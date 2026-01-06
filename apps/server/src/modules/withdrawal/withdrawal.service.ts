import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Withdrawal } from '../../database/entities/withdrawal.entity';
import { User } from '../../database/entities/user.entity';
import { PorterIncome } from '../../database/entities/porter-income.entity';
import { ApplyWithdrawalDto, AuditWithdrawalDto, QueryWithdrawalDto, AdminQueryWithdrawalDto } from './dto/apply-withdrawal.dto';
import { BusinessException } from '../../common/filters/business.exception';
import { ErrorCode } from '../../common/utils/error-code.enum';

@Injectable()
export class WithdrawalService {
  // 最低提现金额（后续可从配置读取）
  private readonly MIN_WITHDRAW_AMOUNT = 100;
  private readonly FEE_RATE = 0; // 手续费率

  constructor(
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepository: Repository<Withdrawal>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PorterIncome)
    private readonly porterIncomeRepository: Repository<PorterIncome>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 代理商申请提现
   */
  async applyWithdrawal(userId: number, dto: ApplyWithdrawalDto): Promise<{ withdrawNo: string }> {
    // 验证最低提现金额
    if (dto.amount < this.MIN_WITHDRAW_AMOUNT) {
      throw new BusinessException(ErrorCode.WITHDRAW_MIN_ERROR, `最低提现金额为${this.MIN_WITHDRAW_AMOUNT}元`);
    }

    // 获取用户余额
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BusinessException(ErrorCode.AUTH_USER_NOT_FOUND, '用户不存在');
    }

    const balance = parseFloat(user.balance);
    if (dto.amount > balance) {
      throw new BusinessException(ErrorCode.BALANCE_NOT_ENOUGH, '余额不足');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 计算手续费和实际到账金额
      const fee = dto.amount * this.FEE_RATE;
      const actualAmount = dto.amount - fee;

      const withdrawNo = this.generateWithdrawNo();

      // 创建提现记录
      const withdrawal = this.withdrawalRepository.create({
        withdrawNo,
        userType: 'user',
        userId,
        amount: dto.amount.toFixed(2),
        fee: fee.toFixed(2),
        actualAmount: actualAmount.toFixed(2),
        bankName: dto.bankName,
        bankAccount: dto.bankAccount,
        bankHolder: dto.bankHolder,
        status: 'pending',
      });
      await queryRunner.manager.save(Withdrawal, withdrawal);

      // 冻结余额
      await queryRunner.manager.update(User, userId, {
        balance: () => `balance - ${dto.amount}`,
      });

      await queryRunner.commitTransaction();
      return { withdrawNo };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 获取代理商提现记录
   */
  async getUserWithdrawalList(userId: number, dto: QueryWithdrawalDto): Promise<any> {
    const { page = 1, pageSize = 20, status } = dto;

    const queryBuilder = this.withdrawalRepository.createQueryBuilder('w');
    queryBuilder.where('w.user_id = :userId AND w.user_type = :userType', { userId, userType: 'user' });

    if (status) {
      queryBuilder.andWhere('w.status = :status', { status });
    }

    queryBuilder
      .orderBy('w.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await queryBuilder.getManyAndCount();

    return {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 货管申请提现
   */
  async porterApplyWithdrawal(porterId: number, dto: ApplyWithdrawalDto): Promise<{ withdrawNo: string }> {
    // 验证最低提现金额
    if (dto.amount < this.MIN_WITHDRAW_AMOUNT) {
      throw new BusinessException(ErrorCode.WITHDRAW_MIN_ERROR, `最低提现金额为${this.MIN_WITHDRAW_AMOUNT}元`);
    }

    // 获取货管可提现余额（已结算的收入）
    const result = await this.porterIncomeRepository
      .createQueryBuilder('pi')
      .select('SUM(pi.amount)', 'total')
      .where('pi.porter_id = :porterId AND pi.status = :status', { porterId, status: 'settled' })
      .getRawOne();

    const availableBalance = parseFloat(result?.total || '0');
    if (dto.amount > availableBalance) {
      throw new BusinessException(ErrorCode.BALANCE_NOT_ENOUGH, '可提现余额不足');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 计算手续费和实际到账金额
      const fee = dto.amount * this.FEE_RATE;
      const actualAmount = dto.amount - fee;

      const withdrawNo = this.generateWithdrawNo();

      // 创建提现记录
      const withdrawal = this.withdrawalRepository.create({
        withdrawNo,
        userType: 'porter',
        userId: porterId,
        amount: dto.amount.toFixed(2),
        fee: fee.toFixed(2),
        actualAmount: actualAmount.toFixed(2),
        bankName: dto.bankName,
        bankAccount: dto.bankAccount,
        bankHolder: dto.bankHolder,
        status: 'pending',
      });
      await queryRunner.manager.save(Withdrawal, withdrawal);

      // 将对应金额的收入记录标记为已提现
      // 简化处理：按金额顺序标记
      let remaining = dto.amount;
      const settledIncomes = await queryRunner.manager.find(PorterIncome, {
        where: { porterId, status: 'settled' },
        order: { createdAt: 'ASC' },
      });

      for (const income of settledIncomes) {
        if (remaining <= 0) break;
        const incomeAmount = parseFloat(income.amount);
        if (incomeAmount <= remaining) {
          await queryRunner.manager.update(PorterIncome, income.id, { status: 'withdrawn' });
          remaining -= incomeAmount;
        }
      }

      await queryRunner.commitTransaction();
      return { withdrawNo };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 获取货管提现记录
   */
  async getPorterWithdrawalList(porterId: number, dto: QueryWithdrawalDto): Promise<any> {
    const { page = 1, pageSize = 20, status } = dto;

    const queryBuilder = this.withdrawalRepository.createQueryBuilder('w');
    queryBuilder.where('w.user_id = :porterId AND w.user_type = :userType', { porterId, userType: 'porter' });

    if (status) {
      queryBuilder.andWhere('w.status = :status', { status });
    }

    queryBuilder
      .orderBy('w.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await queryBuilder.getManyAndCount();

    return {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // ==================== 管理后台方法 ====================

  /**
   * 获取提现列表
   */
  async getAdminWithdrawalList(dto: AdminQueryWithdrawalDto): Promise<any> {
    const { page = 1, pageSize = 20, status, userId, userType, withdrawNo } = dto;

    const queryBuilder = this.withdrawalRepository.createQueryBuilder('w');

    if (status) {
      queryBuilder.where('w.status = :status', { status });
    }

    if (userId) {
      queryBuilder.andWhere('w.user_id = :userId', { userId });
    }

    if (userType) {
      queryBuilder.andWhere('w.user_type = :userType', { userType });
    }

    if (withdrawNo) {
      queryBuilder.andWhere('w.withdraw_no LIKE :withdrawNo', { withdrawNo: `%${withdrawNo}%` });
    }

    queryBuilder
      .orderBy('w.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await queryBuilder.getManyAndCount();

    return {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取提现详情
   */
  async getWithdrawalDetail(id: number): Promise<Withdrawal> {
    const withdrawal = await this.withdrawalRepository.findOne({ where: { id } });
    if (!withdrawal) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '提现记录不存在');
    }
    return withdrawal;
  }

  /**
   * 审核提现
   */
  async auditWithdrawal(id: number, dto: AuditWithdrawalDto, auditorId: number): Promise<void> {
    const withdrawal = await this.withdrawalRepository.findOne({ where: { id } });
    if (!withdrawal) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '提现记录不存在');
    }

    if (withdrawal.status !== 'pending') {
      throw new BusinessException(ErrorCode.WITHDRAW_STATUS_ERROR, '该提现申请已处理');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (dto.status === 'approved') {
        // 审核通过
        await queryRunner.manager.update(Withdrawal, id, {
          status: 'approved',
          auditorId,
          auditAt: new Date(),
          auditRemark: dto.remark,
        });
      } else {
        // 审核拒绝，退还余额
        await queryRunner.manager.update(Withdrawal, id, {
          status: 'rejected',
          auditorId,
          auditAt: new Date(),
          auditRemark: dto.remark,
        });

        // 根据用户类型退还余额
        if (withdrawal.userType === 'user') {
          await queryRunner.manager.update(User, withdrawal.userId, {
            balance: () => `balance + ${withdrawal.amount}`,
          });
        } else {
          // 货管：将已提现的收入恢复为已结算状态
          // 这里简化处理，实际需要记录关联
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 完成提现（线下打款后标记完成）
   */
  async completeWithdrawal(id: number): Promise<void> {
    const withdrawal = await this.withdrawalRepository.findOne({ where: { id } });
    if (!withdrawal) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '提现记录不存在');
    }

    if (withdrawal.status !== 'approved') {
      throw new BusinessException(ErrorCode.WITHDRAW_STATUS_ERROR, '提现状态错误');
    }

    await this.withdrawalRepository.update(id, {
      status: 'completed',
      completedAt: new Date(),
    });
  }

  /**
   * 生成提现单号
   */
  private generateWithdrawNo(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, '0');
    return `WD${dateStr}${random}`;
  }
}

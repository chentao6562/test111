import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Commission } from '../../database/entities/commission.entity';
import { User } from '../../database/entities/user.entity';
import { Order } from '../../database/entities/order.entity';
import { QueryCommissionDto, AdminQueryCommissionDto, SettleCommissionDto } from './dto/query-commission.dto';
import { CommissionRuleService } from './commission-rule.service';

@Injectable()
export class CommissionService {
  constructor(
    @InjectRepository(Commission)
    private readonly commissionRepository: Repository<Commission>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => CommissionRuleService))
    private readonly ruleService: CommissionRuleService,
  ) {}

  /**
   * 计算并创建分润记录（订单完成时调用）
   */
  async calculateCommission(orderId: number): Promise<void> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) return;

    // 获取订单创建人
    const user = await this.userRepository.findOne({ where: { id: order.userId } });
    if (!user || !user.parentId) return;

    const orderAmount = parseFloat(order.payAmount);

    // 从数据库获取分润比例
    const rates = await this.ruleService.getCommissionRates(orderAmount);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 一级分润：直接上级
      const parent = await queryRunner.manager.findOne(User, { where: { id: user.parentId } });
      if (parent && parent.agentLevel > 0 && parent.agentStatus === 2) {
        const commission1 = this.commissionRepository.create({
          userId: parent.id,
          orderId: order.id,
          orderNo: order.orderNo,
          fromUserId: user.id,
          orderAmount: orderAmount.toFixed(2),
          commissionRate: rates.level1Rate.toFixed(4),
          commissionAmount: (orderAmount * rates.level1Rate).toFixed(2),
          level: 1,
          status: 0,
        });
        await queryRunner.manager.save(Commission, commission1);

        // 二级分润：上级的上级
        if (parent.parentId) {
          const grandParent = await queryRunner.manager.findOne(User, { where: { id: parent.parentId } });
          if (grandParent && grandParent.agentLevel > 0 && grandParent.agentStatus === 2) {
            const commission2 = this.commissionRepository.create({
              userId: grandParent.id,
              orderId: order.id,
              orderNo: order.orderNo,
              fromUserId: user.id,
              orderAmount: orderAmount.toFixed(2),
              commissionRate: rates.level2Rate.toFixed(4),
              commissionAmount: (orderAmount * rates.level2Rate).toFixed(2),
              level: 2,
              status: 0,
            });
            await queryRunner.manager.save(Commission, commission2);
          }
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
   * 获取代理商的分润列表
   */
  async getCommissionList(userId: number, dto: QueryCommissionDto): Promise<any> {
    const { page = 1, pageSize = 20, status, level, startDate, endDate } = dto;

    const queryBuilder = this.commissionRepository.createQueryBuilder('c');
    queryBuilder.where('c.user_id = :userId', { userId });

    if (status !== undefined) {
      queryBuilder.andWhere('c.status = :status', { status });
    }

    if (level) {
      queryBuilder.andWhere('c.level = :level', { level });
    }

    if (startDate) {
      queryBuilder.andWhere('c.created_at >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('c.created_at <= :endDate', { endDate: `${endDate} 23:59:59` });
    }

    queryBuilder
      .orderBy('c.created_at', 'DESC')
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
   * 获取代理商的分润统计
   */
  async getCommissionStats(userId: number): Promise<{
    todayAmount: number;
    monthAmount: number;
    totalAmount: number;
    pendingAmount: number;
    settledAmount: number;
  }> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 今日分润
    const todayResult = await this.commissionRepository
      .createQueryBuilder('c')
      .select('SUM(c.commission_amount)', 'total')
      .where('c.user_id = :userId', { userId })
      .andWhere('c.created_at >= :todayStart', { todayStart })
      .andWhere('c.status != 2') // 排除已取消
      .getRawOne();

    // 本月分润
    const monthResult = await this.commissionRepository
      .createQueryBuilder('c')
      .select('SUM(c.commission_amount)', 'total')
      .where('c.user_id = :userId', { userId })
      .andWhere('c.created_at >= :monthStart', { monthStart })
      .andWhere('c.status != 2')
      .getRawOne();

    // 累计分润
    const totalResult = await this.commissionRepository
      .createQueryBuilder('c')
      .select('SUM(c.commission_amount)', 'total')
      .where('c.user_id = :userId', { userId })
      .andWhere('c.status != 2')
      .getRawOne();

    // 待结算分润
    const pendingResult = await this.commissionRepository
      .createQueryBuilder('c')
      .select('SUM(c.commission_amount)', 'total')
      .where('c.user_id = :userId', { userId })
      .andWhere('c.status = 0')
      .getRawOne();

    // 已结算分润
    const settledResult = await this.commissionRepository
      .createQueryBuilder('c')
      .select('SUM(c.commission_amount)', 'total')
      .where('c.user_id = :userId', { userId })
      .andWhere('c.status = 1')
      .getRawOne();

    return {
      todayAmount: parseFloat(todayResult?.total || '0'),
      monthAmount: parseFloat(monthResult?.total || '0'),
      totalAmount: parseFloat(totalResult?.total || '0'),
      pendingAmount: parseFloat(pendingResult?.total || '0'),
      settledAmount: parseFloat(settledResult?.total || '0'),
    };
  }

  /**
   * 获取代理商余额信息
   */
  async getBalanceInfo(userId: number): Promise<{
    balance: number;
    totalIncome: number;
    pendingCommission: number;
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return { balance: 0, totalIncome: 0, pendingCommission: 0 };
    }

    const stats = await this.getCommissionStats(userId);

    return {
      balance: parseFloat(user.balance),
      totalIncome: parseFloat(user.totalIncome),
      pendingCommission: stats.pendingAmount,
    };
  }

  // ==================== 管理后台方法 ====================

  /**
   * 管理后台分润列表
   */
  async getAdminCommissionList(dto: AdminQueryCommissionDto): Promise<any> {
    const { page = 1, pageSize = 20, status, level, userId, orderNo, startDate, endDate } = dto;

    const queryBuilder = this.commissionRepository.createQueryBuilder('c');

    if (userId) {
      queryBuilder.where('c.user_id = :userId', { userId });
    }

    if (status !== undefined) {
      queryBuilder.andWhere('c.status = :status', { status });
    }

    if (level) {
      queryBuilder.andWhere('c.level = :level', { level });
    }

    if (orderNo) {
      queryBuilder.andWhere('c.order_no LIKE :orderNo', { orderNo: `%${orderNo}%` });
    }

    if (startDate) {
      queryBuilder.andWhere('c.created_at >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('c.created_at <= :endDate', { endDate: `${endDate} 23:59:59` });
    }

    queryBuilder
      .orderBy('c.created_at', 'DESC')
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
   * 管理后台分润统计
   */
  async getAdminCommissionStats(): Promise<{
    todayAmount: number;
    monthAmount: number;
    totalAmount: number;
    pendingAmount: number;
    pendingCount: number;
  }> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 今日分润
    const todayResult = await this.commissionRepository
      .createQueryBuilder('c')
      .select('SUM(c.commission_amount)', 'total')
      .where('c.created_at >= :todayStart', { todayStart })
      .andWhere('c.status != 2')
      .getRawOne();

    // 本月分润
    const monthResult = await this.commissionRepository
      .createQueryBuilder('c')
      .select('SUM(c.commission_amount)', 'total')
      .where('c.created_at >= :monthStart', { monthStart })
      .andWhere('c.status != 2')
      .getRawOne();

    // 累计分润
    const totalResult = await this.commissionRepository
      .createQueryBuilder('c')
      .select('SUM(c.commission_amount)', 'total')
      .where('c.status != 2')
      .getRawOne();

    // 待结算分润
    const pendingResult = await this.commissionRepository
      .createQueryBuilder('c')
      .select('SUM(c.commission_amount) as total, COUNT(*) as count')
      .where('c.status = 0')
      .getRawOne();

    return {
      todayAmount: parseFloat(todayResult?.total || '0'),
      monthAmount: parseFloat(monthResult?.total || '0'),
      totalAmount: parseFloat(totalResult?.total || '0'),
      pendingAmount: parseFloat(pendingResult?.total || '0'),
      pendingCount: parseInt(pendingResult?.count || '0'),
    };
  }

  /**
   * 批量结算分润
   */
  async settleCommissions(dto: SettleCommissionDto): Promise<{
    settledCount: number;
    settledAmount: number;
  }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let settledCount = 0;
    let settledAmount = 0;

    try {
      // 构建查询条件
      let commissions: Commission[];
      if (dto.ids && dto.ids.length > 0) {
        commissions = await queryRunner.manager.find(Commission, {
          where: dto.ids.map(id => ({ id, status: 0 })),
        });
      } else if (dto.userId) {
        commissions = await queryRunner.manager.find(Commission, {
          where: { userId: dto.userId, status: 0 },
        });
      } else {
        // 结算所有待结算
        commissions = await queryRunner.manager.find(Commission, {
          where: { status: 0 },
        });
      }

      // 按用户分组结算
      const userCommissions = new Map<number, number>();

      for (const commission of commissions) {
        const amount = parseFloat(commission.commissionAmount);
        const current = userCommissions.get(commission.userId) || 0;
        userCommissions.set(commission.userId, current + amount);

        // 更新分润状态
        await queryRunner.manager.update(Commission, commission.id, {
          status: 1,
          settledAt: new Date(),
        });

        settledCount++;
        settledAmount += amount;
      }

      // 更新用户余额和累计收入
      for (const [userId, amount] of userCommissions) {
        await queryRunner.manager
          .createQueryBuilder()
          .update(User)
          .set({
            balance: () => `balance + ${amount}`,
            totalIncome: () => `total_income + ${amount}`,
          })
          .where('id = :userId', { userId })
          .execute();
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    return {
      settledCount,
      settledAmount: Math.round(settledAmount * 100) / 100,
    };
  }
}

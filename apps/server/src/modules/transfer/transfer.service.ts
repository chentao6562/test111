import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { TransferTask } from '../../database/entities/transfer-task.entity';
import { PorterIncome } from '../../database/entities/porter-income.entity';
import { Order } from '../../database/entities/order.entity';
import { CreateTransferDto, AssignTransferDto } from './dto/create-transfer.dto';
import { QueryTransferDto } from './dto/query-transfer.dto';
import { BusinessException } from '../../common/filters/business.exception';
import { ErrorCode } from '../../common/utils/error-code.enum';

@Injectable()
export class TransferService {
  private readonly DEFAULT_TRANSFER_FEE = 40; // 默认搬运费

  constructor(
    @InjectRepository(TransferTask)
    private readonly taskRepository: Repository<TransferTask>,
    @InjectRepository(PorterIncome)
    private readonly incomeRepository: Repository<PorterIncome>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly dataSource: DataSource,
  ) {}

  // ==================== 货管端方法 ====================

  /**
   * 获取待接单任务列表
   */
  async getPendingTasks(page: number = 1, pageSize: number = 20): Promise<any> {
    const [list, total] = await this.taskRepository.findAndCount({
      where: { status: 'pending' },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取进行中任务列表
   */
  async getDoingTasks(porterId: number, page: number = 1, pageSize: number = 20): Promise<any> {
    const [list, total] = await this.taskRepository.findAndCount({
      where: [
        { porterId, status: 'assigned' },
        { porterId, status: 'picking' },
        { porterId, status: 'transferring' },
      ],
      order: { assignedAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取已完成任务列表
   */
  async getDoneTasks(porterId: number, page: number = 1, pageSize: number = 20): Promise<any> {
    const [list, total] = await this.taskRepository.findAndCount({
      where: { porterId, status: 'completed' },
      order: { completedAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取任务详情
   */
  async getTaskDetail(taskId: number): Promise<TransferTask> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '任务不存在');
    }
    return task;
  }

  /**
   * 接单
   */
  async acceptTask(taskId: number, porterId: number): Promise<void> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '任务不存在');
    }
    if (task.status !== 'pending') {
      throw new BusinessException(ErrorCode.TRANSFER_STATUS_ERROR, '任务状态不允许接单');
    }

    await this.taskRepository.update(taskId, {
      porterId,
      status: 'assigned',
      assignedAt: new Date(),
    });
  }

  /**
   * 确认取货
   */
  async pickTask(taskId: number, porterId: number): Promise<void> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '任务不存在');
    }
    if (task.porterId !== porterId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, '无权操作此任务');
    }
    if (task.status !== 'assigned') {
      throw new BusinessException(ErrorCode.TRANSFER_STATUS_ERROR, '任务状态不允许取货');
    }

    await this.taskRepository.update(taskId, {
      status: 'picking',
      pickedAt: new Date(),
    });
  }

  /**
   * 完成任务
   */
  async completeTask(taskId: number, porterId: number): Promise<void> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '任务不存在');
    }
    if (task.porterId !== porterId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, '无权操作此任务');
    }
    if (task.status !== 'picking' && task.status !== 'transferring') {
      throw new BusinessException(ErrorCode.TRANSFER_STATUS_ERROR, '任务状态不允许完成');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 更新任务状态
      await queryRunner.manager.update(TransferTask, taskId, {
        status: 'completed',
        completedAt: new Date(),
      });

      // 更新订单状态为待提货
      await queryRunner.manager.update(Order, task.orderId, {
        status: 3, // 待提货
      });

      // 创建货管收入记录
      await queryRunner.manager.save(PorterIncome, {
        porterId,
        taskId,
        amount: task.transferFee || this.DEFAULT_TRANSFER_FEE.toFixed(2),
        status: 'pending',
      });

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 获取收入统计
   */
  async getIncomeStats(porterId: number): Promise<{
    totalIncome: number;
    pendingIncome: number;
    settledIncome: number;
    todayIncome: number;
  }> {
    // 获取今天的日期范围
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const incomes = await this.incomeRepository.find({ where: { porterId } });

    let totalIncome = 0;
    let pendingIncome = 0;
    let settledIncome = 0;
    let todayIncome = 0;

    for (const income of incomes) {
      const amount = parseFloat(income.amount);
      totalIncome += amount;

      if (income.status === 'pending') {
        pendingIncome += amount;
      } else if (income.status === 'settled' || income.status === 'withdrawn') {
        settledIncome += amount;
      }

      if (income.createdAt >= today && income.createdAt < tomorrow) {
        todayIncome += amount;
      }
    }

    return {
      totalIncome: Math.round(totalIncome * 100) / 100,
      pendingIncome: Math.round(pendingIncome * 100) / 100,
      settledIncome: Math.round(settledIncome * 100) / 100,
      todayIncome: Math.round(todayIncome * 100) / 100,
    };
  }

  /**
   * 获取收入明细
   */
  async getIncomeList(porterId: number, page: number = 1, pageSize: number = 20): Promise<any> {
    const [list, total] = await this.incomeRepository.findAndCount({
      where: { porterId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // ==================== 库管端方法 ====================

  /**
   * 创建移库任务
   */
  async createTask(dto: CreateTransferDto, operatorId: number): Promise<{ taskId: number; taskNo: string }> {
    // 验证订单存在
    const order = await this.orderRepository.findOne({ where: { id: dto.orderId } });
    if (!order) {
      throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, '订单不存在');
    }

    // 检查是否已有移库任务
    const existingTask = await this.taskRepository.findOne({ where: { orderId: dto.orderId } });
    if (existingTask) {
      throw new BusinessException(ErrorCode.TRANSFER_ALREADY_EXISTS, '该订单已存在移库任务');
    }

    const taskNo = this.generateTaskNo();

    const task = this.taskRepository.create({
      taskNo,
      orderId: dto.orderId,
      fromLocation: dto.fromLocation,
      transferFee: this.DEFAULT_TRANSFER_FEE.toFixed(2),
      remark: dto.remark,
    });

    const savedTask = await this.taskRepository.save(task);

    return {
      taskId: savedTask.id,
      taskNo: savedTask.taskNo,
    };
  }

  /**
   * 获取移库任务列表（库管端）
   */
  async getTaskList(dto: QueryTransferDto): Promise<any> {
    const { page = 1, pageSize = 20, status } = dto;

    const queryBuilder = this.taskRepository.createQueryBuilder('task');

    if (status) {
      queryBuilder.where('task.status = :status', { status });
    }

    queryBuilder
      .orderBy('task.createdAt', 'DESC')
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
   * 指派任务给货管
   */
  async assignTask(taskId: number, dto: AssignTransferDto): Promise<void> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '任务不存在');
    }
    if (task.status !== 'pending') {
      throw new BusinessException(ErrorCode.TRANSFER_STATUS_ERROR, '任务状态不允许指派');
    }

    await this.taskRepository.update(taskId, {
      porterId: dto.porterId,
      status: 'assigned',
      assignedAt: new Date(),
    });
  }

  // ==================== 管理后台方法 ====================

  /**
   * 批量结算
   */
  async settleTasks(taskIds: number[]): Promise<{ settledCount: number }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let settledCount = 0;

    try {
      for (const taskId of taskIds) {
        // 更新任务费用状态
        await queryRunner.manager.update(TransferTask, taskId, {
          feeStatus: 1,
        });

        // 更新收入记录状态
        await queryRunner.manager.update(
          PorterIncome,
          { taskId, status: 'pending' },
          { status: 'settled', settledAt: new Date() },
        );

        settledCount++;
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    return { settledCount };
  }

  /**
   * 生成任务编号
   */
  private generateTaskNo(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, '0');
    return `TF${dateStr}${random}`;
  }
}

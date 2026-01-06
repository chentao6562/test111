import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThan, In } from 'typeorm';
import { Order } from '../../database/entities/order.entity';
import { User } from '../../database/entities/user.entity';
import { Product } from '../../database/entities/product.entity';
import { Commission } from '../../database/entities/commission.entity';
import { Withdrawal } from '../../database/entities/withdrawal.entity';
import { TransferTask } from '../../database/entities/transfer-task.entity';

// 订单状态: 0待付款 1已付款待备货 2备货中 3待提货 4已完成 5已取消
const ORDER_STATUS = {
  UNPAID: 0,
  PAID: 1,
  PREPARING: 2,
  WAITING: 3,
  COMPLETED: 4,
  CANCELLED: 5,
};

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Commission)
    private readonly commissionRepo: Repository<Commission>,
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepo: Repository<Withdrawal>,
    @InjectRepository(TransferTask)
    private readonly transferRepo: Repository<TransferTask>,
  ) {}

  async getStats(): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 今日销售额
    const todaySalesResult = await this.orderRepo
      .createQueryBuilder('order')
      .select('SUM(order.payAmount)', 'total')
      .where('order.status NOT IN (:...status)', { status: [ORDER_STATUS.UNPAID, ORDER_STATUS.CANCELLED] })
      .andWhere('order.createdAt >= :today', { today })
      .andWhere('order.createdAt < :tomorrow', { tomorrow })
      .getRawOne();
    const todaySales = parseFloat(todaySalesResult?.total || '0');

    // 今日订单数
    const todayOrders = await this.orderRepo.count({
      where: {
        createdAt: Between(today, tomorrow),
      },
    });

    // 今日新增代理
    const todayAgents = await this.userRepo.count({
      where: {
        agentLevel: MoreThanOrEqual(1),
        createdAt: Between(today, tomorrow),
      },
    });

    // 待处理订单 (已付款待备货或备货中)
    const pendingOrders = await this.orderRepo.count({
      where: [
        { status: ORDER_STATUS.PAID },
        { status: ORDER_STATUS.PREPARING },
      ],
    });

    // 待审核代理
    const pendingAgents = await this.userRepo.count({
      where: { agentStatus: 1 },
    });

    // 待审核提现
    const pendingWithdrawals = await this.withdrawalRepo.count({
      where: { status: 'pending' },
    });

    // 库存预警
    const warningStock = await this.productRepo.count({
      where: {
        status: 1,
      },
    });

    // 待分配移库任务
    const pendingTransfers = await this.transferRepo.count({
      where: { status: 'pending' },
    });

    return {
      todaySales,
      todayOrders,
      todayAgents,
      pendingOrders,
      pendingAgents,
      pendingWithdrawals,
      warningStock: 0, // 需要单独查询stock <= warning_stock
      pendingTransfers,
    };
  }

  async getChartData(days: number = 7): Promise<any> {
    const result = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = days - 1; i >= 0; i--) {
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - i);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);

      // 当天销售额
      const salesResult = await this.orderRepo
        .createQueryBuilder('order')
        .select('SUM(order.payAmount)', 'total')
        .where('order.status NOT IN (:...status)', { status: [ORDER_STATUS.UNPAID, ORDER_STATUS.CANCELLED] })
        .andWhere('order.createdAt >= :start', { start: startDate })
        .andWhere('order.createdAt < :end', { end: endDate })
        .getRawOne();

      // 当天订单数
      const orderCount = await this.orderRepo.count({
        where: {
          createdAt: Between(startDate, endDate),
        },
      });

      result.push({
        date: startDate.toISOString().slice(5, 10), // MM-DD
        sales: parseFloat(salesResult?.total || '0'),
        orders: orderCount,
      });
    }

    return {
      salesTrend: result,
    };
  }

  async getTodos(): Promise<any[]> {
    const todos = [];

    // 待审核代理申请
    const pendingAgents = await this.userRepo.count({
      where: { agentStatus: 1 },
    });
    if (pendingAgents > 0) {
      todos.push({ type: 'agent_audit', count: pendingAgents, label: '待审核代理申请' });
    }

    // 待备货订单 (已付款待备货)
    const preparingOrders = await this.orderRepo.count({
      where: { status: ORDER_STATUS.PAID },
    });
    if (preparingOrders > 0) {
      todos.push({ type: 'order_prepare', count: preparingOrders, label: '待备货订单' });
    }

    // 待审核提现
    const pendingWithdrawals = await this.withdrawalRepo.count({
      where: { status: 'pending' },
    });
    if (pendingWithdrawals > 0) {
      todos.push({ type: 'withdrawal_audit', count: pendingWithdrawals, label: '待审核提现' });
    }

    // 待分配移库任务
    const pendingTransfers = await this.transferRepo.count({
      where: { status: 'pending' },
    });
    if (pendingTransfers > 0) {
      todos.push({ type: 'transfer_assign', count: pendingTransfers, label: '待分配移库任务' });
    }

    return todos;
  }

  async getSalesReport(startDate: string, endDate: string): Promise<any> {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // 总销售额
    const salesResult = await this.orderRepo
      .createQueryBuilder('order')
      .select('SUM(order.payAmount)', 'totalSales')
      .addSelect('COUNT(*)', 'totalOrders')
      .where('order.status NOT IN (:...status)', { status: [ORDER_STATUS.UNPAID, ORDER_STATUS.CANCELLED] })
      .andWhere('order.createdAt >= :start', { start })
      .andWhere('order.createdAt <= :end', { end })
      .getRawOne();

    // 分润总额
    const commissionResult = await this.commissionRepo
      .createQueryBuilder('commission')
      .select('SUM(commission.commissionAmount)', 'total')
      .where('commission.createdAt >= :start', { start })
      .andWhere('commission.createdAt <= :end', { end })
      .getRawOne();

    return {
      totalSales: parseFloat(salesResult?.totalSales || '0'),
      totalOrders: parseInt(salesResult?.totalOrders || '0'),
      totalCommission: parseFloat(commissionResult?.total || '0'),
      averageOrderValue: salesResult?.totalOrders > 0
        ? parseFloat(salesResult?.totalSales || '0') / parseInt(salesResult?.totalOrders || '1')
        : 0,
    };
  }

  async getAgentReport(startDate: string, endDate: string): Promise<any> {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // 新增代理数
    const newAgents = await this.userRepo.count({
      where: {
        agentLevel: MoreThanOrEqual(1),
        createdAt: Between(start, end),
      },
    });

    // 代理总数
    const totalAgents = await this.userRepo.count({
      where: {
        agentLevel: MoreThanOrEqual(1),
      },
    });

    // 一级代理数
    const level1Agents = await this.userRepo.count({
      where: { agentLevel: 1 },
    });

    // 二级代理数
    const level2Agents = await this.userRepo.count({
      where: { agentLevel: 2 },
    });

    // 代理业绩排行
    const topAgents = await this.orderRepo
      .createQueryBuilder('order')
      .select('order.userId', 'userId')
      .addSelect('SUM(order.payAmount)', 'totalSales')
      .addSelect('COUNT(*)', 'orderCount')
      .leftJoin(User, 'user', 'user.id = order.userId')
      .addSelect('user.nickname', 'nickname')
      .where('order.status NOT IN (:...status)', { status: [ORDER_STATUS.UNPAID, ORDER_STATUS.CANCELLED] })
      .andWhere('order.createdAt >= :start', { start })
      .andWhere('order.createdAt <= :end', { end })
      .groupBy('order.userId')
      .orderBy('totalSales', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      newAgents,
      totalAgents,
      level1Agents,
      level2Agents,
      topAgents,
    };
  }

  async getProductReport(startDate: string, endDate: string): Promise<any> {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // 商品总数
    const totalProducts = await this.productRepo.count();

    // 上架商品数
    const activeProducts = await this.productRepo.count({
      where: { status: 1 },
    });

    // 销量排行
    const topProducts = await this.productRepo
      .createQueryBuilder('product')
      .select(['product.id', 'product.name', 'product.sales', 'product.stock'])
      .orderBy('product.sales', 'DESC')
      .limit(10)
      .getMany();

    return {
      totalProducts,
      activeProducts,
      topProducts,
    };
  }
}

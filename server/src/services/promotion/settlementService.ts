/**
 * T+2 利润结算服务
 * 【2026-01-16 推广体系升级】
 *
 * 结算规则:
 * - 订单完成后T+2天自动结算利润
 * - 结算前检查: 订单状态=completed, 收款确认=true, 利润未结算=false
 * - 结算后: 利润入账到对应推销员余额，创建资金流水记录
 */

import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';
import * as profitService from './profitService';

// 结算结果
export interface SettlementResult {
  orderId: number;
  orderNo: string;
  success: boolean;
  error?: string;
  masterProfit?: number;
  level1Profit?: number;
  level2Profit?: number;
}

/**
 * 获取待结算订单列表
 * @param days T+N天数，默认2天
 */
export async function getPendingSettlementOrders(days: number = 2): Promise<number[]> {
  // 计算结算截止时间（T+N天前完成的订单）
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  cutoffDate.setHours(23, 59, 59, 999);

  const orders = await prisma.order.findMany({
    where: {
      status: 'completed',
      paymentConfirmed: true,
      profitSettled: false,
      pickedAt: {
        lte: cutoffDate,
      },
    },
    select: {
      id: true,
    },
    orderBy: {
      pickedAt: 'asc',
    },
  });

  return orders.map(o => o.id);
}

/**
 * 批量结算利润
 * @param orderIds 订单ID列表
 */
export async function batchSettleProfit(orderIds: number[]): Promise<SettlementResult[]> {
  const results: SettlementResult[] = [];

  for (const orderId of orderIds) {
    try {
      await prisma.$transaction(async (tx) => {
        await profitService.settleOrderProfit(orderId, tx);
      });

      // 获取订单信息用于返回结果
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          orderNo: true,
          masterProfit: true,
          level1Profit: true,
          level2Profit: true,
        },
      });

      results.push({
        orderId,
        orderNo: order?.orderNo || '',
        success: true,
        masterProfit: Number(order?.masterProfit || 0),
        level1Profit: Number(order?.level1Profit || 0),
        level2Profit: Number(order?.level2Profit || 0),
      });
    } catch (error) {
      results.push({
        orderId,
        orderNo: '',
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }

  return results;
}

/**
 * 执行T+2自动结算（定时任务调用）
 */
export async function runDailySettlement(): Promise<{
  totalOrders: number;
  successCount: number;
  failCount: number;
  results: SettlementResult[];
}> {
  console.log(`[${new Date().toISOString()}] 开始执行T+2利润结算任务...`);

  // 获取待结算订单
  const orderIds = await getPendingSettlementOrders(2);
  console.log(`找到 ${orderIds.length} 个待结算订单`);

  if (orderIds.length === 0) {
    return {
      totalOrders: 0,
      successCount: 0,
      failCount: 0,
      results: [],
    };
  }

  // 批量结算
  const results = await batchSettleProfit(orderIds);

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log(`结算完成: 成功 ${successCount} 个，失败 ${failCount} 个`);

  // 记录失败详情
  if (failCount > 0) {
    console.error('结算失败订单:');
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.error(`  订单 ${r.orderId}: ${r.error}`);
      });
  }

  return {
    totalOrders: orderIds.length,
    successCount,
    failCount,
    results,
  };
}

/**
 * 手动结算单个订单（管理员操作）
 */
export async function manualSettleOrder(orderId: number): Promise<SettlementResult> {
  try {
    await prisma.$transaction(async (tx) => {
      await profitService.settleOrderProfit(orderId, tx);
    });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        orderNo: true,
        masterProfit: true,
        level1Profit: true,
        level2Profit: true,
      },
    });

    return {
      orderId,
      orderNo: order?.orderNo || '',
      success: true,
      masterProfit: Number(order?.masterProfit || 0),
      level1Profit: Number(order?.level1Profit || 0),
      level2Profit: Number(order?.level2Profit || 0),
    };
  } catch (error) {
    return {
      orderId,
      orderNo: '',
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 确认订单收款
 * @param orderId 订单ID
 * @param paymentMethod 支付方式
 * @param operatorId 操作人ID
 */
export async function confirmPayment(
  orderId: number,
  paymentMethod: string,
  operatorId: number
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      paymentConfirmed: true,
      fullPaid: true,
    },
  });

  if (!order) {
    throw new Error('订单不存在');
  }

  if (order.paymentConfirmed) {
    throw new Error('订单已确认收款');
  }

  if (!order.fullPaid) {
    throw new Error('订单未全款支付');
  }

  // 只有已完成的订单才能确认收款
  if (order.status !== 'completed') {
    throw new Error('订单未完成，不能确认收款');
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentConfirmed: true,
      paymentConfirmedAt: new Date(),
      paymentMethod,
    },
  });
}

/**
 * 获取结算统计
 */
export async function getSettlementStats(): Promise<{
  pendingCount: number;
  settledToday: number;
  totalSettled: number;
  totalProfit: {
    master: number;
    level1: number;
    level2: number;
  };
}> {
  // 待结算订单数
  const pendingOrderIds = await getPendingSettlementOrders(2);
  const pendingCount = pendingOrderIds.length;

  // 今日结算数
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const settledToday = await prisma.order.count({
    where: {
      profitSettled: true,
      profitSettledAt: {
        gte: today,
      },
    },
  });

  // 总结算数
  const totalSettled = await prisma.order.count({
    where: {
      profitSettled: true,
    },
  });

  // 总利润统计
  const profitStats = await prisma.order.aggregate({
    where: {
      profitSettled: true,
    },
    _sum: {
      masterProfit: true,
      level1Profit: true,
      level2Profit: true,
    },
  });

  return {
    pendingCount,
    settledToday,
    totalSettled,
    totalProfit: {
      master: Number(profitStats._sum.masterProfit || 0),
      level1: Number(profitStats._sum.level1Profit || 0),
      level2: Number(profitStats._sum.level2Profit || 0),
    },
  };
}

/**
 * 获取推销员利润明细
 * 【2026-01-19修复】从FundFlow资金流水表查询，支持Reservation预约模式
 */
export async function getAgentProfitRecords(
  agentId: number,
  options: {
    page?: number;
    pageSize?: number;
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<{
  records: Array<{
    orderId: number;
    orderNo: string;
    profit: number;
    settledAt: Date;
    orderSource: number;
  }>;
  total: number;
  totalProfit: number;
}> {
  const { page = 1, pageSize = 20, startDate, endDate } = options;
  const skip = (page - 1) * pageSize;

  // 【2026-01-19修复】从FundFlow资金流水表查询利润记录
  const where: Prisma.FundFlowWhereInput = {
    agentId,
    type: 'PROFIT',
  };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  // 查询记录
  const [flows, total, totalSum] = await Promise.all([
    prisma.fundFlow.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.fundFlow.count({ where }),
    prisma.fundFlow.aggregate({
      where: { agentId, type: 'PROFIT' },
      _sum: { amount: true },
    }),
  ]);

  // 获取关联的预约号
  const reservationIds = flows
    .filter(f => f.relatedType === 'RESERVATION' && f.relatedId)
    .map(f => f.relatedId!);

  const reservations = reservationIds.length > 0
    ? await prisma.reservation.findMany({
        where: { id: { in: reservationIds } },
        select: { id: true, reservationNo: true, salespersonLevel: true },
      })
    : [];

  const reservationMap = new Map(reservations.map(r => [r.id, r]));

  // 转换为返回格式
  const records = flows.map(flow => {
    const reservation = flow.relatedId ? reservationMap.get(flow.relatedId) : null;
    return {
      orderId: flow.relatedId || 0,
      orderNo: reservation?.reservationNo || (flow.remark?.match(/[A-Z]+\d+/)?.[0] || ''),
      profit: Number(flow.amount),
      settledAt: flow.createdAt,
      orderSource: reservation?.salespersonLevel || 0,
    };
  });

  return {
    records,
    total,
    totalProfit: Number(totalSum._sum.amount || 0),
  };
}

export default {
  getPendingSettlementOrders,
  batchSettleProfit,
  runDailySettlement,
  manualSettleOrder,
  confirmPayment,
  getSettlementStats,
  getAgentProfitRecords,
};

/**
 * 利润计算与分配服务
 * 【2026-01-16 推广体系升级】
 * 【2026-01-17 代码重构】使用settlementExecutor统一利润入账逻辑
 *
 * 利润分配规则:
 * - 订单来源0(默认页面/总代理): 总代理利润 = 零售价 - 成本价
 * - 订单来源1(一级推销员): 总代理利润 = 供货价 - 成本价, 一级利润 = 零售价 - 供货价
 * - 订单来源2(二级推销员): 总代理利润 = 供货价 - 成本价, 一级利润 = 给二级价 - 供货价, 二级利润 = 零售价 - 给二级价
 */

import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';
import * as priceService from './priceService';
import { settleAllProfits, ProfitDistribution as SettlementDistribution } from '../profit/settlementExecutor';

// 利润分配结果
export interface ProfitDistribution {
  masterProfit: number;     // 总代理利润
  level1Profit: number;     // 一级推销员利润
  level2Profit: number;     // 二级推销员利润
  level1AgentId: number | null;  // 一级推销员ID
  level2AgentId: number | null;  // 二级推销员ID
}

// 订单来源信息
export interface OrderSourceInfo {
  orderSource: number;      // 0=总代理 1=一级 2=二级
  sourceAgentId: number;    // 来源推销员ID
  level1AgentId: number | null;
  level2AgentId: number | null;
}

// 价格快照
export interface PriceSnapshot {
  snapshotCostPrice: number;
  snapshotSupplyPrice: number;
  snapshotLevel1Price: number | null;
  snapshotRetailPrice: number;
}

/**
 * 确定订单来源
 * @param agentId 下单时的推销员ID（从URL参数获取）
 */
export async function determineOrderSource(agentId?: number | null): Promise<OrderSourceInfo> {
  // 获取总代理
  const masterAgent = await priceService.getMasterAgent();
  if (!masterAgent) {
    throw new Error('系统配置错误：总代理不存在');
  }

  // 无推销员ID = 默认页面 = 总代理订单
  if (!agentId) {
    return {
      orderSource: 0,
      sourceAgentId: masterAgent.id,
      level1AgentId: null,
      level2AgentId: null,
    };
  }

  // 获取推销员信息
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      type: true,
      isMaster: true,
      parentId: true,
      status: true,
    },
  });

  if (!agent || agent.status !== 'ACTIVE') {
    // 推销员不存在或已禁用，视为总代理订单
    return {
      orderSource: 0,
      sourceAgentId: masterAgent.id,
      level1AgentId: null,
      level2AgentId: null,
    };
  }

  // 总代理本人
  if (agent.isMaster) {
    return {
      orderSource: 0,
      sourceAgentId: agent.id,
      level1AgentId: null,
      level2AgentId: null,
    };
  }

  // 一级推销员
  if (agent.type === 'LEVEL1') {
    return {
      orderSource: 1,
      sourceAgentId: agent.id,
      level1AgentId: agent.id,
      level2AgentId: null,
    };
  }

  // 二级推销员
  if (agent.type === 'LEVEL2') {
    return {
      orderSource: 2,
      sourceAgentId: agent.id,
      level1AgentId: agent.parentId,
      level2AgentId: agent.id,
    };
  }

  // 其他类型（兼容旧数据），视为总代理订单
  return {
    orderSource: 0,
    sourceAgentId: masterAgent.id,
    level1AgentId: null,
    level2AgentId: null,
  };
}

/**
 * 获取订单商品的价格快照
 * @param productId 商品ID
 * @param agentId 推销员ID（下单时的）
 * @param orderSource 订单来源
 */
export async function getPriceSnapshot(
  productId: number,
  agentId: number | null,
  orderSource: number
): Promise<PriceSnapshot> {
  // 获取商品信息
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      costPrice: true,
      supplyPrice: true,
      agentPrice: true,
      masterRetailPrice: true,
      retailPrice: true,
    },
  });

  if (!product) {
    throw new Error('商品不存在');
  }

  const snapshotCostPrice = Number(product.costPrice || product.agentPrice);
  const snapshotSupplyPrice = Number(product.supplyPrice || product.agentPrice);

  // 根据订单来源确定零售价
  let snapshotRetailPrice: number;
  let snapshotLevel1Price: number | null = null;

  if (orderSource === 0) {
    // 总代理订单：使用总代理零售价
    snapshotRetailPrice = Number(product.masterRetailPrice || product.retailPrice);
  } else if (orderSource === 1 && agentId) {
    // 一级推销员订单：使用一级的零售价
    const agentPrice = await prisma.agentPrice.findUnique({
      where: {
        agentId_productId: { agentId, productId },
      },
      select: { retailPrice: true, subPrice: true },
    });
    snapshotRetailPrice = agentPrice?.retailPrice
      ? Number(agentPrice.retailPrice)
      : Number(product.masterRetailPrice || product.retailPrice);
    snapshotLevel1Price = agentPrice?.subPrice ? Number(agentPrice.subPrice) : null;
  } else if (orderSource === 2 && agentId) {
    // 二级推销员订单：需要获取二级的零售价和一级给二级的价格
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { parentId: true },
    });

    // 获取二级的零售价
    const level2Price = await prisma.agentPrice.findUnique({
      where: {
        agentId_productId: { agentId, productId },
      },
      select: { retailPrice: true },
    });
    snapshotRetailPrice = level2Price?.retailPrice
      ? Number(level2Price.retailPrice)
      : Number(product.masterRetailPrice || product.retailPrice);

    // 获取一级给二级的价格
    if (agent?.parentId) {
      const level1Price = await prisma.agentPrice.findUnique({
        where: {
          agentId_productId: { agentId: agent.parentId, productId },
        },
        select: { subPrice: true },
      });
      snapshotLevel1Price = level1Price?.subPrice
        ? Number(level1Price.subPrice)
        : snapshotSupplyPrice; // 未设置则使用供货价
    }
  } else {
    // 默认
    snapshotRetailPrice = Number(product.masterRetailPrice || product.retailPrice);
  }

  return {
    snapshotCostPrice,
    snapshotSupplyPrice,
    snapshotLevel1Price,
    snapshotRetailPrice,
  };
}

/**
 * 计算单个商品的利润分配
 */
export function calculateItemProfit(
  orderSource: number,
  costPrice: number,
  supplyPrice: number,
  level1Price: number | null,
  retailPrice: number,
  quantity: number
): ProfitDistribution {
  let masterProfit = 0;
  let level1Profit = 0;
  let level2Profit = 0;

  if (orderSource === 0) {
    // 总代理订单：总代理赚取全部差价
    masterProfit = (retailPrice - costPrice) * quantity;
  } else if (orderSource === 1) {
    // 一级推销员订单
    masterProfit = (supplyPrice - costPrice) * quantity;  // 总代理赚供货差价
    level1Profit = (retailPrice - supplyPrice) * quantity; // 一级赚零售差价
  } else if (orderSource === 2) {
    // 二级推销员订单
    const actualLevel1Price = level1Price || supplyPrice;
    masterProfit = (supplyPrice - costPrice) * quantity;          // 总代理赚供货差价
    level1Profit = (actualLevel1Price - supplyPrice) * quantity;  // 一级赚批发差价
    level2Profit = (retailPrice - actualLevel1Price) * quantity;  // 二级赚零售差价
  }

  // 保留两位小数，向下取整（防止超出）
  masterProfit = Math.floor(masterProfit * 100) / 100;
  level1Profit = Math.floor(level1Profit * 100) / 100;
  level2Profit = Math.floor(level2Profit * 100) / 100;

  return {
    masterProfit,
    level1Profit,
    level2Profit,
    level1AgentId: null,
    level2AgentId: null,
  };
}

/**
 * 计算整个订单的利润分配（多商品）
 */
export async function calculateOrderProfits(
  items: Array<{ productId: number; quantity: number }>,
  sourceAgentId: number | null
): Promise<{
  profits: ProfitDistribution;
  snapshots: Map<number, PriceSnapshot>;
}> {
  // 确定订单来源
  const sourceInfo = await determineOrderSource(sourceAgentId);

  let totalMasterProfit = 0;
  let totalLevel1Profit = 0;
  let totalLevel2Profit = 0;
  const snapshots = new Map<number, PriceSnapshot>();

  for (const item of items) {
    // 获取价格快照
    const snapshot = await getPriceSnapshot(
      item.productId,
      sourceAgentId,
      sourceInfo.orderSource
    );
    snapshots.set(item.productId, snapshot);

    // 计算单项利润
    const itemProfit = calculateItemProfit(
      sourceInfo.orderSource,
      snapshot.snapshotCostPrice,
      snapshot.snapshotSupplyPrice,
      snapshot.snapshotLevel1Price,
      snapshot.snapshotRetailPrice,
      item.quantity
    );

    totalMasterProfit += itemProfit.masterProfit;
    totalLevel1Profit += itemProfit.level1Profit;
    totalLevel2Profit += itemProfit.level2Profit;
  }

  return {
    profits: {
      masterProfit: totalMasterProfit,
      level1Profit: totalLevel1Profit,
      level2Profit: totalLevel2Profit,
      level1AgentId: sourceInfo.level1AgentId,
      level2AgentId: sourceInfo.level2AgentId,
    },
    snapshots,
  };
}

/**
 * 为订单结算利润（T+2定时任务调用）
 * @param orderId 订单ID
 * @param tx 事务客户端
 */
export async function settleOrderProfit(
  orderId: number,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const client = tx || prisma;

  // 获取订单信息
  const order = await client.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNo: true,
      status: true,
      paymentConfirmed: true,
      profitSettled: true,
      masterProfit: true,
      level1Profit: true,
      level2Profit: true,
      level1AgentId: true,
      level2AgentId: true,
      orderSource: true,
    },
  });

  if (!order) {
    throw new Error('订单不存在');
  }

  if (order.status !== 'completed') {
    throw new Error('订单未完成，不能结算利润');
  }

  if (!order.paymentConfirmed) {
    throw new Error('订单收款未确认，不能结算利润');
  }

  if (order.profitSettled) {
    throw new Error('订单利润已结算，不能重复结算');
  }

  // 获取总代理
  const masterAgent = await priceService.getMasterAgent();
  if (!masterAgent) {
    throw new Error('系统配置错误：总代理不存在');
  }

  // 使用统一的利润入账执行器
  const distribution: SettlementDistribution = {
    masterProfit: Number(order.masterProfit),
    level1Profit: Number(order.level1Profit),
    level2Profit: Number(order.level2Profit),
    masterAgentId: masterAgent.id,
    level1AgentId: order.level1AgentId,
    level2AgentId: order.level2AgentId,
  };

  await settleAllProfits(
    distribution,
    'ORDER',
    orderId,
    order.orderNo,
    client as Prisma.TransactionClient
  );

  // 更新订单结算状态
  await client.order.update({
    where: { id: orderId },
    data: {
      profitSettled: true,
      profitSettledAt: new Date(),
    },
  });
}

export default {
  determineOrderSource,
  getPriceSnapshot,
  calculateItemProfit,
  calculateOrderProfits,
  settleOrderProfit,
};

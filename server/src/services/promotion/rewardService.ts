/**
 * 奖励服务
 * 【2026-01-16 推广体系升级】
 * 【2026-01-17 团队奖励改为月度统计】
 *
 * 奖励类型:
 * 1. 激活奖励 - 被推荐人累计销售额达到门槛后，推荐人获得一次性奖励
 * 2. 团队奖励 - 一级推销员的当月团队销售额达到阶梯后，次月发放奖励
 * 3. 升级补偿 - 二级升级为一级后，原上级获得补偿
 *
 * 团队奖励改动说明（2026-01-17）：
 * - 原来：即时触发，累计销售额达标立即发放
 * - 现在：月度统计，每月1日统计上月业绩，5日前发放
 * - 新增 monthlyTeamSales 字段记录当月销售额
 * - 新增 lastRewardMonth 字段记录上次发放月份
 */

import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';

// 奖励类型
export enum RewardType {
  ACTIVATION = 1,  // 激活奖励
  TEAM = 2,        // 团队奖励
  UPGRADE_COMPENSATION = 3,  // 升级补偿
}

// 奖励配置键
export const RewardConfigKeys = {
  ACTIVATION_THRESHOLD: 'activation_threshold',  // 激活门槛（元）
  ACTIVATION_REWARD: 'activation_reward',        // 激活奖励（元）
  UPGRADE_SALES_THRESHOLD: 'upgrade_sales_threshold',  // 升级销售额门槛
  UPGRADE_ORDERS_THRESHOLD: 'upgrade_orders_threshold', // 升级订单数门槛
  UPGRADE_DAYS_THRESHOLD: 'upgrade_days_threshold',    // 升级注册天数门槛
  UPGRADE_COMPENSATION: 'upgrade_compensation',  // 升级补偿金额
};

/**
 * 获取奖励配置
 */
export async function getRewardConfig(key: string): Promise<number> {
  const config = await prisma.rewardConfig.findUnique({
    where: { configKey: key },
  });
  return config ? Number(config.configValue) : 0;
}

/**
 * 设置奖励配置
 */
export async function setRewardConfig(
  key: string,
  value: string,
  description?: string,
  updatedBy?: number
): Promise<void> {
  await prisma.rewardConfig.upsert({
    where: { configKey: key },
    update: {
      configValue: value,
      description,
      updatedBy,
    },
    create: {
      configKey: key,
      configValue: value,
      description,
      updatedBy,
    },
  });
}

/**
 * 获取所有奖励配置
 */
export async function getAllRewardConfigs(): Promise<Record<string, string>> {
  const configs = await prisma.rewardConfig.findMany();
  const result: Record<string, string> = {};
  for (const config of configs) {
    result[config.configKey] = config.configValue;
  }
  return result;
}

/**
 * 获取团队奖励阶梯
 */
export async function getTeamRewardTiers(): Promise<Array<{
  tierLevel: number;
  salesThreshold: number;
  rewardAmount: number;
}>> {
  const tiers = await prisma.teamRewardTier.findMany({
    where: { isActive: true },
    orderBy: { tierLevel: 'asc' },
  });
  return tiers.map(t => ({
    tierLevel: t.tierLevel,
    salesThreshold: Number(t.salesThreshold),
    rewardAmount: Number(t.rewardAmount),
  }));
}

/**
 * 设置团队奖励阶梯
 */
export async function setTeamRewardTiers(
  tiers: Array<{
    tierLevel: number;
    salesThreshold: number;
    rewardAmount: number;
  }>
): Promise<void> {
  // 使用事务批量更新
  await prisma.$transaction(async (tx) => {
    // 禁用所有现有阶梯
    await tx.teamRewardTier.updateMany({
      data: { isActive: false },
    });

    // 创建或更新新阶梯
    for (const tier of tiers) {
      await tx.teamRewardTier.upsert({
        where: { tierLevel: tier.tierLevel },
        update: {
          salesThreshold: tier.salesThreshold,
          rewardAmount: tier.rewardAmount,
          isActive: true,
        },
        create: {
          tierLevel: tier.tierLevel,
          salesThreshold: tier.salesThreshold,
          rewardAmount: tier.rewardAmount,
          isActive: true,
        },
      });
    }
  });
}

/**
 * 检查并触发激活奖励
 * 在订单完成结算后调用
 */
export async function checkAndTriggerActivationReward(
  agentId: number,
  tx?: Prisma.TransactionClient
): Promise<boolean> {
  const client = tx || prisma;

  // 获取推销员信息
  const agent = await client.agent.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      type: true,
      parentId: true,
      isActivated: true,
      totalSales: true,
    },
  });

  if (!agent) return false;

  // 已激活则跳过
  if (agent.isActivated) return false;

  // 只有二级推销员才有激活奖励机制
  if (agent.type !== 'LEVEL2') return false;

  // 没有上级则跳过
  if (!agent.parentId) return false;

  // 获取激活门槛
  const threshold = await getRewardConfig(RewardConfigKeys.ACTIVATION_THRESHOLD);
  if (threshold <= 0) return false;

  // 检查是否达到门槛
  if (Number(agent.totalSales) < threshold) return false;

  // 获取激活奖励金额
  const rewardAmount = await getRewardConfig(RewardConfigKeys.ACTIVATION_REWARD);
  if (rewardAmount <= 0) return false;

  // 发放奖励给上级（一级推销员）
  await grantReward(
    agent.parentId,
    RewardType.ACTIVATION,
    rewardAmount,
    {
      relatedAgentId: agentId,
      remark: `下级推销员激活奖励（ID: ${agentId}）`,
    },
    client
  );

  // 标记为已激活
  await client.agent.update({
    where: { id: agentId },
    data: {
      isActivated: true,
      activatedAt: new Date(),
    },
  });

  // 更新上级的有效邀请人数
  await client.agent.update({
    where: { id: agent.parentId },
    data: {
      validInviteCount: { increment: 1 },
    },
  });

  return true;
}

/**
 * 检查并触发团队奖励（已废弃）
 * 【2026-01-17】团队奖励已改为月度统计，此函数保留用于兼容
 * 请使用 monthlyTeamRewardTask 中的 processMonthlyTeamReward 函数
 *
 * @deprecated 使用 processMonthlyTeamReward 替代
 */
export async function checkAndTriggerTeamReward(
  agentId: number,
  tx?: Prisma.TransactionClient
): Promise<boolean> {
  // 【2026-01-17】此函数已废弃，团队奖励改为月度统计
  // 保留函数签名以兼容现有调用，但不再执行任何操作
  console.log(`[DEPRECATED] checkAndTriggerTeamReward called for agent ${agentId}, use processMonthlyTeamReward instead`);
  return false;
}

/**
 * 【2026-01-17新增】获取上个月的月份标识
 */
export function getLastMonth(): string {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = lastMonth.getFullYear();
  const month = String(lastMonth.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * 【2026-01-17新增】获取当前月份标识
 */
export function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * 【2026-01-17新增】处理单个一级推销员的月度团队奖励
 * 供 monthlyTeamRewardTask 调用
 */
export async function processAgentMonthlyTeamReward(
  agentId: number,
  month: string,
  tx?: Prisma.TransactionClient
): Promise<{
  processed: boolean;
  rewardAmount: number;
  tierLevel: number;
  monthlySales: number;
}> {
  const client = tx || prisma;

  // 获取推销员信息
  const agent = await client.agent.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      type: true,
      monthlyTeamSales: true,
      lastRewardMonth: true,
      name: true,
    },
  });

  if (!agent) {
    return { processed: false, rewardAmount: 0, tierLevel: 0, monthlySales: 0 };
  }

  // 只有一级推销员才有团队奖励
  if (agent.type !== 'LEVEL1') {
    return { processed: false, rewardAmount: 0, tierLevel: 0, monthlySales: 0 };
  }

  // 检查是否已发放过该月奖励
  if (agent.lastRewardMonth === month) {
    return { processed: false, rewardAmount: 0, tierLevel: 0, monthlySales: Number(agent.monthlyTeamSales) };
  }

  const monthlySales = Number(agent.monthlyTeamSales);

  // 获取奖励阶梯
  const tiers = await getTeamRewardTiers();
  if (tiers.length === 0) {
    return { processed: false, rewardAmount: 0, tierLevel: 0, monthlySales };
  }

  // 找到当月应得的最高阶梯
  let tierLevel = 0;
  let rewardAmount = 0;
  for (const tier of tiers) {
    if (monthlySales >= tier.salesThreshold) {
      tierLevel = tier.tierLevel;
      rewardAmount = tier.rewardAmount;
    }
  }

  // 【2026-01-22 并发安全修复】先用原子操作更新标记，确保幂等性
  // 使用条件更新：只有当lastRewardMonth != month时才更新
  const updateResult = await client.$executeRaw`
    UPDATE agents
    SET lastRewardMonth = ${month},
        monthlyTeamSales = 0,
        currentRewardTier = ${tierLevel}
    WHERE id = ${agentId}
      AND (lastRewardMonth IS NULL OR lastRewardMonth != ${month})
  `;

  // 如果没有更新任何行，说明已经处理过
  if (updateResult === 0) {
    return { processed: false, rewardAmount: 0, tierLevel, monthlySales };
  }

  // 发放奖励（如果有）- 只有在标记更新成功后才发放
  if (rewardAmount > 0) {
    await grantReward(
      agentId,
      RewardType.TEAM,
      rewardAmount,
      {
        tierLevel,
        remark: `${month}月团队奖励（第${tierLevel}阶梯，月销售额: ¥${monthlySales}）`,
      },
      client
    );
  }

  return { processed: true, rewardAmount, tierLevel, monthlySales };
}

/**
 * 发放升级补偿
 * 在二级升级为一级后调用
 */
export async function grantUpgradeCompensation(
  oldParentId: number,
  upgradedAgentId: number,
  tx?: Prisma.TransactionClient
): Promise<boolean> {
  const client = tx || prisma;

  // 获取补偿金额
  const compensationAmount = await getRewardConfig(RewardConfigKeys.UPGRADE_COMPENSATION);
  if (compensationAmount <= 0) return false;

  // 发放补偿给原上级
  await grantReward(
    oldParentId,
    RewardType.UPGRADE_COMPENSATION,
    compensationAmount,
    {
      relatedAgentId: upgradedAgentId,
      remark: `下级推销员升级补偿（ID: ${upgradedAgentId}）`,
    },
    client
  );

  return true;
}

/**
 * 发放奖励（通用函数）
 */
async function grantReward(
  agentId: number,
  rewardType: RewardType,
  amount: number,
  options: {
    relatedAgentId?: number;
    tierLevel?: number;
    orderId?: number;
    remark?: string;
  },
  tx?: Prisma.TransactionClient
): Promise<void> {
  const client = tx || prisma;

  // 获取当前余额
  const agent = await client.agent.findUnique({
    where: { id: agentId },
    select: { balance: true },
  });

  const beforeBalance = Number(agent?.balance || 0);
  const afterBalance = beforeBalance + amount;

  // 增加余额
  await client.agent.update({
    where: { id: agentId },
    data: {
      balance: { increment: amount },
    },
  });

  // 创建奖励记录
  await client.rewardRecord.create({
    data: {
      agentId,
      rewardType,
      amount,
      relatedAgentId: options.relatedAgentId,
      tierLevel: options.tierLevel,
      orderId: options.orderId,
      remark: options.remark,
      status: 1,  // 已发放
    },
  });

  // 创建资金流水
  const typeMap = {
    [RewardType.ACTIVATION]: 'ACTIVATION_REWARD',
    [RewardType.TEAM]: 'TEAM_REWARD',
    [RewardType.UPGRADE_COMPENSATION]: 'UPGRADE_COMPENSATION',
  };

  await client.fundFlow.create({
    data: {
      agentId,
      type: typeMap[rewardType],
      amount,
      beforeBalance,
      afterBalance,
      relatedType: 'REWARD',
      remark: options.remark || `奖励发放（类型: ${rewardType}）`,
    },
  });
}

/**
 * 更新推销员销售统计
 * 在订单完成后调用
 * 【2026-01-17】添加自动晋升检查
 */
export async function updateAgentSalesStats(
  orderId: number,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const client = tx || prisma;

  // 获取订单信息
  const order = await client.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      totalAmount: true,
      orderSource: true,
      sourceAgentId: true,
      level1AgentId: true,
      level2AgentId: true,
    },
  });

  if (!order) return;

  const totalAmount = Number(order.totalAmount);

  // 更新来源推销员的个人销售统计
  if (order.sourceAgentId) {
    await client.agent.update({
      where: { id: order.sourceAgentId },
      data: {
        totalSales: { increment: totalAmount },
        totalOrderCount: { increment: 1 },
      },
    });

    // 如果是二级推销员
    if (order.orderSource === 2) {
      // 检查激活奖励
      await checkAndTriggerActivationReward(order.sourceAgentId, client);

      // 【2026-01-17】检查自动晋升
      const upgradeService = await import('./upgradeService');
      await upgradeService.processAutoUpgrade(order.sourceAgentId, client);
    }
  }

  // 如果有一级推销员（二级订单），更新其团队销售统计
  if (order.level1AgentId && order.orderSource === 2) {
    await client.agent.update({
      where: { id: order.level1AgentId },
      data: {
        teamSales: { increment: totalAmount },        // 累计团队销售额（保留）
        monthlyTeamSales: { increment: totalAmount }, // 当月团队销售额（2026-01-17新增）
      },
    });

    // 【2026-01-17】团队奖励改为月度统计，不再即时触发
    // 由定时任务 monthlyTeamRewardTask 每月1日统计并发放
    // await checkAndTriggerTeamReward(order.level1AgentId, client);
  }
}

/**
 * 获取推销员奖励记录
 */
export async function getAgentRewardRecords(
  agentId: number,
  options: {
    page?: number;
    pageSize?: number;
    rewardType?: RewardType;
  } = {}
): Promise<{
  records: Array<{
    id: number;
    rewardType: number;
    amount: number;
    relatedAgentId: number | null;
    tierLevel: number | null;
    remark: string | null;
    createdAt: Date;
  }>;
  total: number;
  totalAmount: number;
}> {
  const { page = 1, pageSize = 20, rewardType } = options;
  const skip = (page - 1) * pageSize;

  const where: Prisma.RewardRecordWhereInput = {
    agentId,
    status: 1,
  };

  if (rewardType !== undefined) {
    where.rewardType = rewardType;
  }

  const [records, total, sum] = await Promise.all([
    prisma.rewardRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.rewardRecord.count({ where }),
    prisma.rewardRecord.aggregate({
      where,
      _sum: { amount: true },
    }),
  ]);

  return {
    records: records.map(r => ({
      id: r.id,
      rewardType: r.rewardType,
      amount: Number(r.amount),
      relatedAgentId: r.relatedAgentId,
      tierLevel: r.tierLevel,
      remark: r.remark,
      createdAt: r.createdAt,
    })),
    total,
    totalAmount: Number(sum._sum.amount || 0),
  };
}

/**
 * 获取推销员奖励统计
 */
export async function getAgentRewardStats(agentId: number): Promise<{
  activationReward: number;
  teamReward: number;
  upgradeCompensation: number;
  totalReward: number;
}> {
  const stats = await prisma.rewardRecord.groupBy({
    by: ['rewardType'],
    where: {
      agentId,
      status: 1,
    },
    _sum: {
      amount: true,
    },
  });

  const result = {
    activationReward: 0,
    teamReward: 0,
    upgradeCompensation: 0,
    totalReward: 0,
  };

  for (const stat of stats) {
    const amount = Number(stat._sum.amount || 0);
    result.totalReward += amount;

    switch (stat.rewardType) {
      case RewardType.ACTIVATION:
        result.activationReward = amount;
        break;
      case RewardType.TEAM:
        result.teamReward = amount;
        break;
      case RewardType.UPGRADE_COMPENSATION:
        result.upgradeCompensation = amount;
        break;
    }
  }

  return result;
}

export default {
  RewardType,
  RewardConfigKeys,
  getRewardConfig,
  setRewardConfig,
  getAllRewardConfigs,
  getTeamRewardTiers,
  setTeamRewardTiers,
  checkAndTriggerActivationReward,
  checkAndTriggerTeamReward,  // 已废弃，保留兼容
  grantUpgradeCompensation,
  updateAgentSalesStats,
  getAgentRewardRecords,
  getAgentRewardStats,
  // 【2026-01-17新增】月度团队奖励相关
  getLastMonth,
  getCurrentMonth,
  processAgentMonthlyTeamReward,
  grantReward,  // 导出以供定时任务使用
};

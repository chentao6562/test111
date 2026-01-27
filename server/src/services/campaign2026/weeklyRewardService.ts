/**
 * 周期奖励服务
 * 【2026-01-20】
 * 【2026-01-21 添加奖励开关控制】
 *
 * 功能：
 * 1. 周销售统计更新
 * 2. 周拉新统计更新
 * 3. 周发圈统计（由shareAuditService处理）
 * 4. 周奖励检查和发放
 * 5. 推销员周进度查询
 */

import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';
import { issueCoupon, CouponSourceType, getCouponConfig } from './couponService';
import { countWeeklyShareDays } from './shareAuditService';

/**
 * 【2026-01-23】检查代金券系统总开关是否启用
 * 总开关关闭时，所有代金券奖励都不发放
 */
async function isCouponSystemEnabled(): Promise<boolean> {
  const config = await prisma.rewardConfig.findUnique({ where: { configKey: 'coupon_system_enabled' } });
  return config?.configValue === 'true';
}

/**
 * 【2026-01-21】检查奖励开关是否启用
 * 【2026-01-23】增加总开关检查
 * 默认所有开关都是关闭的
 */
async function isRewardEnabled(key: string): Promise<boolean> {
  // 先检查总开关
  const systemEnabled = await isCouponSystemEnabled();
  if (!systemEnabled) {
    return false;
  }
  // 再检查具体奖励开关
  const config = await prisma.rewardConfig.findUnique({ where: { configKey: key } });
  return config?.configValue === 'true';
}

// 周奖励类型
export const WeeklyRewardType = {
  SALES_3: 'WEEK_SALES_3',        // 周销售3单
  SALES_5: 'WEEK_SALES_5',        // 周销售5单
  SALES_10: 'WEEK_SALES_10',      // 周销售10单
  SHARE_FULL: 'WEEK_SHARE_FULL',  // 周发圈全勤
  RECRUIT_3: 'WEEK_RECRUIT_3',    // 周拉新3人
};

// 周销售奖励阶梯（取最高档，不叠加）
export const SalesRewardTiers = [
  { orders: 10, configKey: 'coupon_week_sales_10', type: WeeklyRewardType.SALES_10, desc: '周销售10单奖励' },
  { orders: 5, configKey: 'coupon_week_sales_5', type: WeeklyRewardType.SALES_5, desc: '周销售5单奖励' },
  { orders: 3, configKey: 'coupon_week_sales_3', type: WeeklyRewardType.SALES_3, desc: '周销售3单奖励' },
];

/**
 * 获取当前周的周一日期（北京时间）
 */
export function getWeekStart(date: Date = new Date()): Date {
  // 获取北京时间的当前日期
  const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const year = beijingTime.getUTCFullYear();
  const month = beijingTime.getUTCMonth();
  const day = beijingTime.getUTCDate();
  const weekDay = beijingTime.getUTCDay();

  // 计算本周一的日期
  const diff = weekDay === 0 ? -6 : 1 - weekDay; // 周日往前推6天
  const mondayDate = day + diff;

  // 返回UTC时间的周一00:00:00（与数据库存储格式一致）
  return new Date(Date.UTC(year, month, mondayDate, 0, 0, 0, 0));
}

/**
 * 获取上周的周一日期
 */
export function getLastWeekStart(): Date {
  const weekStart = getWeekStart();
  weekStart.setDate(weekStart.getDate() - 7);
  return weekStart;
}

/**
 * 获取或创建周统计记录
 * 【2026-01-22 并发安全修复】使用upsert替代find-then-create，避免竞态条件
 */
export async function getOrCreateWeeklyStats(
  agentId: number,
  weekStart?: Date,
  tx?: Prisma.TransactionClient
): Promise<{
  id: number;
  agentId: number;
  weekStart: Date;
  completedOrders: number;
  completedAmount: number;
  approvedShares: number;
  newRecruits: number;
  salesBonusPaid: boolean;
  shareBonusPaid: boolean;
  recruitBonusPaid: boolean;
}> {
  const client = tx || prisma;
  const start = weekStart || getWeekStart();

  // 【2026-01-22 修复】使用upsert确保并发安全，添加异常处理
  let stats;
  try {
    stats = await client.weeklyStats.upsert({
      where: {
        agentId_weekStart: { agentId, weekStart: start },
      },
      update: {}, // 已存在则不更新
      create: {
        agentId,
        weekStart: start,
      },
    });
  } catch (err: any) {
    // 并发情况下可能触发唯一约束冲突，此时记录应该已存在，直接查询
    console.log('[WeeklyStats] upsert失败，检查错误类型:', err.code, err.message?.substring(0, 100));

    // Prisma错误code可能在err.code或通过错误消息检测
    const isUniqueConstraintError = err.code === 'P2002' ||
      (err.message && err.message.includes('Unique constraint failed'));

    if (isUniqueConstraintError) {
      console.log('[WeeklyStats] 检测到唯一约束冲突，尝试查询已存在记录');
      const existing = await client.weeklyStats.findUnique({
        where: {
          agentId_weekStart: { agentId, weekStart: start },
        },
      });
      if (existing) {
        console.log('[WeeklyStats] 找到已存在记录:', existing.id);
        stats = existing;
      } else {
        console.log('[WeeklyStats] 未找到记录，抛出原错误');
        throw err;
      }
    } else {
      throw err;
    }
  }

  return {
    id: stats.id,
    agentId: stats.agentId,
    weekStart: stats.weekStart,
    completedOrders: stats.completedOrders,
    completedAmount: Number(stats.completedAmount),
    approvedShares: stats.approvedShares,
    newRecruits: stats.newRecruits,
    salesBonusPaid: stats.salesBonusPaid,
    shareBonusPaid: stats.shareBonusPaid,
    recruitBonusPaid: stats.recruitBonusPaid,
  };
}

/**
 * 更新周销售统计
 * 在预约核销完成时调用
 *
 * 【重要】此函数设计为"尽力而为"模式：
 * - 失败时只记录日志，不抛出错误
 * - 不会影响主事务（核销）的成功
 */
export async function updateWeeklySalesStats(
  agentId: number,
  orderAmount: number,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const weekStart = getWeekStart();

  try {
    // 使用原始SQL进行upsert，避免Prisma的并发问题
    // MySQL的INSERT ... ON DUPLICATE KEY UPDATE是原子操作
    // 【2026-01-22 修复】字段名使用驼峰命名（与数据库一致）
    if (tx) {
      // 在事务中，使用executeRaw
      await tx.$executeRaw`
        INSERT INTO weekly_stats (agentId, weekStart, completedOrders, completedAmount, approvedShares, newRecruits, salesBonusPaid, shareBonusPaid, recruitBonusPaid)
        VALUES (${agentId}, ${weekStart}, 1, ${orderAmount}, 0, 0, false, false, false)
        ON DUPLICATE KEY UPDATE
          completedOrders = completedOrders + 1,
          completedAmount = completedAmount + ${orderAmount}
      `;
    } else {
      // 不在事务中，直接使用prisma
      await prisma.$executeRaw`
        INSERT INTO weekly_stats (agentId, weekStart, completedOrders, completedAmount, approvedShares, newRecruits, salesBonusPaid, shareBonusPaid, recruitBonusPaid)
        VALUES (${agentId}, ${weekStart}, 1, ${orderAmount}, 0, 0, false, false, false)
        ON DUPLICATE KEY UPDATE
          completedOrders = completedOrders + 1,
          completedAmount = completedAmount + ${orderAmount}
      `;
    }
    console.log(`[周统计] 销售更新成功: 推销员${agentId}, +1单, +${orderAmount}元`);
  } catch (error: any) {
    // 周统计失败不应该影响核销主流程，只记录日志
    console.error(`[周统计] 销售更新失败(不影响核销): 推销员${agentId}, 错误:`, error.message);
  }
}

/**
 * 更新周拉新统计
 * 在下级推销员注册成功时调用
 *
 * 【重要】此函数设计为"尽力而为"模式：
 * - 失败时只记录日志，不抛出错误
 * - 不会影响主事务的成功
 */
export async function updateWeeklyRecruitStats(
  parentAgentId: number,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const weekStart = getWeekStart();

  try {
    // 使用原始SQL进行upsert，避免Prisma的并发问题
    // 【2026-01-22 修复】字段名使用驼峰命名（与数据库一致）
    if (tx) {
      await tx.$executeRaw`
        INSERT INTO weekly_stats (agentId, weekStart, completedOrders, completedAmount, approvedShares, newRecruits, salesBonusPaid, shareBonusPaid, recruitBonusPaid)
        VALUES (${parentAgentId}, ${weekStart}, 0, 0, 0, 1, false, false, false)
        ON DUPLICATE KEY UPDATE
          newRecruits = newRecruits + 1
      `;
    } else {
      await prisma.$executeRaw`
        INSERT INTO weekly_stats (agentId, weekStart, completedOrders, completedAmount, approvedShares, newRecruits, salesBonusPaid, shareBonusPaid, recruitBonusPaid)
        VALUES (${parentAgentId}, ${weekStart}, 0, 0, 0, 1, false, false, false)
        ON DUPLICATE KEY UPDATE
          newRecruits = newRecruits + 1
      `;
    }
    console.log(`[周统计] 拉新更新成功: 推销员${parentAgentId}, +1人`);
  } catch (error: any) {
    // 周统计失败不应该影响主流程，只记录日志
    console.error(`[周统计] 拉新更新失败(不影响主流程): 推销员${parentAgentId}, 错误:`, error.message);
  }
}

/**
 * 检查并发放周销售奖励
 * 取最高达成的档位，不叠加
 */
async function processWeeklySalesReward(
  stats: { agentId: number; completedOrders: number; salesBonusPaid: boolean },
  tx: Prisma.TransactionClient
): Promise<{ issued: boolean; type?: string; amount?: number }> {
  // 【2026-01-21】检查开关
  const enabled = await isRewardEnabled('coupon_week_sales_enabled');
  if (!enabled) {
    console.log(`[周奖励] 周销售奖励未启用，跳过: 推销员${stats.agentId}`);
    return { issued: false };
  }

  if (stats.salesBonusPaid) {
    return { issued: false };
  }

  // 找到最高达成的档位
  for (const tier of SalesRewardTiers) {
    if (stats.completedOrders >= tier.orders) {
      const amount = await getCouponConfig(tier.configKey);
      if (amount > 0) {
        await issueCoupon({
          agentId: stats.agentId,
          amount,
          sourceType: tier.type,
          sourceDesc: tier.desc,
        }, tx);

        console.log(`[周奖励] 销售奖励发放: 推销员${stats.agentId}, ${tier.desc}, ${amount}元`);
        return { issued: true, type: tier.type, amount };
      }
    }
  }

  return { issued: false };
}

/**
 * 检查并发放周发圈全勤奖励
 */
async function processWeeklyShareReward(
  stats: { agentId: number; shareBonusPaid: boolean },
  weekStart: Date,
  tx: Prisma.TransactionClient
): Promise<{ issued: boolean; amount?: number }> {
  // 【2026-01-21】检查开关
  const enabled = await isRewardEnabled('coupon_week_share_enabled');
  if (!enabled) {
    console.log(`[周奖励] 周发圈奖励未启用，跳过: 推销员${stats.agentId}`);
    return { issued: false };
  }

  if (stats.shareBonusPaid) {
    return { issued: false };
  }

  // 统计本周发圈天数
  const shareDays = await countWeeklyShareDays(stats.agentId, weekStart);

  if (shareDays >= 7) {
    const amount = await getCouponConfig('coupon_week_share_full');
    if (amount > 0) {
      await issueCoupon({
        agentId: stats.agentId,
        amount,
        sourceType: WeeklyRewardType.SHARE_FULL,
        sourceDesc: '周发圈全勤奖励',
      }, tx);

      console.log(`[周奖励] 发圈全勤奖励发放: 推销员${stats.agentId}, ${amount}元`);
      return { issued: true, amount };
    }
  }

  return { issued: false };
}

/**
 * 检查并发放周拉新奖励
 */
async function processWeeklyRecruitReward(
  stats: { agentId: number; newRecruits: number; recruitBonusPaid: boolean },
  tx: Prisma.TransactionClient
): Promise<{ issued: boolean; amount?: number }> {
  // 【2026-01-21】检查开关
  const enabled = await isRewardEnabled('coupon_week_recruit_enabled');
  if (!enabled) {
    console.log(`[周奖励] 周拉新奖励未启用，跳过: 推销员${stats.agentId}`);
    return { issued: false };
  }

  if (stats.recruitBonusPaid) {
    return { issued: false };
  }

  if (stats.newRecruits >= 3) {
    const amount = await getCouponConfig('coupon_week_recruit_3');
    if (amount > 0) {
      await issueCoupon({
        agentId: stats.agentId,
        amount,
        sourceType: WeeklyRewardType.RECRUIT_3,
        sourceDesc: '周拉新3人奖励',
      }, tx);

      console.log(`[周奖励] 拉新奖励发放: 推销员${stats.agentId}, ${amount}元`);
      return { issued: true, amount };
    }
  }

  return { issued: false };
}

/**
 * 处理单个推销员的周奖励
 */
export async function processAgentWeeklyRewards(
  agentId: number,
  weekStart: Date
): Promise<{
  salesReward: { issued: boolean; type?: string; amount?: number };
  shareReward: { issued: boolean; amount?: number };
  recruitReward: { issued: boolean; amount?: number };
}> {
  return await prisma.$transaction(async (tx) => {
    // 获取周统计
    const stats = await tx.weeklyStats.findUnique({
      where: {
        agentId_weekStart: { agentId, weekStart },
      },
    });

    if (!stats) {
      return {
        salesReward: { issued: false },
        shareReward: { issued: false },
        recruitReward: { issued: false },
      };
    }

    // 处理各类奖励
    const salesReward = await processWeeklySalesReward({
      agentId,
      completedOrders: stats.completedOrders,
      salesBonusPaid: stats.salesBonusPaid,
    }, tx);

    const shareReward = await processWeeklyShareReward({
      agentId,
      shareBonusPaid: stats.shareBonusPaid,
    }, weekStart, tx);

    const recruitReward = await processWeeklyRecruitReward({
      agentId,
      newRecruits: stats.newRecruits,
      recruitBonusPaid: stats.recruitBonusPaid,
    }, tx);

    // 更新奖励发放标记
    await tx.weeklyStats.update({
      where: { id: stats.id },
      data: {
        salesBonusPaid: salesReward.issued || stats.salesBonusPaid,
        shareBonusPaid: shareReward.issued || stats.shareBonusPaid,
        recruitBonusPaid: recruitReward.issued || stats.recruitBonusPaid,
      },
    });

    return { salesReward, shareReward, recruitReward };
  });
}

/**
 * 获取推销员本周进度
 */
export async function getAgentWeeklyProgress(agentId: number): Promise<{
  weekStart: Date;
  weekEnd: Date;
  stats: {
    completedOrders: number;
    completedAmount: number;
    approvedShares: number;
    shareDays: number;
    newRecruits: number;
  };
  rewards: {
    sales3: { target: number; achieved: boolean; bonusPaid: boolean; amount: number };
    sales5: { target: number; achieved: boolean; bonusPaid: boolean; amount: number };
    sales10: { target: number; achieved: boolean; bonusPaid: boolean; amount: number };
    shareFull: { target: number; achieved: boolean; bonusPaid: boolean; amount: number };
    recruit3: { target: number; achieved: boolean; bonusPaid: boolean; amount: number };
  };
}> {
  const weekStart = getWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  // 获取周统计
  const statsRecord = await getOrCreateWeeklyStats(agentId, weekStart);

  // 统计发圈天数
  const shareDays = await countWeeklyShareDays(agentId, weekStart);

  // 获取奖励配置
  const [amount3, amount5, amount10, amountShare, amountRecruit] = await Promise.all([
    getCouponConfig('coupon_week_sales_3'),
    getCouponConfig('coupon_week_sales_5'),
    getCouponConfig('coupon_week_sales_10'),
    getCouponConfig('coupon_week_share_full'),
    getCouponConfig('coupon_week_recruit_3'),
  ]);

  return {
    weekStart,
    weekEnd,
    stats: {
      completedOrders: statsRecord.completedOrders,
      completedAmount: statsRecord.completedAmount,
      approvedShares: statsRecord.approvedShares,
      shareDays,
      newRecruits: statsRecord.newRecruits,
    },
    rewards: {
      sales3: {
        target: 3,
        achieved: statsRecord.completedOrders >= 3,
        bonusPaid: statsRecord.salesBonusPaid,
        amount: amount3,
      },
      sales5: {
        target: 5,
        achieved: statsRecord.completedOrders >= 5,
        bonusPaid: statsRecord.salesBonusPaid,
        amount: amount5,
      },
      sales10: {
        target: 10,
        achieved: statsRecord.completedOrders >= 10,
        bonusPaid: statsRecord.salesBonusPaid,
        amount: amount10,
      },
      shareFull: {
        target: 7,
        achieved: shareDays >= 7,
        bonusPaid: statsRecord.shareBonusPaid,
        amount: amountShare,
      },
      recruit3: {
        target: 3,
        achieved: statsRecord.newRecruits >= 3,
        bonusPaid: statsRecord.recruitBonusPaid,
        amount: amountRecruit,
      },
    },
  };
}

/**
 * 获取周奖励统计（管理后台）
 */
export async function getWeeklyRewardStats(weekStart?: Date): Promise<{
  weekStart: Date;
  totalAgents: number;
  salesRewardedCount: number;
  shareRewardedCount: number;
  recruitRewardedCount: number;
  totalRewardAmount: number;
}> {
  const start = weekStart || getLastWeekStart();

  const stats = await prisma.weeklyStats.aggregate({
    where: { weekStart: start },
    _count: { id: true },
    _sum: { completedOrders: true, completedAmount: true },
  });

  const [salesRewarded, shareRewarded, recruitRewarded] = await Promise.all([
    prisma.weeklyStats.count({ where: { weekStart: start, salesBonusPaid: true } }),
    prisma.weeklyStats.count({ where: { weekStart: start, shareBonusPaid: true } }),
    prisma.weeklyStats.count({ where: { weekStart: start, recruitBonusPaid: true } }),
  ]);

  // 计算发放的奖励总额（简化计算，实际应从代金券表统计）
  const [amount3, amount5, amount10, amountShare, amountRecruit] = await Promise.all([
    getCouponConfig('coupon_week_sales_3'),
    getCouponConfig('coupon_week_sales_5'),
    getCouponConfig('coupon_week_sales_10'),
    getCouponConfig('coupon_week_share_full'),
    getCouponConfig('coupon_week_recruit_3'),
  ]);

  // 简化：假设销售奖励都是最高档
  const totalRewardAmount =
    salesRewarded * amount10 +
    shareRewarded * amountShare +
    recruitRewarded * amountRecruit;

  return {
    weekStart: start,
    totalAgents: stats._count.id,
    salesRewardedCount: salesRewarded,
    shareRewardedCount: shareRewarded,
    recruitRewardedCount: recruitRewarded,
    totalRewardAmount,
  };
}

/**
 * 获取推销员周统计列表（管理后台）
 */
export async function getAgentWeeklyStatsList(options: {
  weekStart?: Date;
  page?: number;
  pageSize?: number;
}): Promise<{
  list: Array<{
    agentId: number;
    agentName: string;
    agentPhone: string;
    completedOrders: number;
    completedAmount: number;
    approvedShares: number;
    newRecruits: number;
    salesBonusPaid: boolean;
    shareBonusPaid: boolean;
    recruitBonusPaid: boolean;
  }>;
  total: number;
}> {
  const { weekStart, page = 1, pageSize = 20 } = options;
  const start = weekStart || getLastWeekStart();
  const skip = (page - 1) * pageSize;

  const [statsList, total] = await Promise.all([
    prisma.weeklyStats.findMany({
      where: { weekStart: start },
      include: {
        agent: {
          select: { name: true, phone: true },
        },
      },
      orderBy: { completedOrders: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.weeklyStats.count({ where: { weekStart: start } }),
  ]);

  return {
    list: statsList.map(s => ({
      agentId: s.agentId,
      agentName: s.agent.name,
      agentPhone: s.agent.phone,
      completedOrders: s.completedOrders,
      completedAmount: Number(s.completedAmount),
      approvedShares: s.approvedShares,
      newRecruits: s.newRecruits,
      salesBonusPaid: s.salesBonusPaid,
      shareBonusPaid: s.shareBonusPaid,
      recruitBonusPaid: s.recruitBonusPaid,
    })),
    total,
  };
}

export default {
  WeeklyRewardType,
  SalesRewardTiers,
  getWeekStart,
  getLastWeekStart,
  getOrCreateWeeklyStats,
  updateWeeklySalesStats,
  updateWeeklyRecruitStats,
  processAgentWeeklyRewards,
  getAgentWeeklyProgress,
  getWeeklyRewardStats,
  getAgentWeeklyStatsList,
};

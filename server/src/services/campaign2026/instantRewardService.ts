/**
 * 即时奖励服务
 * 【2026-01-18 春节营销活动】
 * 【2026-01-21 添加奖励开关控制】
 *
 * 功能：处理各种即时触发的代金券奖励
 * 1. 注册奖励 - 新推销员注册
 * 2. 首发圈奖励 - 首次发圈审核通过
 * 3. 首预约奖励 - 首次有客户预约
 * 4. 首单成交奖励 - 首次有订单完成
 * 5. 拉新奖励 - 邀请新推销员注册
 * 6. 激活再奖 - 下级推销员激活
 */

import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';
import { issueCoupon, getCouponConfig, CouponSourceType } from './couponService';

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

// 默认奖励金额配置
const DEFAULT_REWARDS = {
  REGISTER: 5,           // 注册奖励
  FIRST_SHARE: 5,        // 首发圈奖励
  FIRST_RESERVATION: 10, // 首预约奖励
  FIRST_COMPLETE: 20,    // 首单成交奖励
  RECRUIT: 15,           // 拉新奖励
  RECRUIT_ACTIVATE: 5,   // 激活再奖
};

/**
 * 获取奖励金额配置
 */
async function getRewardAmount(type: string): Promise<number> {
  const configKey = `coupon_${type.toLowerCase()}_bonus`;
  const amount = await getCouponConfig(configKey);
  return amount || DEFAULT_REWARDS[type as keyof typeof DEFAULT_REWARDS] || 0;
}

/**
 * 获取或创建推销员活动追踪记录
 */
async function getOrCreateAgentActivity(
  agentId: number,
  tx?: Prisma.TransactionClient
): Promise<{
  id: number;
  registerBonusPaid: boolean;
  firstShareBonusPaid: boolean;
  firstReservationBonusPaid: boolean;
  firstCompleteBonusPaid: boolean;
}> {
  const client = tx || prisma;

  // 【2026-01-22 并发安全修复】使用 upsert 确保原子性，防止高并发下重复创建
  const activity = await client.agentActivity.upsert({
    where: { agentId },
    update: {},  // 已存在则不更新
    create: { agentId },
  });

  return activity;
}

/**
 * 发放注册奖励
 * 触发时机：新推销员注册成功后
 */
export async function issueRegisterBonus(
  agentId: number,
  tx?: Prisma.TransactionClient
): Promise<{ issued: boolean; amount?: number; couponCode?: string }> {
  // 【2026-01-21】检查开关
  const enabled = await isRewardEnabled('coupon_register_enabled');
  if (!enabled) {
    console.log(`[即时奖励] 注册奖励未启用，跳过: 推销员${agentId}`);
    return { issued: false };
  }

  const client = tx || prisma;

  // 【2026-01-22 并发安全修复】确保 AgentActivity 记录存在
  await getOrCreateAgentActivity(agentId, client);

  // 【2026-01-22 并发安全修复】使用原子更新防止重复发放
  const updateResult = await client.$executeRaw`
    UPDATE agent_activities
    SET registerBonusPaid = true
    WHERE agentId = ${agentId} AND registerBonusPaid = false
  `;

  // 如果没有更新任何行，说明已经发放过
  if (updateResult === 0) {
    console.log(`[即时奖励] 注册奖励已发放，跳过: 推销员${agentId}`);
    return { issued: false };
  }

  // 获取奖励金额
  const amount = await getRewardAmount('REGISTER');
  if (amount <= 0) {
    console.log(`[即时奖励] 注册奖励金额为0，跳过: 推销员${agentId}`);
    // 回滚标记
    await client.$executeRaw`
      UPDATE agent_activities
      SET registerBonusPaid = false
      WHERE agentId = ${agentId}
    `;
    return { issued: false };
  }

  // 发放代金券（注册奖励成本由总代理承担）
  const coupon = await issueCoupon({
    agentId,
    amount,
    sourceType: CouponSourceType.REGISTER,
    costBearerId: null, // 总代理承担
  }, client);

  console.log(`[即时奖励] 注册奖励发放成功: 推销员${agentId}, ${amount}元`);
  return { issued: true, amount, couponCode: coupon.code };
}

/**
 * 发放首发圈奖励
 * 触发时机：推销员首次发圈审核通过
 */
export async function issueFirstShareBonus(
  agentId: number,
  tx?: Prisma.TransactionClient
): Promise<{ issued: boolean; amount?: number; couponCode?: string }> {
  // 【2026-01-21】检查开关
  const enabled = await isRewardEnabled('coupon_first_share_enabled');
  if (!enabled) {
    console.log(`[即时奖励] 首发圈奖励未启用，跳过: 推销员${agentId}`);
    return { issued: false };
  }

  const client = tx || prisma;

  // 【2026-01-22 并发安全修复】确保 AgentActivity 记录存在
  await getOrCreateAgentActivity(agentId, client);

  // 【2026-01-22 并发安全修复】使用原子更新防止重复发放
  const updateResult = await client.$executeRaw`
    UPDATE agent_activities
    SET firstShareBonusPaid = true
    WHERE agentId = ${agentId} AND firstShareBonusPaid = false
  `;

  // 如果没有更新任何行，说明已经发放过
  if (updateResult === 0) {
    console.log(`[即时奖励] 首发圈奖励已发放，跳过: 推销员${agentId}`);
    return { issued: false };
  }

  // 获取奖励金额
  const amount = await getRewardAmount('FIRST_SHARE');
  if (amount <= 0) {
    // 回滚标记
    await client.$executeRaw`
      UPDATE agent_activities
      SET firstShareBonusPaid = false
      WHERE agentId = ${agentId}
    `;
    return { issued: false };
  }

  // 发放代金券（首发圈奖励成本由总代理承担）
  const coupon = await issueCoupon({
    agentId,
    amount,
    sourceType: CouponSourceType.FIRST_SHARE,
    costBearerId: null,
  }, client);

  console.log(`[即时奖励] 首发圈奖励发放成功: 推销员${agentId}, ${amount}元`);
  return { issued: true, amount, couponCode: coupon.code };
}

/**
 * 发放首预约奖励
 * 触发时机：推销员首次有客户创建预约
 */
export async function issueFirstReservationBonus(
  agentId: number,
  tx?: Prisma.TransactionClient
): Promise<{ issued: boolean; amount?: number; couponCode?: string }> {
  // 【2026-01-21】检查开关
  const enabled = await isRewardEnabled('coupon_first_reservation_enabled');
  if (!enabled) {
    console.log(`[即时奖励] 首预约奖励未启用，跳过: 推销员${agentId}`);
    return { issued: false };
  }

  const client = tx || prisma;

  // 【2026-01-22 并发安全修复】确保 AgentActivity 记录存在
  await getOrCreateAgentActivity(agentId, client);

  // 【2026-01-22 并发安全修复】使用原子更新防止重复发放
  // 只有当 firstReservationBonusPaid=false 时才更新为 true，返回更新行数
  // 如果已经是 true，则 updateCount=0，跳过发放
  const updateResult = await client.$executeRaw`
    UPDATE agent_activities
    SET firstReservationBonusPaid = true
    WHERE agentId = ${agentId} AND firstReservationBonusPaid = false
  `;

  // 如果没有更新任何行，说明已经发放过
  if (updateResult === 0) {
    console.log(`[即时奖励] 首预约奖励已发放，跳过: 推销员${agentId}`);
    return { issued: false };
  }

  // 获取推销员信息确定成本承担人
  const agent = await client.agent.findUnique({
    where: { id: agentId },
    select: { type: true, parentId: true },
  });

  if (!agent) {
    throw new Error('推销员不存在');
  }

  // 获取奖励金额
  const amount = await getRewardAmount('FIRST_RESERVATION');
  if (amount <= 0) {
    // 金额为0，回滚标记
    await client.$executeRaw`
      UPDATE agent_activities
      SET firstReservationBonusPaid = false
      WHERE agentId = ${agentId}
    `;
    return { issued: false };
  }

  // 成本承担人：二级由上级承担，一级由总代理承担
  const costBearerId = agent.type === 'LEVEL2' && agent.parentId ? agent.parentId : null;

  // 发放代金券
  const coupon = await issueCoupon({
    agentId,
    amount,
    sourceType: CouponSourceType.FIRST_RESERVATION,
    costBearerId,
  }, client);

  console.log(`[即时奖励] 首预约奖励发放成功: 推销员${agentId}, ${amount}元, 成本承担人${costBearerId || '总代理'}`);
  return { issued: true, amount, couponCode: coupon.code };
}

/**
 * 发放首单成交奖励
 * 触发时机：推销员首次有订单核销完成
 */
export async function issueFirstCompleteBonus(
  agentId: number,
  tx?: Prisma.TransactionClient
): Promise<{ issued: boolean; amount?: number; couponCode?: string }> {
  // 【2026-01-21】检查开关
  const enabled = await isRewardEnabled('coupon_first_complete_enabled');
  if (!enabled) {
    console.log(`[即时奖励] 首单成交奖励未启用，跳过: 推销员${agentId}`);
    return { issued: false };
  }

  const client = tx || prisma;

  // 【2026-01-22 并发安全修复】使用原子更新防止重复发放
  // 只有当 firstCompleteBonusPaid=false 时才更新为 true，返回更新行数
  // 如果已经是 true，则 updateCount=0，跳过发放
  const updateResult = await client.$executeRaw`
    UPDATE agent_activities
    SET firstCompleteBonusPaid = true
    WHERE agentId = ${agentId} AND firstCompleteBonusPaid = false
  `;

  // 如果没有更新任何行，说明已经发放过
  if (updateResult === 0) {
    console.log(`[即时奖励] 首单成交奖励已发放或不存在活动记录，跳过: 推销员${agentId}`);
    return { issued: false };
  }

  // 获取推销员信息确定成本承担人
  const agent = await client.agent.findUnique({
    where: { id: agentId },
    select: { type: true, parentId: true },
  });

  if (!agent) {
    throw new Error('推销员不存在');
  }

  // 获取奖励金额
  const amount = await getRewardAmount('FIRST_COMPLETE');
  if (amount <= 0) {
    // 金额为0，回滚标记
    await client.$executeRaw`
      UPDATE agent_activities
      SET firstCompleteBonusPaid = false
      WHERE agentId = ${agentId}
    `;
    return { issued: false };
  }

  // 成本承担人：二级由上级承担，一级由总代理承担
  const costBearerId = agent.type === 'LEVEL2' && agent.parentId ? agent.parentId : null;

  // 发放代金券
  const coupon = await issueCoupon({
    agentId,
    amount,
    sourceType: CouponSourceType.FIRST_COMPLETE,
    costBearerId,
  }, client);

  console.log(`[即时奖励] 首单成交奖励发放成功: 推销员${agentId}, ${amount}元, 成本承担人${costBearerId || '总代理'}`);
  return { issued: true, amount, couponCode: coupon.code };
}

/**
 * 发放拉新奖励
 * 触发时机：邀请的新推销员注册成功
 *
 * @param inviterId 邀请人ID（获得奖励的人）
 * @param newAgentId 新注册推销员ID
 */
export async function issueRecruitBonus(
  inviterId: number,
  newAgentId: number,
  tx?: Prisma.TransactionClient
): Promise<{ issued: boolean; amount?: number; couponCode?: string }> {
  // 【2026-01-21】检查开关
  const enabled = await isRewardEnabled('coupon_recruit_enabled');
  if (!enabled) {
    console.log(`[即时奖励] 拉新奖励未启用，跳过: 邀请人${inviterId}`);
    return { issued: false };
  }

  const client = tx || prisma;

  // 【2026-01-23 P1-02修复】使用唯一标识符防止重复发放
  // 构造一个唯一的sourceDesc，利用数据库层面检查
  const uniqueSourceDesc = `邀请推销员${newAgentId}注册奖励`;

  // 在事务中使用 SELECT FOR UPDATE 确保并发安全
  // 先锁定检查是否存在，再决定是否发放
  const existingCoupons = await client.$queryRaw<Array<{ id: number }>>`
    SELECT id FROM coupons
    WHERE agentId = ${inviterId}
    AND sourceType = ${CouponSourceType.RECRUIT}
    AND sourceDesc = ${uniqueSourceDesc}
    LIMIT 1
    FOR UPDATE
  `;

  if (existingCoupons && existingCoupons.length > 0) {
    console.log(`[即时奖励] 拉新奖励已发放，跳过: 邀请人${inviterId}, 新人${newAgentId}`);
    return { issued: false };
  }

  // 获取奖励金额
  const amount = await getRewardAmount('RECRUIT');
  if (amount <= 0) {
    return { issued: false };
  }

  // 发放代金券（拉新奖励成本由总代理承担）
  const coupon = await issueCoupon({
    agentId: inviterId,
    amount,
    sourceType: CouponSourceType.RECRUIT,
    sourceDesc: uniqueSourceDesc,
    costBearerId: null,
  }, client);

  console.log(`[即时奖励] 拉新奖励发放成功: 邀请人${inviterId}, 新人${newAgentId}, ${amount}元`);
  return { issued: true, amount, couponCode: coupon.code };
}

/**
 * 发放激活再奖
 * 触发时机：下级推销员首次激活（首单成交）
 *
 * @param parentId 上级ID（获得奖励的人）
 * @param activatedAgentId 被激活的推销员ID
 */
export async function issueRecruitActivateBonus(
  parentId: number,
  activatedAgentId: number,
  tx?: Prisma.TransactionClient
): Promise<{ issued: boolean; amount?: number; couponCode?: string }> {
  // 【2026-01-21】检查开关
  const enabled = await isRewardEnabled('coupon_activate_enabled');
  if (!enabled) {
    console.log(`[即时奖励] 激活再奖未启用，跳过: 上级${parentId}`);
    return { issued: false };
  }

  const client = tx || prisma;

  // 【2026-01-23 P1-02修复】使用唯一标识符防止重复发放
  const uniqueSourceDesc = `下级推销员${activatedAgentId}激活奖励`;

  // 检查是否已发放过该下级的激活奖励
  const existingCoupons = await client.$queryRaw<Array<{ id: number }>>`
    SELECT id FROM coupons
    WHERE agentId = ${parentId}
    AND sourceType = ${CouponSourceType.RECRUIT_ACTIVATE}
    AND sourceDesc = ${uniqueSourceDesc}
    LIMIT 1
    FOR UPDATE
  `;

  if (existingCoupons && existingCoupons.length > 0) {
    console.log(`[即时奖励] 激活再奖已发放，跳过: 上级${parentId}, 被激活${activatedAgentId}`);
    return { issued: false };
  }

  // 获取奖励金额
  const amount = await getRewardAmount('RECRUIT_ACTIVATE');
  if (amount <= 0) {
    return { issued: false };
  }

  // 发放代金券（激活再奖成本由总代理承担）
  const coupon = await issueCoupon({
    agentId: parentId,
    amount,
    sourceType: CouponSourceType.RECRUIT_ACTIVATE,
    sourceDesc: uniqueSourceDesc,
    costBearerId: null,
  }, client);

  console.log(`[即时奖励] 激活再奖发放成功: 上级${parentId}, 被激活${activatedAgentId}, ${amount}元`);
  return { issued: true, amount, couponCode: coupon.code };
}

/**
 * 处理新推销员注册的所有即时奖励
 * 统一入口，在注册成功后调用
 *
 * @param newAgentId 新注册的推销员ID
 * @param inviterId 邀请人ID（可选）
 */
export async function processRegistrationRewards(
  newAgentId: number,
  inviterId?: number | null
): Promise<{
  registerBonus?: { issued: boolean; amount?: number };
  recruitBonus?: { issued: boolean; amount?: number };
}> {
  const result: {
    registerBonus?: { issued: boolean; amount?: number };
    recruitBonus?: { issued: boolean; amount?: number };
  } = {};

  try {
    // 在事务中处理
    await prisma.$transaction(async (tx) => {
      // 1. 发放注册奖励给新推销员
      result.registerBonus = await issueRegisterBonus(newAgentId, tx);

      // 2. 如果有邀请人，发放拉新奖励
      if (inviterId) {
        result.recruitBonus = await issueRecruitBonus(inviterId, newAgentId, tx);
      }
    });
  } catch (error) {
    console.error('[即时奖励] 注册奖励处理失败:', error);
    throw error;
  }

  return result;
}

/**
 * 处理首单成交的所有即时奖励
 * 统一入口，在核销完成后调用
 *
 * @param agentId 推销员ID
 */
export async function processFirstCompleteRewards(
  agentId: number
): Promise<{
  firstCompleteBonus?: { issued: boolean; amount?: number };
  activateBonus?: { issued: boolean; amount?: number };
}> {
  const result: {
    firstCompleteBonus?: { issued: boolean; amount?: number };
    activateBonus?: { issued: boolean; amount?: number };
  } = {};

  try {
    await prisma.$transaction(async (tx) => {
      // 1. 发放首单成交奖励
      result.firstCompleteBonus = await issueFirstCompleteBonus(agentId, tx);

      // 2. 如果是首单成交（即刚刚激活），通知上级获得激活再奖
      if (result.firstCompleteBonus?.issued) {
        const agent = await tx.agent.findUnique({
          where: { id: agentId },
          select: { parentId: true },
        });

        if (agent?.parentId) {
          result.activateBonus = await issueRecruitActivateBonus(agent.parentId, agentId, tx);
        }
      }
    });
  } catch (error) {
    console.error('[即时奖励] 首单奖励处理失败:', error);
    throw error;
  }

  return result;
}

export default {
  issueRegisterBonus,
  issueFirstShareBonus,
  issueFirstReservationBonus,
  issueFirstCompleteBonus,
  issueRecruitBonus,
  issueRecruitActivateBonus,
  processRegistrationRewards,
  processFirstCompleteRewards,
};

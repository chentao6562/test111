/**
 * 发圈审核服务
 * 【2026-01-20】
 *
 * 功能：
 * 1. 推销员上传发圈截图
 * 2. 管理员审核（通过/驳回）
 * 3. 首发圈奖励发放
 * 4. 周发圈统计
 */

import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';
import { issueCoupon, CouponSourceType, getCouponConfig } from './couponService';
// 【2026-01-23 P1-03修复】统一使用 weeklyRewardService 的周一计算函数
import { getWeekStart as getWeekStartFromWeekly } from './weeklyRewardService';

// 发圈状态
export const ShareStatus = {
  PENDING: 'PENDING',     // 待审核
  APPROVED: 'APPROVED',   // 已通过
  REJECTED: 'REJECTED',   // 已驳回
};

// 发圈类型
export const ShareType = {
  MOMENTS: 'MOMENTS',       // 微信朋友圈
  XIAOHONGSHU: 'XIAOHONGSHU', // 小红书
};

// 发圈类型描述
export const ShareTypeDesc: Record<string, string> = {
  [ShareType.MOMENTS]: '微信朋友圈',
  [ShareType.XIAOHONGSHU]: '小红书',
};

// 发圈状态描述
export const ShareStatusDesc: Record<string, string> = {
  [ShareStatus.PENDING]: '待审核',
  [ShareStatus.APPROVED]: '已通过',
  [ShareStatus.REJECTED]: '已驳回',
};

/**
 * 获取当前周的周一日期（北京时间）
 * 【2026-01-23 P1-03修复】委托给 weeklyRewardService，确保统一实现
 */
export function getWeekStart(date: Date = new Date()): Date {
  return getWeekStartFromWeekly(date);
}

/**
 * 推销员提交发圈
 */
export async function submitShare(params: {
  agentId: number;
  imageUrl: string;
  shareType?: string;
}): Promise<{
  id: number;
  status: string;
  message: string;
}> {
  const { agentId, imageUrl, shareType = ShareType.MOMENTS } = params;

  // 验证推销员存在
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { id: true, status: true },
  });

  if (!agent) {
    throw new Error('推销员不存在');
  }

  if (agent.status !== 'ACTIVE') {
    throw new Error('推销员状态异常，无法提交发圈');
  }

  // 检查今天是否已经提交过（限制每天1次）
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayShare = await prisma.shareRecord.findFirst({
    where: {
      agentId,
      createdAt: {
        gte: today,
        lt: tomorrow,
      },
    },
  });

  if (todayShare) {
    throw new Error('今天已经提交过发圈，请明天再来');
  }

  // 创建发圈记录
  const share = await prisma.shareRecord.create({
    data: {
      agentId,
      imageUrl,
      shareType,
      status: ShareStatus.PENDING,
    },
  });

  console.log(`[发圈] 提交成功: 推销员${agentId}, 类型${shareType}, ID${share.id}`);

  return {
    id: share.id,
    status: share.status,
    message: '发圈提交成功，等待审核',
  };
}

/**
 * 获取推销员的发圈列表
 */
export async function getAgentShares(
  agentId: number,
  options: {
    status?: string;
    page?: number;
    pageSize?: number;
  } = {}
): Promise<{
  list: Array<{
    id: number;
    imageUrl: string;
    shareType: string;
    shareTypeDesc: string;
    status: string;
    statusDesc: string;
    rejectReason: string | null;
    bonusPaid: boolean;
    createdAt: Date;
    reviewedAt: Date | null;
  }>;
  total: number;
}> {
  const { status, page = 1, pageSize = 20 } = options;
  const skip = (page - 1) * pageSize;

  const where: Prisma.ShareRecordWhereInput = { agentId };
  if (status) {
    where.status = status;
  }

  const [shares, total] = await Promise.all([
    prisma.shareRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.shareRecord.count({ where }),
  ]);

  return {
    list: shares.map(s => ({
      id: s.id,
      imageUrl: s.imageUrl,
      shareType: s.shareType,
      shareTypeDesc: ShareTypeDesc[s.shareType] || s.shareType,
      status: s.status,
      statusDesc: ShareStatusDesc[s.status] || s.status,
      rejectReason: s.rejectReason,
      bonusPaid: s.bonusPaid,
      createdAt: s.createdAt,
      reviewedAt: s.reviewedAt,
    })),
    total,
  };
}

/**
 * 获取待审核发圈列表（管理后台）
 */
export async function getPendingShares(options: {
  status?: string;
  agentId?: number;
  keyword?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<{
  list: Array<{
    id: number;
    agentId: number;
    agentName: string;
    agentPhone: string;
    agentType: string;
    imageUrl: string;
    shareType: string;
    shareTypeDesc: string;
    status: string;
    statusDesc: string;
    rejectReason: string | null;
    bonusPaid: boolean;
    createdAt: Date;
    reviewedAt: Date | null;
    reviewedBy: number | null;
  }>;
  total: number;
}> {
  const { status, agentId, keyword, page = 1, pageSize = 20 } = options;
  const skip = (page - 1) * pageSize;

  const where: Prisma.ShareRecordWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (agentId) {
    where.agentId = agentId;
  }

  if (keyword) {
    where.agent = {
      OR: [
        { name: { contains: keyword } },
        { phone: { contains: keyword } },
      ],
    };
  }

  const [shares, total] = await Promise.all([
    prisma.shareRecord.findMany({
      where,
      include: {
        agent: {
          select: { id: true, name: true, phone: true, type: true },
        },
      },
      orderBy: [
        { status: 'asc' }, // PENDING排前面
        { createdAt: 'desc' },
      ],
      skip,
      take: pageSize,
    }),
    prisma.shareRecord.count({ where }),
  ]);

  return {
    list: shares.map(s => ({
      id: s.id,
      agentId: s.agentId,
      agentName: s.agent.name,
      agentPhone: s.agent.phone,
      agentType: s.agent.type,
      imageUrl: s.imageUrl,
      shareType: s.shareType,
      shareTypeDesc: ShareTypeDesc[s.shareType] || s.shareType,
      status: s.status,
      statusDesc: ShareStatusDesc[s.status] || s.status,
      rejectReason: s.rejectReason,
      bonusPaid: s.bonusPaid,
      createdAt: s.createdAt,
      reviewedAt: s.reviewedAt,
      reviewedBy: s.reviewedBy,
    })),
    total,
  };
}

/**
 * 审核通过发圈
 */
export async function approveShare(
  shareId: number,
  adminId: number,
  tx?: Prisma.TransactionClient
): Promise<{
  success: boolean;
  bonusIssued: boolean;
  bonusAmount?: number;
}> {
  const client = tx || prisma;

  // 获取发圈记录
  const share = await client.shareRecord.findUnique({
    where: { id: shareId },
    include: {
      agent: { select: { id: true, name: true } },
    },
  });

  if (!share) {
    throw new Error('发圈记录不存在');
  }

  if (share.status !== ShareStatus.PENDING) {
    throw new Error('该发圈已审核');
  }

  // 使用事务处理
  const result = await (client === prisma ? prisma.$transaction(async (txClient) => {
    return processApproval(txClient, share, adminId);
  }) : processApproval(client as Prisma.TransactionClient, share, adminId));

  return result;
}

async function processApproval(
  tx: Prisma.TransactionClient,
  share: { id: number; agentId: number; agent: { id: number; name: string } },
  adminId: number
): Promise<{
  success: boolean;
  bonusIssued: boolean;
  bonusAmount?: number;
}> {
  // 更新发圈状态
  await tx.shareRecord.update({
    where: { id: share.id },
    data: {
      status: ShareStatus.APPROVED,
      reviewedBy: adminId,
      reviewedAt: new Date(),
    },
  });

  // 更新周发圈统计
  await updateWeeklyShareStats(share.agentId, tx);

  // 检查是否为首发圈（发放首发圈奖励）
  const bonusResult = await issueFirstShareBonus(share.agentId, share.id, tx);

  console.log(`[发圈] 审核通过: ID${share.id}, 推销员${share.agentId}`);

  return {
    success: true,
    bonusIssued: bonusResult.issued,
    bonusAmount: bonusResult.amount,
  };
}

/**
 * 审核驳回发圈
 */
export async function rejectShare(
  shareId: number,
  adminId: number,
  rejectReason: string
): Promise<{ success: boolean }> {
  const share = await prisma.shareRecord.findUnique({
    where: { id: shareId },
  });

  if (!share) {
    throw new Error('发圈记录不存在');
  }

  if (share.status !== ShareStatus.PENDING) {
    throw new Error('该发圈已审核');
  }

  await prisma.shareRecord.update({
    where: { id: shareId },
    data: {
      status: ShareStatus.REJECTED,
      reviewedBy: adminId,
      reviewedAt: new Date(),
      rejectReason,
    },
  });

  console.log(`[发圈] 审核驳回: ID${shareId}, 原因: ${rejectReason}`);

  return { success: true };
}

/**
 * 发放首发圈奖励
 */
async function issueFirstShareBonus(
  agentId: number,
  shareId: number,
  tx: Prisma.TransactionClient
): Promise<{ issued: boolean; amount?: number }> {
  // 检查是否已发放过首发圈奖励
  const activity = await tx.agentActivity.findUnique({
    where: { agentId },
  });

  if (activity?.firstShareBonusPaid) {
    return { issued: false };
  }

  // 获取奖励金额配置
  const bonusAmount = await getCouponConfig('coupon_first_share_bonus');
  if (bonusAmount <= 0) {
    return { issued: false };
  }

  // 发放代金券
  await issueCoupon({
    agentId,
    amount: bonusAmount,
    sourceType: CouponSourceType.FIRST_SHARE,
    sourceDesc: '首次发圈奖励',
  }, tx);

  // 更新活动追踪表，标记首发圈奖励已发
  await tx.agentActivity.upsert({
    where: { agentId },
    create: {
      agentId,
      firstShareBonusPaid: true,
      firstShareAt: new Date(),
    },
    update: {
      firstShareBonusPaid: true,
      firstShareAt: new Date(),
    },
  });

  // 标记发圈记录的奖励已发
  await tx.shareRecord.update({
    where: { id: shareId },
    data: { bonusPaid: true },
  });

  console.log(`[发圈] 首发圈奖励发放: 推销员${agentId}, 金额${bonusAmount}元`);

  return { issued: true, amount: bonusAmount };
}

/**
 * 更新周发圈统计
 * 使用原始SQL避免Prisma upsert的并发问题
 */
async function updateWeeklyShareStats(
  agentId: number,
  tx: Prisma.TransactionClient
): Promise<void> {
  const weekStart = getWeekStart();

  try {
    // 【2026-01-22 BUG修复】使用正确的驼峰命名法字段名（与Prisma schema一致）
    await tx.$executeRaw`
      INSERT INTO weekly_stats (agentId, weekStart, completedOrders, completedAmount, approvedShares, newRecruits, salesBonusPaid, shareBonusPaid, recruitBonusPaid)
      VALUES (${agentId}, ${weekStart}, 0, 0, 1, 0, false, false, false)
      ON DUPLICATE KEY UPDATE
        approvedShares = approvedShares + 1
    `;
  } catch (error: any) {
    // 发圈统计失败不应该影响审核流程
    console.error(`[发圈统计] 更新失败: 推销员${agentId}, 错误:`, error.message);
  }
}

/**
 * 统计推销员本周的发圈天数
 * 用于判断是否达成全勤（7天）
 */
export async function countWeeklyShareDays(
  agentId: number,
  weekStart?: Date
): Promise<number> {
  const start = weekStart || getWeekStart();
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  // 按天分组统计审核通过的发圈数
  const shares = await prisma.shareRecord.findMany({
    where: {
      agentId,
      status: ShareStatus.APPROVED,
      createdAt: {
        gte: start,
        lt: end,
      },
    },
    select: {
      createdAt: true,
    },
  });

  // 统计有发圈的天数
  // 【2026-01-20修复】月份需要+1（getMonth返回0-11），并补零确保格式一致
  const days = new Set(shares.map(s => {
    const d = new Date(s.createdAt);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  }));

  return days.size;
}

/**
 * 获取发圈审核统计（管理后台）
 */
export async function getShareAuditStats(): Promise<{
  pendingCount: number;
  approvedToday: number;
  rejectedToday: number;
  totalApproved: number;
  totalRejected: number;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [pendingCount, approvedToday, rejectedToday, totalApproved, totalRejected] = await Promise.all([
    prisma.shareRecord.count({ where: { status: ShareStatus.PENDING } }),
    prisma.shareRecord.count({
      where: {
        status: ShareStatus.APPROVED,
        reviewedAt: { gte: today, lt: tomorrow },
      },
    }),
    prisma.shareRecord.count({
      where: {
        status: ShareStatus.REJECTED,
        reviewedAt: { gte: today, lt: tomorrow },
      },
    }),
    prisma.shareRecord.count({ where: { status: ShareStatus.APPROVED } }),
    prisma.shareRecord.count({ where: { status: ShareStatus.REJECTED } }),
  ]);

  return {
    pendingCount,
    approvedToday,
    rejectedToday,
    totalApproved,
    totalRejected,
  };
}

export default {
  ShareStatus,
  ShareType,
  ShareTypeDesc,
  ShareStatusDesc,
  getWeekStart,
  submitShare,
  getAgentShares,
  getPendingShares,
  approveShare,
  rejectShare,
  countWeeklyShareDays,
  getShareAuditStats,
};

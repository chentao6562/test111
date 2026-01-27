/**
 * 代金券管理服务
 * 【2026-01-21】
 *
 * 功能：
 * 1. 代金券统计 - 按来源、状态、推销员统计
 * 2. 返券功能 - 管理员给一级推销员返券，一级给二级返券
 */

import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';

// 代金券来源描述
const CouponSourceDesc: Record<string, string> = {
  REGISTER: '注册奖励',
  FIRST_SHARE: '首次发圈奖励',
  FIRST_RESERVATION: '首次预约奖励',
  FIRST_COMPLETE: '首单成交奖励',
  RECRUIT: '邀请新推销员奖励',
  RECRUIT_ACTIVATE: '下级激活奖励',
  WEEK_SALES_3: '周销售3单奖励',
  WEEK_SALES_5: '周销售5单奖励',
  WEEK_SALES_10: '周销售10单奖励',
  WEEK_SHARE_FULL: '周发圈全勤奖励',
  WEEK_RECRUIT_3: '周拉新3人奖励',
  ACTIVITY: '活动领取',
  ADMIN_GRANT: '管理员发放',
  LEVEL1_GRANT: '上级发放',
};

/**
 * 生成代金券码
 */
function generateCouponCode(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000).toString();
  return `CPN${timestamp}${random}`;
}

/**
 * 获取代金券过期时间
 */
async function getCouponExpireDate(): Promise<Date> {
  const config = await prisma.rewardConfig.findUnique({
    where: { configKey: 'coupon_expire_date' },
  });
  if (config) {
    return new Date(config.configValue + 'T23:59:59+08:00');
  }
  // 默认过期时间：2026年2月14日
  return new Date('2026-02-14T23:59:59+08:00');
}

// ============ 统计功能 ============

/**
 * 获取代金券总体统计
 */
export async function getCouponOverview(): Promise<{
  totalIssued: number;
  totalIssuedAmount: number;
  totalUsed: number;
  totalUsedAmount: number;
  totalUnused: number;
  totalUnusedAmount: number;
  totalExpired: number;
  totalExpiredAmount: number;
}> {
  const stats = await prisma.coupon.groupBy({
    by: ['status'],
    _count: true,
    _sum: { amount: true },
  });

  const result = {
    totalIssued: 0,
    totalIssuedAmount: 0,
    totalUsed: 0,
    totalUsedAmount: 0,
    totalUnused: 0,
    totalUnusedAmount: 0,
    totalExpired: 0,
    totalExpiredAmount: 0,
  };

  for (const stat of stats) {
    const count = stat._count;
    const amount = Number(stat._sum.amount || 0);
    result.totalIssued += count;
    result.totalIssuedAmount += amount;

    switch (stat.status) {
      case 'USED':
        result.totalUsed = count;
        result.totalUsedAmount = amount;
        break;
      case 'UNUSED':
        result.totalUnused = count;
        result.totalUnusedAmount = amount;
        break;
      case 'EXPIRED':
        result.totalExpired = count;
        result.totalExpiredAmount = amount;
        break;
    }
  }

  return result;
}

/**
 * 按来源类型统计
 */
export async function getCouponStatsBySource(): Promise<Array<{
  sourceType: string;
  sourceDesc: string;
  count: number;
  amount: number;
  usedCount: number;
  usedAmount: number;
}>> {
  // 总数统计
  const totalStats = await prisma.coupon.groupBy({
    by: ['sourceType'],
    _count: true,
    _sum: { amount: true },
  });

  // 已使用统计
  const usedStats = await prisma.coupon.groupBy({
    by: ['sourceType'],
    where: { status: 'USED' },
    _count: true,
    _sum: { amount: true },
  });

  const usedMap = new Map<string, { count: number; amount: number }>();
  for (const stat of usedStats) {
    usedMap.set(stat.sourceType, {
      count: stat._count,
      amount: Number(stat._sum.amount || 0),
    });
  }

  return totalStats.map(stat => ({
    sourceType: stat.sourceType,
    sourceDesc: CouponSourceDesc[stat.sourceType] || stat.sourceType,
    count: stat._count,
    amount: Number(stat._sum.amount || 0),
    usedCount: usedMap.get(stat.sourceType)?.count || 0,
    usedAmount: usedMap.get(stat.sourceType)?.amount || 0,
  })).sort((a, b) => b.amount - a.amount);
}

/**
 * 按推销员统计
 */
export async function getCouponStatsByAgent(params: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  agentType?: string;
}): Promise<{
  list: Array<{
    agentId: number;
    agentName: string;
    agentPhone: string;
    agentType: string;
    totalCount: number;
    totalAmount: number;
    usedCount: number;
    usedAmount: number;
    unusedCount: number;
    unusedAmount: number;
  }>;
  total: number;
}> {
  const { page = 1, pageSize = 20, keyword, agentType } = params;
  const skip = (page - 1) * pageSize;

  // 构建推销员查询条件
  const agentWhere: Prisma.AgentWhereInput = {
    isMaster: false, // 排除总代理
  };
  if (keyword) {
    agentWhere.OR = [
      { name: { contains: keyword } },
      { phone: { contains: keyword } },
    ];
  }
  if (agentType) {
    agentWhere.type = agentType;
  }

  // 查询有代金券的推销员
  const agents = await prisma.agent.findMany({
    where: agentWhere,
    select: {
      id: true,
      name: true,
      phone: true,
      type: true,
    },
    skip,
    take: pageSize,
    orderBy: { id: 'desc' },
  });

  const total = await prisma.agent.count({ where: agentWhere });

  // 批量查询代金券统计
  const agentIds = agents.map(a => a.id);

  const couponStats = await prisma.coupon.groupBy({
    by: ['agentId', 'status'],
    where: { agentId: { in: agentIds } },
    _count: true,
    _sum: { amount: true },
  });

  // 整理统计数据
  const statsMap = new Map<number, {
    totalCount: number;
    totalAmount: number;
    usedCount: number;
    usedAmount: number;
    unusedCount: number;
    unusedAmount: number;
  }>();

  for (const stat of couponStats) {
    if (!statsMap.has(stat.agentId)) {
      statsMap.set(stat.agentId, {
        totalCount: 0,
        totalAmount: 0,
        usedCount: 0,
        usedAmount: 0,
        unusedCount: 0,
        unusedAmount: 0,
      });
    }
    const agentStat = statsMap.get(stat.agentId)!;
    const count = stat._count;
    const amount = Number(stat._sum.amount || 0);

    agentStat.totalCount += count;
    agentStat.totalAmount += amount;

    if (stat.status === 'USED') {
      agentStat.usedCount = count;
      agentStat.usedAmount = amount;
    } else if (stat.status === 'UNUSED') {
      agentStat.unusedCount = count;
      agentStat.unusedAmount = amount;
    }
  }

  return {
    list: agents.map(agent => ({
      agentId: agent.id,
      agentName: agent.name,
      agentPhone: agent.phone,
      agentType: agent.type,
      ...(statsMap.get(agent.id) || {
        totalCount: 0,
        totalAmount: 0,
        usedCount: 0,
        usedAmount: 0,
        unusedCount: 0,
        unusedAmount: 0,
      }),
    })),
    total,
  };
}

/**
 * 获取代金券明细列表
 */
export async function getCouponList(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  sourceType?: string;
  agentId?: number;
  keyword?: string;
}): Promise<{
  list: Array<{
    id: number;
    code: string;
    amount: number;
    agentId: number;
    agentName: string;
    agentPhone: string;
    sourceType: string;
    sourceDesc: string | null;
    status: string;
    usedAt: Date | null;
    expiredAt: Date;
    createdAt: Date;
  }>;
  total: number;
}> {
  const { page = 1, pageSize = 20, status, sourceType, agentId, keyword } = params;
  const skip = (page - 1) * pageSize;

  const where: Prisma.CouponWhereInput = {};
  if (status) where.status = status;
  if (sourceType) where.sourceType = sourceType;
  if (agentId) where.agentId = agentId;
  if (keyword) {
    where.OR = [
      { code: { contains: keyword } },
      { agent: { name: { contains: keyword } } },
      { agent: { phone: { contains: keyword } } },
    ];
  }

  const [coupons, total] = await Promise.all([
    prisma.coupon.findMany({
      where,
      include: {
        agent: {
          select: { id: true, name: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.coupon.count({ where }),
  ]);

  return {
    list: coupons.map(c => ({
      id: c.id,
      code: c.code,
      amount: Number(c.amount),
      agentId: c.agentId,
      agentName: c.agent.name,
      agentPhone: c.agent.phone,
      sourceType: c.sourceType,
      sourceDesc: c.sourceDesc,
      status: c.status,
      usedAt: c.usedAt,
      expiredAt: c.expiredAt,
      createdAt: c.createdAt,
    })),
    total,
  };
}

// ============ 返券功能 ============

/**
 * 管理员给推销员发放代金券
 */
export async function adminGrantCoupon(params: {
  agentId: number;
  amount: number;
  remark?: string;
  operatorId: number;
}): Promise<{
  id: number;
  code: string;
  amount: number;
}> {
  const { agentId, amount, remark, operatorId } = params;

  // 验证推销员存在
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { id: true, name: true, type: true, isMaster: true },
  });

  if (!agent) {
    throw new Error('推销员不存在');
  }

  if (agent.isMaster) {
    throw new Error('不能给总代理发放代金券');
  }

  if (amount <= 0 || amount > 1000) {
    throw new Error('代金券金额必须在1-1000元之间');
  }

  // 生成唯一券码
  let code = generateCouponCode();
  let attempts = 0;
  while (attempts < 10) {
    const exists = await prisma.coupon.findUnique({ where: { code } });
    if (!exists) break;
    code = generateCouponCode();
    attempts++;
  }

  // 获取过期时间
  const expiredAt = await getCouponExpireDate();

  // 创建代金券
  const coupon = await prisma.coupon.create({
    data: {
      code,
      agentId,
      amount,
      sourceType: 'ADMIN_GRANT',
      sourceDesc: remark || `管理员发放 (操作员ID: ${operatorId})`,
      costBearerId: agentId, // 成本由推销员自己承担
      status: 'UNUSED',
      expiredAt,
    },
  });

  console.log(`[代金券] 管理员发放: 推销员${agentId}(${agent.name}), 金额${amount}元, 券码${code}`);

  return {
    id: coupon.id,
    code: coupon.code,
    amount: Number(coupon.amount),
  };
}

/**
 * 一级推销员给二级推销员发放代金券
 */
export async function level1GrantCoupon(params: {
  level1Id: number;       // 一级推销员ID
  level2Id: number;       // 二级推销员ID
  amount: number;
  remark?: string;
}): Promise<{
  id: number;
  code: string;
  amount: number;
}> {
  const { level1Id, level2Id, amount, remark } = params;

  // 验证一级推销员
  const level1 = await prisma.agent.findUnique({
    where: { id: level1Id },
    select: { id: true, name: true, type: true, balance: true },
  });

  if (!level1) {
    throw new Error('一级推销员不存在');
  }

  if (level1.type !== 'LEVEL1') {
    throw new Error('只有一级推销员才能给二级发放代金券');
  }

  // 验证二级推销员
  const level2 = await prisma.agent.findUnique({
    where: { id: level2Id },
    select: { id: true, name: true, type: true, parentId: true },
  });

  if (!level2) {
    throw new Error('二级推销员不存在');
  }

  if (level2.type !== 'LEVEL2') {
    throw new Error('目标必须是二级推销员');
  }

  if (level2.parentId !== level1Id) {
    throw new Error('只能给自己的下级发放代金券');
  }

  if (amount <= 0 || amount > 500) {
    throw new Error('代金券金额必须在1-500元之间');
  }

  // 检查一级推销员余额是否足够
  const balance = Number(level1.balance);
  if (balance < amount) {
    throw new Error(`余额不足，当前余额${balance}元，需要${amount}元`);
  }

  // 使用事务处理
  const result = await prisma.$transaction(async (tx) => {
    // 生成唯一券码
    let code = generateCouponCode();
    let attempts = 0;
    while (attempts < 10) {
      const exists = await tx.coupon.findUnique({ where: { code } });
      if (!exists) break;
      code = generateCouponCode();
      attempts++;
    }

    // 获取过期时间
    const expiredAt = await getCouponExpireDate();

    // 创建代金券
    const coupon = await tx.coupon.create({
      data: {
        code,
        agentId: level2Id,
        amount,
        sourceType: 'LEVEL1_GRANT',
        sourceDesc: remark || `上级(${level1.name})发放`,
        costBearerId: level2Id, // 成本由二级自己承担（核销时扣）
        status: 'UNUSED',
        expiredAt,
      },
    });

    // 从一级推销员余额中扣除
    const afterBalance = balance - amount;
    await tx.agent.update({
      where: { id: level1Id },
      data: { balance: { decrement: amount } },
    });

    // 记录资金流水
    await tx.fundFlow.create({
      data: {
        agentId: level1Id,
        type: 'COUPON_GRANT',
        amount: new Prisma.Decimal(-amount),
        beforeBalance: new Prisma.Decimal(balance),
        afterBalance: new Prisma.Decimal(afterBalance),
        relatedType: 'COUPON',
        relatedId: coupon.id,
        remark: `给下级(${level2.name})发放代金券`,
      },
    });

    console.log(`[代金券] 一级发放: ${level1.name}(${level1Id}) → ${level2.name}(${level2Id}), 金额${amount}元, 券码${code}`);

    return {
      id: coupon.id,
      code: coupon.code,
      amount: Number(coupon.amount),
    };
  });

  return result;
}

/**
 * 获取一级推销员的下级列表（用于返券选择）
 */
export async function getLevel2List(level1Id: number): Promise<Array<{
  id: number;
  name: string;
  phone: string;
  couponCount: number;
  couponAmount: number;
}>> {
  // 验证是一级推销员
  const level1 = await prisma.agent.findUnique({
    where: { id: level1Id },
    select: { type: true },
  });

  if (!level1 || level1.type !== 'LEVEL1') {
    throw new Error('只有一级推销员才能查看下级列表');
  }

  const level2List = await prisma.agent.findMany({
    where: {
      parentId: level1Id,
      type: 'LEVEL2',
      status: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
      phone: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // 批量查询代金券统计
  const couponStats = await prisma.coupon.groupBy({
    by: ['agentId'],
    where: {
      agentId: { in: level2List.map(l => l.id) },
      status: 'UNUSED',
    },
    _count: true,
    _sum: { amount: true },
  });

  const statsMap = new Map<number, { count: number; amount: number }>();
  for (const stat of couponStats) {
    statsMap.set(stat.agentId, {
      count: stat._count,
      amount: Number(stat._sum.amount || 0),
    });
  }

  return level2List.map(l => ({
    id: l.id,
    name: l.name,
    phone: l.phone,
    couponCount: statsMap.get(l.id)?.count || 0,
    couponAmount: statsMap.get(l.id)?.amount || 0,
  }));
}

export default {
  getCouponOverview,
  getCouponStatsBySource,
  getCouponStatsByAgent,
  getCouponList,
  adminGrantCoupon,
  level1GrantCoupon,
  getLevel2List,
};

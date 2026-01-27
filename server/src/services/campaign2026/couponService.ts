/**
 * 代金券服务
 * 【2026-01-18 春节营销活动】
 *
 * 功能：
 * 1. 发放代金券 - 营销奖励以代金券形式发放
 * 2. 查询代金券 - 推销员查看自己的代金券
 * 3. 核销代金券 - 门店端核销，用于抵扣购买金额
 * 4. 过期处理 - 2026-02-14后自动过期
 *
 * 成本扣减规则【2026-01-20更新】：
 * - 所有代金券成本由推销员自己承担
 * - 核销时从推销员余额中扣除等额金额
 * - 如果余额不足，允许负余额（下次分润到账时自动抵扣）
 */

import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';
import { createTransactionTrace, TraceType, OperatorType } from '../audit/auditTraceService';

// 代金券来源类型
export const CouponSourceType = {
  REGISTER: 'REGISTER',                     // 注册奖励
  FIRST_SHARE: 'FIRST_SHARE',               // 首发圈奖励
  FIRST_RESERVATION: 'FIRST_RESERVATION',   // 首预约奖励
  FIRST_COMPLETE: 'FIRST_COMPLETE',         // 首单成交奖励
  RECRUIT: 'RECRUIT',                       // 拉新奖励
  RECRUIT_ACTIVATE: 'RECRUIT_ACTIVATE',     // 激活再奖
  WEEK_SALES_3: 'WEEK_SALES_3',             // 周销售3单
  WEEK_SALES_5: 'WEEK_SALES_5',             // 周销售5单
  WEEK_SALES_10: 'WEEK_SALES_10',           // 周销售10单
  WEEK_SHARE_FULL: 'WEEK_SHARE_FULL',       // 周发圈全勤
  WEEK_RECRUIT_3: 'WEEK_RECRUIT_3',         // 周拉新3人
};

// 代金券来源描述
export const CouponSourceDesc: Record<string, string> = {
  [CouponSourceType.REGISTER]: '注册奖励',
  [CouponSourceType.FIRST_SHARE]: '首次发圈奖励',
  [CouponSourceType.FIRST_RESERVATION]: '首次预约奖励',
  [CouponSourceType.FIRST_COMPLETE]: '首单成交奖励',
  [CouponSourceType.RECRUIT]: '邀请新推销员奖励',
  [CouponSourceType.RECRUIT_ACTIVATE]: '下级激活奖励',
  [CouponSourceType.WEEK_SALES_3]: '周销售3单奖励',
  [CouponSourceType.WEEK_SALES_5]: '周销售5单奖励',
  [CouponSourceType.WEEK_SALES_10]: '周销售10单奖励',
  [CouponSourceType.WEEK_SHARE_FULL]: '周发圈全勤奖励',
  [CouponSourceType.WEEK_RECRUIT_3]: '周拉新3人奖励',
};

// 代金券状态
export const CouponStatus = {
  UNUSED: 'UNUSED',
  USED: 'USED',
  EXPIRED: 'EXPIRED',
};

// 默认过期时间：2026年2月14日 23:59:59
const DEFAULT_EXPIRE_DATE = new Date('2026-02-14T23:59:59+08:00');

/**
 * 生成代金券码
 * 格式: CPN + 时间戳后6位 + 4位随机数
 */
function generateCouponCode(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000).toString();
  return `CPN${timestamp}${random}`;
}

/**
 * 获取代金券配置
 */
export async function getCouponConfig(key: string): Promise<number> {
  const config = await prisma.rewardConfig.findUnique({
    where: { configKey: key },
  });
  return config ? Number(config.configValue) : 0;
}

/**
 * 获取代金券过期时间
 */
export async function getCouponExpireDate(): Promise<Date> {
  const config = await prisma.rewardConfig.findUnique({
    where: { configKey: 'coupon_expire_date' },
  });
  if (config) {
    return new Date(config.configValue + 'T23:59:59+08:00');
  }
  return DEFAULT_EXPIRE_DATE;
}

/**
 * 发放代金券
 */
export async function issueCoupon(params: {
  agentId: number;
  amount: number;
  sourceType: string;
  sourceDesc?: string;
  costBearerId?: number | null;
}, tx?: Prisma.TransactionClient): Promise<{
  id: number;
  code: string;
  amount: number;
}> {
  const client = tx || prisma;

  // 获取推销员信息，确定成本承担人
  const agent = await client.agent.findUnique({
    where: { id: params.agentId },
    select: { id: true, type: true, parentId: true },
  });

  if (!agent) {
    throw new Error('推销员不存在');
  }

  // 确定成本承担人【2026-01-20更新】
  // - 所有代金券成本由推销员自己承担
  // - 核销时从推销员自己的余额中扣除
  let costBearerId: number | null = params.agentId;
  if (params.costBearerId !== undefined) {
    costBearerId = params.costBearerId;
  }

  // 生成唯一券码
  // 【2026-01-22 P1修复】确保券码唯一性，10次重试后抛出错误
  let code = generateCouponCode();
  let attempts = 0;
  let foundUnique = false;
  while (attempts < 10) {
    const exists = await client.coupon.findUnique({ where: { code } });
    if (!exists) {
      foundUnique = true;
      break;
    }
    code = generateCouponCode();
    attempts++;
  }
  if (!foundUnique) {
    throw new Error('无法生成唯一代金券码，请稍后重试');
  }

  // 获取过期时间
  const expiredAt = await getCouponExpireDate();

  // 创建代金券
  const coupon = await client.coupon.create({
    data: {
      code,
      agentId: params.agentId,
      amount: params.amount,
      sourceType: params.sourceType,
      sourceDesc: params.sourceDesc || CouponSourceDesc[params.sourceType] || params.sourceType,
      costBearerId,
      status: CouponStatus.UNUSED,
      expiredAt,
    },
  });

  console.log(`[代金券] 发放成功: 推销员${params.agentId}, 金额${params.amount}元, 来源${params.sourceType}, 券码${code}`);

  return {
    id: coupon.id,
    code: coupon.code,
    amount: Number(coupon.amount),
  };
}

/**
 * 获取推销员代金券列表
 */
export async function getAgentCoupons(
  agentId: number,
  options: {
    status?: string;
    page?: number;
    pageSize?: number;
  } = {}
): Promise<{
  list: Array<{
    id: number;
    code: string;
    amount: number;
    sourceType: string;
    sourceDesc: string | null;
    status: string;
    usedAt: Date | null;
    usedOrderNo: string | null;
    expiredAt: Date;
    createdAt: Date;
  }>;
  total: number;
}> {
  const { status, page = 1, pageSize = 20 } = options;
  const skip = (page - 1) * pageSize;

  // 先更新过期代金券
  await updateExpiredCoupons(agentId);

  const where: Prisma.CouponWhereInput = { agentId };
  if (status) {
    where.status = status;
  }

  const [coupons, total] = await Promise.all([
    prisma.coupon.findMany({
      where,
      orderBy: [
        { status: 'asc' },  // UNUSED排前面
        { createdAt: 'desc' },
      ],
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
      sourceType: c.sourceType,
      sourceDesc: c.sourceDesc,
      status: c.status,
      usedAt: c.usedAt,
      usedOrderNo: c.usedOrderNo,
      expiredAt: c.expiredAt,
      createdAt: c.createdAt,
    })),
    total,
  };
}

/**
 * 获取代金券统计
 */
export async function getCouponStats(agentId: number): Promise<{
  total: number;
  unused: number;
  used: number;
  expired: number;
  totalAmount: number;
  unusedAmount: number;
}> {
  // 先更新过期代金券
  await updateExpiredCoupons(agentId);

  const stats = await prisma.coupon.groupBy({
    by: ['status'],
    where: { agentId },
    _count: true,
    _sum: { amount: true },
  });

  const result = {
    total: 0,
    unused: 0,
    used: 0,
    expired: 0,
    totalAmount: 0,
    unusedAmount: 0,
  };

  for (const stat of stats) {
    const count = stat._count;
    const amount = Number(stat._sum.amount || 0);
    result.total += count;
    result.totalAmount += amount;

    switch (stat.status) {
      case CouponStatus.UNUSED:
        result.unused = count;
        result.unusedAmount = amount;
        break;
      case CouponStatus.USED:
        result.used = count;
        break;
      case CouponStatus.EXPIRED:
        result.expired = count;
        break;
    }
  }

  return result;
}

/**
 * 验证代金券（核销前验证）
 */
export async function verifyCoupon(code: string): Promise<{
  valid: boolean;
  coupon?: {
    id: number;
    code: string;
    amount: number;
    agentId: number;
    agentName: string;
    agentPhone: string;
    sourceDesc: string | null;
    expiredAt: Date;
  };
  error?: string;
}> {
  const coupon = await prisma.coupon.findUnique({
    where: { code },
    include: {
      agent: {
        select: { id: true, name: true, phone: true },
      },
    },
  });

  if (!coupon) {
    return { valid: false, error: '代金券不存在' };
  }

  if (coupon.status === CouponStatus.USED) {
    return { valid: false, error: '代金券已使用' };
  }

  if (coupon.status === CouponStatus.EXPIRED || coupon.expiredAt < new Date()) {
    // 更新为已过期
    if (coupon.status !== CouponStatus.EXPIRED) {
      await prisma.coupon.update({
        where: { id: coupon.id },
        data: { status: CouponStatus.EXPIRED },
      });
    }
    return { valid: false, error: '代金券已过期' };
  }

  return {
    valid: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      amount: Number(coupon.amount),
      agentId: coupon.agentId,
      agentName: coupon.agent.name,
      agentPhone: coupon.agent.phone,
      sourceDesc: coupon.sourceDesc,
      expiredAt: coupon.expiredAt,
    },
  };
}

/**
 * 核销代金券
 * 【2026-01-20更新】核销时从推销员余额中扣除等额金额
 */
export async function redeemCoupon(params: {
  code: string;
  orderNo?: string;
  operatorId: number;
}): Promise<{
  success: boolean;
  amount?: number;
  costBearerId?: number | null;
  error?: string;
}> {
  const { code, orderNo, operatorId } = params;

  // 【2026-01-22 BUG修复】将所有验证逻辑移到事务内，使用SELECT FOR UPDATE确保幂等性
  // 避免验证和更新之间的时间窗口导致并发重复核销
  const result = await prisma.$transaction(async (tx) => {
    // 【关键】使用SELECT FOR UPDATE锁定代金券行，防止并发核销
    const coupons = await tx.$queryRaw<Array<{
      id: number;
      agentId: number;
      amount: any;
      status: string;
      expiredAt: Date | null;
      costBearerId: number | null;
    }>>`
      SELECT id, agentId, amount, status, expiredAt, costBearerId
      FROM coupons
      WHERE code = ${code}
      FOR UPDATE
    `;

    if (!coupons || coupons.length === 0) {
      throw new Error('代金券不存在');
    }

    const couponData = coupons[0];

    // 【在锁定后检查状态】确保代金券可用
    if (couponData.status === 'USED') {
      throw new Error('代金券已使用');
    }
    if (couponData.status === 'EXPIRED') {
      throw new Error('代金券已过期');
    }
    if (couponData.expiredAt && new Date(couponData.expiredAt) < new Date()) {
      throw new Error('代金券已过期');
    }

    // 更新代金券状态
    const coupon = await tx.coupon.update({
      where: { code },
      data: {
        status: CouponStatus.USED,
        usedAt: new Date(),
        usedOrderNo: orderNo,
        usedBy: operatorId,
      },
    });

    const couponAmount = Number(coupon.amount);

    // 【2026-01-24 P0-03修复】根据costBearerId决定从谁的余额扣除
    // - costBearerId有值：从该ID对应的推销员扣除
    // - costBearerId为null：从总代理扣除
    // - 如果找不到costBearer：回退到从代金券持有人扣除
    let costBearerAgentId = couponData.agentId; // 默认：持有人承担

    if (couponData.costBearerId !== null && couponData.costBearerId !== undefined) {
      // costBearerId有值，从指定的推销员扣除
      costBearerAgentId = couponData.costBearerId;
    } else if (couponData.costBearerId === null) {
      // costBearerId为null，表示总代理承担
      const masterAgent = await tx.agent.findFirst({
        where: { isMaster: true },
        select: { id: true },
      });
      if (masterAgent) {
        costBearerAgentId = masterAgent.id;
      }
      // 如果找不到总代理，则回退到持有人承担（已在默认值中设置）
    }

    const agent = await tx.agent.findUnique({
      where: { id: costBearerAgentId },
      select: { id: true, balance: true },
    });

    if (agent) {
      const beforeBalance = Number(agent.balance);
      const afterBalance = beforeBalance - couponAmount;

      // 更新余额（允许负余额）
      await tx.agent.update({
        where: { id: agent.id },
        data: {
          balance: { decrement: couponAmount },
        },
      });

      // 【2026-01-24 P0-03修复】记录成本承担关系
      const isSelfBearing = agent.id === couponData.agentId;
      const costBearerType = couponData.costBearerId === null ? '总代理' :
                            (isSelfBearing ? '持有人' : `上级(${agent.id})`);

      // 记录资金流水
      await tx.fundFlow.create({
        data: {
          agentId: agent.id,
          type: 'COUPON_REDEEM',
          amount: new Prisma.Decimal(-couponAmount),
          beforeBalance: new Prisma.Decimal(beforeBalance),
          afterBalance: new Prisma.Decimal(afterBalance),
          relatedType: 'COUPON',
          relatedId: coupon.id,
          remark: `使用代金券 ${code}（成本承担: ${costBearerType}）`,
        },
      });

      // 【2026-01-23 P1-04修复】添加审计追踪记录
      // 【2026-01-24 P0-03修复】添加成本承担详情
      await createTransactionTrace(tx, {
        traceType: TraceType.COUPON_REDEEM,
        agentId: agent.id,
        amount: -couponAmount,
        beforeBalance,
        afterBalance,
        sourceTable: 'coupons',
        sourceId: coupon.id,
        sourceNo: code,
        details: {
          couponCode: code,
          orderNo,
          couponAmount,
          // P0-03修复：成本承担详情
          couponHolderId: couponData.agentId,
          costBearerId: couponData.costBearerId,
          actualCostBearerId: agent.id,
          costBearerType,
        },
        operatorType: OperatorType.STAFF,
        operatorId,
        remark: `代金券核销：${code}（成本承担: ${costBearerType}）`,
      });

      console.log(`[代金券] 核销成功: 券码${code}, 金额${couponAmount}元, 持有人${couponData.agentId}, 成本由${costBearerType}(${agent.id})承担, 余额变化: ${beforeBalance} → ${afterBalance}`);
    }

    return {
      success: true,
      amount: couponAmount,
      costBearerId: coupon.costBearerId,
    };
  });

  return result;
}

/**
 * 更新过期代金券
 */
async function updateExpiredCoupons(agentId?: number): Promise<number> {
  const where: Prisma.CouponWhereInput = {
    status: CouponStatus.UNUSED,
    expiredAt: { lt: new Date() },
  };
  if (agentId) {
    where.agentId = agentId;
  }

  const result = await prisma.coupon.updateMany({
    where,
    data: { status: CouponStatus.EXPIRED },
  });

  return result.count;
}

/**
 * 批量更新所有过期代金券（定时任务使用）
 */
export async function processExpiredCoupons(): Promise<number> {
  return updateExpiredCoupons();
}

/**
 * 获取管理后台代金券统计
 */
export async function getAdminCouponStats(): Promise<{
  totalIssued: number;
  totalIssuedAmount: number;
  totalUsed: number;
  totalUsedAmount: number;
  totalExpired: number;
  totalExpiredAmount: number;
  bySourceType: Array<{
    sourceType: string;
    sourceDesc: string;
    count: number;
    amount: number;
  }>;
}> {
  // 先更新所有过期代金券
  await processExpiredCoupons();

  // 按状态统计
  const statusStats = await prisma.coupon.groupBy({
    by: ['status'],
    _count: true,
    _sum: { amount: true },
  });

  // 按来源类型统计
  const sourceStats = await prisma.coupon.groupBy({
    by: ['sourceType'],
    _count: true,
    _sum: { amount: true },
  });

  const result = {
    totalIssued: 0,
    totalIssuedAmount: 0,
    totalUsed: 0,
    totalUsedAmount: 0,
    totalExpired: 0,
    totalExpiredAmount: 0,
    bySourceType: [] as Array<{
      sourceType: string;
      sourceDesc: string;
      count: number;
      amount: number;
    }>,
  };

  for (const stat of statusStats) {
    const count = stat._count;
    const amount = Number(stat._sum.amount || 0);
    result.totalIssued += count;
    result.totalIssuedAmount += amount;

    switch (stat.status) {
      case CouponStatus.USED:
        result.totalUsed = count;
        result.totalUsedAmount = amount;
        break;
      case CouponStatus.EXPIRED:
        result.totalExpired = count;
        result.totalExpiredAmount = amount;
        break;
    }
  }

  for (const stat of sourceStats) {
    result.bySourceType.push({
      sourceType: stat.sourceType,
      sourceDesc: CouponSourceDesc[stat.sourceType] || stat.sourceType,
      count: stat._count,
      amount: Number(stat._sum.amount || 0),
    });
  }

  return result;
}

/**
 * 【2026-01-21】获取推销员可用代金券列表（用于提货时选择）
 */
export async function getAvailableCouponsForAgent(agentId: number): Promise<Array<{
  id: number;
  code: string;
  amount: number;
  sourceDesc: string | null;
  expiredAt: Date;
  createdAt: Date;
}>> {
  // 先更新过期代金券
  await updateExpiredCoupons(agentId);

  const coupons = await prisma.coupon.findMany({
    where: {
      agentId,
      status: CouponStatus.UNUSED,
      expiredAt: { gt: new Date() },
    },
    orderBy: { amount: 'desc' },
    select: {
      id: true,
      code: true,
      amount: true,
      sourceDesc: true,
      expiredAt: true,
      createdAt: true,
    },
  });

  return coupons.map(c => ({
    id: c.id,
    code: c.code,
    amount: Number(c.amount),
    sourceDesc: c.sourceDesc,
    expiredAt: c.expiredAt,
    createdAt: c.createdAt,
  }));
}

/**
 * 【2026-01-21】提货时批量核销代金券（在事务中使用）
 * @param couponIds 要核销的代金券ID列表
 * @param agentId 推销员ID（用于验证代金券归属）
 * @param orderNo 关联的预约号
 * @param operatorId 操作员ID
 * @param tx 事务客户端
 * @returns 抵扣总金额
 */
export async function redeemCouponsForPickup(params: {
  couponIds: number[];
  agentId: number;
  orderNo: string;
  operatorId: number;
}, tx: Prisma.TransactionClient): Promise<{
  success: boolean;
  totalDeduction: number;
  redeemedCoupons: Array<{ id: number; code: string; amount: number }>;
  error?: string;
}> {
  const { couponIds, agentId, orderNo, operatorId } = params;

  if (!couponIds || couponIds.length === 0) {
    return { success: true, totalDeduction: 0, redeemedCoupons: [] };
  }

  // 【2026-01-22 并发安全修复】使用SELECT FOR UPDATE锁定代金券
  // 防止同一张代金券被两个预约核销同时使用
  // 【2026-01-22 P2修复】使用驼峰命名（与Prisma schema一致）
  const coupons = await tx.$queryRaw<Array<{
    id: number;
    code: string;
    amount: any;
    agentId: number;
    status: string;
    expiredAt: Date;
    costBearerId: number | null;
  }>>`
    SELECT id, code, amount, agentId, status, expiredAt, costBearerId
    FROM coupons
    WHERE id IN (${Prisma.join(couponIds)})
    AND agentId = ${agentId}
    AND status = 'UNUSED'
    AND expiredAt > NOW()
    FOR UPDATE
  `.then(rows => rows.map(row => ({
    id: row.id,
    code: row.code,
    amount: row.amount,
    agentId: row.agentId,
    status: row.status,
    expiredAt: row.expiredAt,
    costBearerId: row.costBearerId,
  })));

  if (coupons.length !== couponIds.length) {
    return {
      success: false,
      totalDeduction: 0,
      redeemedCoupons: [],
      error: '部分代金券不可用或不属于该推销员',
    };
  }

  // 计算总抵扣金额
  let totalDeduction = 0;
  const redeemedCoupons: Array<{ id: number; code: string; amount: number }> = [];

  // 获取推销员当前余额
  const agent = await tx.agent.findUnique({
    where: { id: agentId },
    select: { balance: true },
  });

  if (!agent) {
    return {
      success: false,
      totalDeduction: 0,
      redeemedCoupons: [],
      error: '推销员不存在',
    };
  }

  let currentBalance = Number(agent.balance);

  // 逐个核销代金券
  for (const coupon of coupons) {
    const couponAmount = Number(coupon.amount);

    // 更新代金券状态
    await tx.coupon.update({
      where: { id: coupon.id },
      data: {
        status: CouponStatus.USED,
        usedAt: new Date(),
        usedOrderNo: orderNo,
        usedBy: operatorId,
      },
    });

    // 记录扣款前余额
    const beforeBalance = currentBalance;
    currentBalance -= couponAmount;

    // 记录资金流水
    await tx.fundFlow.create({
      data: {
        agentId,
        type: 'COUPON_REDEEM',
        amount: new Prisma.Decimal(-couponAmount),
        beforeBalance: new Prisma.Decimal(beforeBalance),
        afterBalance: new Prisma.Decimal(currentBalance),
        relatedType: 'COUPON',
        relatedId: coupon.id,
        remark: `提货使用代金券 ${coupon.code}，预约号 ${orderNo}`,
      },
    });

    // 【2026-01-22】创建审计追踪记录
    await createTransactionTrace(tx, {
      traceType: TraceType.COUPON_REDEEM,
      agentId,
      amount: -couponAmount,
      beforeBalance,
      afterBalance: currentBalance,
      sourceTable: 'coupons',
      sourceId: coupon.id,
      sourceNo: coupon.code,
      details: {
        couponCode: coupon.code,
        reservationNo: orderNo,
        couponAmount,
      },
      operatorType: OperatorType.STAFF,
      operatorId,
      remark: `代金券核销：${coupon.code}，预约号：${orderNo}`,
    });

    totalDeduction += couponAmount;
    redeemedCoupons.push({
      id: coupon.id,
      code: coupon.code,
      amount: couponAmount,
    });

    console.log(`[代金券] 提货核销: 券码${coupon.code}, 金额${couponAmount}元, 预约号${orderNo}`);
  }

  // 批量扣减推销员余额（允许负余额）
  await tx.agent.update({
    where: { id: agentId },
    data: {
      balance: { decrement: totalDeduction },
    },
  });

  console.log(`[代金券] 提货核销完成: 推销员${agentId}, 共核销${coupons.length}张, 总抵扣${totalDeduction}元`);

  return {
    success: true,
    totalDeduction,
    redeemedCoupons,
  };
}

export default {
  CouponSourceType,
  CouponSourceDesc,
  CouponStatus,
  getCouponConfig,
  getCouponExpireDate,
  issueCoupon,
  getAgentCoupons,
  getCouponStats,
  verifyCoupon,
  redeemCoupon,
  processExpiredCoupons,
  getAdminCouponStats,
  getAvailableCouponsForAgent,
  redeemCouponsForPickup,
};

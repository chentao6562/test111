/**
 * 现金大转盘兑换服务
 * @module services/spinWheel/spinWheelRedeemService
 * @since 2026-01-23
 */

import prisma from '../../utils/prisma';
import { RedeemRequest, RedeemResultResponse, RedeemStatus } from './types';

/**
 * 兑换代金券
 */
export async function redeemCoupon(request: RedeemRequest): Promise<RedeemResultResponse> {
  const { phone, configId, amount } = request;

  // 获取参与记录
  const participation = await prisma.spinWheelParticipation.findUnique({
    where: {
      configId_phone: {
        configId,
        phone,
      },
    },
    include: { config: true },
  });

  if (!participation) {
    return { success: false, message: '参与记录不存在' };
  }

  // 计算可用金额
  const totalAmount = Number(participation.totalAmount);
  const redeemedAmount = Number(participation.redeemedAmount);
  const expiredAmount = Number(participation.expiredAmount);
  const availableAmount = totalAmount - redeemedAmount - expiredAmount;
  const redeemThreshold = Number(participation.config.redeemThreshold);

  // 检查是否达到兑换门槛
  if (availableAmount < redeemThreshold) {
    return {
      success: false,
      message: `累计满${redeemThreshold}元才能兑换，当前${availableAmount.toFixed(2)}元`,
    };
  }

  // 检查兑换金额
  if (amount > availableAmount) {
    return { success: false, message: '兑换金额超过可用金额' };
  }

  // 必须以100为单位兑换
  if (amount < redeemThreshold) {
    return { success: false, message: `最低兑换金额为${redeemThreshold}元` };
  }

  // 创建兑换记录
  const redeem = await prisma.spinWheelRedeem.create({
    data: {
      participationId: participation.id,
      configId,
      redeemAmount: amount,
      status: RedeemStatus.PENDING,
    },
  });

  try {
    // 检查是否有推销员关联
    if (!participation.salespersonId) {
      await prisma.spinWheelRedeem.update({
        where: { id: redeem.id },
        data: {
          status: RedeemStatus.FAILED,
          failReason: '未关联推销员',
        },
      });
      return { success: false, message: '兑换失败：未关联推销员' };
    }

    // 发放代金券
    const coupon = await prisma.coupon.create({
      data: {
        code: generateCouponCode(),
        agentId: participation.salespersonId,
        amount,
        sourceType: 'SPIN_WHEEL',
        sourceDesc: `转盘活动兑换 (兑换ID: ${redeem.id})`,
        status: 'UNUSED',
        expiredAt: new Date('2026-02-14 23:59:59'),
      },
    });

    // 更新兑换记录
    await prisma.spinWheelRedeem.update({
      where: { id: redeem.id },
      data: {
        status: RedeemStatus.SUCCESS,
        couponId: coupon.id,
      },
    });

    // 更新参与记录
    await prisma.spinWheelParticipation.update({
      where: { id: participation.id },
      data: {
        redeemedAmount: { increment: amount },
      },
    });

    return {
      success: true,
      redeemAmount: amount,
      couponCode: coupon.code,
      message: `兑换成功！${amount}元代金券已发放`,
    };
  } catch (error) {
    console.error('[转盘兑换] 发放代金券失败:', error);

    await prisma.spinWheelRedeem.update({
      where: { id: redeem.id },
      data: {
        status: RedeemStatus.FAILED,
        failReason: '系统错误',
      },
    });

    return { success: false, message: '兑换失败，请稍后重试' };
  }
}

/**
 * 生成代金券码
 */
function generateCouponCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SW${timestamp}${random}`;
}

/**
 * 获取兑换记录
 */
export async function getRedeemRecords(
  phone: string,
  configId: number,
  params: { page?: number; pageSize?: number }
): Promise<{
  list: Array<{
    id: number;
    redeemAmount: number;
    couponCode: string | null;
    status: string;
    createdAt: string;
  }>;
  total: number;
}> {
  const { page = 1, pageSize = 20 } = params;
  const skip = (page - 1) * pageSize;

  const participation = await prisma.spinWheelParticipation.findUnique({
    where: {
      configId_phone: {
        configId,
        phone,
      },
    },
  });

  if (!participation) {
    return { list: [], total: 0 };
  }

  const [redeems, total] = await Promise.all([
    prisma.spinWheelRedeem.findMany({
      where: { participationId: participation.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        config: true,
      },
    }),
    prisma.spinWheelRedeem.count({
      where: { participationId: participation.id },
    }),
  ]);

  const list = await Promise.all(
    redeems.map(async (redeem) => {
      let couponCode: string | null = null;
      if (redeem.couponId) {
        const coupon = await prisma.coupon.findUnique({
          where: { id: redeem.couponId },
        });
        couponCode = coupon?.code || null;
      }

      return {
        id: redeem.id,
        redeemAmount: Number(redeem.redeemAmount),
        couponCode,
        status: redeem.status,
        createdAt: redeem.createdAt.toISOString(),
      };
    })
  );

  return { list, total };
}

/**
 * 检查兑换资格
 */
export async function checkRedeemEligibility(
  phone: string,
  configId: number
): Promise<{
  eligible: boolean;
  availableAmount: number;
  redeemThreshold: number;
  message?: string;
}> {
  const participation = await prisma.spinWheelParticipation.findUnique({
    where: {
      configId_phone: {
        configId,
        phone,
      },
    },
    include: { config: true },
  });

  if (!participation) {
    return {
      eligible: false,
      availableAmount: 0,
      redeemThreshold: 100,
      message: '未参与活动',
    };
  }

  const totalAmount = Number(participation.totalAmount);
  const redeemedAmount = Number(participation.redeemedAmount);
  const expiredAmount = Number(participation.expiredAmount);
  const availableAmount = totalAmount - redeemedAmount - expiredAmount;
  const redeemThreshold = Number(participation.config.redeemThreshold);

  if (availableAmount < redeemThreshold) {
    return {
      eligible: false,
      availableAmount,
      redeemThreshold,
      message: `还差${(redeemThreshold - availableAmount).toFixed(2)}元可兑换`,
    };
  }

  if (!participation.salespersonId) {
    return {
      eligible: false,
      availableAmount,
      redeemThreshold,
      message: '未关联推销员，无法兑换',
    };
  }

  return {
    eligible: true,
    availableAmount,
    redeemThreshold,
  };
}

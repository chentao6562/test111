/**
 * 赠品服务
 * 【2026-01-16 预约模式升级】预约有礼功能
 */

import prisma from '../../utils/prisma';
import { GiftInfo } from './types';

/**
 * 根据金额计算应得赠品
 * @param totalAmount 预约总金额
 * @returns 赠品信息，如果未达标返回null
 */
export async function calculateGift(totalAmount: number): Promise<GiftInfo | null> {
  // 查询所有启用的赠品档位，按金额降序排列
  const tiers = await prisma.giftTier.findMany({
    where: { isActive: true },
    orderBy: { minAmount: 'desc' },
  });

  if (tiers.length === 0) {
    return null;
  }

  // 找到满足条件的最高档位
  for (const tier of tiers) {
    if (totalAmount >= Number(tier.minAmount)) {
      const giftItems = tier.giftItems ? JSON.parse(tier.giftItems) : [tier.giftName];
      return {
        giftTierId: tier.id,
        giftName: tier.giftName,
        giftItems,
        minAmount: Number(tier.minAmount),
      };
    }
  }

  return null;
}

/**
 * 获取所有赠品档位（供前端展示）
 */
export async function getAllGiftTiers() {
  const tiers = await prisma.giftTier.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  return tiers.map(tier => ({
    id: tier.id,
    minAmount: Number(tier.minAmount),
    giftName: tier.giftName,
    giftItems: tier.giftItems ? JSON.parse(tier.giftItems) : [tier.giftName],
    giftCost: tier.giftCost ? Number(tier.giftCost) : null,
  }));
}

/**
 * 根据客户风险等级决定是否发放赠品
 * @param riskLevel 客户风险等级
 * @returns 是否可以获得赠品
 */
export function isEligibleForGift(riskLevel: number): boolean {
  // 高风险(2)和黑名单(3)客户不享受赠品
  return riskLevel < 2;
}

/**
 * 标记赠品已发放
 * @param reservationId 预约ID
 */
export async function markGiftDelivered(reservationId: number): Promise<void> {
  await prisma.reservation.update({
    where: { id: reservationId },
    data: { giftDelivered: true },
  });
}

/**
 * 管理后台：获取赠品档位列表
 */
export async function getGiftTiersForAdmin() {
  return prisma.giftTier.findMany({
    orderBy: { sortOrder: 'asc' },
  });
}

/**
 * 管理后台：创建赠品档位
 */
export async function createGiftTier(data: {
  minAmount: number;
  giftName: string;
  giftItems?: string[];
  giftCost?: number;
  sortOrder?: number;
}) {
  return prisma.giftTier.create({
    data: {
      minAmount: data.minAmount,
      giftName: data.giftName,
      giftItems: data.giftItems ? JSON.stringify(data.giftItems) : null,
      giftCost: data.giftCost,
      sortOrder: data.sortOrder || 0,
      isActive: true,
    },
  });
}

/**
 * 管理后台：更新赠品档位
 */
export async function updateGiftTier(
  id: number,
  data: {
    minAmount?: number;
    giftName?: string;
    giftItems?: string[];
    giftCost?: number;
    sortOrder?: number;
    isActive?: boolean;
  }
) {
  return prisma.giftTier.update({
    where: { id },
    data: {
      ...(data.minAmount !== undefined && { minAmount: data.minAmount }),
      ...(data.giftName !== undefined && { giftName: data.giftName }),
      ...(data.giftItems !== undefined && { giftItems: JSON.stringify(data.giftItems) }),
      ...(data.giftCost !== undefined && { giftCost: data.giftCost }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
}

/**
 * 管理后台：删除赠品档位
 */
export async function deleteGiftTier(id: number) {
  return prisma.giftTier.delete({
    where: { id },
  });
}

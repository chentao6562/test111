/**
 * 拼团核销服务
 * @module services/groupBuy/groupBuyPickupService
 * @since 2026-01-21
 */

import prisma from '../../utils/prisma';
import { GroupBuyStatus, GroupBuyMemberStatus, TierGiftConfig } from './types';
import { getTierGifts } from './groupBuyService';

/**
 * 查询预约关联的拼团信息
 */
export async function getGroupBuyByReservation(reservationId: number) {
  const member = await prisma.groupBuyMember.findUnique({
    where: { reservationId },
    include: {
      groupBuy: {
        include: {
          members: {
            where: {
              status: { not: GroupBuyMemberStatus.QUIT },
            },
          },
          config: true,
        },
      },
    },
  });

  if (!member) {
    return null;
  }

  const groupBuy = member.groupBuy;

  // 计算有效成员数（已加入或已提货的）
  const validMembers = groupBuy.members.filter(
    (m) => m.status === GroupBuyMemberStatus.JOINED || m.status === GroupBuyMemberStatus.PICKED_UP
  );

  // 计算已提货成员数
  const pickedUpMembers = groupBuy.members.filter(
    (m) => m.status === GroupBuyMemberStatus.PICKED_UP
  );

  // 【2026-01-25 多档位赠品】获取适用的档位
  const tierGifts = getTierGifts(validMembers.length, groupBuy.config?.memberGiftsJson || null);

  // 判断当前成员是否是团长（发起人）
  const isLeader = member.reservationId === groupBuy.initiatorId;

  return {
    groupBuyId: groupBuy.id,
    code: groupBuy.code,
    status: groupBuy.status,
    requiredCount: groupBuy.requiredCount,
    currentCount: validMembers.length,
    pickedUpCount: pickedUpMembers.length,
    bonusGiftName: groupBuy.bonusGiftName,
    bonusGiftCost: groupBuy.config?.bonusGiftCost ? Number(groupBuy.config.bonusGiftCost) : 0,
    memberId: member.id,
    memberStatus: member.status,
    isLastMember: validMembers.length === pickedUpMembers.length + 1,
    allPickedUp: validMembers.length === pickedUpMembers.length,
    // 【2026-01-25 多档位赠品信息】
    tierGifts,
    isLeader,
    memberGiftName: tierGifts?.memberGifts.join('+') || groupBuy.bonusGiftName,
    leaderGiftName: tierGifts?.leaderGift || null,
    leaderGiftCount: tierGifts?.leaderCount || 0,
  };
}

/**
 * 标记拼团成员已提货
 * 在预约核销时调用
 * 【2026-01-25】支持多档位赠品分配
 */
export async function markMemberPickedUp(
  reservationId: number
): Promise<{
  success: boolean;
  isLastMember: boolean;
  shouldDeliverBonusGift: boolean;
  bonusGiftName?: string | null;
  message?: string;
  // 【2026-01-25】多档位赠品信息
  memberGiftName?: string | null;
  leaderGiftName?: string | null;
  leaderGiftCount?: number;
  isLeader?: boolean;
}> {
  const member = await prisma.groupBuyMember.findUnique({
    where: { reservationId },
    include: {
      groupBuy: {
        include: {
          members: {
            where: {
              status: { not: GroupBuyMemberStatus.QUIT },
            },
          },
          config: true,  // 【2026-01-25】需要配置信息获取多档位赠品
        },
      },
    },
  });

  if (!member) {
    return {
      success: true,
      isLastMember: false,
      shouldDeliverBonusGift: false,
      message: '该预约未参与拼团',
    };
  }

  const groupBuy = member.groupBuy;

  // 检查拼团状态
  if (groupBuy.status === GroupBuyStatus.EXPIRED || groupBuy.status === GroupBuyStatus.CANCELLED) {
    // 拼团已过期或取消，正常核销但不发拼团赠品
    await prisma.groupBuyMember.update({
      where: { id: member.id },
      data: {
        status: GroupBuyMemberStatus.PICKED_UP,
        pickedUpAt: new Date(),
      },
    });

    return {
      success: true,
      isLastMember: false,
      shouldDeliverBonusGift: false,
      message: '拼团已过期，不发放拼团赠品',
    };
  }

  // 计算有效成员（已加入或已提货）
  const validMembers = groupBuy.members.filter(
    (m) => m.status === GroupBuyMemberStatus.JOINED || m.status === GroupBuyMemberStatus.PICKED_UP
  );

  // 计算已提货成员数
  const pickedUpCount = groupBuy.members.filter(
    (m) => m.status === GroupBuyMemberStatus.PICKED_UP
  ).length;

  // 检查是否满足成团条件
  const isFull = validMembers.length >= groupBuy.requiredCount;

  // 检查是否是最后一人
  const isLastMember = isFull && pickedUpCount === validMembers.length - 1;

  // 【2026-01-25 多档位赠品】获取适用的档位
  const tierGifts = getTierGifts(validMembers.length, groupBuy.config?.memberGiftsJson || null);
  const isLeader = member.reservationId === groupBuy.initiatorId;

  // 构建赠品信息
  const memberGiftName = tierGifts?.memberGifts.join('+') || groupBuy.bonusGiftName;
  const leaderGiftName = tierGifts?.leaderGift || null;
  const leaderGiftCount = tierGifts?.leaderCount || 0;

  // 更新成员状态
  await prisma.$transaction(async (tx) => {
    // 标记成员已提货，并记录赠品信息
    await tx.groupBuyMember.update({
      where: { id: member.id },
      data: {
        status: GroupBuyMemberStatus.PICKED_UP,
        pickedUpAt: new Date(),
        // 【2026-01-25】记录实际分配的赠品
        memberGiftName: memberGiftName,
        leaderGiftName: isLeader ? leaderGiftName : null,
        leaderGiftCount: isLeader ? leaderGiftCount : null,
      },
    });

    // 如果是最后一人且满足成团条件，更新拼团状态为已完成
    if (isLastMember) {
      await tx.groupBuy.update({
        where: { id: groupBuy.id },
        data: {
          status: GroupBuyStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
    }
  });

  return {
    success: true,
    isLastMember,
    shouldDeliverBonusGift: isLastMember && isFull,
    bonusGiftName: groupBuy.bonusGiftName,
    // 【2026-01-25】多档位赠品信息
    memberGiftName,
    leaderGiftName,
    leaderGiftCount,
    isLeader,
  };
}

/**
 * 发放拼团赠品
 * 在最后一人提货时调用
 */
export async function deliverBonusGift(
  groupBuyId: number,
  operatorId: number
): Promise<{ success: boolean; message?: string }> {
  const groupBuy = await prisma.groupBuy.findUnique({
    where: { id: groupBuyId },
    include: {
      members: {
        where: {
          status: GroupBuyMemberStatus.PICKED_UP,
        },
      },
    },
  });

  if (!groupBuy) {
    return { success: false, message: '拼团不存在' };
  }

  if (groupBuy.status !== GroupBuyStatus.COMPLETED) {
    return { success: false, message: '拼团尚未完成' };
  }

  // 检查是否所有人都已提货
  if (groupBuy.members.length < groupBuy.requiredCount) {
    return { success: false, message: '未满足成团人数，无法发放赠品' };
  }

  // 检查是否已发放
  const alreadyDelivered = groupBuy.members.some((m) => m.bonusGiftDelivered);
  if (alreadyDelivered) {
    return { success: false, message: '赠品已发放' };
  }

  // 标记所有成员的赠品已发放
  await prisma.groupBuyMember.updateMany({
    where: {
      groupBuyId: groupBuy.id,
      status: GroupBuyMemberStatus.PICKED_UP,
    },
    data: {
      bonusGiftDelivered: true,
    },
  });

  return { success: true };
}

/**
 * 获取门店待发放拼团赠品的列表
 */
export async function getPendingBonusGifts(storeId: number) {
  const groupBuys = await prisma.groupBuy.findMany({
    where: {
      storeId,
      status: GroupBuyStatus.COMPLETED,
      members: {
        some: {
          bonusGiftDelivered: false,
          status: GroupBuyMemberStatus.PICKED_UP,
        },
      },
    },
    include: {
      members: {
        where: {
          status: GroupBuyMemberStatus.PICKED_UP,
        },
      },
    },
    orderBy: { completedAt: 'asc' },
  });

  return groupBuys.map((g) => ({
    id: g.id,
    code: g.code,
    bonusGiftName: g.bonusGiftName,
    memberCount: g.members.length,
    completedAt: g.completedAt?.toISOString(),
    members: g.members.map((m) => ({
      id: m.id,
      customerName: m.customerName,
      customerPhone: m.customerPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
      bonusGiftDelivered: m.bonusGiftDelivered,
    })),
  }));
}

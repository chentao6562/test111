/**
 * 拼团核心服务
 * @module services/groupBuy/groupBuyService
 * @since 2026-01-21
 */

import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';
import {
  GroupBuyStatus,
  GroupBuyMemberStatus,
  CreateGroupBuyRequest,
  JoinGroupBuyRequest,
  GroupBuyDetailResponse,
  MyGroupBuyItem,
  GroupBuyConfigResponse,
  GroupBuyMemberInfo,
  TierGiftConfig,
  MultiTierGiftsConfig,
} from './types';

/**
 * 生成拼团码
 */
function generateGroupBuyCode(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `GB${timestamp}${random}`;
}

/**
 * 检查拼团功能是否启用
 */
export async function isGroupBuyEnabled(): Promise<boolean> {
  const config = await prisma.config.findUnique({
    where: { key: 'group_buy_enabled' },
  });
  return config?.value === 'true';
}

/**
 * 【2026-01-25 多档位拼团】解析多档位赠品配置
 * @param memberGiftsJson JSON字符串
 * @returns 解析后的配置或null
 */
export function parseMultiTierGifts(memberGiftsJson: string | null): MultiTierGiftsConfig | null {
  if (!memberGiftsJson) return null;
  try {
    const parsed = JSON.parse(memberGiftsJson);
    if (parsed && Array.isArray(parsed.tiers)) {
      return parsed as MultiTierGiftsConfig;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 【2026-01-25 多档位拼团】根据当前人数获取适用的档位赠品
 * @param currentCount 当前成团人数
 * @param memberGiftsJson 多档位配置JSON
 * @returns 匹配的档位配置，如果没有则返回null
 */
export function getTierGifts(
  currentCount: number,
  memberGiftsJson: string | null
): TierGiftConfig | null {
  const config = parseMultiTierGifts(memberGiftsJson);
  if (!config) return null;

  // 按人数从大到小排序，找到当前人数能匹配的最高档位
  const sortedTiers = [...config.tiers].sort((a, b) => b.count - a.count);
  for (const tier of sortedTiers) {
    if (currentCount >= tier.count) {
      return tier;
    }
  }
  return null;
}

/**
 * 【2026-01-25 多档位拼团】获取所有可用的成团档位
 * @param memberGiftsJson 多档位配置JSON
 * @returns 所有档位信息
 */
export function getAllTiers(memberGiftsJson: string | null): TierGiftConfig[] {
  const config = parseMultiTierGifts(memberGiftsJson);
  if (!config) return [];
  return [...config.tiers].sort((a, b) => a.count - b.count);
}

/**
 * 获取拼团配置
 */
export async function getGroupBuyConfig(): Promise<GroupBuyConfigResponse> {
  const enabled = await isGroupBuyEnabled();

  // 获取系统配置
  const [requiredCountConfig, minAmountConfig, formingHoursConfig] = await Promise.all([
    prisma.config.findUnique({ where: { key: 'group_buy_required_count' } }),
    prisma.config.findUnique({ where: { key: 'group_buy_min_amount' } }),
    prisma.config.findUnique({ where: { key: 'group_buy_forming_hours' } }),
  ]);

  const requiredCount = parseInt(requiredCountConfig?.value || '3', 10);
  const minAmount = parseFloat(minAmountConfig?.value || '200');
  const formingHours = parseInt(formingHoursConfig?.value || '24', 10);

  // 获取当前有效的拼团活动配置
  const now = new Date();
  const activeConfig = await prisma.groupBuyConfig.findFirst({
    where: {
      isActive: true,
      OR: [
        { startTime: null },
        { startTime: { lte: now } },
      ],
      AND: [
        {
          OR: [
            { endTime: null },
            { endTime: { gte: now } },
          ],
        },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  // 【2026-01-25】解析多档位配置
  let tiers: TierGiftConfig[] | undefined;
  if (activeConfig?.memberGiftsJson) {
    try {
      const parsed = JSON.parse(activeConfig.memberGiftsJson);
      if (parsed.tiers && Array.isArray(parsed.tiers)) {
        tiers = parsed.tiers;
      }
    } catch (e) {
      console.error('解析多档位配置失败:', e);
    }
  }

  return {
    enabled,
    requiredCount: activeConfig?.requiredCount || requiredCount,
    minAmount: activeConfig ? Number(activeConfig.minAmount) : minAmount,
    formingHours: activeConfig?.formingHours || formingHours,
    bonusGiftName: activeConfig?.bonusGiftName || null,
    activeConfig: activeConfig ? {
      id: activeConfig.id,
      name: activeConfig.name,
      requiredCount: activeConfig.requiredCount,
      minAmount: Number(activeConfig.minAmount),
      bonusGiftName: activeConfig.bonusGiftName,
      startTime: activeConfig.startTime?.toISOString() || null,
      endTime: activeConfig.endTime?.toISOString() || null,
    } : null,
    tiers,  // 【2026-01-25】返回可选的人数档位
  };
}

/**
 * 发起拼团
 */
export async function createGroupBuy(
  request: CreateGroupBuyRequest
): Promise<{ success: boolean; code?: string; message?: string }> {
  const { reservationId, requiredCount: requestedCount } = request;

  // 检查功能是否启用
  const enabled = await isGroupBuyEnabled();
  if (!enabled) {
    return { success: false, message: '拼团功能暂未开放' };
  }

  // 获取预约信息
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      store: true,
      groupBuyMember: true,
      items: true, // 【2026-01-26】用于计算排除特价商品后的金额
    },
  });

  if (!reservation) {
    return { success: false, message: '预约不存在' };
  }

  // 检查预约状态（必须已确认）
  if (reservation.status < 2) {
    return { success: false, message: '预约尚未确认，无法发起拼团' };
  }

  if (reservation.status >= 3) {
    return { success: false, message: '预约已完成或已取消，无法发起拼团' };
  }

  // 检查是否已加入拼团（只检查JOINED状态，已退出的可以二次发起）
  if (reservation.groupBuyMember && reservation.groupBuyMember.status === GroupBuyMemberStatus.JOINED) {
    return { success: false, message: '该预约已参与拼团' };
  }

  // 获取拼团配置
  const config = await getGroupBuyConfig();

  // 【2026-01-26】计算排除特价商品后的金额和特价比例
  const itemProductIds = reservation.items.map(item => item.productId);
  const productsInfo = await prisma.product.findMany({
    where: { id: { in: itemProductIds } },
    select: { id: true, isSpecialPrice: true },
  });
  let groupBuyEligibleAmount = 0;
  let specialPriceAmount = 0;
  for (const item of reservation.items) {
    const product = productsInfo.find(p => p.id === item.productId);
    const itemAmount = Number(item.price) * item.quantity;
    if (product?.isSpecialPrice) {
      specialPriceAmount += itemAmount;
    } else {
      groupBuyEligibleAmount += itemAmount;
    }
  }

  // 【2026-01-26】检查特价商品比例（≥80%不能参与拼团）
  const totalAmount = Number(reservation.totalAmount);
  if (totalAmount > 0) {
    const specialPriceRatio = specialPriceAmount / totalAmount;
    if (specialPriceRatio >= 0.8) {
      return {
        success: false,
        message: `特价商品金额占比${(specialPriceRatio * 100).toFixed(0)}%（≥80%），无法参与拼团`
      };
    }
  }

  // 检查金额门槛（使用排除特价商品后的金额）
  if (groupBuyEligibleAmount < config.minAmount) {
    return { success: false, message: `非特价商品金额需满${config.minAmount}元才能发起拼团，当前¥${groupBuyEligibleAmount.toFixed(2)}` };
  }

  // 获取有效的拼团配置
  const now = new Date();
  const groupBuyConfigRecord = await prisma.groupBuyConfig.findFirst({
    where: {
      isActive: true,
      OR: [
        { startTime: null },
        { startTime: { lte: now } },
      ],
      AND: [
        {
          OR: [
            { endTime: null },
            { endTime: { gte: now } },
          ],
        },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!groupBuyConfigRecord) {
    return { success: false, message: '当前没有进行中的拼团活动' };
  }

  // 【2026-01-25】确定成团人数：优先使用用户选择，否则使用活动配置
  let finalRequiredCount = groupBuyConfigRecord.requiredCount;
  if (requestedCount) {
    // 验证人数是否在有效档位中
    if (groupBuyConfigRecord.memberGiftsJson) {
      try {
        const parsed = JSON.parse(groupBuyConfigRecord.memberGiftsJson);
        const validCounts = parsed.tiers?.map((t: any) => t.count) || [];
        if (validCounts.length > 0 && !validCounts.includes(requestedCount)) {
          return { success: false, message: `无效的拼团人数，请选择 ${validCounts.join('/')} 人团` };
        }
      } catch (e) {
        console.error('解析多档位配置失败:', e);
      }
    }
    finalRequiredCount = requestedCount;
  }

  // 生成拼团码
  const code = generateGroupBuyCode();

  // 计算过期时间
  const expireAt = new Date();
  expireAt.setHours(expireAt.getHours() + config.formingHours);

  // 创建拼团（使用事务）
  try {
    const groupBuy = await prisma.$transaction(async (tx) => {
      // 先删除该预约的旧成员记录（如果有QUIT状态的）
      // 因为reservationId有唯一约束，需要先清理旧记录才能创建新记录
      await tx.groupBuyMember.deleteMany({
        where: {
          reservationId,
          status: GroupBuyMemberStatus.QUIT,
        },
      });

      // 创建拼团（包含区域信息）
      const newGroupBuy = await tx.groupBuy.create({
        data: {
          code,
          initiatorId: reservationId,
          initiatorPhone: reservation.customerPhone,
          initiatorName: reservation.customerName,
          configId: groupBuyConfigRecord.id,
          requiredCount: finalRequiredCount,  // 【2026-01-25】使用用户选择的人数
          bonusGiftName: groupBuyConfigRecord.bonusGiftName,
          storeId: reservation.storeId,
          pickupDate: reservation.pickupDate,
          // 【2026-01-21 顺路拼团】继承预约的区域信息
          regionId: reservation.regionId,
          regionName: reservation.regionName,
          status: GroupBuyStatus.FORMING,
          currentCount: 1,
          expireAt,
        },
      });

      // 创建发起人成员记录
      await tx.groupBuyMember.create({
        data: {
          groupBuyId: newGroupBuy.id,
          reservationId,
          customerPhone: reservation.customerPhone,
          customerName: reservation.customerName,
          status: GroupBuyMemberStatus.JOINED,
        },
      });

      return newGroupBuy;
    });

    return { success: true, code: groupBuy.code };
  } catch (error) {
    console.error('创建拼团失败:', error);
    return { success: false, message: '创建拼团失败，请重试' };
  }
}

/**
 * 加入拼团
 */
export async function joinGroupBuy(
  request: JoinGroupBuyRequest
): Promise<{ success: boolean; message?: string }> {
  const { reservationId, groupCode } = request;

  // 检查功能是否启用
  const enabled = await isGroupBuyEnabled();
  if (!enabled) {
    return { success: false, message: '拼团功能暂未开放' };
  }

  // 获取拼团
  const groupBuy = await prisma.groupBuy.findUnique({
    where: { code: groupCode },
    include: {
      members: true,
      store: true,
    },
  });

  if (!groupBuy) {
    return { success: false, message: '拼团不存在' };
  }

  // 检查拼团状态
  if (groupBuy.status === GroupBuyStatus.EXPIRED) {
    return { success: false, message: '该拼团已过期' };
  }

  if (groupBuy.status === GroupBuyStatus.CANCELLED) {
    return { success: false, message: '该拼团已取消' };
  }

  if (groupBuy.status === GroupBuyStatus.FULL || groupBuy.status === GroupBuyStatus.COMPLETED) {
    return { success: false, message: '该拼团已满员' };
  }

  // 检查是否过期
  if (new Date() > groupBuy.expireAt) {
    // 更新状态为过期
    await prisma.groupBuy.update({
      where: { id: groupBuy.id },
      data: { status: GroupBuyStatus.EXPIRED },
    });
    return { success: false, message: '该拼团已过期' };
  }

  // 获取预约信息
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      groupBuyMember: true,
      items: true, // 【2026-01-26】用于计算排除特价商品后的金额
    },
  });

  if (!reservation) {
    return { success: false, message: '预约不存在' };
  }

  // 检查预约状态
  if (reservation.status < 2) {
    return { success: false, message: '预约尚未确认，无法加入拼团' };
  }

  if (reservation.status >= 3) {
    return { success: false, message: '预约已完成或已取消，无法加入拼团' };
  }

  // 检查是否已加入拼团（只检查JOINED状态，已退出的可以二次加入）
  if (reservation.groupBuyMember && reservation.groupBuyMember.status === GroupBuyMemberStatus.JOINED) {
    return { success: false, message: '该预约已参与其他拼团' };
  }

  // 检查门店是否一致
  if (reservation.storeId !== groupBuy.storeId) {
    return { success: false, message: '提货门店不一致，无法加入此拼团' };
  }

  // 检查提货日期是否一致（必须同一天）
  const groupPickupDate = groupBuy.pickupDate.toISOString().split('T')[0];
  const reservationPickupDate = reservation.pickupDate.toISOString().split('T')[0];
  if (groupPickupDate !== reservationPickupDate) {
    return { success: false, message: '提货日期不一致，必须与拼团约定日期相同' };
  }

  // 【2026-01-21 顺路拼团】检查区域是否一致（如果拼团有区域限制）
  if (groupBuy.regionId) {
    if (!reservation.regionId) {
      return { success: false, message: '该拼团限定区域，请先在预约中选择您的区域' };
    }
    if (reservation.regionId !== groupBuy.regionId) {
      return { success: false, message: `该拼团限定"${groupBuy.regionName}"区域的客户参加` };
    }
  }

  // 【2026-01-26】计算排除特价商品后的金额和特价比例
  const config = await getGroupBuyConfig();
  const joinItemProductIds = reservation.items.map(item => item.productId);
  const joinProductsInfo = await prisma.product.findMany({
    where: { id: { in: joinItemProductIds } },
    select: { id: true, isSpecialPrice: true },
  });
  let joinGroupBuyEligibleAmount = 0;
  let joinSpecialPriceAmount = 0;
  for (const item of reservation.items) {
    const product = joinProductsInfo.find(p => p.id === item.productId);
    const itemAmount = Number(item.price) * item.quantity;
    if (product?.isSpecialPrice) {
      joinSpecialPriceAmount += itemAmount;
    } else {
      joinGroupBuyEligibleAmount += itemAmount;
    }
  }

  // 【2026-01-26】检查特价商品比例（≥80%不能参与拼团）
  const joinTotalAmount = Number(reservation.totalAmount);
  if (joinTotalAmount > 0) {
    const joinSpecialPriceRatio = joinSpecialPriceAmount / joinTotalAmount;
    if (joinSpecialPriceRatio >= 0.8) {
      return {
        success: false,
        message: `特价商品金额占比${(joinSpecialPriceRatio * 100).toFixed(0)}%（≥80%），无法加入拼团`
      };
    }
  }

  // 检查金额门槛（使用排除特价商品后的金额）
  if (joinGroupBuyEligibleAmount < config.minAmount) {
    return { success: false, message: `非特价商品金额需满${config.minAmount}元才能加入拼团，当前¥${joinGroupBuyEligibleAmount.toFixed(2)}` };
  }

  // 加入拼团（使用事务）
  try {
    await prisma.$transaction(async (tx) => {
      // 先删除该预约的旧成员记录（如果有QUIT状态的）
      // 因为reservationId有唯一约束，需要先清理旧记录才能创建新记录
      await tx.groupBuyMember.deleteMany({
        where: {
          reservationId,
          status: GroupBuyMemberStatus.QUIT,
        },
      });

      // 创建成员记录
      await tx.groupBuyMember.create({
        data: {
          groupBuyId: groupBuy.id,
          reservationId,
          customerPhone: reservation.customerPhone,
          customerName: reservation.customerName,
          status: GroupBuyMemberStatus.JOINED,
        },
      });

      // 更新拼团人数
      const newCount = groupBuy.currentCount + 1;
      const newStatus = newCount >= groupBuy.requiredCount
        ? GroupBuyStatus.FULL
        : GroupBuyStatus.FORMING;

      await tx.groupBuy.update({
        where: { id: groupBuy.id },
        data: {
          currentCount: newCount,
          status: newStatus,
        },
      });
    });

    return { success: true };
  } catch (error) {
    console.error('加入拼团失败:', error);
    if ((error as any).code === 'P2002') {
      return { success: false, message: '该预约已参与拼团' };
    }
    return { success: false, message: '加入拼团失败，请重试' };
  }
}

/**
 * 获取拼团详情
 */
export async function getGroupBuyByCode(code: string): Promise<GroupBuyDetailResponse | null> {
  const groupBuy = await prisma.groupBuy.findUnique({
    where: { code },
    include: {
      store: true,
      members: {
        orderBy: { joinedAt: 'asc' },
      },
      config: true,  // 【2026-01-25】获取关联的活动配置
    },
  });

  if (!groupBuy) {
    return null;
  }

  // 检查并更新过期状态
  if (groupBuy.status === GroupBuyStatus.FORMING && new Date() > groupBuy.expireAt) {
    await prisma.groupBuy.update({
      where: { id: groupBuy.id },
      data: { status: GroupBuyStatus.EXPIRED },
    });
    groupBuy.status = GroupBuyStatus.EXPIRED;
  }

  const members: GroupBuyMemberInfo[] = groupBuy.members.map((m) => ({
    id: m.id,
    customerName: m.customerName,
    customerPhone: m.customerPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'), // 脱敏
    status: m.status as any,
    joinedAt: m.joinedAt.toISOString(),
    pickedUpAt: m.pickedUpAt?.toISOString() || null,
    bonusGiftDelivered: m.bonusGiftDelivered,
  }));

  // 【2026-01-25】获取多档位赠品阶梯
  const giftTiers = getAllTiers(groupBuy.config?.memberGiftsJson || null);

  return {
    id: groupBuy.id,
    code: groupBuy.code,
    initiatorName: groupBuy.initiatorName,
    initiatorPhone: groupBuy.initiatorPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
    requiredCount: groupBuy.requiredCount,
    currentCount: groupBuy.currentCount,
    bonusGiftName: groupBuy.bonusGiftName,
    pickupDate: groupBuy.pickupDate.toISOString().split('T')[0],
    storeName: groupBuy.store.name,
    storeAddress: groupBuy.store.address,
    regionName: groupBuy.regionName,  // 【2026-01-21】添加区域信息
    status: groupBuy.status as any,
    expireAt: groupBuy.expireAt.toISOString(),
    members,
    giftTiers: giftTiers.length > 0 ? giftTiers : undefined,  // 【2026-01-25】多档位赠品阶梯
  };
}

/**
 * 获取我的拼团列表
 */
export async function getMyGroupBuys(customerPhone: string): Promise<MyGroupBuyItem[]> {
  // 查找我参与的所有拼团（前台不显示已取消的拼团和已退出的成员）
  const members = await prisma.groupBuyMember.findMany({
    where: {
      customerPhone,
      // 只查询未退出的成员记录
      status: { not: GroupBuyMemberStatus.QUIT },
    },
    include: {
      groupBuy: true,
    },
    orderBy: { joinedAt: 'desc' },
  });

  // 过滤掉已取消的拼团
  return members
    .filter((m) => m.groupBuy.status !== GroupBuyStatus.CANCELLED)
    .map((m) => ({
      id: m.groupBuy.id,
      code: m.groupBuy.code,
      requiredCount: m.groupBuy.requiredCount,
      currentCount: m.groupBuy.currentCount,
      bonusGiftName: m.groupBuy.bonusGiftName,
      pickupDate: m.groupBuy.pickupDate.toISOString().split('T')[0],
      status: m.groupBuy.status as any,
      isInitiator: m.groupBuy.initiatorId === m.reservationId,
      expireAt: m.groupBuy.expireAt.toISOString(),
      regionName: m.groupBuy.regionName, // 【2026-01-26】添加区域名称
    }));
}

/**
 * 退出拼团
 */
export async function quitGroupBuy(
  groupCode: string,
  reservationId: number
): Promise<{ success: boolean; message?: string }> {
  const groupBuy = await prisma.groupBuy.findUnique({
    where: { code: groupCode },
    include: { members: true },
  });

  if (!groupBuy) {
    return { success: false, message: '拼团不存在' };
  }

  // 检查拼团状态
  if (groupBuy.status !== GroupBuyStatus.FORMING && groupBuy.status !== GroupBuyStatus.FULL) {
    return { success: false, message: '当前拼团状态不允许退出' };
  }

  // 检查是否是发起人 - 发起人可以取消整个拼团
  if (groupBuy.initiatorId === reservationId) {
    return cancelGroupBuyByInitiator(groupBuy);
  }

  // 查找成员记录
  const member = groupBuy.members.find((m) => m.reservationId === reservationId);
  if (!member) {
    return { success: false, message: '您不是该拼团成员' };
  }

  if (member.status === GroupBuyMemberStatus.PICKED_UP) {
    return { success: false, message: '已提货，无法退出' };
  }

  // 退出拼团（更新成员状态为QUIT，保留数据供后台查看）
  try {
    await prisma.$transaction([
      // 更新成员状态为已退出
      prisma.groupBuyMember.update({
        where: { id: member.id },
        data: { status: GroupBuyMemberStatus.QUIT },
      }),
      prisma.groupBuy.update({
        where: { id: groupBuy.id },
        data: {
          currentCount: { decrement: 1 },
          // 如果之前是满员状态，变回组队中
          status: groupBuy.status === GroupBuyStatus.FULL ? GroupBuyStatus.FORMING : groupBuy.status,
        },
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error('退出拼团失败:', error);
    return { success: false, message: '退出失败，请重试' };
  }
}

/**
 * 发起人取消拼团
 * 【重要】更新成员状态为QUIT，保留数据供后台查看
 */
async function cancelGroupBuyByInitiator(
  groupBuy: any
): Promise<{ success: boolean; message?: string }> {
  try {
    await prisma.$transaction([
      // 更新所有成员状态为已退出（保留数据供后台查看）
      prisma.groupBuyMember.updateMany({
        where: { groupBuyId: groupBuy.id },
        data: { status: GroupBuyMemberStatus.QUIT },
      }),
      // 更新拼团状态为已取消
      prisma.groupBuy.update({
        where: { id: groupBuy.id },
        data: { status: GroupBuyStatus.CANCELLED },
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error('取消拼团失败:', error);
    return { success: false, message: '取消失败，请重试' };
  }
}

/**
 * 通过手机号退出拼团
 */
export async function quitGroupBuyByPhone(
  groupCode: string,
  customerPhone: string
): Promise<{ success: boolean; message?: string }> {
  const groupBuy = await prisma.groupBuy.findUnique({
    where: { code: groupCode },
    include: { members: true },
  });

  if (!groupBuy) {
    return { success: false, message: '拼团不存在' };
  }

  // 检查拼团状态
  if (groupBuy.status !== GroupBuyStatus.FORMING && groupBuy.status !== GroupBuyStatus.FULL) {
    return { success: false, message: '当前拼团状态不允许退出' };
  }

  // 通过手机号查找成员
  const member = groupBuy.members.find((m) => m.customerPhone === customerPhone);
  if (!member) {
    return { success: false, message: '您不是该拼团成员' };
  }

  if (member.status === GroupBuyMemberStatus.QUIT) {
    return { success: false, message: '您已退出该拼团' };
  }

  if (member.status === GroupBuyMemberStatus.PICKED_UP) {
    return { success: false, message: '已提货，无法退出' };
  }

  // 检查是否是发起人
  if (groupBuy.initiatorPhone === customerPhone) {
    return cancelGroupBuyByInitiator(groupBuy);
  }

  // 退出拼团（更新成员状态为QUIT，保留数据供后台查看）
  try {
    await prisma.$transaction([
      // 更新成员状态为已退出
      prisma.groupBuyMember.update({
        where: { id: member.id },
        data: { status: GroupBuyMemberStatus.QUIT },
      }),
      prisma.groupBuy.update({
        where: { id: groupBuy.id },
        data: {
          currentCount: { decrement: 1 },
          // 如果之前是满员状态，变回组队中
          status: groupBuy.status === GroupBuyStatus.FULL ? GroupBuyStatus.FORMING : groupBuy.status,
        },
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error('退出拼团失败:', error);
    return { success: false, message: '退出失败，请重试' };
  }
}

/**
 * 检查并更新过期的拼团
 */
export async function checkAndExpireGroupBuys(): Promise<number> {
  const now = new Date();

  const result = await prisma.groupBuy.updateMany({
    where: {
      status: GroupBuyStatus.FORMING,
      expireAt: { lt: now },
    },
    data: {
      status: GroupBuyStatus.EXPIRED,
    },
  });

  return result.count;
}

/**
 * 【2026-01-21 顺路拼团】获取同区域可加入的拼团列表
 * @param regionId 区域ID（乡镇/街道级）
 * @param pickupDate 提货日期（可选，精确匹配）
 * @param storeId 门店ID（可选，精确匹配）
 */
export async function getNearbyGroupBuys(
  regionId: number,
  pickupDate?: string,
  storeId?: number
): Promise<any[]> {
  const now = new Date();

  const where: any = {
    status: GroupBuyStatus.FORMING,
    expireAt: { gt: now },
    regionId: regionId,
  };

  if (pickupDate) {
    // 按日期筛选（同一天）
    const date = new Date(pickupDate);
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));
    where.pickupDate = {
      gte: startOfDay,
      lte: endOfDay,
    };
  }

  if (storeId) {
    where.storeId = storeId;
  }

  const groupBuys = await prisma.groupBuy.findMany({
    where,
    include: {
      store: {
        select: { id: true, name: true },
      },
      members: {
        select: { id: true, customerName: true },
        orderBy: { joinedAt: 'asc' },
        take: 3, // 只取前3个成员名
      },
    },
    orderBy: { expireAt: 'asc' }, // 即将过期的优先
    take: 10, // 最多返回10个
  });

  return groupBuys.map((g) => ({
    id: g.id,
    code: g.code,
    initiatorName: g.initiatorName,
    regionName: g.regionName,
    storeName: g.store.name,
    pickupDate: g.pickupDate.toISOString().split('T')[0],
    requiredCount: g.requiredCount,
    currentCount: g.currentCount,
    remainingSlots: g.requiredCount - g.currentCount,
    bonusGiftName: g.bonusGiftName,
    expireAt: g.expireAt.toISOString(),
    members: g.members.map((m) => m.customerName),
  }));
}

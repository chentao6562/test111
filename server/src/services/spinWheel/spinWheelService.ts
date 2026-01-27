/**
 * 现金大转盘核心服务
 * @module services/spinWheel/spinWheelService
 * @since 2026-01-23
 */

import prisma from '../../utils/prisma';
import {
  SpinType,
  JoinSpinWheelRequest,
  SpinRequest,
  SpinWheelConfigResponse,
  ParticipationResponse,
  SpinResultResponse,
  SpinRecordItem,
  ShareDetailResponse,
  HelpRecordItem,
  PrizePoolItem,
} from './types';
import { spinWheel, getDefaultPrizePool } from './spinAlgorithm';

/**
 * 生成参与码
 */
function generateParticipationCode(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `SW${timestamp}${random}`;
}

/**
 * 脱敏手机号
 */
function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  return phone.substring(0, 3) + '****' + phone.substring(7);
}

/**
 * 检查并重置今日数据
 */
async function checkAndResetDailyData(participationId: number): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const participation = await prisma.spinWheelParticipation.findUnique({
    where: { id: participationId },
    include: { config: true },
  });

  if (!participation) return;

  const todayDate = participation.todayDate;
  const needReset = !todayDate || new Date(todayDate).getTime() < today.getTime();

  if (needReset) {
    await prisma.spinWheelParticipation.update({
      where: { id: participationId },
      data: {
        todaySpinCount: 0,
        todayHelpCount: 0,
        todayDate: today,
        remainingSpins: participation.config.freeSpinCount,
        shareBonus: false,
      },
    });
  }
}

/**
 * 获取当前有效的活动配置
 */
export async function getActiveConfig(): Promise<SpinWheelConfigResponse> {
  const now = new Date();

  const config = await prisma.spinWheelConfig.findFirst({
    where: {
      isActive: true,
      startTime: { lte: now },
      endTime: { gte: now },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!config) {
    return {
      enabled: false,
      config: null,
    };
  }

  let prizePool: PrizePoolItem[];
  try {
    prizePool = JSON.parse(config.prizePool);
  } catch {
    prizePool = getDefaultPrizePool();
  }

  return {
    enabled: true,
    config: {
      id: config.id,
      name: config.name,
      startTime: config.startTime.toISOString(),
      endTime: config.endTime.toISOString(),
      prizePool,
      redeemThreshold: Number(config.redeemThreshold),
      freeSpinCount: config.freeSpinCount,
      shareSpinCount: config.shareSpinCount,
      maxDailyHelp: config.maxDailyHelp,
      newUserHelpMin: Number(config.newUserHelpMin),
      newUserHelpMax: Number(config.newUserHelpMax),
      oldUserHelpMin: Number(config.oldUserHelpMin),
      oldUserHelpMax: Number(config.oldUserHelpMax),
    },
  };
}

/**
 * 加入活动
 */
export async function joinSpinWheel(
  request: JoinSpinWheelRequest
): Promise<{ success: boolean; participation?: ParticipationResponse; message?: string }> {
  const { phone, name, configId, salespersonId } = request;

  // 检查活动配置
  const config = await prisma.spinWheelConfig.findUnique({
    where: { id: configId },
  });

  if (!config || !config.isActive) {
    return { success: false, message: '活动不存在或已结束' };
  }

  const now = new Date();
  if (now < config.startTime || now > config.endTime) {
    return { success: false, message: '活动未开始或已结束' };
  }

  // 检查是否已参与
  const existing = await prisma.spinWheelParticipation.findUnique({
    where: {
      configId_phone: {
        configId,
        phone,
      },
    },
  });

  if (existing) {
    // 已参与，检查并重置今日数据
    await checkAndResetDailyData(existing.id);
    const participation = await getParticipationByCode(existing.code);
    return { success: true, participation: participation! };
  }

  // 创建新参与记录
  const code = generateParticipationCode();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const participation = await prisma.spinWheelParticipation.create({
    data: {
      code,
      configId,
      phone,
      name,
      salespersonId,
      todayDate: today,
      remainingSpins: config.freeSpinCount,
    },
  });

  const response = await getParticipationByCode(code);
  return { success: true, participation: response! };
}

/**
 * 根据参与码获取参与信息
 */
export async function getParticipationByCode(code: string): Promise<ParticipationResponse | null> {
  const participation = await prisma.spinWheelParticipation.findUnique({
    where: { code },
    include: { config: true },
  });

  if (!participation) return null;

  // 检查并重置今日数据
  await checkAndResetDailyData(participation.id);

  // 重新获取更新后的数据
  const updated = await prisma.spinWheelParticipation.findUnique({
    where: { code },
    include: { config: true },
  });

  if (!updated) return null;

  const totalAmount = Number(updated.totalAmount);
  const redeemedAmount = Number(updated.redeemedAmount);
  const expiredAmount = Number(updated.expiredAmount);
  const availableAmount = totalAmount - redeemedAmount - expiredAmount;
  const redeemThreshold = Number(updated.config.redeemThreshold);

  return {
    id: updated.id,
    code: updated.code,
    phone: maskPhone(updated.phone),
    name: updated.name,
    totalAmount,
    redeemedAmount,
    availableAmount,
    todaySpinCount: updated.todaySpinCount,
    todayHelpCount: updated.todayHelpCount,
    remainingSpins: updated.remainingSpins,
    canRedeem: availableAmount >= redeemThreshold,
    redeemThreshold,
    progressPercent: Math.min(100, Math.round((availableAmount / redeemThreshold) * 100)),
    shareBonus: updated.shareBonus,
    configId: updated.configId,
    createdAt: updated.createdAt.toISOString(),
  };
}

/**
 * 根据手机号获取参与信息
 */
export async function getParticipationByPhone(
  phone: string,
  configId: number
): Promise<ParticipationResponse | null> {
  const participation = await prisma.spinWheelParticipation.findUnique({
    where: {
      configId_phone: {
        configId,
        phone,
      },
    },
  });

  if (!participation) return null;

  return getParticipationByCode(participation.code);
}

/**
 * 抽奖
 */
export async function spin(request: SpinRequest): Promise<SpinResultResponse> {
  const { phone, configId } = request;

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
    return { success: false, message: '请先参与活动' };
  }

  // 检查并重置今日数据
  await checkAndResetDailyData(participation.id);

  // 重新获取更新后的数据
  const updated = await prisma.spinWheelParticipation.findUnique({
    where: { id: participation.id },
    include: { config: true },
  });

  if (!updated) {
    return { success: false, message: '参与记录不存在' };
  }

  // 检查抽奖次数
  if (updated.remainingSpins <= 0) {
    return { success: false, message: '今日抽奖次数已用完，邀请好友助力可获得更多次数' };
  }

  // 检查活动时间
  const now = new Date();
  if (now < updated.config.startTime || now > updated.config.endTime) {
    return { success: false, message: '活动未开始或已结束' };
  }

  // 获取奖池配置
  let prizePool: PrizePoolItem[];
  try {
    prizePool = JSON.parse(updated.config.prizePool);
  } catch {
    prizePool = getDefaultPrizePool();
  }

  // 执行抽奖算法
  const result = spinWheel({
    spinCount: updated.spinCount,
    totalAmount: Number(updated.totalAmount),
    redeemThreshold: Number(updated.config.redeemThreshold),
    prizePool,
  });

  // 计算过期时间
  const expireAt = updated.config.fragmentExpireDays > 0
    ? new Date(now.getTime() + updated.config.fragmentExpireDays * 24 * 60 * 60 * 1000)
    : null;

  // 更新数据库（事务）
  const [, updatedParticipation] = await prisma.$transaction([
    // 创建抽奖记录
    prisma.spinWheelRecord.create({
      data: {
        participationId: updated.id,
        configId,
        prizeName: result.prizeName,
        prizeAmount: result.prizeAmount,
        spinType: SpinType.FREE,
        expireAt,
      },
    }),
    // 更新参与记录
    prisma.spinWheelParticipation.update({
      where: { id: updated.id },
      data: {
        totalAmount: { increment: result.prizeAmount },
        spinCount: { increment: 1 },
        todaySpinCount: { increment: 1 },
        remainingSpins: { decrement: 1 },
      },
    }),
  ]);

  return {
    success: true,
    prizeName: result.prizeName,
    prizeAmount: result.prizeAmount,
    totalAmount: Number(updatedParticipation.totalAmount),
    remainingSpins: updatedParticipation.remainingSpins,
    prizeIndex: result.prizeIndex,
  };
}

/**
 * 分享获得抽奖次数
 */
export async function shareForSpins(
  phone: string,
  configId: number
): Promise<{ success: boolean; spinsAdded?: number; message?: string }> {
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
    return { success: false, message: '请先参与活动' };
  }

  // 检查并重置今日数据
  await checkAndResetDailyData(participation.id);

  // 重新获取
  const updated = await prisma.spinWheelParticipation.findUnique({
    where: { id: participation.id },
    include: { config: true },
  });

  if (!updated) {
    return { success: false, message: '参与记录不存在' };
  }

  if (updated.shareBonus) {
    return { success: false, message: '今日已获得分享奖励' };
  }

  const spinsAdded = updated.config.shareSpinCount;

  await prisma.spinWheelParticipation.update({
    where: { id: updated.id },
    data: {
      remainingSpins: { increment: spinsAdded },
      shareBonus: true,
    },
  });

  return { success: true, spinsAdded };
}

/**
 * 获取抽奖记录
 */
export async function getSpinRecords(
  phone: string,
  configId: number,
  params: { page?: number; pageSize?: number }
): Promise<{ list: SpinRecordItem[]; total: number }> {
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

  const [records, total] = await Promise.all([
    prisma.spinWheelRecord.findMany({
      where: { participationId: participation.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.spinWheelRecord.count({
      where: { participationId: participation.id },
    }),
  ]);

  const list: SpinRecordItem[] = records.map(record => ({
    id: record.id,
    prizeName: record.prizeName,
    prizeAmount: Number(record.prizeAmount),
    spinType: record.spinType as any,
    isExpired: record.isExpired,
    createdAt: record.createdAt.toISOString(),
  }));

  return { list, total };
}

/**
 * 获取分享页详情
 */
export async function getShareDetail(code: string): Promise<ShareDetailResponse | null> {
  const participation = await prisma.spinWheelParticipation.findUnique({
    where: { code },
    include: {
      config: true,
      helpsReceived: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });

  if (!participation) return null;

  const totalAmount = Number(participation.totalAmount);
  const redeemedAmount = Number(participation.redeemedAmount);
  const expiredAmount = Number(participation.expiredAmount);
  const redeemThreshold = Number(participation.config.redeemThreshold);

  const helpRecords: HelpRecordItem[] = participation.helpsReceived.map(help => ({
    id: help.id,
    helperPhone: maskPhone(help.helperPhone),
    helperName: help.helperName,
    helpAmount: Number(help.helpAmount),
    isNewUser: help.isNewUser,
    createdAt: help.createdAt.toISOString(),
  }));

  return {
    participation: {
      code: participation.code,
      phone: maskPhone(participation.phone),
      name: participation.name,
      totalAmount,
      progressPercent: Math.min(100, Math.round(((totalAmount - redeemedAmount - expiredAmount) / redeemThreshold) * 100)),
    },
    config: {
      name: participation.config.name,
      endTime: participation.config.endTime.toISOString(),
    },
    helpRecords,
  };
}

/**
 * 检查碎片过期（定时任务使用）
 */
export async function checkAndExpireFragments(): Promise<number> {
  const now = new Date();

  // 查找需要过期的记录
  const expiredRecords = await prisma.spinWheelRecord.findMany({
    where: {
      isExpired: false,
      expireAt: { lt: now },
    },
    include: {
      participation: true,
    },
  });

  let totalExpired = 0;

  for (const record of expiredRecords) {
    await prisma.$transaction([
      // 标记记录为已过期
      prisma.spinWheelRecord.update({
        where: { id: record.id },
        data: { isExpired: true },
      }),
      // 增加过期金额
      prisma.spinWheelParticipation.update({
        where: { id: record.participationId },
        data: {
          expiredAmount: { increment: Number(record.prizeAmount) },
        },
      }),
    ]);

    totalExpired++;
  }

  if (totalExpired > 0) {
    console.log(`[转盘碎片过期任务] 已过期 ${totalExpired} 条记录`);
  }

  return totalExpired;
}

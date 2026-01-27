/**
 * 现金大转盘风控服务
 * @module services/spinWheel/spinWheelRiskService
 * @since 2026-01-23
 */

import prisma from '../../utils/prisma';
import { BlacklistType, BlacklistTypeValue } from './types';

/**
 * 检查是否在黑名单中
 */
export async function isBlacklisted(
  phone?: string,
  ipAddress?: string,
  deviceId?: string
): Promise<boolean> {
  const now = new Date();
  const conditions: any[] = [];

  if (phone) {
    conditions.push({
      type: BlacklistType.PHONE,
      value: phone,
      OR: [
        { expireAt: null },
        { expireAt: { gt: now } },
      ],
    });
  }

  if (ipAddress) {
    conditions.push({
      type: BlacklistType.IP,
      value: ipAddress,
      OR: [
        { expireAt: null },
        { expireAt: { gt: now } },
      ],
    });
  }

  if (deviceId) {
    conditions.push({
      type: BlacklistType.DEVICE,
      value: deviceId,
      OR: [
        { expireAt: null },
        { expireAt: { gt: now } },
      ],
    });
  }

  if (conditions.length === 0) {
    return false;
  }

  const blacklist = await prisma.spinWheelBlacklist.findFirst({
    where: {
      OR: conditions,
    },
  });

  return !!blacklist;
}

/**
 * 添加到黑名单
 */
export async function addToBlacklist(params: {
  type: BlacklistTypeValue;
  value: string;
  reason?: string;
  expireHours?: number;
  expireAt?: Date;
  createdBy?: number;
}): Promise<any> {
  const { type, value, reason, expireHours, expireAt: customExpireAt, createdBy } = params;

  const expireAt = customExpireAt
    ? customExpireAt
    : expireHours
    ? new Date(Date.now() + expireHours * 60 * 60 * 1000)
    : null;

  const result = await prisma.spinWheelBlacklist.upsert({
    where: {
      type_value: {
        type,
        value,
      },
    },
    update: {
      reason,
      expireAt,
    },
    create: {
      type,
      value,
      reason,
      expireAt,
      createdBy: createdBy ?? 0, // 默认为0表示系统操作
    },
  });

  return result;
}

/**
 * 从黑名单移除（按ID）
 */
export async function removeFromBlacklist(id: number): Promise<boolean> {
  try {
    await prisma.spinWheelBlacklist.delete({
      where: { id },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取黑名单列表（管理后台）
 */
export async function getBlacklist(params: {
  page?: number;
  pageSize?: number;
  type?: string;
  keyword?: string;
}): Promise<{ list: any[]; total: number; page: number; pageSize: number }> {
  const { page = 1, pageSize = 20, type, keyword } = params;

  const where: any = {};
  if (type) {
    where.type = type;
  }
  if (keyword) {
    where.value = { contains: keyword };
  }

  const [total, list] = await Promise.all([
    prisma.spinWheelBlacklist.count({ where }),
    prisma.spinWheelBlacklist.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    list,
    total,
    page,
    pageSize,
  };
}

/**
 * 检查风险等级
 * 返回0=正常, 1=警告, 2=拒绝
 */
export async function checkRiskLevel(
  phone: string,
  ipAddress?: string,
  deviceId?: string
): Promise<{ level: number; reason?: string }> {
  // 1. 检查黑名单
  if (await isBlacklisted(phone, ipAddress, deviceId)) {
    return { level: 2, reason: '黑名单用户' };
  }

  // 2. 检查今日操作频率
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 检查今日助力次数
  const todayHelpCount = await prisma.spinWheelHelp.count({
    where: {
      helperPhone: phone,
      createdAt: { gte: today },
    },
  });

  if (todayHelpCount >= 10) {
    return { level: 1, reason: '今日助力次数过多' };
  }

  // 3. 检查同IP今日操作
  if (ipAddress) {
    const sameIpCount = await prisma.spinWheelHelp.count({
      where: {
        ipAddress,
        createdAt: { gte: today },
      },
    });

    if (sameIpCount >= 50) {
      return { level: 2, reason: 'IP异常' };
    }

    if (sameIpCount >= 20) {
      return { level: 1, reason: 'IP操作频繁' };
    }
  }

  // 4. 检查同设备今日操作
  if (deviceId) {
    const sameDeviceCount = await prisma.spinWheelHelp.count({
      where: {
        deviceId,
        createdAt: { gte: today },
      },
    });

    if (sameDeviceCount >= 30) {
      return { level: 2, reason: '设备异常' };
    }

    if (sameDeviceCount >= 15) {
      return { level: 1, reason: '设备操作频繁' };
    }
  }

  return { level: 0 };
}

/**
 * 清理过期黑名单
 */
export async function cleanExpiredBlacklist(): Promise<number> {
  const result = await prisma.spinWheelBlacklist.deleteMany({
    where: {
      expireAt: {
        lt: new Date(),
        not: null,
      },
    },
  });

  if (result.count > 0) {
    console.log(`[转盘风控] 清理过期黑名单 ${result.count} 条`);
  }

  return result.count;
}

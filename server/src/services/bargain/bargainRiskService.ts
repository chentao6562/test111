/**
 * 砍价风控服务
 * @module services/bargain/bargainRiskService
 * @since 2026-01-22
 */

import prisma from '../../utils/prisma';
import { RiskCheckResult, AddBlacklistRequest, BlacklistType } from './types';

// 【2026-01-23 R-01修复】加强风控限制配置
const RISK_LIMITS = {
  PHONE_DAILY_LIMIT: 3,      // 同一手机号每天最多帮砍3次（从5降到3）
  IP_DAILY_LIMIT: 5,         // 同一IP每天最多帮砍5次（从10降到5）
  DEVICE_DAILY_LIMIT: 5,     // 同一设备每天最多帮砍5次（从10降到5）
  IP_HOURLY_LIMIT: 10,       // 同一IP每小时最多帮砍10次（从20降到10，触发自动封禁）
  MIN_HELP_INTERVAL: 3000,   // 【新增】最小帮砍间隔（毫秒），防止机器刷
  MAX_BARGAINS_PER_DEVICE_HOUR: 5, // 【新增】单设备每小时帮砍不同砍价的上限
};

/**
 * 检查是否在黑名单中
 */
export async function isBlacklisted(params: {
  phone?: string;
  ipAddress?: string;
  deviceId?: string;
}): Promise<{ blocked: boolean; reason?: string }> {
  const { phone, ipAddress, deviceId } = params;
  const now = new Date();

  const conditions: any[] = [];

  if (phone) {
    conditions.push({
      type: BlacklistType.PHONE,
      value: phone,
      OR: [{ expireAt: null }, { expireAt: { gt: now } }],
    });
  }

  if (ipAddress) {
    conditions.push({
      type: BlacklistType.IP,
      value: ipAddress,
      OR: [{ expireAt: null }, { expireAt: { gt: now } }],
    });
  }

  if (deviceId) {
    conditions.push({
      type: BlacklistType.DEVICE,
      value: deviceId,
      OR: [{ expireAt: null }, { expireAt: { gt: now } }],
    });
  }

  if (conditions.length === 0) {
    return { blocked: false };
  }

  const blacklistEntry = await prisma.bargainBlacklist.findFirst({
    where: { OR: conditions },
  });

  if (blacklistEntry) {
    return {
      blocked: true,
      reason: blacklistEntry.reason || '您已被限制参与砍价活动',
    };
  }

  return { blocked: false };
}

/**
 * 检查帮砍频率限制
 * 【2026-01-23 R-01修复】增加异常行为检测
 */
async function checkFrequencyLimits(params: {
  phone: string;
  ipAddress?: string;
  deviceId?: string;
}): Promise<{ passed: boolean; reason?: string }> {
  const { phone, ipAddress, deviceId } = params;

  // 获取今天0点
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 获取1小时前
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // 【新增】检查帮砍时间间隔（防止机器刷）
  const lastCut = await prisma.bargainCut.findFirst({
    where: { helperPhone: phone },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
  if (lastCut) {
    const intervalMs = Date.now() - lastCut.createdAt.getTime();
    if (intervalMs < RISK_LIMITS.MIN_HELP_INTERVAL) {
      console.warn(`[砍价风控] 检测到快速帮砍: phone=${phone}, interval=${intervalMs}ms`);
      return { passed: false, reason: '操作过于频繁，请稍后再试' };
    }
  }

  // 检查手机号每日限制
  const phoneCount = await prisma.bargainCut.count({
    where: {
      helperPhone: phone,
      createdAt: { gte: today },
    },
  });
  if (phoneCount >= RISK_LIMITS.PHONE_DAILY_LIMIT) {
    return { passed: false, reason: '今日帮砍次数已达上限' };
  }

  // 检查IP每日限制
  if (ipAddress) {
    const ipDailyCount = await prisma.bargainCut.count({
      where: {
        ipAddress,
        createdAt: { gte: today },
      },
    });
    if (ipDailyCount >= RISK_LIMITS.IP_DAILY_LIMIT) {
      return { passed: false, reason: '当前网络环境帮砍次数已达上限' };
    }

    // 检查IP每小时限制（触发自动封禁）
    const ipHourlyCount = await prisma.bargainCut.count({
      where: {
        ipAddress,
        createdAt: { gte: oneHourAgo },
      },
    });
    if (ipHourlyCount >= RISK_LIMITS.IP_HOURLY_LIMIT) {
      // 自动加入黑名单24小时
      await addToBlacklist({
        type: BlacklistType.IP,
        value: ipAddress,
        reason: '异常行为：1小时内帮砍次数过多',
        expireHours: 24,
        operatorId: 0, // 系统自动
      });
      return { passed: false, reason: '检测到异常行为，请稍后再试' };
    }
  }

  // 检查设备每日限制
  if (deviceId) {
    const deviceCount = await prisma.bargainCut.count({
      where: {
        deviceId,
        createdAt: { gte: today },
      },
    });
    if (deviceCount >= RISK_LIMITS.DEVICE_DAILY_LIMIT) {
      return { passed: false, reason: '当前设备帮砍次数已达上限' };
    }

    // 【新增】检查单设备每小时帮砍不同砍价的次数（检测刷单工具）
    const deviceBargainCount = await prisma.bargainCut.groupBy({
      by: ['bargainId'],
      where: {
        deviceId,
        createdAt: { gte: oneHourAgo },
      },
    });
    if (deviceBargainCount.length >= RISK_LIMITS.MAX_BARGAINS_PER_DEVICE_HOUR) {
      console.warn(`[砍价风控] 检测到单设备帮砍多个砍价: deviceId=${deviceId}, count=${deviceBargainCount.length}`);
      // 自动加入黑名单12小时
      await addToBlacklist({
        type: BlacklistType.DEVICE,
        value: deviceId,
        reason: '异常行为：同一设备频繁帮砍不同活动',
        expireHours: 12,
        operatorId: 0,
      });
      return { passed: false, reason: '检测到异常行为，请稍后再试' };
    }
  }

  return { passed: true };
}

/**
 * 检查客户风控（关联CustomerRecord）
 */
async function checkCustomerRisk(phone: string): Promise<{ passed: boolean; reason?: string }> {
  const customer = await prisma.customerRecord.findUnique({
    where: { phone },
  });

  if (customer) {
    // 黑名单客户不能帮砍
    if (customer.isBlocked || customer.riskLevel >= 3) {
      return { passed: false, reason: '您的账户已被限制' };
    }
  }

  return { passed: true };
}

/**
 * 综合风控检查
 */
export async function checkBargainRisk(params: {
  phone: string;
  ipAddress?: string;
  deviceId?: string;
  bargainCode: string;
}): Promise<RiskCheckResult> {
  const { phone, ipAddress, deviceId } = params;

  // 1. 检查黑名单
  const blacklistResult = await isBlacklisted({ phone, ipAddress, deviceId });
  if (blacklistResult.blocked) {
    return {
      passed: false,
      riskLevel: 2,
      reason: blacklistResult.reason,
    };
  }

  // 2. 检查客户风控
  const customerResult = await checkCustomerRisk(phone);
  if (!customerResult.passed) {
    return {
      passed: false,
      riskLevel: 2,
      reason: customerResult.reason,
    };
  }

  // 3. 检查频率限制
  const frequencyResult = await checkFrequencyLimits({ phone, ipAddress, deviceId });
  if (!frequencyResult.passed) {
    return {
      passed: false,
      riskLevel: 1,
      reason: frequencyResult.reason,
    };
  }

  return {
    passed: true,
    riskLevel: 0,
  };
}

/**
 * 添加黑名单
 */
export async function addToBlacklist(params: AddBlacklistRequest): Promise<void> {
  const { type, value, reason, expireHours, operatorId } = params;

  const expireAt = expireHours
    ? new Date(Date.now() + expireHours * 60 * 60 * 1000)
    : null;

  await prisma.bargainBlacklist.upsert({
    where: {
      type_value: { type, value },
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
      createdBy: operatorId,
    },
  });
}

/**
 * 移除黑名单
 */
export async function removeFromBlacklist(id: number): Promise<boolean> {
  try {
    await prisma.bargainBlacklist.delete({
      where: { id },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取黑名单列表
 */
export async function getBlacklist(params: {
  page?: number;
  pageSize?: number;
  type?: string;
}): Promise<{ list: any[]; total: number }> {
  const { page = 1, pageSize = 20, type } = params;
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (type) {
    where.type = type;
  }

  const [list, total] = await Promise.all([
    prisma.bargainBlacklist.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.bargainBlacklist.count({ where }),
  ]);

  return { list, total };
}

/**
 * 清理过期的黑名单记录
 */
export async function cleanExpiredBlacklist(): Promise<number> {
  const now = new Date();

  const result = await prisma.bargainBlacklist.deleteMany({
    where: {
      expireAt: { lt: now },
    },
  });

  if (result.count > 0) {
    console.log(`[砍价风控] 清理过期黑名单记录: ${result.count}条`);
  }

  return result.count;
}

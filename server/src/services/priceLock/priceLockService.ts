/**
 * 锁价核心服务
 * @module services/priceLock/priceLockService
 * @since 2026-01-21
 */

import prisma from '../../utils/prisma';
import {
  PriceLockStatus,
  CreatePriceLockRequest,
  PriceLockDetailResponse,
  ValidatePriceLockResult,
  PriceLockConfigResponse,
  LockedItem,
} from './types';

/**
 * 生成锁价码
 */
function generatePriceLockCode(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PL${timestamp}${random}`;
}

/**
 * 检查锁价功能是否启用
 */
export async function isPriceLockEnabled(): Promise<boolean> {
  const config = await prisma.config.findUnique({
    where: { key: 'price_lock_enabled' },
  });
  return config?.value === 'true';
}

/**
 * 获取锁价配置
 */
export async function getPriceLockConfig(): Promise<PriceLockConfigResponse> {
  const enabled = await isPriceLockEnabled();

  // 获取系统配置
  const lockHoursConfig = await prisma.config.findUnique({
    where: { key: 'price_lock_hours' },
  });

  const lockHours = parseInt(lockHoursConfig?.value || '24', 10);

  // 获取当前有效的锁价活动配置
  const now = new Date();
  const activeConfig = await prisma.priceLockConfig.findFirst({
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

  return {
    enabled,
    lockHours: activeConfig?.lockHours || lockHours,
    minAmount: activeConfig?.minAmount ? Number(activeConfig.minAmount) : null,
    activeConfig: activeConfig ? {
      id: activeConfig.id,
      name: activeConfig.name,
      lockHours: activeConfig.lockHours,
      minAmount: activeConfig.minAmount ? Number(activeConfig.minAmount) : null,
      startTime: activeConfig.startTime?.toISOString() || null,
      endTime: activeConfig.endTime?.toISOString() || null,
    } : null,
  };
}

/**
 * 创建锁价记录
 */
export async function createPriceLock(
  request: CreatePriceLockRequest
): Promise<{ success: boolean; code?: string; message?: string }> {
  const { customerPhone, customerName, salespersonId, items } = request;

  // 检查功能是否启用
  const enabled = await isPriceLockEnabled();
  if (!enabled) {
    return { success: false, message: '限时锁价功能暂未开放' };
  }

  // 验证商品列表
  if (!items || items.length === 0) {
    return { success: false, message: '请选择要锁定价格的商品' };
  }

  // 【2026-01-26】检查是否包含特价商品
  const productIds = items.map(item => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, isSpecialPrice: true },
  });
  const specialPriceProducts = products.filter(p => p.isSpecialPrice);
  if (specialPriceProducts.length > 0) {
    const names = specialPriceProducts.map(p => p.name).join('、');
    return { success: false, message: `特价商品（${names}）不能使用锁价功能` };
  }

  // 计算总金额
  const totalAmount = items.reduce((sum, item) => sum + item.lockedPrice * item.quantity, 0);

  // 获取配置
  const config = await getPriceLockConfig();

  // 检查最低金额
  if (config.minAmount && totalAmount < config.minAmount) {
    return { success: false, message: `锁价金额需满${config.minAmount}元` };
  }

  // 检查是否有未使用的锁价记录（每个手机号同时只能有一个有效锁价）
  const existingLock = await prisma.priceLock.findFirst({
    where: {
      customerPhone,
      status: PriceLockStatus.ACTIVE,
      expireAt: { gt: new Date() },
    },
  });

  if (existingLock) {
    return {
      success: false,
      message: '您已有一个有效的锁价记录，请先使用或等待过期后再创建新的锁价',
    };
  }

  // 生成锁价码
  const code = generatePriceLockCode();

  // 计算过期时间
  const expireAt = new Date();
  expireAt.setHours(expireAt.getHours() + config.lockHours);

  // 创建锁价记录
  try {
    await prisma.priceLock.create({
      data: {
        code,
        customerPhone,
        customerName: customerName || null,
        salespersonId: salespersonId || null,
        lockedItems: JSON.stringify(items),
        totalAmount,
        status: PriceLockStatus.ACTIVE,
        expireAt,
      },
    });

    return { success: true, code };
  } catch (error) {
    console.error('创建锁价记录失败:', error);
    return { success: false, message: '创建锁价失败，请重试' };
  }
}

/**
 * 获取锁价详情
 */
export async function getPriceLockByCode(code: string): Promise<PriceLockDetailResponse | null> {
  const priceLock = await prisma.priceLock.findUnique({
    where: { code },
  });

  if (!priceLock) {
    return null;
  }

  // 检查并更新过期状态
  const now = new Date();
  if (priceLock.status === PriceLockStatus.ACTIVE && now > priceLock.expireAt) {
    await prisma.priceLock.update({
      where: { id: priceLock.id },
      data: { status: PriceLockStatus.EXPIRED },
    });
    priceLock.status = PriceLockStatus.EXPIRED;
  }

  // 计算剩余秒数
  const remainingSeconds = priceLock.status === PriceLockStatus.ACTIVE
    ? Math.max(0, Math.floor((priceLock.expireAt.getTime() - now.getTime()) / 1000))
    : 0;

  let lockedItems: LockedItem[] = [];
  try {
    lockedItems = JSON.parse(priceLock.lockedItems);
  } catch {
    lockedItems = [];
  }

  return {
    id: priceLock.id,
    code: priceLock.code,
    customerPhone: priceLock.customerPhone,
    customerName: priceLock.customerName,
    lockedItems,
    totalAmount: Number(priceLock.totalAmount),
    status: priceLock.status as any,
    expireAt: priceLock.expireAt.toISOString(),
    remainingSeconds,
    createdAt: priceLock.createdAt.toISOString(),
  };
}

/**
 * 获取客户的锁价记录
 */
export async function getCustomerPriceLocks(customerPhone: string): Promise<PriceLockDetailResponse[]> {
  const priceLocks = await prisma.priceLock.findMany({
    where: { customerPhone },
    orderBy: { createdAt: 'desc' },
    take: 10, // 最多返回10条
  });

  const now = new Date();

  return priceLocks.map((lock) => {
    // 检查是否过期
    let status = lock.status;
    if (status === PriceLockStatus.ACTIVE && now > lock.expireAt) {
      status = PriceLockStatus.EXPIRED;
    }

    const remainingSeconds = status === PriceLockStatus.ACTIVE
      ? Math.max(0, Math.floor((lock.expireAt.getTime() - now.getTime()) / 1000))
      : 0;

    let lockedItems: LockedItem[] = [];
    try {
      lockedItems = JSON.parse(lock.lockedItems);
    } catch {
      lockedItems = [];
    }

    return {
      id: lock.id,
      code: lock.code,
      customerPhone: lock.customerPhone,
      customerName: lock.customerName,
      lockedItems,
      totalAmount: Number(lock.totalAmount),
      status: status as any,
      expireAt: lock.expireAt.toISOString(),
      remainingSeconds,
      createdAt: lock.createdAt.toISOString(),
    };
  });
}

/**
 * 验证锁价码
 * 在创建预约时调用，验证锁价是否有效
 */
export async function validatePriceLock(
  code: string,
  customerPhone: string
): Promise<ValidatePriceLockResult> {
  const priceLock = await prisma.priceLock.findUnique({
    where: { code },
  });

  if (!priceLock) {
    return { valid: false, message: '锁价码不存在' };
  }

  // 验证手机号
  if (priceLock.customerPhone !== customerPhone) {
    return { valid: false, message: '锁价码与手机号不匹配' };
  }

  // 验证状态
  if (priceLock.status === PriceLockStatus.USED) {
    return { valid: false, message: '该锁价码已使用' };
  }

  if (priceLock.status === PriceLockStatus.EXPIRED) {
    return { valid: false, message: '该锁价码已过期' };
  }

  // 验证有效期
  if (new Date() > priceLock.expireAt) {
    // 更新状态为过期
    await prisma.priceLock.update({
      where: { id: priceLock.id },
      data: { status: PriceLockStatus.EXPIRED },
    });
    return { valid: false, message: '该锁价码已过期' };
  }

  let lockedItems: LockedItem[] = [];
  try {
    lockedItems = JSON.parse(priceLock.lockedItems);
  } catch {
    lockedItems = [];
  }

  return {
    valid: true,
    priceLock: {
      id: priceLock.id,
      code: priceLock.code,
      lockedItems,
      totalAmount: Number(priceLock.totalAmount),
      expireAt: priceLock.expireAt.toISOString(),
    },
  };
}

/**
 * 使用锁价码
 * 在预约创建成功后调用
 */
export async function usePriceLock(
  code: string,
  reservationId: number
): Promise<{ success: boolean; message?: string }> {
  const priceLock = await prisma.priceLock.findUnique({
    where: { code },
  });

  if (!priceLock) {
    return { success: false, message: '锁价码不存在' };
  }

  if (priceLock.status !== PriceLockStatus.ACTIVE) {
    return { success: false, message: '锁价码状态无效' };
  }

  try {
    await prisma.priceLock.update({
      where: { id: priceLock.id },
      data: {
        status: PriceLockStatus.USED,
        usedAt: new Date(),
        usedReservationId: reservationId,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('使用锁价码失败:', error);
    return { success: false, message: '使用锁价码失败' };
  }
}

/**
 * 检查并更新过期的锁价记录
 * 定时任务调用
 */
export async function checkAndExpirePriceLocks(): Promise<number> {
  const now = new Date();

  const result = await prisma.priceLock.updateMany({
    where: {
      status: PriceLockStatus.ACTIVE,
      expireAt: { lt: now },
    },
    data: {
      status: PriceLockStatus.EXPIRED,
    },
  });

  return result.count;
}

/**
 * 获取客户当前有效的锁价
 * 用于前端显示锁价状态
 */
export async function getActivePriceLock(customerPhone: string): Promise<PriceLockDetailResponse | null> {
  const priceLock = await prisma.priceLock.findFirst({
    where: {
      customerPhone,
      status: PriceLockStatus.ACTIVE,
      expireAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!priceLock) {
    return null;
  }

  const now = new Date();
  const remainingSeconds = Math.max(0, Math.floor((priceLock.expireAt.getTime() - now.getTime()) / 1000));

  let lockedItems: LockedItem[] = [];
  try {
    lockedItems = JSON.parse(priceLock.lockedItems);
  } catch {
    lockedItems = [];
  }

  return {
    id: priceLock.id,
    code: priceLock.code,
    customerPhone: priceLock.customerPhone,
    customerName: priceLock.customerName,
    lockedItems,
    totalAmount: Number(priceLock.totalAmount),
    status: priceLock.status as any,
    expireAt: priceLock.expireAt.toISOString(),
    remainingSeconds,
    createdAt: priceLock.createdAt.toISOString(),
  };
}

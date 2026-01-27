/**
 * 预约过期处理服务
 * 【2026-01-16 预约模式升级】过期检查+爽约记录
 */

import prisma from '../../utils/prisma';
import { ReservationStatus } from './types';
import { recordNoShow } from './customerService';

/**
 * 处理过期预约
 * 确认后3天未提货 = 过期 = 爽约
 * 【2026-01-22 BUG修复】扩展状态覆盖范围，包括待备货和备货中状态
 */
export async function processExpiredReservations(): Promise<{
  processed: number;
  errors: string[];
}> {
  const now = new Date();
  const errors: string[] = [];
  let processed = 0;

  // 查找已过期的预约
  // 【2026-01-22 修复】不仅检查状态2(CONFIRMED)，还要检查状态7(PENDING_PREPARE)和8(PREPARING)
  // 这些状态都是确认后的状态，都应该检查过期
  const expiredReservations = await prisma.reservation.findMany({
    where: {
      status: {
        in: [
          ReservationStatus.CONFIRMED,       // 2 - 已确认
          ReservationStatus.PENDING_PREPARE, // 7 - 待备货
          ReservationStatus.PREPARING,       // 8 - 备货中
        ],
      },
      expireAt: { lt: now },
    },
    include: { items: true },
  });

  for (const reservation of expiredReservations) {
    try {
      await prisma.$transaction(async (tx) => {
        // 更新预约状态为过期
        await tx.reservation.update({
          where: { id: reservation.id },
          data: { status: ReservationStatus.EXPIRED },
        });

        // 释放锁定库存（防止负值）
        // 【2026-01-22 P1修复】使用Math.max防止lockStock变负
        for (const item of reservation.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { lockStock: true },
          });
          if (product) {
            const newLockStock = Math.max(0, product.lockStock - item.quantity);
            await tx.product.update({
              where: { id: item.productId },
              data: { lockStock: newLockStock },
            });
          }
        }
      });

      // 记录客户爽约（事务外执行，避免影响主流程）
      // 【2026-01-22 P1修复】爽约记录失败也记录到errors，不再静默吞掉
      try {
        await recordNoShow(reservation.customerPhone);
      } catch (err: any) {
        const errMsg = `${reservation.reservationNo}: 爽约记录失败 - ${err.message || err}`;
        errors.push(errMsg);
        console.error(`[ExpiryService] recordNoShow failed for ${reservation.customerPhone}:`, err);
      }

      processed++;
      console.log(`[ExpiryService] Expired reservation ${reservation.reservationNo}`);
    } catch (err: any) {
      errors.push(`${reservation.reservationNo}: ${err.message}`);
      console.error(`[ExpiryService] Error processing ${reservation.reservationNo}:`, err);
    }
  }

  return { processed, errors };
}

/**
 * 获取即将过期的预约（提前通知用）
 * @param storeId 门店ID
 * @param hoursAhead 提前多少小时
 */
export async function getSoonExpiringReservations(storeId: number, hoursAhead: number = 24) {
  const now = new Date();
  const futureTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  return prisma.reservation.findMany({
    where: {
      storeId,
      status: ReservationStatus.CONFIRMED,
      expireAt: {
        gte: now,
        lt: futureTime,
      },
    },
    select: {
      id: true,
      reservationNo: true,
      customerName: true,
      customerPhone: true,
      pickupDate: true,
      totalAmount: true,
      expireAt: true,
    },
    orderBy: { expireAt: 'asc' },
  });
}

/**
 * 获取过期统计
 */
export async function getExpiryStats(storeId?: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const where = storeId ? { storeId } : {};

  const [todayExpired, monthExpired, totalExpired] = await Promise.all([
    // 今日过期
    prisma.reservation.count({
      where: {
        ...where,
        status: ReservationStatus.EXPIRED,
        updatedAt: { gte: today },
      },
    }),
    // 本月过期
    prisma.reservation.count({
      where: {
        ...where,
        status: ReservationStatus.EXPIRED,
        updatedAt: { gte: thisMonth },
      },
    }),
    // 总过期数
    prisma.reservation.count({
      where: {
        ...where,
        status: ReservationStatus.EXPIRED,
      },
    }),
  ]);

  return {
    todayExpired,
    monthExpired,
    totalExpired,
  };
}

/**
 * 手动标记过期（管理后台使用）
 */
export async function manualExpire(reservationId: number, operatorId: number): Promise<{
  success: boolean;
  message: string;
}> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { items: true },
  });

  if (!reservation) {
    return { success: false, message: '预约不存在' };
  }

  // 【2026-01-22 修复】扩展可过期状态范围
  const expirableStatuses = [
    ReservationStatus.CONFIRMED,
    ReservationStatus.PENDING_PREPARE,
    ReservationStatus.PREPARING,
  ];
  if (!expirableStatuses.includes(reservation.status)) {
    return { success: false, message: '只有已确认、待备货、备货中的预约才能标记过期' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.reservation.update({
      where: { id: reservationId },
      data: { status: ReservationStatus.EXPIRED },
    });

    // 释放锁定库存（防止负值）
    // 【2026-01-22 P1修复】使用Math.max防止lockStock变负
    for (const item of reservation.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { lockStock: true },
      });
      if (product) {
        const newLockStock = Math.max(0, product.lockStock - item.quantity);
        await tx.product.update({
          where: { id: item.productId },
          data: { lockStock: newLockStock },
        });
      }
    }
  });

  // 记录爽约
  try {
    await recordNoShow(reservation.customerPhone);
  } catch (err) {
    console.error(`[ExpiryService] recordNoShow failed:`, err);
  }

  return { success: true, message: '已标记为过期' };
}

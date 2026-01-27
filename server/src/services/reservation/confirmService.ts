/**
 * 电话确认服务
 * 【2026-01-16 预约模式升级】门店电话确认流程
 * 【2026-01-16 爽约记录】确认失败时自动记录爽约
 */

import prisma from '../../utils/prisma';
import { ReservationStatus, ReservationResult } from './types';
import { recordNoShow } from './customerService';
import { notifyReservationConfirmed } from '../notificationService';
import { logReservationAction, AuditAction } from '../auditService';

const MAX_CALL_ATTEMPTS = 3; // 最大拨打次数

/**
 * 记录拨打电话
 * @param reservationId 预约ID
 * @param staffId 门店员工ID
 * @param storeId 门店ID【2026-01-22 安全修复】必须传入门店ID进行权限验证
 * @param connected 是否接通（默认false，如果未接通且达到3次则自动标记失败）
 *
 * 【2026-01-17 自动失败】
 * 当拨打第3次仍未接通时，自动标记为确认失败，释放库存，记录爽约
 */
export async function recordCall(
  reservationId: number,
  staffId: number,
  storeId: number,
  connected: boolean = false
): Promise<ReservationResult> {
  // 【2026-01-22 安全修复】查询时必须验证门店所有权
  const reservation = await prisma.reservation.findFirst({
    where: {
      id: reservationId,
      storeId,  // 【关键】添加门店过滤，防止跨店操作
    },
    include: { items: true },
  });

  if (!reservation) {
    return { success: false, message: '预约不存在或不属于当前门店' };
  }

  // 只有待确认和确认中状态可以拨打
  if (reservation.status !== ReservationStatus.PENDING &&
      reservation.status !== ReservationStatus.CALLING) {
    return { success: false, message: '当前状态不可拨打' };
  }

  const newCallCount = reservation.callCount + 1;

  // 【2026-01-17 自动失败】如果未接通且达到3次，自动标记为确认失败
  if (!connected && newCallCount >= MAX_CALL_ATTEMPTS) {
    // 事务：更新状态 + 释放库存
    await prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id: reservationId },
        data: {
          callCount: newCallCount,
          lastCallAt: new Date(),
          status: ReservationStatus.CALL_FAILED,
        },
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
    } catch (error) {
      console.error('[ConfirmService] recordNoShow error:', error);
    }

    // 【2026-01-17】记录审计日志 - 确认失败
    await logReservationAction({
      reservationId,
      action: AuditAction.CALL_FAILED,
      operatorId: staffId,
      operatorType: 'STAFF',
      details: {
        callCount: newCallCount,
        reason: `${MAX_CALL_ATTEMPTS}次电话未接通，自动标记为确认失败`,
        autoFailed: true,
      },
    });

    return {
      success: true,
      message: `已拨打第${newCallCount}次，${MAX_CALL_ATTEMPTS}次未接通，自动标记为确认失败`,
      data: {
        callCount: newCallCount,
        maxAttempts: MAX_CALL_ATTEMPTS,
        canCallAgain: false,
        autoFailed: true,
      },
    };
  }

  // 正常更新拨打记录
  await prisma.reservation.update({
    where: { id: reservationId },
    data: {
      callCount: newCallCount,
      lastCallAt: new Date(),
      status: ReservationStatus.CALLING,
    },
  });

  // 【2026-01-17】记录审计日志 - 记录拨打电话
  await logReservationAction({
    reservationId,
    action: AuditAction.CALL_RECORDED,
    operatorId: staffId,
    operatorType: 'STAFF',
    details: {
      callCount: newCallCount,
      connected,
    },
  });

  return {
    success: true,
    message: `已记录第${newCallCount}次拨打`,
    data: {
      callCount: newCallCount,
      maxAttempts: MAX_CALL_ATTEMPTS,
      canCallAgain: newCallCount < MAX_CALL_ATTEMPTS,
    },
  };
}

/**
 * 确认预约成功
 * @param reservationId 预约ID
 * @param staffId 确认人员ID
 * @param storeId 门店ID【2026-01-22 安全修复】必须传入门店ID进行权限验证
 */
export async function confirmReservation(
  reservationId: number,
  staffId: number,
  storeId: number
): Promise<ReservationResult> {
  // 【2026-01-22 安全修复】查询时必须验证门店所有权
  const reservation = await prisma.reservation.findFirst({
    where: {
      id: reservationId,
      storeId,  // 【关键】添加门店过滤，防止跨店操作
    },
  });

  if (!reservation) {
    return { success: false, message: '预约不存在或不属于当前门店' };
  }

  // 只有待确认和确认中状态可以确认
  if (reservation.status !== ReservationStatus.PENDING &&
      reservation.status !== ReservationStatus.CALLING) {
    return { success: false, message: '当前状态不可确认' };
  }

  // 计算过期时间（确认后3天）
  const expireAt = new Date();
  expireAt.setDate(expireAt.getDate() + 3);
  expireAt.setHours(23, 59, 59, 999);

  await prisma.reservation.update({
    where: { id: reservationId },
    data: {
      status: ReservationStatus.CONFIRMED,
      confirmedAt: new Date(),
      confirmedBy: staffId,
      expireAt,
    },
  });

  // 【2026-01-16】确认成功后发送短信通知客户
  // 异步发送，不阻塞主流程
  notifyReservationConfirmed({
    id: reservation.id,
    reservationNo: reservation.reservationNo,
    customerName: reservation.customerName,
    customerPhone: reservation.customerPhone,
    pickupDate: reservation.pickupDate,
    totalAmount: Number(reservation.totalAmount),
    giftName: reservation.giftName,
  }).catch((error) => {
    console.error('[ConfirmService] 发送确认通知失败:', error);
  });

  // 【2026-01-17】记录审计日志 - 确认成功
  await logReservationAction({
    reservationId,
    action: AuditAction.CONFIRMED,
    operatorId: staffId,
    operatorType: 'STAFF',
    details: {
      expireAt,
      pickupDate: reservation.pickupDate,
    },
  });

  return {
    success: true,
    message: '预约已确认',
    data: {
      expireAt,
      pickupDate: reservation.pickupDate,
    },
  };
}

/**
 * 标记确认失败（3次未接通）
 * @param reservationId 预约ID
 * @param staffId 操作人员ID
 * @param storeId 门店ID【2026-01-22 安全修复】必须传入门店ID进行权限验证
 */
export async function markCallFailed(
  reservationId: number,
  staffId: number,
  storeId: number
): Promise<ReservationResult> {
  // 【2026-01-22 安全修复】查询时必须验证门店所有权
  const reservation = await prisma.reservation.findFirst({
    where: {
      id: reservationId,
      storeId,  // 【关键】添加门店过滤，防止跨店操作
    },
    include: { items: true },
  });

  if (!reservation) {
    return { success: false, message: '预约不存在或不属于当前门店' };
  }

  // 只有确认中状态可以标记失败
  if (reservation.status !== ReservationStatus.CALLING) {
    return { success: false, message: '当前状态不可标记失败' };
  }

  // 【2026-01-20修复】必须拨打满3次才能标记失败
  if (reservation.callCount < MAX_CALL_ATTEMPTS) {
    return { success: false, message: `需拨打满${MAX_CALL_ATTEMPTS}次后才能标记确认失败，当前已拨打${reservation.callCount}次` };
  }

  // 事务：更新状态 + 释放库存
  await prisma.$transaction(async (tx) => {
    await tx.reservation.update({
      where: { id: reservationId },
      data: {
        status: ReservationStatus.CALL_FAILED,
      },
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

  // 【2026-01-16 爽约记录】确认失败视为爽约，记录到客户风控
  // 注意：这里放在事务外，即使记录失败也不影响主流程
  try {
    await recordNoShow(reservation.customerPhone);
  } catch (error) {
    console.error('[ConfirmService] recordNoShow error:', error);
    // 不抛出错误，保证主流程完成
  }

  // 【2026-01-17】记录审计日志 - 手动标记确认失败
  await logReservationAction({
    reservationId,
    action: AuditAction.CALL_FAILED,
    operatorId: staffId,
    operatorType: 'STAFF',
    details: {
      reason: '手动标记为确认失败',
      callCount: reservation.callCount,
    },
  });

  return {
    success: true,
    message: '已标记为确认失败',
  };
}

/**
 * 获取待确认统计
 */
export async function getPendingStats(storeId: number) {
  const now = new Date();
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

  const [total, urgent, calling] = await Promise.all([
    // 待确认总数
    prisma.reservation.count({
      where: {
        storeId,
        status: { in: [ReservationStatus.PENDING, ReservationStatus.CALLING] },
      },
    }),
    // 超过30分钟未处理的紧急预约
    prisma.reservation.count({
      where: {
        storeId,
        status: ReservationStatus.PENDING,
        createdAt: { lt: thirtyMinutesAgo },
      },
    }),
    // 确认中
    prisma.reservation.count({
      where: {
        storeId,
        status: ReservationStatus.CALLING,
      },
    }),
  ]);

  return {
    total,
    pending: total - calling,
    calling,
    urgent,
  };
}

/**
 * 检查是否需要提醒（超过30分钟未处理）
 */
export async function getUrgentReservations(storeId: number) {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  return prisma.reservation.findMany({
    where: {
      storeId,
      status: ReservationStatus.PENDING,
      createdAt: { lt: thirtyMinutesAgo },
    },
    select: {
      id: true,
      reservationNo: true,
      customerName: true,
      customerPhone: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
    take: 10,
  });
}

/**
 * 【2026-01-17 超时自动分配】
 * 处理超过30分钟未处理的预约，自动分配给管理员或其他在线员工
 * 由定时任务调用
 * 【2026-01-17 优化】使用专用字段assignedStaffId，添加审计日志
 * 【2026-01-22 P1修复】同时处理PENDING和CALLING状态的超时预约
 */
export async function processOverdueReservations(): Promise<{
  processed: number;
  details: Array<{ reservationId: number; reservationNo: string; action: string }>;
}> {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  // 【2026-01-22 P1修复】查找所有超时未处理的预约（包括待确认和确认中状态）
  // CALLING状态可能是员工开始处理但长时间未完成，也需要超时检查
  const overdueReservations = await prisma.reservation.findMany({
    where: {
      status: { in: [ReservationStatus.PENDING, ReservationStatus.CALLING] },
      createdAt: { lt: thirtyMinutesAgo },
      assignedStaffId: null, // 【2026-01-17】只处理未分配的预约
    },
    select: {
      id: true,
      reservationNo: true,
      storeId: true,
      customerName: true,
      customerPhone: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
    take: 50, // 每次最多处理50个
  });

  if (overdueReservations.length === 0) {
    return { processed: 0, details: [] };
  }

  const details: Array<{ reservationId: number; reservationNo: string; action: string }> = [];

  // 查找管理员（作为默认分配对象）
  const adminUser = await prisma.systemUser.findFirst({
    where: {
      role: 'ADMIN',
      status: 'ACTIVE',
    },
    select: { id: true, name: true },
  });

  for (const reservation of overdueReservations) {
    try {
      // 查找该门店的在线员工
      const availableStaff = await prisma.systemUser.findFirst({
        where: {
          warehouseId: reservation.storeId,
          status: 'ACTIVE',
          role: { in: ['WAREHOUSE', 'ADMIN'] },
        },
        select: { id: true, name: true },
      });

      const assignedStaffId = availableStaff?.id || adminUser?.id;
      const assignedStaffName = availableStaff?.name || adminUser?.name || '系统管理员';

      if (assignedStaffId) {
        // 【2026-01-17 优化】使用专用字段记录分配信息
        await prisma.reservation.update({
          where: { id: reservation.id },
          data: {
            assignedStaffId,  // 使用专用字段
            assignedAt: new Date(),
          },
        });

        // 【2026-01-17】记录审计日志
        await logReservationAction({
          reservationId: reservation.id,
          action: AuditAction.ASSIGNED,
          operatorType: 'SYSTEM',
          operatorName: '系统自动分配',
          details: {
            reason: '超时30分钟自动分配',
            assignedTo: assignedStaffName,
            assignedStaffId,
          },
        });

        details.push({
          reservationId: reservation.id,
          reservationNo: reservation.reservationNo,
          action: `超时30分钟，自动分配给${assignedStaffName}`,
        });
      } else {
        details.push({
          reservationId: reservation.id,
          reservationNo: reservation.reservationNo,
          action: '超时30分钟，但无可用员工分配',
        });
      }
    } catch (error) {
      console.error(`[ConfirmService] processOverdueReservations error for ${reservation.reservationNo}:`, error);
      details.push({
        reservationId: reservation.id,
        reservationNo: reservation.reservationNo,
        action: `处理失败: ${(error as Error).message}`,
      });
    }
  }

  console.log(`[ConfirmService] 处理超时预约: ${details.length}个`);

  return {
    processed: details.length,
    details,
  };
}

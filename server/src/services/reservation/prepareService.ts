/**
 * 门店备货服务
 * 【2026-01-17 新增备货环节】
 * 提货前一天门店备货 → 生成提货码 → 客户凭码核销
 */

import prisma from '../../utils/prisma';
import { ReservationStatus, PrepareResult, PrepareProgress } from './types';
import { sendPickupCodeSms } from '../smsService';
import { logReservationAction, AuditAction } from '../auditService';

/**
 * 生成8位数字提货码
 */
function generatePickupCode(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

/**
 * 生成唯一提货码（预约）
 * 确保在待提货的预约中不重复
 */
async function generateUniqueReservationPickupCode(): Promise<string> {
  const maxAttempts = 10;

  for (let i = 0; i < maxAttempts; i++) {
    const code = generatePickupCode();

    // 检查在待提货的预约中是否已存在
    const existing = await prisma.reservation.findFirst({
      where: {
        pickupCode: code,
        status: ReservationStatus.PENDING_PICKUP,
      },
    });

    if (!existing) {
      return code;
    }
  }

  // 如果多次尝试后仍未找到唯一码，抛出错误
  throw new Error('无法生成唯一提货码，请重试');
}

/**
 * 获取待备货预约列表
 * @param storeId 门店ID
 */
export async function getPendingPrepareList(storeId: number) {
  const reservations = await prisma.reservation.findMany({
    where: {
      storeId,
      status: ReservationStatus.PENDING_PREPARE,
    },
    include: {
      items: true,
    },
    orderBy: { pickupDate: 'asc' },
  });

  return reservations.map(r => ({
    id: r.id,
    reservationNo: r.reservationNo,
    customerName: r.customerName,
    customerPhone: r.customerPhone,
    pickupDate: r.pickupDate,
    totalAmount: Number(r.totalAmount),
    giftName: r.giftName,
    itemCount: r.items.length,
    totalQuantity: r.items.reduce((sum, item) => sum + item.quantity, 0),
    items: r.items.map(item => ({
      productId: item.productId,
      productName: item.productName,
      productImage: item.productImage,
      quantity: item.quantity,
      price: Number(item.price),
      prepared: item.prepared || false,
    })),
  }));
}

/**
 * 获取备货中预约列表
 * @param storeId 门店ID
 */
export async function getPreparingList(storeId: number) {
  const reservations = await prisma.reservation.findMany({
    where: {
      storeId,
      status: ReservationStatus.PREPARING,
    },
    include: {
      items: true,
    },
    orderBy: { pickupDate: 'asc' },
  });

  return reservations.map(r => {
    const preparedCount = r.items.filter(item => item.prepared).length;
    const totalCount = r.items.length;

    return {
      id: r.id,
      reservationNo: r.reservationNo,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      pickupDate: r.pickupDate,
      totalAmount: Number(r.totalAmount),
      giftName: r.giftName,
      progress: {
        prepared: preparedCount,
        total: totalCount,
        percent: totalCount > 0 ? Math.round((preparedCount / totalCount) * 100) : 0,
      },
      items: r.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        productImage: item.productImage,
        quantity: item.quantity,
        price: Number(item.price),
        prepared: item.prepared || false,
      })),
    };
  });
}

/**
 * 开始备货
 * 将状态从"待备货"改为"备货中"
 * @param reservationId 预约ID
 * @param staffId 员工ID
 */
export async function startPrepare(
  reservationId: number,
  staffId: number
): Promise<PrepareResult> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
  });

  if (!reservation) {
    return { success: false, message: '预约不存在' };
  }

  // 【2026-01-19】允许已确认(2)和待备货(7)状态开始备货，支持提前备货
  const allowedStatuses = [
    ReservationStatus.CONFIRMED,        // 2 - 已确认（提前备货）
    ReservationStatus.PENDING_PREPARE,  // 7 - 待备货
  ];
  if (!allowedStatuses.includes(reservation.status)) {
    return { success: false, message: '预约状态不正确，无法开始备货' };
  }

  await prisma.reservation.update({
    where: { id: reservationId },
    data: {
      status: ReservationStatus.PREPARING,
      staffId,
    },
  });

  // 【2026-01-17】记录审计日志 - 开始备货
  await logReservationAction({
    reservationId,
    action: AuditAction.PREPARE_STARTED,
    operatorId: staffId,
    operatorType: 'STAFF',
    details: {
      previousStatus: reservation.status,
    },
  });

  return { success: true, message: '开始备货' };
}

/**
 * 更新商品备货状态
 * @param reservationId 预约ID
 * @param productId 商品ID
 * @param prepared 是否已备货
 */
export async function updateItemPrepareStatus(
  reservationId: number,
  productId: number,
  prepared: boolean
): Promise<PrepareProgress> {
  // 更新商品备货状态
  await prisma.reservationItem.updateMany({
    where: {
      reservationId,
      productId,
    },
    data: {
      prepared,
    },
  });

  // 获取最新的备货进度
  const items = await prisma.reservationItem.findMany({
    where: { reservationId },
  });

  const preparedItems = items.filter(item => item.prepared).length;
  const totalItems = items.length;
  const progressPercent = totalItems > 0 ? Math.round((preparedItems / totalItems) * 100) : 0;
  const isComplete = totalItems > 0 && preparedItems === totalItems;

  return {
    reservationId,
    totalItems,
    preparedItems,
    progressPercent,
    isComplete,
  };
}

/**
 * 批量更新商品备货状态
 * @param reservationId 预约ID
 * @param productIds 商品ID数组
 * @param prepared 是否已备货
 */
export async function batchUpdateItemPrepareStatus(
  reservationId: number,
  productIds: number[],
  prepared: boolean
): Promise<PrepareProgress> {
  // 批量更新
  await prisma.reservationItem.updateMany({
    where: {
      reservationId,
      productId: { in: productIds },
    },
    data: {
      prepared,
    },
  });

  // 获取最新的备货进度
  const items = await prisma.reservationItem.findMany({
    where: { reservationId },
  });

  const preparedItems = items.filter(item => item.prepared).length;
  const totalItems = items.length;
  const progressPercent = totalItems > 0 ? Math.round((preparedItems / totalItems) * 100) : 0;
  const isComplete = totalItems > 0 && preparedItems === totalItems;

  return {
    reservationId,
    totalItems,
    preparedItems,
    progressPercent,
    isComplete,
  };
}

/**
 * 完成备货（生成提货码）
 * @param reservationId 预约ID
 * @param staffId 员工ID
 */
export async function completePrepare(
  reservationId: number,
  staffId: number
): Promise<PrepareResult> {
  // 检查所有商品是否都已备货
  const items = await prisma.reservationItem.findMany({
    where: { reservationId },
  });

  const unpreparedItems = items.filter(item => !item.prepared);
  if (unpreparedItems.length > 0) {
    return {
      success: false,
      message: `还有 ${unpreparedItems.length} 件商品未备货`,
    };
  }

  // 生成唯一提货码
  const pickupCode = await generateUniqueReservationPickupCode();

  // 获取预约详情（用于发送短信）
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      store: {
        select: {
          address: true,
          contactPhone: true,
        },
      },
    },
  });

  if (!reservation) {
    return { success: false, message: '预约不存在' };
  }

  // 更新预约状态
  await prisma.reservation.update({
    where: { id: reservationId },
    data: {
      status: ReservationStatus.PENDING_PICKUP,
      pickupCode,
      preparedAt: new Date(),
      staffId,
    },
  });

  console.log(`[PrepareService] 预约${reservationId}备货完成，提货码: ${pickupCode}`);

  // 【2026-01-17】发送短信通知客户提货码
  try {
    await sendPickupCodeSms({
      phone: reservation.customerPhone,
      reservationNo: reservation.reservationNo,
      pickupCode: pickupCode,
      pickupDate: reservation.pickupDate,
      storeAddress: reservation.store?.address || '呼和浩特市和林格尔县盛乐镇姑子板村华门世家1号门面房',
      storePhone: reservation.store?.contactPhone || '13190531439',
    });
    console.log(`[PrepareService] 提货码短信发送成功 - 预约号: ${reservation.reservationNo}`);
  } catch (smsError) {
    // 短信发送失败不影响主流程
    console.error('[PrepareService] 发送提货码短信失败:', smsError);
  }

  // 【2026-01-17】记录审计日志 - 完成备货
  await logReservationAction({
    reservationId,
    action: AuditAction.PREPARE_COMPLETED,
    operatorId: staffId,
    operatorType: 'STAFF',
    details: {
      pickupCode,
      itemCount: items.length,
    },
  });

  return {
    success: true,
    message: '备货完成，已生成提货码',
    pickupCode,
  };
}

/**
 * 获取备货进度
 * @param reservationId 预约ID
 */
export async function getPrepareProgress(reservationId: number): Promise<PrepareProgress | null> {
  const items = await prisma.reservationItem.findMany({
    where: { reservationId },
  });

  if (items.length === 0) {
    return null;
  }

  const preparedItems = items.filter(item => item.prepared).length;
  const totalItems = items.length;
  const progressPercent = totalItems > 0 ? Math.round((preparedItems / totalItems) * 100) : 0;
  const isComplete = totalItems > 0 && preparedItems === totalItems;

  return {
    reservationId,
    totalItems,
    preparedItems,
    progressPercent,
    isComplete,
  };
}

// 问题类型映射
const issueTypeMap: Record<string, string> = {
  SHORTAGE: 'STOCK_SHORTAGE',
  DAMAGE: 'PRODUCT_DAMAGED',
  NOT_FOUND: 'PRODUCT_NOT_FOUND',
  OTHER: 'OTHER',
};

/**
 * 上报备货问题
 * @param reservationId 预约ID
 * @param issueType 问题类型
 * @param description 问题描述
 * @param staffId 员工ID
 * @param itemId 商品项ID（可选）
 */
export async function reportIssue(
  reservationId: number,
  issueType: 'SHORTAGE' | 'DAMAGE' | 'NOT_FOUND' | 'OTHER',
  description: string,
  staffId: number,
  itemId?: number
): Promise<PrepareResult> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
  });

  if (!reservation) {
    return { success: false, message: '预约不存在' };
  }

  // 获取员工姓名
  const staff = await prisma.systemUser.findUnique({
    where: { id: staffId },
    select: { name: true },
  });

  // 创建问题记录
  const issue = await prisma.prepareIssue.create({
    data: {
      reservationId,
      itemId,
      issueType: issueTypeMap[issueType] || issueType,
      description,
      reportedBy: staffId,
      reportedName: staff?.name || '未知',
      status: 'PENDING',
    },
  });

  console.log(`[PrepareService] 预约${reservationId}上报问题(ID:${issue.id}): ${issueType} - ${description}`);

  return {
    success: true,
    message: '问题已上报',
    issueId: issue.id,
  };
}

/**
 * 获取预约的问题列表
 * @param reservationId 预约ID
 */
export async function getReservationIssues(reservationId: number) {
  const issues = await prisma.prepareIssue.findMany({
    where: { reservationId },
    orderBy: { createdAt: 'desc' },
  });

  return issues.map(issue => ({
    id: issue.id,
    issueType: issue.issueType,
    description: issue.description,
    status: issue.status,
    reportedBy: issue.reportedBy,
    reportedName: issue.reportedName,
    resolvedBy: issue.resolvedBy,
    resolvedName: issue.resolvedName,
    resolvedAt: issue.resolvedAt,
    resolution: issue.resolution,
    createdAt: issue.createdAt,
  }));
}

/**
 * 根据提货码验证预约（用于核销）
 * @param pickupCode 提货码
 * @param storeId 门店ID
 * 【2026-01-22 P1修复】支持CONFIRMED和PENDING_PICKUP两种状态，与completePickup保持一致
 */
export async function verifyByPickupCode(
  pickupCode: string,
  storeId: number
) {
  const reservation = await prisma.reservation.findFirst({
    where: {
      pickupCode,
      storeId,
      // 【2026-01-22 P1修复】支持已确认和待提货两种状态的预约核销
      status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING_PICKUP] },
    },
    include: {
      items: true,
    },
  });

  if (!reservation) {
    return {
      success: false,
      message: '提货码无效或预约状态不正确',
    };
  }

  return {
    success: true,
    message: '验证成功',
    data: {
      id: reservation.id,
      reservationNo: reservation.reservationNo,
      customerName: reservation.customerName,
      customerPhone: reservation.customerPhone,
      pickupDate: reservation.pickupDate,
      totalAmount: Number(reservation.totalAmount),
      giftName: reservation.giftName,
      giftDelivered: reservation.giftDelivered,
      items: reservation.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        productImage: item.productImage,
        quantity: item.quantity,
        price: Number(item.price),
      })),
    },
  };
}

export default {
  getPendingPrepareList,
  getPreparingList,
  startPrepare,
  updateItemPrepareStatus,
  batchUpdateItemPrepareStatus,
  completePrepare,
  getPrepareProgress,
  reportIssue,
  getReservationIssues,
  verifyByPickupCode,
};

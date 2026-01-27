/**
 * 通知服务 - 客服通知、订单提醒等
 */
import { sendSms } from '../utils/aliSms';
import prisma from '../utils/prisma';

// 客服电话配置
const CS_PHONES = [
  '13190531439',
  '15849390600',
];

// 通知类型
export const NOTIFICATION_TYPE = {
  ORDER_TIMEOUT: 'ORDER_TIMEOUT',      // 订单确认超时
  ORDER_EXCEPTION: 'ORDER_EXCEPTION',  // 订单异常
  STOCK_WARNING: 'STOCK_WARNING',      // 库存预警
  WITHDRAWAL_REQUEST: 'WITHDRAWAL_REQUEST', // 提现申请
  RESERVATION_CONFIRMED: 'RESERVATION_CONFIRMED', // 【2026-01-16】预约确认通知
  RESERVATION_REMINDER: 'RESERVATION_REMINDER',   // 【2026-01-16】预约提醒
};

// 已发送通知的缓存（防止重复通知）
const sentNotifications = new Map<string, number>();

// 通知发送间隔（同一订单2小时内不重复通知）
const NOTIFICATION_INTERVAL = 2 * 60 * 60 * 1000;

/**
 * 检查是否可以发送通知（防止重复）
 */
function canSendNotification(key: string): boolean {
  const lastSent = sentNotifications.get(key);
  if (!lastSent) return true;
  return Date.now() - lastSent > NOTIFICATION_INTERVAL;
}

/**
 * 记录已发送通知
 */
function markNotificationSent(key: string): void {
  sentNotifications.set(key, Date.now());
  // 清理过期的缓存（保持最近1000条）
  if (sentNotifications.size > 1000) {
    const oldestKey = sentNotifications.keys().next().value;
    if (oldestKey) sentNotifications.delete(oldestKey);
  }
}

/**
 * 订单确认超时通知客服
 * @param order 超时订单信息
 */
export async function notifyCSForTimeoutOrder(order: {
  id: number;
  orderNo: string;
  totalAmount: number | string;
  agent?: { name: string; phone: string } | null;
}): Promise<{ success: boolean; message: string }> {
  const notificationKey = `ORDER_TIMEOUT_${order.id}`;

  // 检查是否已发送过通知
  if (!canSendNotification(notificationKey)) {
    console.log(`[NotificationService] 订单${order.orderNo}已发送过通知，跳过`);
    return { success: true, message: '已发送过通知，跳过' };
  }

  const agentName = order.agent?.name || '未知代理商';
  const agentPhone = order.agent?.phone || '未知手机号';
  const amount = typeof order.totalAmount === 'string'
    ? parseFloat(order.totalAmount).toFixed(2)
    : order.totalAmount.toFixed(2);

  // 构建通知内容（用于日志）
  const message = `【订单超时】订单${order.orderNo}(¥${amount})等待确认超过1小时，` +
    `下单人：${agentName}(${agentPhone})，请及时处理。`;

  console.log(`[NotificationService] 准备发送客服通知: ${message}`);

  let successCount = 0;
  let failCount = 0;

  // 向所有客服发送短信
  for (const phone of CS_PHONES) {
    try {
      // 使用简短的验证码模板发送提醒
      // 注意：实际生产中应该使用专门的通知模板
      const result = await sendSms(phone, order.orderNo.slice(-6));

      if (result.success) {
        successCount++;
        console.log(`[NotificationService] 通知客服${phone}成功`);
      } else {
        failCount++;
        console.error(`[NotificationService] 通知客服${phone}失败: ${result.message}`);
      }
    } catch (error: any) {
      failCount++;
      console.error(`[NotificationService] 通知客服${phone}异常: ${error.message}`);
    }
  }

  // 记录通知日志到数据库
  try {
    await prisma.auditLog.create({
      data: {
        userId: 0, // 系统自动操作
        userType: 'system',
        userName: 'SYSTEM',
        action: NOTIFICATION_TYPE.ORDER_TIMEOUT,
        module: 'notification',
        detail: JSON.stringify({
          orderNo: order.orderNo,
          orderId: order.id,
          agentName,
          agentPhone,
          amount,
          csPhones: CS_PHONES,
          successCount,
          failCount,
        }),
      },
    });
  } catch (error) {
    console.error('[NotificationService] 记录通知日志失败:', error);
  }

  // 标记已发送
  markNotificationSent(notificationKey);

  if (successCount > 0) {
    return { success: true, message: `已通知${successCount}位客服` };
  } else {
    return { success: false, message: '通知发送失败' };
  }
}

/**
 * 库存预警通知
 * @param productName 商品名称
 * @param currentStock 当前库存
 * @param minStock 最低库存
 */
export async function notifyStockWarning(
  productId: number,
  productName: string,
  currentStock: number,
  minStock: number
): Promise<void> {
  const notificationKey = `STOCK_WARNING_${productId}`;

  if (!canSendNotification(notificationKey)) {
    return;
  }

  console.log(
    `[NotificationService] 库存预警: ${productName}, 当前库存: ${currentStock}, 最低库存: ${minStock}`
  );

  // 记录到审计日志
  try {
    await prisma.auditLog.create({
      data: {
        userId: 0,
        userType: 'system',
        userName: 'SYSTEM',
        action: NOTIFICATION_TYPE.STOCK_WARNING,
        module: 'notification',
        detail: JSON.stringify({
          productId,
          productName,
          currentStock,
          minStock,
        }),
      },
    });
  } catch (error) {
    console.error('[NotificationService] 记录库存预警日志失败:', error);
  }

  markNotificationSent(notificationKey);
}

/**
 * 提现申请通知
 * @param withdrawal 提现申请信息
 */
export async function notifyWithdrawalRequest(withdrawal: {
  id: number;
  agentName: string;
  amount: number;
}): Promise<void> {
  const notificationKey = `WITHDRAWAL_${withdrawal.id}`;

  if (!canSendNotification(notificationKey)) {
    return;
  }

  console.log(
    `[NotificationService] 提现申请: ${withdrawal.agentName} 申请提现 ¥${withdrawal.amount}`
  );

  // 记录到审计日志
  try {
    await prisma.auditLog.create({
      data: {
        userId: 0,
        userType: 'system',
        userName: 'SYSTEM',
        action: NOTIFICATION_TYPE.WITHDRAWAL_REQUEST,
        module: 'notification',
        detail: JSON.stringify(withdrawal),
      },
    });
  } catch (error) {
    console.error('[NotificationService] 记录提现通知日志失败:', error);
  }

  markNotificationSent(notificationKey);
}

/**
 * 【2026-01-16 预约模式升级】预约确认成功通知客户
 * @param reservation 预约信息
 */
export async function notifyReservationConfirmed(reservation: {
  id: number;
  reservationNo: string;
  customerName: string;
  customerPhone: string;
  pickupDate: Date | string;
  totalAmount: number | string;
  giftName?: string | null;
}): Promise<{ success: boolean; message: string }> {
  const notificationKey = `RESERVATION_CONFIRMED_${reservation.id}`;

  // 检查是否已发送过通知
  if (!canSendNotification(notificationKey)) {
    console.log(`[NotificationService] 预约${reservation.reservationNo}已发送过确认通知，跳过`);
    return { success: true, message: '已发送过通知，跳过' };
  }

  const amount = typeof reservation.totalAmount === 'string'
    ? parseFloat(reservation.totalAmount).toFixed(2)
    : Number(reservation.totalAmount).toFixed(2);

  // 格式化提货日期
  const pickupDate = typeof reservation.pickupDate === 'string'
    ? reservation.pickupDate.split('T')[0]
    : reservation.pickupDate.toISOString().split('T')[0];

  // 构建通知内容（用于日志）
  const message = `【预约确认】尊敬的${reservation.customerName}，您的预约${reservation.reservationNo}已确认，` +
    `预约金额¥${amount}，提货日期${pickupDate}。` +
    (reservation.giftName ? `赠品：${reservation.giftName}。` : '') +
    `请按时到店提货，地址：呼和浩特市和林格尔县盛乐镇姑子板村华门世家1号门面房。`;

  console.log(`[NotificationService] 准备发送预约确认通知: ${message}`);

  try {
    // 尝试发送短信（如果配置了预约通知模板）
    // 注意：需要在阿里云申请预约通知短信模板
    // 模板示例：您的预约${reservationNo}已确认，金额${amount}元，${pickupDate}到店提货。
    const result = await sendSms(
      reservation.customerPhone,
      reservation.reservationNo.slice(-6), // 使用预约号后6位作为验证信息
      'RESERVATION_CONFIRMED'
    );

    // 记录通知日志到数据库
    await prisma.auditLog.create({
      data: {
        userId: 0,
        userType: 'system',
        userName: 'SYSTEM',
        action: NOTIFICATION_TYPE.RESERVATION_CONFIRMED,
        module: 'notification',
        detail: JSON.stringify({
          reservationNo: reservation.reservationNo,
          reservationId: reservation.id,
          customerName: reservation.customerName,
          customerPhone: reservation.customerPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
          totalAmount: amount,
          pickupDate,
          giftName: reservation.giftName,
          smsResult: result,
        }),
      },
    });

    markNotificationSent(notificationKey);

    if (result.success) {
      return { success: true, message: '已发送预约确认通知' };
    } else {
      // 短信发送失败，但不影响主流程
      console.warn(`[NotificationService] 预约确认短信发送失败: ${result.message}`);
      return { success: true, message: '通知已记录（短信发送失败）' };
    }
  } catch (error: any) {
    console.error('[NotificationService] 发送预约确认通知异常:', error);

    // 记录错误日志
    try {
      await prisma.auditLog.create({
        data: {
          userId: 0,
          userType: 'system',
          userName: 'SYSTEM',
          action: NOTIFICATION_TYPE.RESERVATION_CONFIRMED,
          module: 'notification',
          detail: JSON.stringify({
            reservationNo: reservation.reservationNo,
            error: error.message,
          }),
        },
      });
    } catch (logError) {
      console.error('[NotificationService] 记录错误日志失败:', logError);
    }

    // 不抛出错误，保证主流程完成
    return { success: false, message: '通知发送失败' };
  }
}

/**
 * 【2026-01-16】预约提醒通知（确认后第2天提醒）
 * @param reservation 预约信息
 */
export async function notifyReservationReminder(reservation: {
  id: number;
  reservationNo: string;
  customerName: string;
  customerPhone: string;
  pickupDate: Date | string;
}): Promise<{ success: boolean; message: string }> {
  const notificationKey = `RESERVATION_REMINDER_${reservation.id}`;

  if (!canSendNotification(notificationKey)) {
    return { success: true, message: '已发送过提醒，跳过' };
  }

  const pickupDate = typeof reservation.pickupDate === 'string'
    ? reservation.pickupDate.split('T')[0]
    : reservation.pickupDate.toISOString().split('T')[0];

  console.log(`[NotificationService] 发送预约提醒: ${reservation.reservationNo}, 提货日期: ${pickupDate}`);

  try {
    const result = await sendSms(
      reservation.customerPhone,
      reservation.reservationNo.slice(-6),
      'RESERVATION_REMINDER'
    );

    await prisma.auditLog.create({
      data: {
        userId: 0,
        userType: 'system',
        userName: 'SYSTEM',
        action: NOTIFICATION_TYPE.RESERVATION_REMINDER,
        module: 'notification',
        detail: JSON.stringify({
          reservationNo: reservation.reservationNo,
          reservationId: reservation.id,
          pickupDate,
          smsResult: result,
        }),
      },
    });

    markNotificationSent(notificationKey);
    return result;
  } catch (error: any) {
    console.error('[NotificationService] 发送预约提醒异常:', error);
    return { success: false, message: '提醒发送失败' };
  }
}

export default {
  notifyCSForTimeoutOrder,
  notifyStockWarning,
  notifyWithdrawalRequest,
  notifyReservationConfirmed,
  notifyReservationReminder,
  NOTIFICATION_TYPE,
};

/**
 * 备货提醒定时任务
 * 【2026-01-17 新增备货环节】
 * 【2026-01-22 高并发优化：添加分布式锁】
 *
 * 执行频率：每天早上9:00执行
 * 功能：将明天预约提货且状态为"已确认"的预约改为"待备货"，提醒门店备货
 */

import cron from 'node-cron';
import prisma from '../utils/prisma';
import { ReservationStatus } from '../services/reservation/types';
import { sendNotifySms } from '../utils/aliSms';
import { withTaskLock } from '../utils/taskLock';

const TASK_NAME = 'prepare-reminder';
const LOCK_TTL = 600; // 锁有效期10分钟

/**
 * 获取明天的日期范围
 */
function getTomorrowRange(): { start: Date; end: Date } {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const endOfTomorrow = new Date(tomorrow);
  endOfTomorrow.setHours(23, 59, 59, 999);

  return { start: tomorrow, end: endOfTomorrow };
}

/**
 * 执行备货提醒
 * 将明天要提货的"已确认"预约转为"待备货"状态
 */
async function runPrepareReminder() {
  // 使用分布式锁，确保多进程只执行一次
  const result = await withTaskLock(TASK_NAME, async () => {
    const startTime = Date.now();
    console.log('[PrepareReminderTask] 开始检查明天待备货的预约...');

    const { start, end } = getTomorrowRange();

    // 查找明天预约提货、状态为"已确认"的预约
    const reservations = await prisma.reservation.findMany({
      where: {
        pickupDate: {
          gte: start,
          lte: end,
        },
        status: ReservationStatus.CONFIRMED,
      },
      select: {
        id: true,
        reservationNo: true,
        customerName: true,
        customerPhone: true,
        storeId: true,
      },
    });

    if (reservations.length === 0) {
      console.log('[PrepareReminderTask] 检查完成，明天无需备货的预约');
      return { count: 0 };
    }

    console.log(`[PrepareReminderTask] 发现${reservations.length}个明天待备货的预约`);

    // 批量更新状态为"待备货"
    const updateResult = await prisma.reservation.updateMany({
      where: {
        id: { in: reservations.map((r) => r.id) },
        status: ReservationStatus.CONFIRMED,
      },
      data: {
        status: ReservationStatus.PENDING_PREPARE,
      },
    });

    console.log(`[PrepareReminderTask] 已将${updateResult.count}个预约状态更新为"待备货"`);

    // 按门店分组统计
    const storeStats: Record<number, number> = {};
    reservations.forEach((r) => {
      storeStats[r.storeId] = (storeStats[r.storeId] || 0) + 1;
    });

    // 打印门店统计并发送短信通知
    for (const [storeId, count] of Object.entries(storeStats)) {
      console.log(`[PrepareReminderTask] 门店${storeId}: ${count}个待备货预约`);

      try {
        const staff = await prisma.systemUser.findFirst({
          where: {
            warehouseId: parseInt(storeId),
            role: 'WAREHOUSE',
            status: 'ACTIVE'
          },
          select: { phone: true, name: true }
        });

        if (staff?.phone) {
          await sendNotifySms(staff.phone, 'RESERVATION_REMINDER', {
            name: staff.name || '管理员',
            count: count.toString()
          });
          console.log(`[PrepareReminderTask] 已发送备货提醒短信给 ${staff.name || '门店管理员'}`);
        }
      } catch (smsError) {
        console.error(`[PrepareReminderTask] 发送短信失败，门店${storeId}:`, smsError);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[PrepareReminderTask] 任务完成，耗时${duration}ms`);

    return { count: updateResult.count };
  }, LOCK_TTL);

  if (result === null) {
    console.log('[PrepareReminderTask] 其他实例正在执行，跳过本次');
  }
}

/**
 * 启动定时任务
 * 每天早上9:00执行
 */
export function startPrepareReminderTask() {
  // 每天9:00执行
  cron.schedule('0 9 * * *', runPrepareReminder);

  console.log('[PrepareReminderTask] 备货提醒定时任务已启动（每天9:00执行）');
}

/**
 * 手动触发执行（用于测试或管理后台）
 */
export async function triggerPrepareReminder() {
  return runPrepareReminder();
}

export default { startPrepareReminderTask, triggerPrepareReminder };

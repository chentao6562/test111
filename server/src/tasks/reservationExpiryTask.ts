/**
 * 预约过期检查定时任务
 * 【2026-01-16 预约模式升级】
 * 【2026-01-22 高并发优化：添加分布式锁】
 *
 * 执行频率：每小时执行一次
 * 功能：检查已确认但超过expireAt的预约，标记为过期并释放库存
 */

import cron from 'node-cron';
import { processExpiredReservations } from '../services/reservation';
import { withTaskLock } from '../utils/taskLock';

const TASK_NAME = 'reservation-expiry-check';
const LOCK_TTL = 300; // 锁有效期5分钟

/**
 * 执行过期检查
 */
async function runExpiryCheck() {
  // 使用分布式锁，确保多进程只执行一次
  const result = await withTaskLock(TASK_NAME, async () => {
    console.log('[ReservationExpiryTask] 开始检查过期预约...');

    const checkResult = await processExpiredReservations();

    if (checkResult.processed > 0) {
      console.log(`[ReservationExpiryTask] 处理完成，过期${checkResult.processed}个预约`);
    } else {
      console.log('[ReservationExpiryTask] 检查完成，无过期预约');
    }

    if (checkResult.errors.length > 0) {
      console.error('[ReservationExpiryTask] 处理错误:', checkResult.errors);
    }

    return checkResult;
  }, LOCK_TTL);

  if (result === null) {
    console.log('[ReservationExpiryTask] 其他实例正在执行，跳过本次');
  }
}

/**
 * 启动定时任务
 * 每小时执行一次（整点执行）
 */
export function startReservationExpiryTask() {
  // 每小时的第5分钟执行，避免与其他任务冲突
  cron.schedule('5 * * * *', runExpiryCheck);

  console.log('[ReservationExpiryTask] 预约过期检查定时任务已启动（每小时执行一次）');

  // 启动时立即执行一次
  setTimeout(runExpiryCheck, 5000);
}

/**
 * 手动触发执行（用于测试或管理后台）
 */
export async function triggerExpiryCheck() {
  return runExpiryCheck();
}

export default { startReservationExpiryTask, triggerExpiryCheck };

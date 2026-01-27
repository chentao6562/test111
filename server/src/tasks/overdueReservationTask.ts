/**
 * 超时预约自动分配定时任务
 * 【2026-01-17 30分钟确认时限】
 * 【2026-01-22 高并发优化：添加分布式锁】
 *
 * 执行频率：每5分钟执行一次
 * 功能：检查超过30分钟未处理的待确认预约，自动分配给可用员工
 */

import cron from 'node-cron';
import { processOverdueReservations } from '../services/reservation';
import { withTaskLock } from '../utils/taskLock';

const TASK_NAME = 'overdue-reservation-check';
const LOCK_TTL = 240; // 锁有效期4分钟（小于执行间隔5分钟）

/**
 * 执行超时预约检查和自动分配
 */
async function runOverdueCheck() {
  // 使用分布式锁，确保多进程只执行一次
  const result = await withTaskLock(TASK_NAME, async () => {
    console.log('[OverdueReservationTask] 开始检查超时预约...');

    const checkResult = await processOverdueReservations();

    if (checkResult.processed > 0) {
      console.log(`[OverdueReservationTask] 处理完成，自动分配${checkResult.processed}个超时预约`);
      checkResult.details.forEach(detail => {
        console.log(`  - 预约 ${detail.reservationNo}: ${detail.action}`);
      });
    } else {
      console.log('[OverdueReservationTask] 检查完成，无超时预约');
    }

    return checkResult;
  }, LOCK_TTL);

  if (result === null) {
    console.log('[OverdueReservationTask] 其他实例正在执行，跳过本次');
  }
}

/**
 * 启动定时任务
 * 每5分钟执行一次
 */
export function startOverdueReservationTask() {
  // 每5分钟执行一次（在第2分钟，避免与其他任务冲突）
  // 例如：02, 07, 12, 17, 22, 27, 32, 37, 42, 47, 52, 57
  cron.schedule('2,7,12,17,22,27,32,37,42,47,52,57 * * * *', runOverdueCheck);

  console.log('[OverdueReservationTask] 超时预约自动分配定时任务已启动（每5分钟执行一次）');

  // 启动时立即执行一次
  setTimeout(runOverdueCheck, 10000);
}

/**
 * 手动触发执行（用于测试或管理后台）
 */
export async function triggerOverdueCheck() {
  return runOverdueCheck();
}

export default { startOverdueReservationTask, triggerOverdueCheck };

/**
 * 代金券过期检查定时任务
 * 【2026-01-23 P1-01修复】
 *
 * 执行频率：每天凌晨1点执行
 * 功能：检查已过期但状态仍为UNUSED的代金券，批量标记为EXPIRED
 */

import cron from 'node-cron';
import { processExpiredCoupons } from '../services/campaign2026/couponService';
import { withTaskLock } from '../utils/taskLock';

const TASK_NAME = 'coupon-expiry-check';
const LOCK_TTL = 300; // 锁有效期5分钟

/**
 * 执行过期检查
 */
async function runExpiryCheck() {
  // 使用分布式锁，确保多进程只执行一次
  const result = await withTaskLock(TASK_NAME, async () => {
    console.log('[CouponExpiryTask] 开始检查过期代金券...');

    const count = await processExpiredCoupons();

    if (count > 0) {
      console.log(`[CouponExpiryTask] 处理完成，标记${count}张代金券为过期`);
    } else {
      console.log('[CouponExpiryTask] 检查完成，无需处理的过期代金券');
    }

    return count;
  }, LOCK_TTL);

  if (result === null) {
    console.log('[CouponExpiryTask] 其他实例正在执行，跳过本次');
  }
}

/**
 * 启动定时任务
 * 每天凌晨1点执行
 */
export function startCouponExpiryTask() {
  // 每天凌晨1点10分执行，避免与其他任务冲突
  cron.schedule('10 1 * * *', runExpiryCheck);

  console.log('[CouponExpiryTask] 代金券过期检查定时任务已启动（每天凌晨1:10执行）');

  // 启动时立即执行一次
  setTimeout(runExpiryCheck, 10000);
}

/**
 * 手动触发执行（用于测试或管理后台）
 */
export async function triggerCouponExpiryCheck() {
  return runExpiryCheck();
}

export default { startCouponExpiryTask, triggerCouponExpiryCheck };

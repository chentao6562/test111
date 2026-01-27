/**
 * 大转盘碎片过期检查定时任务
 * @module tasks/spinWheelExpiryTask
 * @since 2026-01-23
 *
 * 每天凌晨1点执行：
 * 1. 将已过期的碎片标记为过期
 * 2. 清理已过期的黑名单记录
 */

import { checkAndExpireFragments } from '../services/spinWheel/spinWheelService';
import { cleanExpiredBlacklist } from '../services/spinWheel/spinWheelRiskService';
import { withTaskLock } from '../utils/taskLock';

// 任务执行间隔（毫秒）- 每天
const TASK_INTERVAL = 24 * 60 * 60 * 1000;
const TASK_NAME = 'spin-wheel-expiry-check';
const LOCK_TTL = 300; // 锁有效期5分钟

/**
 * 执行过期检查
 */
async function executeTask() {
  // 使用分布式锁确保多实例只执行一次
  const result = await withTaskLock(TASK_NAME, async () => {
    console.log('[SpinWheelExpiryTask] 开始执行碎片过期检查...');

    try {
      // 1. 检查并过期碎片
      const expiredCount = await checkAndExpireFragments();
      if (expiredCount > 0) {
        console.log(`[SpinWheelExpiryTask] 已将 ${expiredCount} 条碎片标记为过期`);
      }

      // 2. 清理过期黑名单
      const cleanedCount = await cleanExpiredBlacklist();
      if (cleanedCount > 0) {
        console.log(`[SpinWheelExpiryTask] 已清理 ${cleanedCount} 条过期黑名单记录`);
      }

      return { expiredCount, cleanedCount };
    } catch (error) {
      console.error('[SpinWheelExpiryTask] 执行失败:', error);
      throw error;
    }
  }, LOCK_TTL);

  if (result === null) {
    console.log('[SpinWheelExpiryTask] 其他实例正在执行，跳过本次');
  }
}

/**
 * 启动定时任务
 */
export function startSpinWheelExpiryTask() {
  console.log('[SpinWheelExpiryTask] 大转盘碎片过期检查定时任务已启动（每天凌晨1点执行）');

  // 计算距离下一个凌晨1点的毫秒数
  const now = new Date();
  const next1am = new Date(now);
  next1am.setHours(1, 0, 0, 0);
  if (next1am <= now) {
    next1am.setDate(next1am.getDate() + 1);
  }
  const delay = next1am.getTime() - now.getTime();

  console.log(`[SpinWheelExpiryTask] 首次执行将在 ${Math.round(delay / 1000 / 60)} 分钟后`);

  // 延迟到凌晨1点首次执行
  setTimeout(() => {
    executeTask();
    // 之后每天执行一次
    setInterval(executeTask, TASK_INTERVAL);
  }, delay);
}

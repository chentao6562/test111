/**
 * 砍价过期检查定时任务
 * @module tasks/bargainExpiryTask
 * @since 2026-01-22
 * @update 2026-01-22 P2修复：添加分布式锁防止多实例重复执行
 *
 * 每小时执行一次：
 * 1. 将砍价中但已过期的标记为过期
 * 2. 将砍价成功但24小时未下单的标记为过期
 * 3. 清理已过期的黑名单记录
 */

import { checkAndExpireBargains } from '../services/bargain/bargainService';
import { cleanExpiredBlacklist } from '../services/bargain/bargainRiskService';
import { withTaskLock } from '../utils/taskLock';

// 任务执行间隔（毫秒）- 每小时
const TASK_INTERVAL = 60 * 60 * 1000;
const TASK_NAME = 'bargain-expiry-check';
const LOCK_TTL = 300; // 锁有效期5分钟

/**
 * 执行过期检查
 */
async function executeTask() {
  // 【2026-01-22 P2修复】使用分布式锁确保多实例只执行一次
  const result = await withTaskLock(TASK_NAME, async () => {
    console.log('[BargainExpiryTask] 开始执行砍价过期检查...');

    try {
      // 1. 检查并过期砍价
      const expiredCount = await checkAndExpireBargains();
      if (expiredCount > 0) {
        console.log(`[BargainExpiryTask] 已将 ${expiredCount} 个砍价标记为过期`);
      }

      // 2. 清理过期黑名单
      const cleanedCount = await cleanExpiredBlacklist();
      if (cleanedCount > 0) {
        console.log(`[BargainExpiryTask] 已清理 ${cleanedCount} 条过期黑名单记录`);
      }

      return { expiredCount, cleanedCount };
    } catch (error) {
      console.error('[BargainExpiryTask] 执行失败:', error);
      throw error;
    }
  }, LOCK_TTL);

  if (result === null) {
    console.log('[BargainExpiryTask] 其他实例正在执行，跳过本次');
  }
}

/**
 * 启动定时任务
 */
export function startBargainExpiryTask() {
  console.log('[BargainExpiryTask] 砍价过期检查定时任务已启动（每小时执行一次）');

  // 延迟5秒执行首次，避免启动时与其他任务冲突
  setTimeout(executeTask, 5000);

  // 设置定时执行
  setInterval(executeTask, TASK_INTERVAL);
}

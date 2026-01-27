/**
 * 拼团过期检查定时任务
 * @module tasks/groupBuyExpiryTask
 * @since 2026-01-21
 * @update 2026-01-22 P2修复：添加分布式锁防止多实例重复执行
 *
 * 每小时执行一次，检查并更新过期的拼团状态
 */

import * as groupBuyService from '../services/groupBuy/groupBuyService';
import { withTaskLock } from '../utils/taskLock';

// 任务执行间隔（毫秒）- 每小时
const TASK_INTERVAL = 60 * 60 * 1000;
const TASK_NAME = 'group-buy-expiry-check';
const LOCK_TTL = 300; // 锁有效期5分钟

/**
 * 执行过期检查
 */
async function executeTask() {
  // 【2026-01-22 P2修复】使用分布式锁确保多实例只执行一次
  const result = await withTaskLock(TASK_NAME, async () => {
    console.log('[GroupBuyExpiryTask] 开始执行拼团过期检查...');

    try {
      const expiredCount = await groupBuyService.checkAndExpireGroupBuys();
      if (expiredCount > 0) {
        console.log(`[GroupBuyExpiryTask] 已将 ${expiredCount} 个拼团标记为过期`);
      }
      return { expiredCount };
    } catch (error) {
      console.error('[GroupBuyExpiryTask] 执行失败:', error);
      throw error;
    }
  }, LOCK_TTL);

  if (result === null) {
    console.log('[GroupBuyExpiryTask] 其他实例正在执行，跳过本次');
  }
}

/**
 * 启动定时任务
 */
export function startGroupBuyExpiryTask() {
  console.log('[GroupBuyExpiryTask] 拼团过期检查定时任务已启动（每小时执行一次）');

  // 延迟15秒执行首次，避免启动时与其他任务冲突
  setTimeout(executeTask, 15000);

  // 设置定时执行
  setInterval(executeTask, TASK_INTERVAL);
}

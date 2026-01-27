/**
 * 周期奖励定时任务
 * 【2026-01-20】
 * 【2026-01-22 高并发优化：添加分布式锁】
 *
 * 执行时间：每周一凌晨 2:00（北京时间）
 * 功能：统计上周的销售/发圈/拉新数据，并发放达标的奖励
 */

import cron from 'node-cron';
import prisma from '../utils/prisma';
import {
  getLastWeekStart,
  processAgentWeeklyRewards,
} from '../services/campaign2026/weeklyRewardService';
import { withTaskLock } from '../utils/taskLock';

const TASK_NAME = 'weekly-reward-process';
const LOCK_TTL = 1800; // 锁有效期30分钟（周奖励处理可能耗时较长）

interface WeeklyRewardResult {
  totalAgents: number;
  processedAgents: number;
  salesRewardedCount: number;
  shareRewardedCount: number;
  recruitRewardedCount: number;
  totalRewardAmount: number;
  errors: Array<{ agentId: number; error: string }>;
}

/**
 * 处理周奖励发放
 */
export async function processWeeklyRewards(weekStart?: Date): Promise<WeeklyRewardResult> {
  const start = weekStart || getLastWeekStart();
  console.log(`[周奖励任务] 开始处理, 统计周: ${start.toISOString().slice(0, 10)}`);

  const result: WeeklyRewardResult = {
    totalAgents: 0,
    processedAgents: 0,
    salesRewardedCount: 0,
    shareRewardedCount: 0,
    recruitRewardedCount: 0,
    totalRewardAmount: 0,
    errors: [],
  };

  try {
    // 获取所有有统计数据的推销员
    const weeklyStatsList = await prisma.weeklyStats.findMany({
      where: { weekStart: start },
      select: { agentId: true },
    });

    result.totalAgents = weeklyStatsList.length;

    if (weeklyStatsList.length === 0) {
      console.log('[周奖励任务] 没有需要处理的推销员');
      return result;
    }

    console.log(`[周奖励任务] 共需处理 ${weeklyStatsList.length} 个推销员`);

    // 逐个处理推销员的周奖励
    for (const { agentId } of weeklyStatsList) {
      try {
        const rewards = await processAgentWeeklyRewards(agentId, start);
        result.processedAgents++;

        if (rewards.salesReward.issued) {
          result.salesRewardedCount++;
          result.totalRewardAmount += rewards.salesReward.amount || 0;
        }

        if (rewards.shareReward.issued) {
          result.shareRewardedCount++;
          result.totalRewardAmount += rewards.shareReward.amount || 0;
        }

        if (rewards.recruitReward.issued) {
          result.recruitRewardedCount++;
          result.totalRewardAmount += rewards.recruitReward.amount || 0;
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error(`[周奖励任务] 处理推销员${agentId}失败:`, errMsg);
        result.errors.push({ agentId, error: errMsg });
      }
    }

    console.log(`[周奖励任务] 处理完成:
  - 总推销员数: ${result.totalAgents}
  - 成功处理: ${result.processedAgents}
  - 销售奖励: ${result.salesRewardedCount}人
  - 发圈奖励: ${result.shareRewardedCount}人
  - 拉新奖励: ${result.recruitRewardedCount}人
  - 总发放金额: ${result.totalRewardAmount}元
  - 失败数: ${result.errors.length}`);

    return result;
  } catch (error) {
    console.error('[周奖励任务] 执行失败:', error);
    throw error;
  }
}

/**
 * 启动周奖励定时任务
 * 每周一凌晨 2:00 执行（北京时间）
 */
export function startWeeklyRewardTask(): void {
  // cron格式: 分 时 日 月 星期
  // 0 2 * * 1 = 每周一凌晨2:00
  cron.schedule('0 2 * * 1', async () => {
    console.log('[周奖励任务] 定时任务触发');

    // 使用分布式锁，确保多进程只执行一次
    const result = await withTaskLock(TASK_NAME, async () => {
      return processWeeklyRewards();
    }, LOCK_TTL);

    if (result === null) {
      console.log('[周奖励任务] 其他实例正在执行，跳过本次');
    }
  }, {
    timezone: 'Asia/Shanghai',
  });

  console.log('[周奖励任务] 定时任务已启动，将在每周一凌晨2:00执行');
}

/**
 * 手动触发周奖励处理
 * 用于测试或补发
 */
export async function manualProcessWeeklyRewards(weekStartStr?: string): Promise<WeeklyRewardResult> {
  let weekStart: Date | undefined;

  if (weekStartStr) {
    weekStart = new Date(weekStartStr);
    if (isNaN(weekStart.getTime())) {
      throw new Error('无效的日期格式，请使用 YYYY-MM-DD');
    }
  }

  console.log(`[周奖励任务] 手动触发, 周起始日: ${weekStart ? weekStart.toISOString().slice(0, 10) : '上周'}`);
  return processWeeklyRewards(weekStart);
}

export default {
  processWeeklyRewards,
  startWeeklyRewardTask,
  manualProcessWeeklyRewards,
};

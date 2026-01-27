/**
 * 月度团队奖励定时任务
 * 【2026-01-17 新增】
 * 【2026-01-22 P1修复】添加分布式锁防止多实例重复执行
 *
 * 功能说明：
 * - 每月1日凌晨1:00执行
 * - 统计上月各一级推销员的团队销售额
 * - 根据阶梯发放对应奖励
 * - 重置当月销售额统计
 *
 * 奖励阶梯（可在管理后台配置）：
 * - 5,000元 → ¥100
 * - 15,000元 → ¥300
 * - 50,000元 → ¥1,000
 */
import cron from 'node-cron';
import prisma from '../utils/prisma';
import * as rewardService from '../services/promotion/rewardService';
import { withTaskLock } from '../utils/taskLock';

const TASK_NAME = 'monthly-team-reward';
const LOCK_TTL = 1800; // 锁有效期30分钟

/**
 * 处理月度团队奖励
 * 查询所有一级推销员，统计上月销售额并发放奖励
 */
export async function processMonthlyTeamReward(): Promise<{
  totalAgents: number;
  processedAgents: number;
  rewardedAgents: number;
  totalRewardAmount: number;
  errors: Array<{ agentId: number; error: string }>;
}> {
  const lastMonth = rewardService.getLastMonth();
  console.log(`[月度团队奖励] 开始处理 ${lastMonth} 月的团队奖励...`);

  // 查询所有一级推销员
  const level1Agents = await prisma.agent.findMany({
    where: {
      type: 'LEVEL1',
      status: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
      monthlyTeamSales: true,
      lastRewardMonth: true,
    },
  });

  const result = {
    totalAgents: level1Agents.length,
    processedAgents: 0,
    rewardedAgents: 0,
    totalRewardAmount: 0,
    errors: [] as Array<{ agentId: number; error: string }>,
  };

  console.log(`[月度团队奖励] 共 ${result.totalAgents} 个一级推销员需要处理`);

  // 逐个处理
  for (const agent of level1Agents) {
    try {
      const processResult = await rewardService.processAgentMonthlyTeamReward(
        agent.id,
        lastMonth
      );

      if (processResult.processed) {
        result.processedAgents++;
        if (processResult.rewardAmount > 0) {
          result.rewardedAgents++;
          result.totalRewardAmount += processResult.rewardAmount;
          console.log(
            `[月度团队奖励] ${agent.name}(ID:${agent.id}): ` +
            `月销售额 ¥${processResult.monthlySales}, ` +
            `第${processResult.tierLevel}阶梯, ` +
            `奖励 ¥${processResult.rewardAmount}`
          );
        } else {
          console.log(
            `[月度团队奖励] ${agent.name}(ID:${agent.id}): ` +
            `月销售额 ¥${processResult.monthlySales}, 未达奖励门槛`
          );
        }
      } else {
        console.log(
          `[月度团队奖励] ${agent.name}(ID:${agent.id}): 已处理过或无需处理`
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push({ agentId: agent.id, error: errorMessage });
      console.error(
        `[月度团队奖励] ${agent.name}(ID:${agent.id}) 处理失败:`,
        errorMessage
      );
    }
  }

  console.log(
    `[月度团队奖励] ${lastMonth} 月处理完成: ` +
    `总计 ${result.totalAgents} 人, ` +
    `处理 ${result.processedAgents} 人, ` +
    `发放 ${result.rewardedAgents} 人, ` +
    `总金额 ¥${result.totalRewardAmount}, ` +
    `失败 ${result.errors.length} 人`
  );

  return result;
}

/**
 * 启动月度团队奖励定时任务
 */
export function startMonthlyTeamRewardTask() {
  // 每月1日凌晨1:00执行（北京时间）
  // cron表达式: 分 时 日 月 周
  cron.schedule('0 1 1 * *', async () => {
    console.log('[定时任务] 月度团队奖励任务触发');

    // 【2026-01-22 P1修复】使用分布式锁确保多实例只执行一次
    const result = await withTaskLock(TASK_NAME, async () => {
      console.log('[定时任务] 月度团队奖励任务开始执行...');

      try {
        const processResult = await processMonthlyTeamReward();
        console.log(
          `[定时任务] 月度团队奖励任务完成: ` +
          `发放 ${processResult.rewardedAgents} 人, 总金额 ¥${processResult.totalRewardAmount}`
        );
        return processResult;
      } catch (err) {
        console.error('[定时任务] 月度团队奖励任务失败:', err);
        throw err;
      }
    }, LOCK_TTL);

    if (result === null) {
      console.log('[定时任务] 月度团队奖励任务跳过（其他实例正在执行）');
    }
  }, {
    timezone: 'Asia/Shanghai', // 使用北京时间
  });

  console.log('[定时任务] 月度团队奖励任务已启动（每月1日凌晨1:00执行）');
}

/**
 * 手动触发月度团队奖励（用于测试或补发）
 * @param month 可选，指定月份(YYYY-MM格式)，默认为上个月
 */
export async function manualProcessMonthlyTeamReward(month?: string): Promise<{
  totalAgents: number;
  processedAgents: number;
  rewardedAgents: number;
  totalRewardAmount: number;
  errors: Array<{ agentId: number; error: string }>;
}> {
  const targetMonth = month || rewardService.getLastMonth();
  console.log(`[手动触发] 执行 ${targetMonth} 月的团队奖励发放`);

  // 临时修改 getLastMonth 返回值，使用传入的月份
  // 直接调用处理函数，传入指定月份
  const level1Agents = await prisma.agent.findMany({
    where: {
      type: 'LEVEL1',
      status: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
      monthlyTeamSales: true,
      lastRewardMonth: true,
    },
  });

  const result = {
    totalAgents: level1Agents.length,
    processedAgents: 0,
    rewardedAgents: 0,
    totalRewardAmount: 0,
    errors: [] as Array<{ agentId: number; error: string }>,
  };

  for (const agent of level1Agents) {
    try {
      const processResult = await rewardService.processAgentMonthlyTeamReward(
        agent.id,
        targetMonth
      );

      if (processResult.processed) {
        result.processedAgents++;
        if (processResult.rewardAmount > 0) {
          result.rewardedAgents++;
          result.totalRewardAmount += processResult.rewardAmount;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push({ agentId: agent.id, error: errorMessage });
    }
  }

  return result;
}

export default {
  startMonthlyTeamRewardTask,
  processMonthlyTeamReward,
  manualProcessMonthlyTeamReward,
};

/**
 * 利润结算定时任务
 * 【优化计划 Task 2.2】每日凌晨2:00执行
 * 【2026-01-16 推广体系升级】
 * - 旧订单（无orderSource）：T+1分润结算
 * - 新订单（有orderSource）：T+2利润结算
 * 【2026-01-22 P1修复】添加分布式锁防止多实例重复执行
 */
import cron from 'node-cron';
import commissionService from '../services/commissionService';
import * as settlementService from '../services/promotion/settlementService';
import { withTaskLock } from '../utils/taskLock';

const TASK_NAME = 'commission-settle-daily';
const LOCK_TTL = 1800; // 锁有效期30分钟

/**
 * 启动利润结算定时任务
 */
export function startCommissionSettleTask() {
  // 每天凌晨2:00执行（北京时间）
  // cron表达式: 秒 分 时 日 月 周
  cron.schedule('0 2 * * *', async () => {
    console.log('[定时任务] 利润结算任务触发');

    // 【2026-01-22 P1修复】使用分布式锁确保多实例只执行一次
    const result = await withTaskLock(TASK_NAME, async () => {
      console.log('[定时任务] 利润结算任务开始执行...');

      // 【旧逻辑】T+1分润结算（兼容旧订单）
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      try {
        const oldResult = await commissionService.settleCommissionsByDate(yesterday);
        console.log(
          `[定时任务] T+1分润结算完成（旧订单）: ` +
          `结算${oldResult.count}条分润，金额￥${oldResult.amount.toFixed(2)}`
        );
      } catch (err) {
        console.error('[定时任务] T+1分润结算失败:', err);
      }

      // 【新逻辑】T+2利润结算（新订单）
      try {
        const newResult = await settlementService.runDailySettlement();
        console.log(
          `[定时任务] T+2利润结算完成（新订单）: ` +
          `共${newResult.totalOrders}单，成功${newResult.successCount}单，失败${newResult.failCount}单`
        );
      } catch (err) {
        console.error('[定时任务] T+2利润结算失败:', err);
      }

      return { success: true };
    }, LOCK_TTL);

    if (result === null) {
      console.log('[定时任务] 利润结算任务跳过（其他实例正在执行）');
    }
  }, {
    timezone: 'Asia/Shanghai', // 使用北京时间
  });

  console.log('[定时任务] 利润结算任务已启动（每日凌晨2:00执行，T+1旧订单 + T+2新订单）');
}

/**
 * 手动触发结算（用于测试或补结算）
 * @param date 可选，指定结算日期，默认为前一天
 */
export async function manualSettle(date?: Date): Promise<{ count: number; amount: number }> {
  const settleDate = date || (() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  })();

  console.log(`[手动结算] 执行${settleDate.toISOString().split('T')[0]}的分润结算`);
  return commissionService.settleCommissionsByDate(settleDate);
}

export default {
  startCommissionSettleTask,
  manualSettle,
};

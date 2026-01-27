/**
 * 审计对账定时任务
 * 【2026-01-22 高并发优化：添加分布式锁】
 *
 * 功能：
 * 1. 每日凌晨2点创建所有推销员余额快照
 * 2. 每日凌晨3点执行对账检查
 * 3. 每周一凌晨4点执行周对账
 * 4. 每月1日凌晨5点执行月度对账
 *
 * @author Claude
 * @date 2026-01-22
 */

import cron from 'node-cron';
import {
  createAllBalanceSnapshots,
  runReconciliation,
  getAuditOverview,
} from '../services/audit/auditTraceService';
import { withTaskLock, cleanupExpiredLocks } from '../utils/taskLock';

/**
 * 启动审计对账定时任务
 */
export function startAuditReconciliationTasks(): void {
  console.log('[审计对账] 启动定时任务...');

  // 每日凌晨2点 - 创建余额快照
  cron.schedule('0 2 * * *', async () => {
    await withTaskLock('audit-daily-snapshot', async () => {
      console.log('[审计对账] 开始创建每日余额快照...');
      const startTime = Date.now();

      const result = await createAllBalanceSnapshots('DAILY');
      const duration = Date.now() - startTime;

      console.log(`[审计对账] 每日快照完成: 共${result.total}人, 一致${result.consistent}人, 差异${result.discrepancy}人, 耗时${duration}ms`);

      if (result.discrepancy > 0) {
        console.warn(`[审计对账] 发现${result.discrepancy}个推销员余额存在差异，请检查告警列表`);
      }

      return result;
    }, 1800);
  }, {
    timezone: 'Asia/Shanghai',
  });

  // 每日凌晨3点 - 执行日对账
  cron.schedule('0 3 * * *', async () => {
    await withTaskLock('audit-daily-reconciliation', async () => {
      console.log('[审计对账] 开始执行每日对账...');

      const endTime = new Date();
      const startTime = new Date(endTime);
      startTime.setDate(startTime.getDate() - 1);

      const logId = await runReconciliation(startTime, endTime, 'DAILY');
      console.log(`[审计对账] 每日对账完成，记录ID: ${logId}`);

      return logId;
    }, 1800);
  }, {
    timezone: 'Asia/Shanghai',
  });

  // 每周一凌晨4点 - 执行周对账和周快照
  cron.schedule('0 4 * * 1', async () => {
    await withTaskLock('audit-weekly-reconciliation', async () => {
      console.log('[审计对账] 开始执行每周对账...');

      // 创建周快照
      const snapshotResult = await createAllBalanceSnapshots('WEEKLY');
      console.log(`[审计对账] 周快照完成: 共${snapshotResult.total}人`);

      // 执行周对账
      const endTime = new Date();
      const startTime = new Date(endTime);
      startTime.setDate(startTime.getDate() - 7);

      const logId = await runReconciliation(startTime, endTime, 'WEEKLY');
      console.log(`[审计对账] 周对账完成，记录ID: ${logId}`);

      return logId;
    }, 3600);
  }, {
    timezone: 'Asia/Shanghai',
  });

  // 每月1日凌晨5点 - 执行月度对账和月快照
  cron.schedule('0 5 1 * *', async () => {
    await withTaskLock('audit-monthly-reconciliation', async () => {
      console.log('[审计对账] 开始执行月度对账...');

      // 创建月快照
      const snapshotResult = await createAllBalanceSnapshots('MONTHLY');
      console.log(`[审计对账] 月快照完成: 共${snapshotResult.total}人`);

      // 执行月度对账（上个月）
      const endTime = new Date();
      endTime.setDate(1);
      endTime.setHours(0, 0, 0, 0);
      const startTime = new Date(endTime);
      startTime.setMonth(startTime.getMonth() - 1);

      const logId = await runReconciliation(startTime, endTime, 'MONTHLY');
      console.log(`[审计对账] 月度对账完成，记录ID: ${logId}`);

      return logId;
    }, 3600);
  }, {
    timezone: 'Asia/Shanghai',
  });

  // 每小时检查一次告警数量 + 清理过期锁
  cron.schedule('0 * * * *', async () => {
    try {
      // 清理过期的分布式锁
      await cleanupExpiredLocks();

      const overview = await getAuditOverview();

      if (overview.criticalAlerts > 0) {
        console.error(`[审计对账] 警告！存在${overview.criticalAlerts}个严重告警待处理`);
      }

      if (overview.pendingAlerts > 10) {
        console.warn(`[审计对账] 存在${overview.pendingAlerts}个待处理告警`);
      }
    } catch (error) {
      console.error('[审计对账] 检查告警失败:', error);
    }
  }, {
    timezone: 'Asia/Shanghai',
  });

  console.log('[审计对账] 定时任务启动完成');
  console.log('  - 每日2点: 余额快照');
  console.log('  - 每日3点: 日对账');
  console.log('  - 每周一4点: 周对账');
  console.log('  - 每月1日5点: 月度对账');
  console.log('  - 每小时: 告警检查');
}

export default { startAuditReconciliationTasks };

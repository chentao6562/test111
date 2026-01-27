/**
 * 分布式任务锁服务
 *
 * 使用数据库实现分布式锁，确保定时任务在多进程/多实例部署时只执行一次
 *
 * @author Claude
 * @date 2026-01-22
 */

import prisma from './prisma';

// 锁记录接口
interface TaskLock {
  id: number;
  taskName: string;
  lockedBy: string;
  lockedAt: Date;
  expiresAt: Date;
  executionId: string;
}

// 生成唯一执行ID
function generateExecutionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  const pid = process.pid.toString(36);
  return `${timestamp}-${pid}-${random}`;
}

// 获取当前实例标识
function getInstanceId(): string {
  return `${process.env.HOSTNAME || 'local'}-${process.pid}`;
}

/**
 * 尝试获取任务锁
 *
 * @param taskName 任务名称（唯一标识）
 * @param ttlSeconds 锁的有效期（秒），默认300秒（5分钟）
 * @returns 如果获取成功返回executionId，否则返回null
 */
export async function acquireTaskLock(
  taskName: string,
  ttlSeconds: number = 300
): Promise<string | null> {
  const executionId = generateExecutionId();
  const instanceId = getInstanceId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

  try {
    // 使用原子操作：先尝试删除过期的锁，再插入新锁
    // 这样可以避免竞态条件

    // 1. 清理过期的锁
    await (prisma as any).$executeRaw`
      DELETE FROM task_locks
      WHERE task_name = ${taskName} AND expires_at < NOW()
    `;

    // 2. 尝试插入新锁（利用唯一索引保证原子性）
    const result = await (prisma as any).$executeRaw`
      INSERT IGNORE INTO task_locks (task_name, locked_by, locked_at, expires_at, execution_id)
      VALUES (${taskName}, ${instanceId}, NOW(), ${expiresAt}, ${executionId})
    `;

    // 如果插入成功（affected rows = 1），说明获取锁成功
    if (result === 1) {
      console.log(`[TaskLock] 获取锁成功: ${taskName}, executionId: ${executionId}`);
      return executionId;
    }

    // 插入失败，说明其他实例已持有锁
    console.log(`[TaskLock] 获取锁失败（已被其他实例持有）: ${taskName}`);
    return null;
  } catch (error: any) {
    // 如果表不存在，自动创建
    if (error.code === 'P2010' || error.message?.includes('task_locks')) {
      await createTaskLocksTable();
      // 重试一次
      return acquireTaskLock(taskName, ttlSeconds);
    }
    console.error(`[TaskLock] 获取锁异常: ${taskName}`, error);
    return null;
  }
}

/**
 * 释放任务锁
 *
 * @param taskName 任务名称
 * @param executionId 执行ID（必须匹配才能释放）
 */
export async function releaseTaskLock(
  taskName: string,
  executionId: string
): Promise<boolean> {
  try {
    const result = await (prisma as any).$executeRaw`
      DELETE FROM task_locks
      WHERE task_name = ${taskName} AND execution_id = ${executionId}
    `;

    if (result > 0) {
      console.log(`[TaskLock] 释放锁成功: ${taskName}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`[TaskLock] 释放锁异常: ${taskName}`, error);
    return false;
  }
}

/**
 * 续期任务锁（用于长时间运行的任务）
 *
 * @param taskName 任务名称
 * @param executionId 执行ID
 * @param ttlSeconds 新的有效期
 */
export async function renewTaskLock(
  taskName: string,
  executionId: string,
  ttlSeconds: number = 300
): Promise<boolean> {
  try {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const result = await (prisma as any).$executeRaw`
      UPDATE task_locks
      SET expires_at = ${expiresAt}
      WHERE task_name = ${taskName} AND execution_id = ${executionId}
    `;
    return result > 0;
  } catch (error) {
    console.error(`[TaskLock] 续期锁异常: ${taskName}`, error);
    return false;
  }
}

/**
 * 检查任务是否正在运行
 */
export async function isTaskRunning(taskName: string): Promise<boolean> {
  try {
    const locks = await (prisma as any).$queryRaw<TaskLock[]>`
      SELECT * FROM task_locks
      WHERE task_name = ${taskName} AND expires_at > NOW()
      LIMIT 1
    `;
    return locks.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * 带锁执行任务的包装函数
 *
 * @param taskName 任务名称
 * @param task 任务函数
 * @param ttlSeconds 锁有效期
 */
export async function withTaskLock<T>(
  taskName: string,
  task: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T | null> {
  const executionId = await acquireTaskLock(taskName, ttlSeconds);

  if (!executionId) {
    console.log(`[TaskLock] 跳过任务（锁已被占用）: ${taskName}`);
    return null;
  }

  try {
    const result = await task();
    return result;
  } finally {
    await releaseTaskLock(taskName, executionId);
  }
}

/**
 * 创建任务锁表（如果不存在）
 */
async function createTaskLocksTable(): Promise<void> {
  try {
    await (prisma as any).$executeRaw`
      CREATE TABLE IF NOT EXISTS task_locks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_name VARCHAR(100) NOT NULL,
        locked_by VARCHAR(100) NOT NULL,
        locked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        execution_id VARCHAR(50) NOT NULL,
        UNIQUE KEY uk_task_name (task_name),
        KEY idx_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `;
    console.log('[TaskLock] 任务锁表创建成功');
  } catch (error) {
    console.error('[TaskLock] 创建任务锁表失败:', error);
  }
}

/**
 * 清理所有过期的锁（可由定时任务调用）
 */
export async function cleanupExpiredLocks(): Promise<number> {
  try {
    const result = await (prisma as any).$executeRaw`
      DELETE FROM task_locks WHERE expires_at < NOW()
    `;
    if (result > 0) {
      console.log(`[TaskLock] 清理了 ${result} 个过期锁`);
    }
    return result;
  } catch (error) {
    return 0;
  }
}

export default {
  acquireTaskLock,
  releaseTaskLock,
  renewTaskLock,
  isTaskRunning,
  withTaskLock,
  cleanupExpiredLocks,
};

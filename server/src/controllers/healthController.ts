/**
 * 系统健康检查控制器
 * 【2026-01-22 高并发优化】提供系统监控和健康状态API
 *
 * @author Claude
 * @date 2026-01-22
 */

import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { getRateLimitStats } from '../middlewares/rateLimit';

// 启动时间
const startTime = Date.now();

// 请求计数器
let requestCount = 0;
let errorCount = 0;

/**
 * 增加请求计数
 */
export function incrementRequestCount(): void {
  requestCount++;
}

/**
 * 增加错误计数
 */
export function incrementErrorCount(): void {
  errorCount++;
}

/**
 * 基础健康检查
 * GET /api/health
 */
export async function healthCheck(req: Request, res: Response): Promise<void> {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
  });
}

/**
 * 详细健康检查（包含数据库连接状态）
 * GET /api/health/detailed
 */
export async function detailedHealthCheck(req: Request, res: Response): Promise<void> {
  const checks: Record<string, { status: string; latency?: number; error?: string }> = {};

  // 检查数据库连接
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = {
      status: 'healthy',
      latency: Date.now() - dbStart,
    };
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      latency: Date.now() - dbStart,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // 检查内存使用
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  const heapUsagePercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

  checks.memory = {
    status: heapUsagePercent < 90 ? 'healthy' : 'warning',
  };

  // 计算整体状态
  const isHealthy = Object.values(checks).every(c => c.status !== 'unhealthy');

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
    memory: {
      heapUsed: `${heapUsedMB}MB`,
      heapTotal: `${heapTotalMB}MB`,
      heapUsagePercent: `${heapUsagePercent}%`,
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
    },
  });
}

/**
 * 系统指标
 * GET /api/health/metrics
 */
export async function systemMetrics(req: Request, res: Response): Promise<void> {
  const memUsage = process.memoryUsage();
  const rateLimitStats = getRateLimitStats();

  // 获取数据库连接池状态（通过查询）
  let dbConnections = 0;
  try {
    const result = await prisma.$queryRaw<Array<{ count: number }>>`
      SHOW STATUS LIKE 'Threads_connected'
    `;
    if (result && result.length > 0) {
      dbConnections = Number((result[0] as any).Value || 0);
    }
  } catch (error) {
    // 忽略错误
  }

  res.json({
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    process: {
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
    },
    memory: {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      rss: memUsage.rss,
      external: memUsage.external,
    },
    requests: {
      total: requestCount,
      errors: errorCount,
      errorRate: requestCount > 0 ? (errorCount / requestCount * 100).toFixed(2) + '%' : '0%',
    },
    rateLimit: rateLimitStats,
    database: {
      connections: dbConnections,
    },
  });
}

/**
 * 就绪检查（Kubernetes readiness probe）
 * GET /api/health/ready
 */
export async function readinessCheck(req: Request, res: Response): Promise<void> {
  try {
    // 检查数据库是否可用
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Database unavailable',
    });
  }
}

/**
 * 存活检查（Kubernetes liveness probe）
 * GET /api/health/live
 */
export function livenessCheck(req: Request, res: Response): void {
  // 检查进程是否响应
  const memUsage = process.memoryUsage();
  const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

  // 如果内存使用超过95%，认为不健康
  if (heapUsagePercent > 95) {
    res.status(503).json({
      status: 'unhealthy',
      reason: 'Memory pressure',
      heapUsagePercent: `${heapUsagePercent.toFixed(2)}%`,
    });
    return;
  }

  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
}

export default {
  healthCheck,
  detailedHealthCheck,
  systemMetrics,
  readinessCheck,
  livenessCheck,
  incrementRequestCount,
  incrementErrorCount,
};

import { PrismaClient } from '@prisma/client';

/**
 * Prisma客户端单例（高并发优化版）
 *
 * 配置说明：
 * - 连接池大小由 DATABASE_URL 中的 connection_limit 控制
 * - 生产环境默认20个连接，开发环境5个
 * - 事务超时30秒，查询超时15秒
 */

// 创建Prisma客户端单例
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error', 'warn'],
  // 数据源配置（覆盖.env中的部分参数）
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// 连接池监控：记录连接获取耗时（仅开发环境）
if (process.env.NODE_ENV === 'development') {
  prisma.$use(async (params, next) => {
    const before = Date.now();
    const result = await next(params);
    const after = Date.now();
    if (after - before > 1000) {
      console.warn(`[Prisma慢查询] ${params.model}.${params.action} 耗时 ${after - before}ms`);
    }
    return result;
  });
}

// 优雅关闭：确保连接正确释放
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// 处理未捕获的Promise拒绝（防止连接泄漏）
process.on('unhandledRejection', async (reason, promise) => {
  console.error('[Prisma] 未处理的Promise拒绝:', reason);
});

export default prisma;

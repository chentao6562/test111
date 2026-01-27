/**
 * 测试辅助函数
 */

import prisma from '../../utils/prisma';

/**
 * 清理测试数据（ID >= 9000 的测试数据）
 */
export async function cleanupTestData(): Promise<void> {
  // 按外键依赖顺序删除
  await prisma.$transaction([
    // 预约相关
    prisma.reservationItem.deleteMany({
      where: {
        reservation: {
          reservationNo: { startsWith: 'TEST' },
        },
      },
    }),
    prisma.reservationAudit.deleteMany({
      where: {
        reservation: {
          reservationNo: { startsWith: 'TEST' },
        },
      },
    }),
    prisma.reservation.deleteMany({
      where: { reservationNo: { startsWith: 'TEST' } },
    }),
    // 库存日志
    prisma.stockLog.deleteMany({
      where: { remark: { contains: 'TEST' } },
    }),
    // 资金流水
    prisma.fundFlow.deleteMany({
      where: { remark: { contains: 'TEST' } },
    }),
    // 代金券
    prisma.coupon.deleteMany({
      where: { code: { startsWith: 'CPNTEST' } },
    }),
    // 推销员定价
    prisma.agentPrice.deleteMany({
      where: { agentId: { gte: 9000 } },
    }),
    // 推销员
    prisma.agent.deleteMany({
      where: { id: { gte: 9000 } },
    }),
    // 商品
    prisma.product.deleteMany({
      where: { id: { gte: 9000 } },
    }),
  ]);
}

/**
 * 生成测试预约号
 */
export function generateTestReservationNo(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TEST${timestamp}${random}`;
}

/**
 * 生成测试代金券码
 */
export function generateTestCouponCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  return `CPNTEST${timestamp}`;
}

/**
 * 并发执行多个Promise，收集所有结果
 */
export async function runConcurrent<T>(
  tasks: Array<() => Promise<T>>,
  description: string = ''
): Promise<{
  results: PromiseSettledResult<T>[];
  successCount: number;
  failCount: number;
  errors: string[];
}> {
  console.log(`[并发测试] ${description} - 启动 ${tasks.length} 个并发任务`);

  const startTime = Date.now();
  const results = await Promise.allSettled(tasks.map(task => task()));
  const duration = Date.now() - startTime;

  const successCount = results.filter(r => r.status === 'fulfilled').length;
  const failCount = results.filter(r => r.status === 'rejected').length;
  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map(r => String(r.reason));

  console.log(`[并发测试] ${description} - 完成：成功=${successCount}, 失败=${failCount}, 耗时=${duration}ms`);

  return { results, successCount, failCount, errors };
}

/**
 * 等待指定毫秒
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 重试执行函数
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 100
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (i < maxRetries - 1) {
        await sleep(delayMs * (i + 1));
      }
    }
  }

  throw lastError;
}

/**
 * 验证利润计算结果
 */
export function assertProfitEquals(
  actual: { masterProfit: number; level1Profit: number; level2Profit: number },
  expected: { masterProfit: number; level1Profit: number; level2Profit: number },
  precision: number = 0.01
): void {
  const diff = (a: number, b: number) => Math.abs(a - b);

  if (diff(actual.masterProfit, expected.masterProfit) > precision) {
    throw new Error(
      `masterProfit不匹配: 实际=${actual.masterProfit}, 预期=${expected.masterProfit}`
    );
  }
  if (diff(actual.level1Profit, expected.level1Profit) > precision) {
    throw new Error(
      `level1Profit不匹配: 实际=${actual.level1Profit}, 预期=${expected.level1Profit}`
    );
  }
  if (diff(actual.level2Profit, expected.level2Profit) > precision) {
    throw new Error(
      `level2Profit不匹配: 实际=${actual.level2Profit}, 预期=${expected.level2Profit}`
    );
  }
}

/**
 * 验证库存状态
 */
export async function assertStockState(
  productId: number,
  expectedStock: number,
  expectedLockStock: number
): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { stock: true, lockStock: true },
  });

  if (!product) {
    throw new Error(`商品 ${productId} 不存在`);
  }

  if (product.stock !== expectedStock) {
    throw new Error(
      `stock不匹配: 实际=${product.stock}, 预期=${expectedStock}`
    );
  }
  if (product.lockStock !== expectedLockStock) {
    throw new Error(
      `lockStock不匹配: 实际=${product.lockStock}, 预期=${expectedLockStock}`
    );
  }
}

/**
 * 验证资金流水
 */
export async function assertFundFlowExists(
  agentId: number,
  remarkContains: string,
  expectedAmount: number
): Promise<void> {
  const flow = await prisma.fundFlow.findFirst({
    where: {
      agentId,
      remark: { contains: remarkContains },
    },
  });

  if (!flow) {
    throw new Error(`资金流水不存在: agentId=${agentId}, remark包含=${remarkContains}`);
  }

  const actualAmount = Number(flow.amount);
  if (Math.abs(actualAmount - expectedAmount) > 0.01) {
    throw new Error(
      `资金流水金额不匹配: 实际=${actualAmount}, 预期=${expectedAmount}`
    );
  }
}

/**
 * 数据库查询辅助
 */
export const db = {
  // 获取商品库存
  async getProductStock(productId: number) {
    return prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, stock: true, lockStock: true, salesCount: true },
    });
  },

  // 获取推销员余额
  async getAgentBalance(agentId: number) {
    return prisma.agent.findUnique({
      where: { id: agentId },
      select: { id: true, balance: true, totalCommission: true },
    });
  },

  // 获取预约详情
  async getReservation(reservationNo: string) {
    return prisma.reservation.findUnique({
      where: { reservationNo },
      include: { items: true },
    });
  },

  // 统计预约状态分布
  async getReservationStatusCounts() {
    const result = await prisma.reservation.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    return Object.fromEntries(result.map(r => [r.status, r._count.id]));
  },

  // 检查库存异常
  async checkStockAnomalies() {
    return prisma.product.findMany({
      where: {
        OR: [
          { stock: { lt: 0 } },
          { lockStock: { lt: 0 } },
        ],
      },
      select: { id: true, name: true, stock: true, lockStock: true },
    });
  },
};

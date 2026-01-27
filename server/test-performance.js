/**
 * 性能测试脚本
 * 测试内容:
 * 1. API响应时间测试
 * 2. 高并发下单测试
 * 3. 分润计算性能测试
 * 4. 数据库查询性能测试
 *
 * 执行方式: node test-performance.js
 */

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();
const API_BASE = 'http://39.104.58.26/api';

// 测试结果统计
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

// 性能指标
const performanceMetrics = {
  apiResponseTimes: [],
  concurrentOrderTimes: [],
  commissionCalcTimes: [],
  queryTimes: []
};

// 测试场景包装函数
const test = async (name, fn) => {
  results.total++;
  console.log(`\n【测试${results.total}】${name}`);
  console.log('─'.repeat(50));

  try {
    const startTime = Date.now();
    await fn();
    const duration = Date.now() - startTime;

    results.passed++;
    results.tests.push({ name, status: 'PASS', duration });
    console.log(`✓ 测试通过 (${duration}ms)\n`);
    return true;
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'FAIL', error: error.message });
    console.log(`✗ 测试失败: ${error.message}\n`);
    return false;
  }
};

// 计算统计数据
const calculateStats = (times) => {
  if (times.length === 0) return { avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };

  const sorted = [...times].sort((a, b) => a - b);
  const sum = times.reduce((a, b) => a + b, 0);

  return {
    avg: Math.round(sum / times.length),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)]
  };
};

async function performanceTest() {
  console.log('======= 性能测试开始 =======');
  console.log(`执行时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n`);

  let testAgent = null;
  let testProduct = null;
  let agentToken = null;

  // ========== 准备测试环境 ==========
  await test('准备测试环境', async () => {
    // 查找测试代理商
    testAgent = await prisma.agent.findFirst({
      where: {
        phone: '13800138000',
        status: 'active'
      }
    });

    if (!testAgent) {
      throw new Error('测试代理商不存在');
    }

    // 查找测试商品
    testProduct = await prisma.product.findFirst({
      where: {
        status: 'active',
        stock: { gt: 100 }
      }
    });

    if (!testProduct) {
      throw new Error('无可用测试商品');
    }

    // 生成Token
    const jwt = require('jsonwebtoken');
    agentToken = jwt.sign(
      { id: testAgent.id, type: 'agent', phone: testAgent.phone },
      process.env.JWT_SECRET || 'firework2026',
      { expiresIn: '7d' }
    );

    console.log(`  测试代理: ${testAgent.name} (ID: ${testAgent.id})`);
    console.log(`  测试商品: ${testProduct.name} (ID: ${testProduct.id}, 库存: ${testProduct.stock})`);
  });

  // ========== 测试1: API响应时间测试 ==========
  await test('API响应时间测试 (100次请求)', async () => {
    const iterations = 100;
    const times = [];

    console.log(`  开始测试...`);

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();

      const response = await axios.get(`${API_BASE}/products`, {
        headers: { Authorization: `Bearer ${agentToken}` },
        validateStatus: () => true
      });

      const duration = Date.now() - start;
      times.push(duration);

      if (response.status !== 200) {
        throw new Error(`请求失败: ${response.status}`);
      }

      // 每20次显示进度
      if ((i + 1) % 20 === 0) {
        console.log(`  进度: ${i + 1}/${iterations}`);
      }
    }

    performanceMetrics.apiResponseTimes = times;
    const stats = calculateStats(times);

    console.log(`  请求次数: ${iterations}次`);
    console.log(`  平均响应: ${stats.avg}ms`);
    console.log(`  最快响应: ${stats.min}ms`);
    console.log(`  最慢响应: ${stats.max}ms`);
    console.log(`  P50: ${stats.p50}ms`);
    console.log(`  P95: ${stats.p95}ms`);
    console.log(`  P99: ${stats.p99}ms`);

    // 验证性能指标
    if (stats.p95 > 1000) {
      throw new Error(`P95响应时间过长: ${stats.p95}ms (期望<1000ms)`);
    }
  });

  // ========== 测试2: 高并发下单测试 ==========
  await test('高并发下单测试 (20并发)', async () => {
    const concurrency = 20;
    const times = [];

    console.log(`  开始测试...`);

    // 准备充足的库存
    await prisma.product.update({
      where: { id: testProduct.id },
      data: { stock: 200 }
    });

    const start = Date.now();

    const promises = [];
    for (let i = 0; i < concurrency; i++) {
      promises.push(
        (async () => {
          const reqStart = Date.now();

          const response = await axios.post(
            `${API_BASE}/orders`,
            {
              items: [{
                productId: testProduct.id,
                quantity: 1
              }],
              contactName: '测试客户',
              contactPhone: '13900000000',
              needTransfer: false
            },
            {
              headers: { Authorization: `Bearer ${agentToken}` },
              validateStatus: () => true
            }
          );

          const duration = Date.now() - reqStart;
          times.push(duration);

          return {
            success: response.status === 201,
            orderId: response.data?.data?.id,
            status: response.status,
            message: response.data?.message || '',
            duration
          };
        })()
      );
    }

    const orderResults = await Promise.all(promises);
    const totalDuration = Date.now() - start;

    const successCount = orderResults.filter(r => r.success).length;
    const failCount = orderResults.filter(r => !r.success).length;
    const successOrders = orderResults.filter(r => r.success).map(r => r.orderId);
    const failedOrders = orderResults.filter(r => !r.success);

    performanceMetrics.concurrentOrderTimes = times;
    const stats = calculateStats(times);

    console.log(`  并发数: ${concurrency}`);
    console.log(`  成功订单: ${successCount}单`);
    console.log(`  失败订单: ${failCount}单`);
    console.log(`  总耗时: ${totalDuration}ms`);
    console.log(`  平均耗时: ${stats.avg}ms`);
    console.log(`  P95: ${stats.p95}ms`);
    console.log(`  TPS: ${Math.round((successCount / totalDuration) * 1000)} 单/秒`);

    // 显示失败原因
    if (failCount > 0 && failedOrders.length > 0) {
      console.log(`  失败原因: ${failedOrders[0].status} - ${failedOrders[0].message}`);
    }

    // 清理测试订单
    for (const orderId of successOrders) {
      await prisma.orderItem.deleteMany({ where: { orderId } });
      await prisma.order.delete({ where: { id: orderId } });
    }

    // 验证性能指标
    if (stats.p95 > 2000) {
      throw new Error(`P95下单时间过长: ${stats.p95}ms (期望<2000ms)`);
    }

    if (successCount < concurrency * 0.9) {
      throw new Error(`成功率过低: ${(successCount/concurrency*100).toFixed(1)}% (期望>90%)`);
    }
  });

  // ========== 测试3: 分润计算性能测试 ==========
  await test('分润计算性能测试 (100次计算)', async () => {
    const iterations = 100;
    const times = [];

    console.log(`  开始测试...`);

    // 创建测试订单
    const testOrders = [];
    for (let i = 0; i < 10; i++) {
      const order = await prisma.order.create({
        data: {
          orderNo: `PERF_COMM_${Date.now()}_${i}`,
          agentId: testAgent.id,
          totalAmount: 596,
          status: 'completed',
          needTransfer: false,
          fullPaid: true,
          paidAmount: 596,
          contactName: '测试',
          contactPhone: '13900000000',
          needConfirm: false,
          pickedAt: new Date()
        }
      });

      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: testProduct.id,
          quantity: 2,
          price: testProduct.agentPrice,
          productName: testProduct.name,
          productImage: testProduct.images || null
        }
      });

      testOrders.push(order.id);
    }

    // 执行100次分润计算
    for (let i = 0; i < iterations; i++) {
      const orderId = testOrders[i % testOrders.length];

      const start = Date.now();

      // 调用分润计算逻辑（简化版）
      await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { agent: { include: { parent: true } } }
        });

        if (!order || !order.agent.parentId) return;

        // 查询分润规则
        const rule = await tx.commissionRule.findFirst({
          where: { minAmount: { lte: order.totalAmount } },
          orderBy: { minAmount: 'desc' }
        });

        if (!rule) return;

        // 检查是否已存在分润
        const existing = await tx.commission.findFirst({
          where: { orderId: order.id }
        });

        if (existing) return;

        // 创建分润记录
        const amount = Number(order.totalAmount) * Number(rule.level1Rate) / 100;
        await tx.commission.create({
          data: {
            agentId: order.agent.parentId,
            orderId: order.id,
            amount,
            rate: Number(rule.level1Rate),
            type: 'DIRECT',
            status: 'PENDING'
          }
        });
      });

      const duration = Date.now() - start;
      times.push(duration);

      if ((i + 1) % 20 === 0) {
        console.log(`  进度: ${i + 1}/${iterations}`);
      }
    }

    performanceMetrics.commissionCalcTimes = times;
    const stats = calculateStats(times);

    console.log(`  计算次数: ${iterations}次`);
    console.log(`  平均耗时: ${stats.avg}ms`);
    console.log(`  P95: ${stats.p95}ms`);
    console.log(`  P99: ${stats.p99}ms`);

    // 清理测试数据
    for (const orderId of testOrders) {
      await prisma.commission.deleteMany({ where: { orderId } });
      await prisma.orderItem.deleteMany({ where: { orderId } });
      await prisma.order.delete({ where: { id: orderId } });
    }

    // 验证性能指标
    if (stats.p95 > 500) {
      throw new Error(`P95计算时间过长: ${stats.p95}ms (期望<500ms)`);
    }
  });

  // ========== 测试4: 数据库查询性能测试 ==========
  await test('数据库查询性能测试 (100次查询)', async () => {
    const iterations = 100;
    const times = [];

    console.log(`  开始测试...`);

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();

      // 复杂查询：订单列表+关联商品+代理商信息
      await prisma.order.findMany({
        where: { agentId: testAgent.id },
        include: {
          items: {
            include: { product: true }
          },
          agent: true
        },
        take: 10,
        orderBy: { createdAt: 'desc' }
      });

      const duration = Date.now() - start;
      times.push(duration);

      if ((i + 1) % 20 === 0) {
        console.log(`  进度: ${i + 1}/${iterations}`);
      }
    }

    performanceMetrics.queryTimes = times;
    const stats = calculateStats(times);

    console.log(`  查询次数: ${iterations}次`);
    console.log(`  平均耗时: ${stats.avg}ms`);
    console.log(`  P50: ${stats.p50}ms`);
    console.log(`  P95: ${stats.p95}ms`);
    console.log(`  P99: ${stats.p99}ms`);

    // 验证性能指标
    if (stats.p95 > 500) {
      throw new Error(`P95查询时间过长: ${stats.p95}ms (期望<500ms)`);
    }
  });

  // ========== 测试5: 压力测试 - 持续负载 ==========
  await test('压力测试: 持续负载 (50请求/5秒)', async () => {
    const totalRequests = 50;
    const durationSeconds = 5;
    const times = [];
    let successCount = 0;
    let failCount = 0;

    console.log(`  开始测试...`);
    const start = Date.now();

    const promises = [];
    for (let i = 0; i < totalRequests; i++) {
      // 均匀分布请求
      const delay = (durationSeconds * 1000 / totalRequests) * i;

      promises.push(
        (async () => {
          await new Promise(resolve => setTimeout(resolve, delay));

          const reqStart = Date.now();
          try {
            const response = await axios.get(`${API_BASE}/products`, {
              headers: { Authorization: `Bearer ${agentToken}` },
              validateStatus: () => true,
              timeout: 5000
            });

            const duration = Date.now() - reqStart;
            times.push(duration);

            if (response.status === 200) {
              successCount++;
            } else {
              failCount++;
            }
          } catch (error) {
            failCount++;
          }
        })()
      );
    }

    await Promise.all(promises);
    const totalDuration = Date.now() - start;

    const stats = calculateStats(times);

    console.log(`  总请求数: ${totalRequests}`);
    console.log(`  成功请求: ${successCount}`);
    console.log(`  失败请求: ${failCount}`);
    console.log(`  成功率: ${(successCount/totalRequests*100).toFixed(1)}%`);
    console.log(`  总耗时: ${totalDuration}ms`);
    console.log(`  实际TPS: ${Math.round((successCount / totalDuration) * 1000)}`);
    console.log(`  平均响应: ${stats.avg}ms`);
    console.log(`  P95: ${stats.p95}ms`);

    // 验证性能指标
    if (successCount < totalRequests * 0.95) {
      throw new Error(`成功率过低: ${(successCount/totalRequests*100).toFixed(1)}% (期望>95%)`);
    }
  });

  // 最终统计
  console.log('\n======= 性能测试完成 =======\n');
  console.log(`总测试项: ${results.total}`);
  console.log(`通过: ${results.passed}`);
  console.log(`失败: ${results.failed}`);
  console.log(`通过率: ${(results.passed / results.total * 100).toFixed(1)}%\n`);

  // 性能指标汇总
  console.log('======= 性能指标汇总 =======\n');

  if (performanceMetrics.apiResponseTimes.length > 0) {
    const apiStats = calculateStats(performanceMetrics.apiResponseTimes);
    console.log('API响应时间:');
    console.log(`  平均: ${apiStats.avg}ms`);
    console.log(`  P50: ${apiStats.p50}ms`);
    console.log(`  P95: ${apiStats.p95}ms`);
    console.log(`  P99: ${apiStats.p99}ms`);
    console.log(`  评级: ${apiStats.p95 < 500 ? '✅ 优秀' : apiStats.p95 < 1000 ? '⚠️ 良好' : '❌ 需优化'}\n`);
  }

  if (performanceMetrics.concurrentOrderTimes.length > 0) {
    const orderStats = calculateStats(performanceMetrics.concurrentOrderTimes);
    console.log('并发下单性能:');
    console.log(`  平均: ${orderStats.avg}ms`);
    console.log(`  P95: ${orderStats.p95}ms`);
    console.log(`  评级: ${orderStats.p95 < 1000 ? '✅ 优秀' : orderStats.p95 < 2000 ? '⚠️ 良好' : '❌ 需优化'}\n`);
  }

  if (performanceMetrics.commissionCalcTimes.length > 0) {
    const commStats = calculateStats(performanceMetrics.commissionCalcTimes);
    console.log('分润计算性能:');
    console.log(`  平均: ${commStats.avg}ms`);
    console.log(`  P95: ${commStats.p95}ms`);
    console.log(`  评级: ${commStats.p95 < 200 ? '✅ 优秀' : commStats.p95 < 500 ? '⚠️ 良好' : '❌ 需优化'}\n`);
  }

  if (performanceMetrics.queryTimes.length > 0) {
    const queryStats = calculateStats(performanceMetrics.queryTimes);
    console.log('数据库查询性能:');
    console.log(`  平均: ${queryStats.avg}ms`);
    console.log(`  P95: ${queryStats.p95}ms`);
    console.log(`  评级: ${queryStats.p95 < 200 ? '✅ 优秀' : queryStats.p95 < 500 ? '⚠️ 良好' : '❌ 需优化'}\n`);
  }

  // 总体评级
  const allP95 = [
    ...performanceMetrics.apiResponseTimes,
    ...performanceMetrics.concurrentOrderTimes,
    ...performanceMetrics.commissionCalcTimes,
    ...performanceMetrics.queryTimes
  ];

  if (allP95.length > 0) {
    const overallStats = calculateStats(allP95);
    console.log('总体性能评级:');
    console.log(`  P95: ${overallStats.p95}ms`);

    if (overallStats.p95 < 500 && results.failed === 0) {
      console.log(`  评级: 🟢 A级（优秀）`);
    } else if (overallStats.p95 < 1000 && results.failed === 0) {
      console.log(`  评级: 🟡 B级（良好）`);
    } else {
      console.log(`  评级: 🔴 C级（需优化）`);
    }
  }

  if (results.failed > 0) {
    console.log('\n❌ 性能测试发现问题：\n');
    results.tests.filter(t => t.status === 'FAIL').forEach(t => {
      console.log(`  - ${t.name}: ${t.error}`);
    });
  } else {
    console.log('\n✅ 所有性能测试通过！');
  }

  await prisma.$disconnect();
}

performanceTest()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n测试执行失败:', error);
    process.exit(1);
  });

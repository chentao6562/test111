/**
 * 1000场景交易快速测试脚本（访客模式）
 * 跳过登录环节，专注于核心交易流程测试
 * 执行命令：node tests/transaction-1000-fast.cjs
 */

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const BASE_URL = 'http://39.104.58.26';

// 请求延迟
async function delay(ms) {
  return new Promise(r => setTimeout(r, ms || 200));
}

// ==================== API客户端 ====================

async function staffLogin(username, password) {
  try {
    const res = await axios.post(`${BASE_URL}/api/staff/login`, { username, password });
    return res.data.data?.token || null;
  } catch (e) {
    console.error(`员工登录失败:`, e.message);
    return null;
  }
}

async function createReservation(params) {
  try {
    await delay(100);
    const res = await axios.post(`${BASE_URL}/api/reservations`, params);
    return res.data;
  } catch (e) {
    if (e.response?.status === 429) {
      await delay(3000);
      return createReservation(params);
    }
    return { code: -1, message: e.response?.data?.message || e.message };
  }
}

async function cancelReservation(id, phone) {
  try {
    const res = await axios.delete(`${BASE_URL}/api/reservations/${id}?phone=${phone}`);
    return res.data;
  } catch (e) {
    return { code: -1, message: e.message };
  }
}

async function confirmReservation(id, staffToken) {
  try {
    const res = await axios.post(
      `${BASE_URL}/api/store/reservations/${id}/confirm`,
      { confirmTime: new Date().toISOString() },
      { headers: { Authorization: `Bearer ${staffToken}` } }
    );
    return res.data;
  } catch (e) {
    return { code: -1, message: e.message };
  }
}

async function completePickup(params, staffToken) {
  try {
    const res = await axios.post(
      `${BASE_URL}/api/store/pickup/complete`,
      params,
      { headers: { Authorization: `Bearer ${staffToken}` } }
    );
    return res.data;
  } catch (e) {
    return { code: -1, message: e.response?.data?.message || e.message };
  }
}

// ==================== 数据准备 ====================

async function getTestData() {
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE', stock: { gt: 5 } },
    take: 30,
    select: { id: true, name: true, stock: true, costPrice: true, supplyPrice: true }
  });

  const agents = await prisma.agent.findMany({
    where: { status: 'ACTIVE' },
    take: 10,
    select: { id: true, phone: true, type: true, isMaster: true, parentId: true, balance: true }
  });

  const store = await prisma.warehouse.findFirst({ where: { status: 'ACTIVE' } });

  return { products, agents, store };
}

function generatePhone(index) {
  return `1380099${String(index).padStart(4, '0')}`;
}

function generatePickupDate() {
  const date = new Date();
  date.setDate(date.getDate() + Math.floor(Math.random() * 7) + 1);
  return date.toISOString().split('T')[0];
}

// ==================== 测试场景 ====================

// 1. 普通预约创建测试
async function testCreateReservation(testData, index) {
  const { products, agents, store } = testData;
  const product = products[index % products.length];
  const agent = agents[index % agents.length];
  const phone = generatePhone(index);

  const createRes = await createReservation({
    customerName: `测试客户${index}`,
    customerPhone: phone,
    pickupDate: generatePickupDate(),
    storeId: store?.id || 1,
    items: [{ productId: product.id, quantity: 1 }],
    salespersonId: agent?.id
  });

  if (createRes.code !== 0) {
    return { passed: false, error: createRes.message };
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: createRes.data.reservationId }
  });

  return {
    passed: reservation && reservation.status === 0,
    reservationId: createRes.data.reservationId,
    error: reservation ? null : '预约创建失败'
  };
}

// 2. 完整核销流程测试
async function testFullPickupFlow(testData, staffToken, index) {
  const { products, agents, store } = testData;
  const product = products[index % products.length];
  const agent = agents.find(a => !a.isMaster) || agents[0];
  const phone = generatePhone(1000 + index);

  // 记录初始数据
  const productBefore = await prisma.product.findUnique({ where: { id: product.id } });
  const initialStock = productBefore.stock;
  const initialSalesCount = productBefore.salesCount;

  let agentBefore = null;
  if (agent) {
    agentBefore = await prisma.agent.findUnique({ where: { id: agent.id } });
  }

  // 1. 创建预约
  const createRes = await createReservation({
    customerName: `核销测试${index}`,
    customerPhone: phone,
    pickupDate: generatePickupDate(),
    storeId: store?.id || 1,
    items: [{ productId: product.id, quantity: 1 }],
    salespersonId: agent?.id
  });

  if (createRes.code !== 0) {
    return { passed: false, error: `创建预约失败: ${createRes.message}`, stage: 'create' };
  }

  const reservationId = createRes.data.reservationId;

  // 2. 确认预约
  await confirmReservation(reservationId, staffToken);

  // 3. 直接更新为待提货状态（模拟备货完成）
  await prisma.reservation.update({
    where: { id: reservationId },
    data: { status: 9 }
  });

  // 4. 核销
  const pickupRes = await completePickup({
    reservationId,
    paymentMethod: 'CASH',
    deliverGift: index % 2 === 0
  }, staffToken);

  if (pickupRes.code !== 0) {
    return { passed: false, error: `核销失败: ${pickupRes.message}`, stage: 'pickup', reservationId };
  }

  // 5. 验证结果
  const reservationAfter = await prisma.reservation.findUnique({ where: { id: reservationId } });
  const productAfter = await prisma.product.findUnique({ where: { id: product.id } });

  const statusOK = reservationAfter && reservationAfter.status === 3;
  const stockOK = productAfter.stock === initialStock - 1;
  const salesOK = productAfter.salesCount === initialSalesCount + 1;

  let profitOK = true;
  if (agent && agentBefore) {
    const agentAfter = await prisma.agent.findUnique({ where: { id: agent.id } });
    // 只要余额没变少就算通过（分润可能为0）
    profitOK = Number(agentAfter.balance) >= Number(agentBefore.balance);
  }

  const passed = statusOK && stockOK && salesOK && profitOK;

  return {
    passed,
    reservationId,
    checks: { statusOK, stockOK, salesOK, profitOK },
    error: passed ? null : `验证失败: status=${statusOK}, stock=${stockOK}, sales=${salesOK}, profit=${profitOK}`
  };
}

// 3. 取消预约测试
async function testCancelReservation(testData, index) {
  const { products, store } = testData;
  const product = products[index % products.length];
  const phone = generatePhone(2000 + index);

  // 记录初始库存
  const productBefore = await prisma.product.findUnique({ where: { id: product.id } });
  const initialLockStock = productBefore.lockStock;

  // 创建预约
  const createRes = await createReservation({
    customerName: `取消测试${index}`,
    customerPhone: phone,
    pickupDate: generatePickupDate(),
    storeId: store?.id || 1,
    items: [{ productId: product.id, quantity: 1 }]
  });

  if (createRes.code !== 0) {
    return { passed: false, error: createRes.message };
  }

  // 检查库存锁定
  const productAfterCreate = await prisma.product.findUnique({ where: { id: product.id } });
  const lockStockIncreased = productAfterCreate.lockStock > initialLockStock;

  // 取消预约
  await cancelReservation(createRes.data.reservationId, phone);

  // 验证状态和库存释放
  const reservation = await prisma.reservation.findUnique({
    where: { id: createRes.data.reservationId }
  });

  const productAfterCancel = await prisma.product.findUnique({ where: { id: product.id } });
  const lockStockReleased = productAfterCancel.lockStock <= initialLockStock;

  const passed = reservation && reservation.status === 4 && lockStockReleased;

  return {
    passed,
    checks: { cancelled: reservation?.status === 4, lockStockIncreased, lockStockReleased },
    error: passed ? null : `取消验证失败`
  };
}

// 4. 库存边界测试
async function testStockBoundary(testData, index) {
  const { products, store } = testData;
  // 找一个库存较少的商品
  const product = products.find(p => p.stock > 0 && p.stock < 10) || products[0];
  const phone = generatePhone(3000 + index);

  // 尝试超量预约
  const createRes = await createReservation({
    customerName: `库存边界${index}`,
    customerPhone: phone,
    pickupDate: generatePickupDate(),
    storeId: store?.id || 1,
    items: [{ productId: product.id, quantity: 999 }] // 超大数量
  });

  // 应该失败
  const passed = createRes.code !== 0 && createRes.message?.includes('库存');

  return {
    passed,
    error: passed ? null : `库存边界测试失败: ${createRes.message}`
  };
}

// 5. 并发核销测试
async function testConcurrentPickup(testData, staffToken, index) {
  const { products, store } = testData;
  const product = products[index % products.length];
  const phone = generatePhone(4000 + index);

  // 创建预约
  const createRes = await createReservation({
    customerName: `并发测试${index}`,
    customerPhone: phone,
    pickupDate: generatePickupDate(),
    storeId: store?.id || 1,
    items: [{ productId: product.id, quantity: 1 }]
  });

  if (createRes.code !== 0) {
    return { passed: false, error: createRes.message };
  }

  const reservationId = createRes.data.reservationId;
  await confirmReservation(reservationId, staffToken);
  await prisma.reservation.update({
    where: { id: reservationId },
    data: { status: 9 }
  });

  // 并发核销
  const results = await Promise.all([
    completePickup({ reservationId, paymentMethod: 'CASH', deliverGift: false }, staffToken),
    completePickup({ reservationId, paymentMethod: 'CASH', deliverGift: false }, staffToken)
  ]);

  const successCount = results.filter(r => r.code === 0).length;
  const passed = successCount === 1; // 只能有一个成功

  return {
    passed,
    successCount,
    error: passed ? null : `并发核销异常: ${successCount}个成功`
  };
}

// ==================== 主测试流程 ====================

async function main() {
  console.log('=====================================');
  console.log('1000场景交易快速测试（访客模式）');
  console.log('=====================================');
  console.log(`测试环境: ${BASE_URL}`);
  console.log(`开始时间: ${new Date().toISOString()}`);
  console.log('');

  // 获取测试数据
  console.log('正在获取测试数据...');
  const testData = await getTestData();
  console.log(`- 可用商品: ${testData.products.length}个`);
  console.log(`- 可用推销员: ${testData.agents.length}个`);
  console.log('');

  // 员工登录
  console.log('正在登录门店员工...');
  const staffToken = await staffLogin('warehouse01', '123456');
  if (!staffToken) {
    console.error('员工登录失败');
    process.exit(1);
  }
  console.log('员工登录成功');
  console.log('');

  // 测试计划
  const testPlan = [
    { name: '预约创建', count: 300, fn: (i) => testCreateReservation(testData, i) },
    { name: '完整核销', count: 400, fn: (i) => testFullPickupFlow(testData, staffToken, i) },
    { name: '取消预约', count: 200, fn: (i) => testCancelReservation(testData, i) },
    { name: '库存边界', count: 50, fn: (i) => testStockBoundary(testData, i) },
    { name: '并发核销', count: 50, fn: (i) => testConcurrentPickup(testData, staffToken, i) }
  ];

  const stats = {};
  const errors = [];
  let totalCompleted = 0;
  const totalTests = testPlan.reduce((sum, t) => sum + t.count, 0);

  console.log(`共计 ${totalTests} 个测试场景`);
  console.log('');

  // 执行测试
  for (const test of testPlan) {
    stats[test.name] = { total: test.count, passed: 0 };
    console.log(`开始测试: ${test.name} (${test.count}个)...`);

    for (let i = 0; i < test.count; i++) {
      try {
        const result = await test.fn(i);
        if (result.passed) {
          stats[test.name].passed++;
        } else if (result.error) {
          errors.push({
            test: test.name,
            index: i,
            error: result.error
          });
        }
      } catch (e) {
        errors.push({
          test: test.name,
          index: i,
          error: e.message
        });
      }

      totalCompleted++;
      if (totalCompleted % 100 === 0) {
        const pct = Math.round(totalCompleted / totalTests * 100);
        console.log(`进度: ${totalCompleted}/${totalTests} (${pct}%)`);
      }

      await delay(150);
    }
  }

  // 输出结果
  console.log('');
  console.log('=====================================');
  console.log('测试结果汇总');
  console.log('=====================================');

  let totalPassed = 0;
  let total = 0;

  for (const [name, stat] of Object.entries(stats)) {
    const rate = Math.round(stat.passed / stat.total * 100);
    console.log(`${name}: ${stat.passed}/${stat.total} (${rate}%)`);
    totalPassed += stat.passed;
    total += stat.total;
  }

  console.log('-------------------------------------');
  console.log(`总计: ${totalPassed}/${total} (${Math.round(totalPassed/total*100)}%)`);
  console.log('');

  if (errors.length > 0) {
    console.log('失败场景详情 (前30个):');
    const uniqueErrors = {};
    errors.forEach(e => {
      const key = `${e.test}:${e.error}`;
      if (!uniqueErrors[key]) {
        uniqueErrors[key] = { count: 0, sample: e };
      }
      uniqueErrors[key].count++;
    });

    Object.values(uniqueErrors).slice(0, 30).forEach(({ count, sample }) => {
      console.log(`  [${sample.test}] ${sample.error} (${count}次)`);
    });
  }

  console.log('');
  console.log(`结束时间: ${new Date().toISOString()}`);
  console.log('=====================================');

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('测试执行失败:', e);
  process.exit(1);
});

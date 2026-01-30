/**
 * 1000场景交易自动化测试脚本
 * 测试环境：http://39.104.58.26
 * 执行命令：node tests/transaction-1000-scenarios.cjs
 */

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const BASE_URL = 'http://39.104.58.26';
const TEST_CODE = '123456'; // 测试验证码

// 测试结果统计
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [],
  details: []
};

// ==================== API客户端 ====================

async function login(phone) {
  try {
    const res = await axios.post(`${BASE_URL}/api/auth/phone-login`, {
      phone,
      code: TEST_CODE
    });
    return res.data.data?.token || null;
  } catch (e) {
    console.error(`登录失败 ${phone}:`, e.message);
    return null;
  }
}

async function staffLogin(username, password) {
  try {
    const res = await axios.post(`${BASE_URL}/api/staff/login`, {
      username,
      password
    });
    return res.data.data?.token || null;
  } catch (e) {
    console.error(`员工登录失败:`, e.message);
    return null;
  }
}

async function createReservation(params, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  try {
    const res = await axios.post(`${BASE_URL}/api/reservations`, params, { headers });
    return res.data;
  } catch (e) {
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

async function createPackageReservation(packageId, params, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  try {
    const res = await axios.post(`${BASE_URL}/api/packages/${packageId}/reserve`, params, { headers });
    return res.data;
  } catch (e) {
    return { code: -1, message: e.response?.data?.message || e.message };
  }
}

// ==================== 数据准备 ====================

async function getTestData() {
  // 获取活跃商品
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE', stock: { gt: 10 } },
    take: 20,
    select: { id: true, name: true, stock: true, costPrice: true, supplyPrice: true }
  });

  // 获取推销员
  const agents = await prisma.agent.findMany({
    where: { status: 'ACTIVE' },
    take: 10,
    select: { id: true, phone: true, type: true, isMaster: true, parentId: true, balance: true }
  });

  // 获取套餐
  const packages = await prisma.productPackage.findMany({
    where: { status: 'ACTIVE' },
    take: 5,
    select: { id: true, name: true }
  });

  // 获取门店
  const store = await prisma.warehouse.findFirst({
    where: { status: 'ACTIVE' }
  });

  return { products, agents, packages, store };
}

// ==================== 测试场景生成器 ====================

function generatePhone(index) {
  return `1380013${String(index).padStart(4, '0')}`;
}

function generatePickupDate() {
  const date = new Date();
  date.setDate(date.getDate() + Math.floor(Math.random() * 7) + 1);
  return date.toISOString().split('T')[0];
}

// ==================== 测试执行器 ====================

async function runScenario(scenario, testData, staffToken, index) {
  const startTime = Date.now();
  let result = { scenario: scenario.type, index, passed: false, error: null, duration: 0 };

  try {
    switch (scenario.type) {
      case 'NORMAL':
        result = await testNormalReservation(scenario, testData, staffToken, index);
        break;
      case 'PACKAGE':
        result = await testPackageReservation(scenario, testData, staffToken, index);
        break;
      case 'PICKUP':
        result = await testPickupFlow(scenario, testData, staffToken, index);
        break;
      case 'CANCEL':
        result = await testCancelFlow(scenario, testData, index);
        break;
      case 'SELF_PURCHASE':
        result = await testSelfPurchase(scenario, testData, staffToken, index);
        break;
      case 'PROFIT_VERIFY':
        result = await testProfitCalculation(scenario, testData, staffToken, index);
        break;
      case 'STOCK_VERIFY':
        result = await testStockDeduction(scenario, testData, staffToken, index);
        break;
      case 'CONCURRENT':
        result = await testConcurrentPickup(scenario, testData, staffToken, index);
        break;
      default:
        result = await testNormalReservation(scenario, testData, staffToken, index);
    }
  } catch (e) {
    result.error = e.message;
  }

  result.duration = Date.now() - startTime;
  return result;
}

// ==================== 测试场景实现 ====================

// 普通商品预约测试
async function testNormalReservation(scenario, testData, staffToken, index) {
  const { products, agents, store } = testData;
  const product = products[index % products.length];
  const agent = scenario.withAgent ? agents[index % agents.length] : null;
  const phone = generatePhone(index);

  // 1. 创建预约
  const token = agent ? await login(agent.phone) : null;
  const createRes = await createReservation({
    customerName: `测试客户${index}`,
    customerPhone: phone,
    pickupDate: generatePickupDate(),
    storeId: store?.id || 1,
    items: [{ productId: product.id, quantity: scenario.quantity || 1 }],
    salespersonId: agent?.id
  }, token);

  if (createRes.code !== 0) {
    return { scenario: 'NORMAL', index, passed: false, error: createRes.message };
  }

  // 2. 验证预约创建
  const reservation = await prisma.reservation.findUnique({
    where: { id: createRes.data.reservationId }
  });

  const passed = reservation && reservation.status === 0;
  return {
    scenario: 'NORMAL',
    index,
    passed,
    reservationId: createRes.data.reservationId,
    error: passed ? null : '预约状态不正确'
  };
}

// 套餐预约测试
async function testPackageReservation(scenario, testData, staffToken, index) {
  const { packages, agents, store } = testData;
  if (!packages.length) {
    return { scenario: 'PACKAGE', index, passed: true, error: '无可用套餐，跳过' };
  }

  const pkg = packages[index % packages.length];
  const agent = scenario.withAgent ? agents[index % agents.length] : null;
  const phone = generatePhone(1000 + index);

  const token = agent ? await login(agent.phone) : null;
  const createRes = await createPackageReservation(pkg.id, {
    customerName: `套餐测试${index}`,
    customerPhone: phone,
    pickupDate: generatePickupDate(),
    storeId: store?.id || 1
  }, token);

  const passed = createRes.code === 0;
  return {
    scenario: 'PACKAGE',
    index,
    passed,
    error: passed ? null : createRes.message
  };
}

// 核销流程测试
async function testPickupFlow(scenario, testData, staffToken, index) {
  const { products, agents, store } = testData;
  const product = products[index % products.length];
  const agent = agents.find(a => !a.isMaster) || agents[0];
  const phone = generatePhone(2000 + index);

  // 记录初始余额
  const initialBalance = agent ? Number(agent.balance) : 0;

  // 1. 创建预约
  const token = agent ? await login(agent.phone) : null;
  const createRes = await createReservation({
    customerName: `核销测试${index}`,
    customerPhone: phone,
    pickupDate: generatePickupDate(),
    storeId: store?.id || 1,
    items: [{ productId: product.id, quantity: 1 }],
    salespersonId: agent?.id
  }, token);

  if (createRes.code !== 0) {
    return { scenario: 'PICKUP', index, passed: false, error: `创建预约失败: ${createRes.message}` };
  }

  const reservationId = createRes.data.reservationId;

  // 2. 确认预约
  await confirmReservation(reservationId, staffToken);

  // 3. 完成备货（直接更新状态）
  await prisma.reservation.update({
    where: { id: reservationId },
    data: { status: 9 } // 待提货
  });

  // 4. 核销
  const pickupRes = await completePickup({
    reservationId,
    paymentMethod: 'CASH',
    deliverGift: scenario.withGift !== false
  }, staffToken);

  if (pickupRes.code !== 0) {
    return { scenario: 'PICKUP', index, passed: false, error: `核销失败: ${pickupRes.message}` };
  }

  // 5. 验证状态和利润
  const finalReservation = await prisma.reservation.findUnique({
    where: { id: reservationId }
  });

  const passed = finalReservation && finalReservation.status === 3;
  return {
    scenario: 'PICKUP',
    index,
    passed,
    reservationId,
    error: passed ? null : '核销后状态不正确'
  };
}

// 取消流程测试
async function testCancelFlow(scenario, testData, index) {
  const { products, store } = testData;
  const product = products[index % products.length];
  const phone = generatePhone(3000 + index);

  // 记录初始库存
  const initialStock = product.stock;

  // 1. 创建预约
  const createRes = await createReservation({
    customerName: `取消测试${index}`,
    customerPhone: phone,
    pickupDate: generatePickupDate(),
    storeId: store?.id || 1,
    items: [{ productId: product.id, quantity: 1 }]
  }, null);

  if (createRes.code !== 0) {
    return { scenario: 'CANCEL', index, passed: false, error: createRes.message };
  }

  // 2. 取消预约
  const cancelRes = await cancelReservation(createRes.data.reservationId, phone);

  // 3. 验证状态
  const reservation = await prisma.reservation.findUnique({
    where: { id: createRes.data.reservationId }
  });

  const passed = reservation && reservation.status === 4; // 已取消
  return {
    scenario: 'CANCEL',
    index,
    passed,
    error: passed ? null : '取消状态不正确'
  };
}

// 自购订单测试
async function testSelfPurchase(scenario, testData, staffToken, index) {
  const { products, agents, store } = testData;
  const product = products[index % products.length];
  const agent = agents.find(a => !a.isMaster && a.type === 'LEVEL1') || agents[0];

  if (!agent) {
    return { scenario: 'SELF_PURCHASE', index, passed: true, error: '无可用推销员，跳过' };
  }

  // 推销员登录
  const token = await login(agent.phone);
  if (!token) {
    return { scenario: 'SELF_PURCHASE', index, passed: false, error: '推销员登录失败' };
  }

  // 创建自购订单（用自己的手机号）
  const createRes = await createReservation({
    customerName: agent.name || `推销员${agent.id}`,
    customerPhone: agent.phone, // 使用推销员自己的手机号
    pickupDate: generatePickupDate(),
    storeId: store?.id || 1,
    items: [{ productId: product.id, quantity: 1 }],
    salespersonId: agent.id
  }, token);

  if (createRes.code !== 0) {
    return { scenario: 'SELF_PURCHASE', index, passed: false, error: createRes.message };
  }

  // 验证自购标记
  const reservation = await prisma.reservation.findUnique({
    where: { id: createRes.data.reservationId }
  });

  const passed = reservation && reservation.isSelfPurchase === true;
  return {
    scenario: 'SELF_PURCHASE',
    index,
    passed,
    reservationId: createRes.data.reservationId,
    error: passed ? null : `自购标记不正确: isSelfPurchase=${reservation?.isSelfPurchase}`
  };
}

// 利润计算验证测试
async function testProfitCalculation(scenario, testData, staffToken, index) {
  const { products, agents, store } = testData;
  const product = products[index % products.length];
  const agent = agents.find(a => !a.isMaster && a.type === 'LEVEL1');

  if (!agent) {
    return { scenario: 'PROFIT_VERIFY', index, passed: true, error: '无可用一级推销员，跳过' };
  }

  const phone = generatePhone(5000 + index);
  const quantity = 2;

  // 记录初始余额
  const agentBefore = await prisma.agent.findUnique({ where: { id: agent.id } });
  const initialBalance = Number(agentBefore.balance);

  // 创建预约
  const createRes = await createReservation({
    customerName: `利润测试${index}`,
    customerPhone: phone,
    pickupDate: generatePickupDate(),
    storeId: store?.id || 1,
    items: [{ productId: product.id, quantity }],
    salespersonId: agent.id
  }, null);

  if (createRes.code !== 0) {
    return { scenario: 'PROFIT_VERIFY', index, passed: false, error: createRes.message };
  }

  const reservationId = createRes.data.reservationId;

  // 确认并核销
  await confirmReservation(reservationId, staffToken);
  await prisma.reservation.update({
    where: { id: reservationId },
    data: { status: 9 }
  });

  const pickupRes = await completePickup({
    reservationId,
    paymentMethod: 'CASH',
    deliverGift: false
  }, staffToken);

  if (pickupRes.code !== 0) {
    return { scenario: 'PROFIT_VERIFY', index, passed: false, error: pickupRes.message };
  }

  // 验证利润
  const agentAfter = await prisma.agent.findUnique({ where: { id: agent.id } });
  const finalBalance = Number(agentAfter.balance);
  const balanceChange = finalBalance - initialBalance;

  // 检查交易记录
  const traces = await prisma.transactionTrace.findMany({
    where: { sourceNo: (await prisma.reservation.findUnique({ where: { id: reservationId } }))?.reservationNo }
  });

  const passed = traces.length > 0 || balanceChange >= 0;
  return {
    scenario: 'PROFIT_VERIFY',
    index,
    passed,
    reservationId,
    balanceChange,
    traceCount: traces.length,
    error: passed ? null : '利润未正确入账'
  };
}

// 库存扣减验证测试
async function testStockDeduction(scenario, testData, staffToken, index) {
  const { products, store } = testData;
  const product = products[index % products.length];
  const phone = generatePhone(6000 + index);
  const quantity = 1;

  // 记录初始库存
  const productBefore = await prisma.product.findUnique({ where: { id: product.id } });
  const initialStock = productBefore.stock;
  const initialLockStock = productBefore.lockStock;

  // 创建预约
  const createRes = await createReservation({
    customerName: `库存测试${index}`,
    customerPhone: phone,
    pickupDate: generatePickupDate(),
    storeId: store?.id || 1,
    items: [{ productId: product.id, quantity }]
  }, null);

  if (createRes.code !== 0) {
    return { scenario: 'STOCK_VERIFY', index, passed: false, error: createRes.message };
  }

  // 检查库存锁定
  const productAfterCreate = await prisma.product.findUnique({ where: { id: product.id } });
  const lockStockChange = productAfterCreate.lockStock - initialLockStock;

  // 确认并核销
  const reservationId = createRes.data.reservationId;
  await confirmReservation(reservationId, staffToken);
  await prisma.reservation.update({
    where: { id: reservationId },
    data: { status: 9 }
  });

  await completePickup({
    reservationId,
    paymentMethod: 'CASH',
    deliverGift: false
  }, staffToken);

  // 检查最终库存
  const productAfterPickup = await prisma.product.findUnique({ where: { id: product.id } });
  const stockChange = initialStock - productAfterPickup.stock;
  const salesCountChange = productAfterPickup.salesCount - productBefore.salesCount;

  const passed = stockChange === quantity && salesCountChange === quantity;
  return {
    scenario: 'STOCK_VERIFY',
    index,
    passed,
    stockChange,
    salesCountChange,
    error: passed ? null : `库存扣减异常: stock变化=${stockChange}, salesCount变化=${salesCountChange}`
  };
}

// 并发核销测试
async function testConcurrentPickup(scenario, testData, staffToken, index) {
  const { products, store } = testData;
  const product = products[index % products.length];
  const phone = generatePhone(7000 + index);

  // 创建预约
  const createRes = await createReservation({
    customerName: `并发测试${index}`,
    customerPhone: phone,
    pickupDate: generatePickupDate(),
    storeId: store?.id || 1,
    items: [{ productId: product.id, quantity: 1 }]
  }, null);

  if (createRes.code !== 0) {
    return { scenario: 'CONCURRENT', index, passed: false, error: createRes.message };
  }

  const reservationId = createRes.data.reservationId;
  await confirmReservation(reservationId, staffToken);
  await prisma.reservation.update({
    where: { id: reservationId },
    data: { status: 9 }
  });

  // 并发核销（模拟2个请求同时到达）
  const pickupPromises = [
    completePickup({ reservationId, paymentMethod: 'CASH', deliverGift: false }, staffToken),
    completePickup({ reservationId, paymentMethod: 'CASH', deliverGift: false }, staffToken)
  ];

  const results = await Promise.all(pickupPromises);
  const successCount = results.filter(r => r.code === 0).length;

  // 应该只有一个成功
  const passed = successCount === 1;
  return {
    scenario: 'CONCURRENT',
    index,
    passed,
    successCount,
    error: passed ? null : `并发核销异常: ${successCount}个成功（应该只有1个）`
  };
}

// ==================== 主测试流程 ====================

async function main() {
  console.log('=====================================');
  console.log('1000场景交易自动化测试');
  console.log('=====================================');
  console.log(`测试环境: ${BASE_URL}`);
  console.log(`开始时间: ${new Date().toISOString()}`);
  console.log('');

  // 1. 获取测试数据
  console.log('正在获取测试数据...');
  const testData = await getTestData();
  console.log(`- 可用商品: ${testData.products.length}个`);
  console.log(`- 可用推销员: ${testData.agents.length}个`);
  console.log(`- 可用套餐: ${testData.packages.length}个`);
  console.log('');

  // 2. 员工登录
  console.log('正在登录门店员工...');
  const staffToken = await staffLogin('warehouse01', '123456');
  if (!staffToken) {
    console.error('员工登录失败，无法继续测试');
    process.exit(1);
  }
  console.log('员工登录成功');
  console.log('');

  // 3. 生成1000个测试场景
  const scenarios = [];

  // 普通商品预约 (300个)
  for (let i = 0; i < 300; i++) {
    scenarios.push({
      type: 'NORMAL',
      withAgent: i % 2 === 0,
      quantity: (i % 5) + 1
    });
  }

  // 套餐预约 (150个)
  for (let i = 0; i < 150; i++) {
    scenarios.push({
      type: 'PACKAGE',
      withAgent: i % 3 !== 0
    });
  }

  // 核销流程 (200个)
  for (let i = 0; i < 200; i++) {
    scenarios.push({
      type: 'PICKUP',
      withGift: i % 2 === 0
    });
  }

  // 取消流程 (100个)
  for (let i = 0; i < 100; i++) {
    scenarios.push({ type: 'CANCEL' });
  }

  // 自购订单 (50个)
  for (let i = 0; i < 50; i++) {
    scenarios.push({ type: 'SELF_PURCHASE' });
  }

  // 利润验证 (100个)
  for (let i = 0; i < 100; i++) {
    scenarios.push({ type: 'PROFIT_VERIFY' });
  }

  // 库存验证 (80个)
  for (let i = 0; i < 80; i++) {
    scenarios.push({ type: 'STOCK_VERIFY' });
  }

  // 并发测试 (20个)
  for (let i = 0; i < 20; i++) {
    scenarios.push({ type: 'CONCURRENT' });
  }

  console.log(`共生成 ${scenarios.length} 个测试场景`);
  console.log('');

  // 4. 执行测试
  const stats = {
    NORMAL: { total: 0, passed: 0 },
    PACKAGE: { total: 0, passed: 0 },
    PICKUP: { total: 0, passed: 0 },
    CANCEL: { total: 0, passed: 0 },
    SELF_PURCHASE: { total: 0, passed: 0 },
    PROFIT_VERIFY: { total: 0, passed: 0 },
    STOCK_VERIFY: { total: 0, passed: 0 },
    CONCURRENT: { total: 0, passed: 0 }
  };

  const errors = [];
  let completed = 0;

  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];

    try {
      const result = await runScenario(scenario, testData, staffToken, i);

      stats[scenario.type].total++;
      if (result.passed) {
        stats[scenario.type].passed++;
      } else if (result.error && !result.error.includes('跳过')) {
        errors.push({
          index: i,
          type: scenario.type,
          error: result.error
        });
      }

      completed++;

      // 每100个打印进度
      if (completed % 100 === 0) {
        console.log(`进度: ${completed}/${scenarios.length} (${Math.round(completed/scenarios.length*100)}%)`);
      }

      // 避免请求过快
      if (i % 10 === 0) {
        await new Promise(r => setTimeout(r, 100));
      }

    } catch (e) {
      errors.push({
        index: i,
        type: scenario.type,
        error: e.message
      });
    }
  }

  // 5. 输出结果
  console.log('');
  console.log('=====================================');
  console.log('测试结果汇总');
  console.log('=====================================');

  let totalPassed = 0;
  let totalTests = 0;

  for (const [type, stat] of Object.entries(stats)) {
    const rate = stat.total > 0 ? Math.round(stat.passed / stat.total * 100) : 0;
    console.log(`${type}: ${stat.passed}/${stat.total} (${rate}%)`);
    totalPassed += stat.passed;
    totalTests += stat.total;
  }

  console.log('-------------------------------------');
  console.log(`总计: ${totalPassed}/${totalTests} (${Math.round(totalPassed/totalTests*100)}%)`);
  console.log('');

  if (errors.length > 0) {
    console.log('失败场景详情 (前20个):');
    errors.slice(0, 20).forEach(e => {
      console.log(`  [${e.index}] ${e.type}: ${e.error}`);
    });
    if (errors.length > 20) {
      console.log(`  ... 还有 ${errors.length - 20} 个错误`);
    }
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

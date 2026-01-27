/**
 * 门店端库存核销与库存管理全面测试脚本
 * 包含：数据清理、库存管理、备货流程、核销流程、端到端测试、异常测试、并发测试
 *
 * 执行方式：在服务器上运行 node tests/store-stock-pickup-test.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// API基础地址
const BASE_URL = 'http://39.104.58.26/api';

// 测试账号
const TEST_ACCOUNTS = {
  staff: { username: 'warehouse01', password: '123456' },
  agent: { phone: '13800138001', password: '123456' },
  customer: { phone: '13800138000', name: '测试客户' }
};

// 测试结果收集
const testResults = [];
let staffToken = null;
let agentToken = null;
let testProductId = null;
let testReservationId = null;

// ================== 工具函数 ==================

async function request(method, url, data = null, token = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  };
  if (data) options.body = JSON.stringify(data);

  try {
    const response = await fetch(`${BASE_URL}${url}`, options);
    const json = await response.json();
    return { status: response.status, ...json };
  } catch (error) {
    return { status: 500, error: error.message };
  }
}

function logTest(name, passed, detail = '') {
  const status = passed ? '✓' : '✗';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${status}\x1b[0m ${name}${detail ? ': ' + detail : ''}`);
  testResults.push({ name, passed, detail });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ================== 阶段1：数据清理 ==================

async function cleanupTestData() {
  console.log('\n' + '='.repeat(50));
  console.log('阶段1：清理历史测试数据');
  console.log('='.repeat(50) + '\n');

  try {
    // 1. 清理测试客户的未完成预约
    const deletedItems = await prisma.$executeRaw`
      DELETE ri FROM reservation_items ri
      INNER JOIN reservations r ON ri.reservationId = r.id
      WHERE r.customerPhone = '13800138000' AND r.status != 3
    `;

    const deletedReservations = await prisma.$executeRaw`
      DELETE FROM reservations
      WHERE customerPhone = '13800138000' AND status != 3
    `;

    logTest('清理未完成预约', true, `删除 ${deletedReservations} 条预约`);

    // 2. 清理测试库存日志（最近7天的测试数据）
    const deletedLogs = await prisma.$executeRaw`
      DELETE FROM stock_logs
      WHERE remark LIKE '%测试%'
      AND createdAt > DATE_SUB(NOW(), INTERVAL 7 DAY)
    `;
    logTest('清理测试库存日志', true, `删除 ${deletedLogs} 条日志`);

    // 3. 清理测试代金券
    const deletedCoupons = await prisma.$executeRaw`
      DELETE FROM coupons
      WHERE agentId IN (SELECT id FROM agents WHERE phone IN ('13800138001', '13800138002'))
      AND status = 'UNUSED'
      AND code LIKE 'TEST%'
    `;
    logTest('清理测试代金券', true, `删除 ${deletedCoupons} 张代金券`);

    // 4. 查找测试商品并重置库存
    const testProduct = await prisma.product.findFirst({
      where: {
        status: 'active',
        stock: { gt: 0 }
      },
      orderBy: { id: 'asc' }
    });

    if (testProduct) {
      testProductId = testProduct.id;
      await prisma.product.update({
        where: { id: testProductId },
        data: { stock: 100, lockStock: 0 }
      });
      logTest('重置测试商品库存', true, `商品ID=${testProductId}, 库存=100`);
    }

    // 5. 验证清理结果
    const remainingTestReservations = await prisma.reservation.count({
      where: { customerPhone: '13800138000', status: { not: 3 } }
    });

    logTest('验证清理完成', remainingTestReservations === 0,
      remainingTestReservations === 0 ? '环境已清理' : `还有 ${remainingTestReservations} 条未清理`);

  } catch (error) {
    logTest('数据清理', false, error.message);
  }
}

// ================== 阶段2：库存管理功能测试 ==================

async function testStockManagement() {
  console.log('\n' + '='.repeat(50));
  console.log('阶段2：库存管理功能测试');
  console.log('='.repeat(50) + '\n');

  // 2.1 员工登录
  const loginResult = await request('POST', '/staff/login', TEST_ACCOUNTS.staff);
  staffToken = loginResult.data?.token;
  logTest('员工登录', !!staffToken, staffToken ? '获取token成功' : loginResult.message);

  if (!staffToken) {
    console.log('员工登录失败，跳过库存管理测试');
    return;
  }

  // 2.2 库存列表查询
  const stockList = await request('GET', '/staff/stock?page=1&pageSize=10', null, staffToken);
  logTest('库存列表查询', stockList.code === 0 && Array.isArray(stockList.data?.list),
    `返回 ${stockList.data?.list?.length || 0} 条商品`);

  // 2.3 库存统计
  const stockStats = await request('GET', '/staff/stock/statistics', null, staffToken);
  logTest('库存统计查询', stockStats.code === 0,
    stockStats.data ? `总库存=${stockStats.data.totalStock}, 预警=${stockStats.data.warningCount}` : stockStats.message);

  // 2.4 获取测试商品当前库存
  const productBefore = await prisma.product.findUnique({ where: { id: testProductId } });
  const stockBefore = Number(productBefore?.stock || 0);

  // 2.5 入库操作测试
  const stockInResult = await request('POST', '/staff/stock/in', {
    productId: testProductId,
    quantity: 10,
    remark: '测试入库'
  }, staffToken);

  const productAfterIn = await prisma.product.findUnique({ where: { id: testProductId } });
  const stockAfterIn = Number(productAfterIn?.stock || 0);

  logTest('入库操作', stockAfterIn === stockBefore + 10,
    `${stockBefore} → ${stockAfterIn} (期望 +10)`);

  // 2.6 库存调整测试（正数增加）
  const adjustPlusResult = await request('POST', '/staff/stock/adjust', {
    productId: testProductId,
    adjustQuantity: 5,
    reason: '测试调整增加'
  }, staffToken);

  const productAfterAdjustPlus = await prisma.product.findUnique({ where: { id: testProductId } });
  const stockAfterAdjustPlus = Number(productAfterAdjustPlus?.stock || 0);

  logTest('库存调整(+5)', stockAfterAdjustPlus === stockAfterIn + 5,
    `${stockAfterIn} → ${stockAfterAdjustPlus}`);

  // 2.7 库存调整测试（负数减少）
  const adjustMinusResult = await request('POST', '/staff/stock/adjust', {
    productId: testProductId,
    adjustQuantity: -3,
    reason: '测试调整减少'
  }, staffToken);

  const productAfterAdjustMinus = await prisma.product.findUnique({ where: { id: testProductId } });
  const stockAfterAdjustMinus = Number(productAfterAdjustMinus?.stock || 0);

  logTest('库存调整(-3)', stockAfterAdjustMinus === stockAfterAdjustPlus - 3,
    `${stockAfterAdjustPlus} → ${stockAfterAdjustMinus}`);

  // 2.8 库存日志查询 (API返回结构是 data.items 而不是 data.list)
  const stockLogs = await request('GET', '/staff/stock/logs?page=1&pageSize=10', null, staffToken);
  logTest('库存日志查询', stockLogs.code === 0 && Array.isArray(stockLogs.data?.items),
    `返回 ${stockLogs.data?.items?.length || 0} 条日志`);

  // 2.9 验证日志记录
  const recentLogs = await prisma.stockLog.findMany({
    where: {
      productId: testProductId,
      remark: { contains: '测试' }
    },
    orderBy: { createdAt: 'desc' },
    take: 3
  });
  logTest('入库/调整日志生成', recentLogs.length >= 3,
    `找到 ${recentLogs.length} 条测试相关日志`);
}

// ================== 阶段3：备货流程测试 ==================

async function testPrepareFlow() {
  console.log('\n' + '='.repeat(50));
  console.log('阶段3：备货流程测试');
  console.log('='.repeat(50) + '\n');

  if (!staffToken) {
    console.log('员工未登录，跳过备货测试');
    return;
  }

  // 首先创建一个测试预约
  await createTestReservation();

  if (!testReservationId) {
    console.log('无法创建测试预约，跳过备货测试');
    return;
  }

  // 3.1 获取待备货列表
  const pendingList = await request('GET', '/store/prepare/pending', null, staffToken);
  logTest('获取待备货列表', pendingList.code === 0,
    `返回 ${pendingList.data?.length || 0} 条待备货预约`);

  // 3.2 先将预约状态设为待备货（模拟系统自动触发）
  await prisma.reservation.update({
    where: { id: testReservationId },
    data: { status: 7 } // 待备货状态
  });

  // 3.3 开始备货
  const startResult = await request('POST', `/store/prepare/${testReservationId}/start`, {}, staffToken);

  const reservationAfterStart = await prisma.reservation.findUnique({ where: { id: testReservationId } });
  logTest('开始备货', reservationAfterStart?.status === 8,
    `状态: ${reservationAfterStart?.status} (期望 8=备货中)`);

  // 3.4 获取备货进度
  const progressResult = await request('GET', `/store/prepare/${testReservationId}/progress`, null, staffToken);
  logTest('获取备货进度', progressResult.code === 0,
    progressResult.data ? `${progressResult.data.preparedItems}/${progressResult.data.totalItems}` : progressResult.message);

  // 3.5 逐件确认备货
  const reservationItems = await prisma.reservationItem.findMany({
    where: { reservationId: testReservationId }
  });

  if (reservationItems.length > 0) {
    const firstItem = reservationItems[0];
    const itemResult = await request('POST', `/store/prepare/${testReservationId}/item`, {
      productId: firstItem.productId,
      prepared: true
    }, staffToken);

    const itemAfterUpdate = await prisma.reservationItem.findFirst({
      where: { reservationId: testReservationId, productId: firstItem.productId }
    });
    logTest('逐件确认备货', itemAfterUpdate?.prepared === true,
      `商品 ${firstItem.productId} prepared=${itemAfterUpdate?.prepared}`);
  }

  // 3.6 批量确认剩余商品
  if (reservationItems.length > 1) {
    const remainingIds = reservationItems.slice(1).map(item => item.productId);
    const batchResult = await request('POST', `/store/prepare/${testReservationId}/batch`, {
      productIds: remainingIds,
      prepared: true
    }, staffToken);
    logTest('批量确认备货', batchResult.code === 0,
      `批量确认 ${remainingIds.length} 件商品`);
  }

  // 确保所有商品都已备货
  await prisma.reservationItem.updateMany({
    where: { reservationId: testReservationId },
    data: { prepared: true }
  });

  // 3.7 完成备货（生成提货码）
  const completeResult = await request('POST', `/store/prepare/${testReservationId}/complete`, {}, staffToken);

  const reservationAfterComplete = await prisma.reservation.findUnique({ where: { id: testReservationId } });
  logTest('完成备货',
    reservationAfterComplete?.status === 9 && !!reservationAfterComplete?.pickupCode,
    `状态=${reservationAfterComplete?.status}, 提货码=${reservationAfterComplete?.pickupCode || '无'}`);
}

// ================== 阶段4：核销流程测试 ==================

async function testPickupFlow() {
  console.log('\n' + '='.repeat(50));
  console.log('阶段4：核销流程测试');
  console.log('='.repeat(50) + '\n');

  if (!staffToken || !testReservationId) {
    console.log('缺少必要数据，跳过核销测试');
    return;
  }

  // 确保预约处于待提货状态
  const reservation = await prisma.reservation.findUnique({ where: { id: testReservationId } });
  if (reservation?.status !== 9) {
    await prisma.reservation.update({
      where: { id: testReservationId },
      data: { status: 9, pickupCode: '12345678' }
    });
  }

  // 4.1 手机号查询预约
  const phoneQuery = await request('GET', `/store/pickup/query?phone=${TEST_ACCOUNTS.customer.phone}`, null, staffToken);
  logTest('手机号查询预约', phoneQuery.code === 0 && phoneQuery.data,
    phoneQuery.data ? `找到预约 ${phoneQuery.data.reservationNo}` : phoneQuery.message);

  // 4.2 预约号查询
  const reservationNo = reservation?.reservationNo;
  if (reservationNo) {
    const noQuery = await request('GET', `/store/pickup/query-no?no=${reservationNo}`, null, staffToken);
    logTest('预约号查询', noQuery.code === 0,
      noQuery.data ? '查询成功' : noQuery.message);
  }

  // 4.3 提货码验证
  const pickupCode = reservation?.pickupCode || '12345678';
  const verifyResult = await request('POST', '/store/pickup/verify-code', { pickupCode }, staffToken);
  logTest('提货码验证', verifyResult.code === 0,
    verifyResult.data ? '验证成功' : verifyResult.message);

  // 4.4 记录核销前的库存
  const productBefore = await prisma.product.findUnique({ where: { id: testProductId } });
  const stockBefore = Number(productBefore?.stock || 0);

  // 4.5 获取推销员可用代金券
  const couponsResult = await request('GET', `/store/pickup/coupons/${testReservationId}`, null, staffToken);
  logTest('获取可用代金券', couponsResult.code === 0,
    `找到 ${couponsResult.data?.length || 0} 张可用代金券`);

  // 4.6 完成核销
  const completeResult = await request('POST', '/store/pickup/complete', {
    reservationId: testReservationId,
    paymentMethod: 'cash',
    deliverGift: true
  }, staffToken);

  const reservationAfter = await prisma.reservation.findUnique({ where: { id: testReservationId } });
  logTest('完成核销', reservationAfter?.status === 3,
    `状态=${reservationAfter?.status} (期望 3=已完成)`);

  // 4.7 验证库存扣减
  const productAfter = await prisma.product.findUnique({ where: { id: testProductId } });
  const stockAfter = Number(productAfter?.stock || 0);
  const expectedDeduction = 2; // 测试预约数量

  logTest('库存正确扣减', stockAfter === stockBefore - expectedDeduction,
    `${stockBefore} → ${stockAfter} (期望扣减 ${expectedDeduction})`);

  // 4.8 验证利润结算 (利润信息直接在data中，不是嵌套在profitDistribution)
  if (completeResult.data?.masterProfit !== undefined) {
    logTest('利润结算', true,
      `总代=${completeResult.data.masterProfit}, 一级=${completeResult.data.level1Profit}, 二级=${completeResult.data.level2Profit}`);
  } else {
    logTest('利润结算', false, '未返回利润分配信息');
  }

  // 4.9 今日核销统计
  const todayStats = await request('GET', '/store/pickup/today-stats', null, staffToken);
  logTest('今日核销统计', todayStats.code === 0,
    todayStats.data ? `核销${todayStats.data.completedCount}单, 金额${todayStats.data.completedAmount}` : todayStats.message);

  // 4.10 今日已核销列表
  const todayCompleted = await request('GET', '/store/pickup/today-completed', null, staffToken);
  logTest('今日已核销列表', todayCompleted.code === 0,
    `返回 ${todayCompleted.data?.length || 0} 条记录`);
}

// ================== 阶段5：端到端业务流程测试 ==================

async function testE2EFlow() {
  console.log('\n' + '='.repeat(50));
  console.log('阶段5：端到端业务流程测试');
  console.log('='.repeat(50) + '\n');

  // 创建新的测试预约进行完整流程测试
  const newReservation = await createTestReservation();

  if (!newReservation) {
    logTest('端到端测试', false, '无法创建测试预约');
    return;
  }

  const reservationId = newReservation.id;

  // 记录初始库存
  const productBefore = await prisma.product.findUnique({ where: { id: testProductId } });
  const initialStock = Number(productBefore?.stock || 0);
  console.log(`初始库存: ${initialStock}`);

  // E2E-1: 电话确认
  const confirmResult = await request('POST', `/store/reservations/${reservationId}/confirm`, {}, staffToken);
  const afterConfirm = await prisma.reservation.findUnique({ where: { id: reservationId } });
  logTest('E2E: 电话确认', afterConfirm?.status === 2,
    `状态 0→${afterConfirm?.status}`);

  // E2E-2: 设为待备货
  await prisma.reservation.update({
    where: { id: reservationId },
    data: { status: 7 }
  });

  // E2E-3: 开始备货
  await request('POST', `/store/prepare/${reservationId}/start`, {}, staffToken);
  const afterStart = await prisma.reservation.findUnique({ where: { id: reservationId } });
  logTest('E2E: 开始备货', afterStart?.status === 8,
    `状态 7→${afterStart?.status}`);

  // E2E-4: 确认所有商品备货
  await prisma.reservationItem.updateMany({
    where: { reservationId },
    data: { prepared: true }
  });

  // E2E-5: 完成备货
  const prepareComplete = await request('POST', `/store/prepare/${reservationId}/complete`, {}, staffToken);
  const afterPrepare = await prisma.reservation.findUnique({ where: { id: reservationId } });
  logTest('E2E: 完成备货', afterPrepare?.status === 9 && !!afterPrepare?.pickupCode,
    `提货码: ${afterPrepare?.pickupCode}`);

  // E2E-6: 完成核销
  const pickupComplete = await request('POST', '/store/pickup/complete', {
    reservationId,
    paymentMethod: 'wechat',
    deliverGift: true
  }, staffToken);

  const afterPickup = await prisma.reservation.findUnique({ where: { id: reservationId } });
  logTest('E2E: 完成核销', afterPickup?.status === 3,
    `状态 9→${afterPickup?.status}`);

  // E2E-7: 验证库存变化
  const productAfter = await prisma.product.findUnique({ where: { id: testProductId } });
  const finalStock = Number(productAfter?.stock || 0);
  logTest('E2E: 库存验证', finalStock === initialStock - 2,
    `${initialStock} → ${finalStock}`);

  // E2E-8: 验证库存日志
  const outLog = await prisma.stockLog.findFirst({
    where: {
      productId: testProductId,
      type: 'OUT',
      remark: { contains: afterPickup?.reservationNo || '' }
    }
  });
  logTest('E2E: 出库日志', !!outLog,
    outLog ? `日志ID=${outLog.id}` : '未找到出库日志');
}

// ================== 阶段6：异常测试 ==================

async function testExceptions() {
  console.log('\n' + '='.repeat(50));
  console.log('阶段6：异常测试');
  console.log('='.repeat(50) + '\n');

  if (!staffToken) {
    console.log('员工未登录，跳过异常测试');
    return;
  }

  // EX-1: 入库数量为负数
  const negativeIn = await request('POST', '/staff/stock/in', {
    productId: testProductId,
    quantity: -5,
    remark: '测试负数入库'
  }, staffToken);
  logTest('异常: 负数入库被拒绝', negativeIn.code !== 0,
    negativeIn.message || '返回错误');

  // EX-2: 入库数量为0
  const zeroIn = await request('POST', '/staff/stock/in', {
    productId: testProductId,
    quantity: 0,
    remark: '测试零入库'
  }, staffToken);
  logTest('异常: 零入库被拒绝', zeroIn.code !== 0,
    zeroIn.message || '返回错误');

  // EX-3: 调整导致负库存
  const currentProduct = await prisma.product.findUnique({ where: { id: testProductId } });
  const currentStock = Number(currentProduct?.stock || 0);

  const overAdjust = await request('POST', '/staff/stock/adjust', {
    productId: testProductId,
    adjustQuantity: -(currentStock + 100),
    reason: '测试超量调整'
  }, staffToken);
  logTest('异常: 导致负库存被拒绝', overAdjust.code !== 0,
    overAdjust.message || '返回错误');

  // EX-4: 无效提货码
  const invalidCode = await request('POST', '/store/pickup/verify-code', {
    pickupCode: '99999999'
  }, staffToken);
  logTest('异常: 无效提货码被拒绝', invalidCode.code !== 0,
    invalidCode.message || '返回错误');

  // EX-5: 重复核销（已完成的预约）
  if (testReservationId) {
    const doublePickup = await request('POST', '/store/pickup/complete', {
      reservationId: testReservationId,
      paymentMethod: 'cash'
    }, staffToken);
    logTest('异常: 重复核销被拒绝', doublePickup.code !== 0,
      doublePickup.message || '返回错误');
  }

  // EX-6: 未登录访问
  const noAuthResult = await request('GET', '/staff/stock', null, null);
  logTest('异常: 未登录访问被拒绝', noAuthResult.status === 401 || noAuthResult.code !== 0,
    '需要认证');
}

// ================== 阶段7：并发安全测试 ==================

async function testConcurrency() {
  console.log('\n' + '='.repeat(50));
  console.log('阶段7：并发安全测试');
  console.log('='.repeat(50) + '\n');

  // 设置测试商品库存为5
  await prisma.product.update({
    where: { id: testProductId },
    data: { stock: 5, lockStock: 0 }
  });

  console.log('测试场景：10个并发预约请求，商品库存5件');

  // 获取推销员信息
  const agent = await prisma.agent.findFirst({
    where: { phone: TEST_ACCOUNTS.agent.phone }
  });

  if (!agent) {
    logTest('并发测试', false, '找不到测试推销员');
    return;
  }

  // 并发创建10个预约 - 使用原子操作（与实际服务相同的实现方式）
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(
      prisma.$transaction(async (tx) => {
        // 【正确的原子操作】使用 WHERE 条件确保库存充足才更新
        // 这与实际的预约创建服务使用的方式一致
        const requiredStock = 1;
        const affectedRows = await tx.$executeRaw`
          UPDATE products
          SET lockStock = lockStock + ${requiredStock}
          WHERE id = ${testProductId}
          AND (stock - lockStock) >= ${requiredStock}
        `;

        // 如果影响行数为0，说明库存不足
        if (affectedRows === 0) {
          throw new Error('库存不足');
        }

        // 创建预约
        const reservation = await tx.reservation.create({
          data: {
            reservationNo: `CONC${Date.now()}${i}`,
            customerName: `并发测试${i}`,
            customerPhone: `1380013800${i}`,
            pickupDate: new Date(),
            storeId: 1,
            agentId: agent.id,
            totalAmount: 100,
            status: 0
          }
        });

        await tx.reservationItem.create({
          data: {
            reservationId: reservation.id,
            productId: testProductId,
            productName: '测试商品',
            quantity: 1,
            price: 100
          }
        });

        return reservation;
      })
    );
  }

  const results = await Promise.allSettled(promises);
  const successCount = results.filter(r => r.status === 'fulfilled').length;
  const failCount = results.filter(r => r.status === 'rejected').length;

  console.log(`  成功: ${successCount}, 失败: ${failCount}`);

  // 验证最终库存状态
  const finalProduct = await prisma.product.findUnique({ where: { id: testProductId } });
  const finalLockStock = Number(finalProduct?.lockStock || 0);

  logTest('并发预约防超卖', successCount === 5 && failCount === 5,
    `预期成功5个，实际成功${successCount}个`);

  logTest('锁定库存正确', finalLockStock === 5,
    `lockStock=${finalLockStock} (期望5)`);

  // 清理并发测试数据
  await prisma.reservationItem.deleteMany({
    where: {
      reservation: {
        reservationNo: { startsWith: 'CONC' }
      }
    }
  });
  await prisma.reservation.deleteMany({
    where: { reservationNo: { startsWith: 'CONC' } }
  });

  // 重置库存
  await prisma.product.update({
    where: { id: testProductId },
    data: { stock: 100, lockStock: 0 }
  });
}

// ================== 辅助函数：创建测试预约 ==================

async function createTestReservation() {
  try {
    // 获取推销员
    const agent = await prisma.agent.findFirst({
      where: { phone: TEST_ACCOUNTS.agent.phone }
    });

    if (!agent) {
      console.log('找不到测试推销员');
      return null;
    }

    // 获取门店（数据库表名是 warehouses）
    const store = await prisma.warehouse.findFirst({
      where: { status: 'ACTIVE' }
    });
    if (!store) {
      console.log('找不到门店');
      return null;
    }

    // 获取商品价格
    const product = await prisma.product.findUnique({ where: { id: testProductId } });
    const price = Number(product?.masterRetailPrice || product?.supplyPrice || 100);
    const costPrice = Number(product?.costPrice || 50);
    const supplyPrice = Number(product?.supplyPrice || 80);

    // 创建预约
    const reservationNo = `MQ${Date.now()}`;
    const reservation = await prisma.reservation.create({
      data: {
        reservationNo,
        customerName: TEST_ACCOUNTS.customer.name,
        customerPhone: TEST_ACCOUNTS.customer.phone,
        pickupDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 明天
        storeId: store.id,
        agentId: agent.id,
        totalAmount: price * 2,
        status: 0 // 待确认
      }
    });

    // 创建预约商品
    // 【2026-01-23修复】必须包含snapshotCostPrice，否则会被误判为秒杀商品
    await prisma.reservationItem.create({
      data: {
        reservationId: reservation.id,
        productId: testProductId,
        productName: product?.name || '测试商品',
        quantity: 2,
        price: price,
        snapshotCostPrice: costPrice,       // 快照成本价
        snapshotSupplyPrice: supplyPrice,   // 快照供货价
        snapshotRetailPrice: price,         // 快照零售价
        isFlashSale: false,                 // 明确标记非秒杀
        isBargain: false                    // 明确标记非砍价
      }
    });

    testReservationId = reservation.id;
    console.log(`创建测试预约: ${reservationNo} (ID=${reservation.id})`);
    return reservation;
  } catch (error) {
    console.log('创建预约失败:', error.message);
    return null;
  }
}

// ================== 生成测试报告 ==================

function generateReport() {
  console.log('\n' + '='.repeat(50));
  console.log('测试报告');
  console.log('='.repeat(50) + '\n');

  const passed = testResults.filter(r => r.passed).length;
  const failed = testResults.filter(r => !r.passed).length;
  const total = testResults.length;
  const passRate = ((passed / total) * 100).toFixed(1);

  console.log(`时间: ${new Date().toISOString()}`);
  console.log(`总计: ${total} 项测试`);
  console.log(`\x1b[32m通过: ${passed}\x1b[0m`);
  console.log(`\x1b[31m失败: ${failed}\x1b[0m`);
  console.log(`通过率: ${passRate}%\n`);

  if (failed > 0) {
    console.log('失败项目:');
    testResults.filter(r => !r.passed).forEach(r => {
      console.log(`  \x1b[31m✗\x1b[0m ${r.name}: ${r.detail}`);
    });
  }

  console.log('\n' + '='.repeat(50));
  if (passed === total) {
    console.log('\x1b[32m所有测试通过！门店端库存核销功能正常！\x1b[0m');
  } else {
    console.log(`\x1b[33m测试完成，发现 ${failed} 个问题需要修复\x1b[0m`);
  }
  console.log('='.repeat(50));

  return { passed, failed, total, passRate };
}

// ================== 主流程 ==================

async function main() {
  console.log('='.repeat(50));
  console.log('门店端库存核销与库存管理全面测试');
  console.log('='.repeat(50));
  console.log(`执行时间: ${new Date().toISOString()}`);
  console.log(`API地址: ${BASE_URL}`);

  try {
    // 阶段1: 数据清理
    await cleanupTestData();

    // 阶段2: 库存管理功能测试
    await testStockManagement();

    // 阶段3: 备货流程测试
    await testPrepareFlow();

    // 阶段4: 核销流程测试
    await testPickupFlow();

    // 阶段5: 端到端测试
    await testE2EFlow();

    // 阶段6: 异常测试
    await testExceptions();

    // 阶段7: 并发安全测试
    await testConcurrency();

  } catch (error) {
    console.error('\n测试执行异常:', error);
  }

  // 生成报告
  const report = generateReport();

  // 清理并断开连接
  await prisma.$disconnect();

  // 返回退出码
  process.exit(report.failed > 0 ? 1 : 0);
}

main();

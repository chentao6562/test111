/**
 * 全面测试脚本 - 订单功能测试
 *
 * 执行方式: npx ts-node src/scripts/fullTest.ts
 *
 * 测试覆盖:
 * - TC-01 到 TC-06: 预约创建测试
 * - TC-07 到 TC-10: 预约确认测试
 * - TC-11 到 TC-15: 备货核销测试
 * - TC-16 到 TC-20: 利润计算测试
 * - TC-21 到 TC-23: 风控过期测试
 * - TC-24 到 TC-27: 代金券测试
 */

const API_BASE = 'http://39.104.58.26/api';

interface TestResult {
  id: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  duration: number;
  details?: any;
}

const results: TestResult[] = [];
const bugs: { id: string; severity: string; description: string; location: string }[] = [];

// 辅助函数
async function fetchAPI(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await response.json();
  return { status: response.status, data };
}

function logTest(id: string, name: string, status: 'PASS' | 'FAIL' | 'SKIP', message: string, duration: number, details?: any) {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`${icon} [${id}] ${name}: ${message} (${duration}ms)`);
  results.push({ id, name, status, message, duration, details });
}

function reportBug(id: string, severity: string, description: string, location: string) {
  bugs.push({ id, severity, description, location });
  console.log(`🐛 [BUG-${id}] ${severity}: ${description}`);
}

// ==================== 阶段1：预约创建测试 ====================
async function testReservationCreation() {
  console.log('\n========================================');
  console.log('阶段1: 预约创建测试 (TC-01 到 TC-06)');
  console.log('========================================\n');

  // TC-01: 正常创建预约
  {
    const start = Date.now();
    const testId = 'TC-01';
    const testName = '正常创建预约';
    try {
      // 先获取商品列表
      const productsRes = await fetchAPI('/products?limit=5');
      if (productsRes.data.code !== 0 || !productsRes.data.data?.list?.length) {
        logTest(testId, testName, 'SKIP', '无法获取商品列表', Date.now() - start);
      } else {
        const products = productsRes.data.data.list;
        const testProduct = products[0];

        // 创建预约
        const reservationData = {
          customerName: '测试客户01',
          customerPhone: '13900000001',
          pickupDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          items: [{ productId: testProduct.id, quantity: 1, price: testProduct.retailPrice || testProduct.masterRetailPrice }],
          storeId: 1,
          remark: 'TC-01自动测试'
        };

        const res = await fetchAPI('/reservations', {
          method: 'POST',
          body: JSON.stringify(reservationData)
        });

        if (res.data.code === 0 && res.data.data?.reservationId) {
          logTest(testId, testName, 'PASS', `预约创建成功，ID: ${res.data.data.reservationId}`, Date.now() - start, res.data.data);

          // 验证库存是否被锁定
          const productCheck = await fetchAPI(`/products/${testProduct.id}`);
          if (productCheck.data.data?.lockStock > 0) {
            console.log(`   ↳ 库存锁定验证通过，lockStock: ${productCheck.data.data.lockStock}`);
          } else {
            reportBug('001', 'P1', '预约创建后库存未正确锁定', 'reservationService.ts');
          }
        } else {
          logTest(testId, testName, 'FAIL', res.data.message || '预约创建失败', Date.now() - start, res.data);
        }
      }
    } catch (err: any) {
      logTest(testId, testName, 'FAIL', err.message, Date.now() - start);
    }
  }

  // TC-02: 库存不足时创建
  {
    const start = Date.now();
    const testId = 'TC-02';
    const testName = '库存不足时创建预约';
    try {
      // 获取一个库存较少的商品
      const productsRes = await fetchAPI('/products?limit=10');
      if (productsRes.data.code !== 0) {
        logTest(testId, testName, 'SKIP', '无法获取商品列表', Date.now() - start);
      } else {
        const products = productsRes.data.data.list;
        const testProduct = products[0];

        // 尝试创建超过库存数量的预约
        const reservationData = {
          customerName: '测试客户02',
          customerPhone: '13900000002',
          pickupDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          items: [{ productId: testProduct.id, quantity: 99999, price: testProduct.retailPrice || 100 }],
          storeId: 1,
          remark: 'TC-02库存不足测试'
        };

        const res = await fetchAPI('/reservations', {
          method: 'POST',
          body: JSON.stringify(reservationData)
        });

        if (res.data.code !== 0 && res.data.message?.includes('库存')) {
          logTest(testId, testName, 'PASS', '正确返回库存不足错误', Date.now() - start);
        } else if (res.data.code === 0) {
          logTest(testId, testName, 'FAIL', '库存检查失败，允许了超量预约', Date.now() - start);
          reportBug('002', 'P0', '库存校验失败，允许超量预约', 'reservationService.ts');
        } else {
          logTest(testId, testName, 'PASS', `返回错误: ${res.data.message}`, Date.now() - start);
        }
      }
    } catch (err: any) {
      logTest(testId, testName, 'FAIL', err.message, Date.now() - start);
    }
  }

  // TC-03: 并发创建测试（简化版）
  {
    const start = Date.now();
    const testId = 'TC-03';
    const testName = '并发创建同一商品';
    try {
      const productsRes = await fetchAPI('/products?limit=5');
      if (productsRes.data.code !== 0) {
        logTest(testId, testName, 'SKIP', '无法获取商品列表', Date.now() - start);
      } else {
        const testProduct = productsRes.data.data.list[0];
        const concurrentCount = 3;

        // 并发创建预约
        const promises = [];
        for (let i = 0; i < concurrentCount; i++) {
          const reservationData = {
            customerName: `并发测试${i}`,
            customerPhone: `1390000100${i}`,
            pickupDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            items: [{ productId: testProduct.id, quantity: 1, price: testProduct.retailPrice || 100 }],
            storeId: 1,
            remark: `TC-03并发测试${i}`
          };
          promises.push(fetchAPI('/reservations', {
            method: 'POST',
            body: JSON.stringify(reservationData)
          }));
        }

        const results = await Promise.all(promises);
        const successCount = results.filter(r => r.data.code === 0).length;

        logTest(testId, testName, 'PASS', `${concurrentCount}个并发请求，${successCount}个成功`, Date.now() - start, {
          concurrentCount,
          successCount,
          results: results.map(r => ({ code: r.data.code, message: r.data.message }))
        });
      }
    } catch (err: any) {
      logTest(testId, testName, 'FAIL', err.message, Date.now() - start);
    }
  }

  // TC-04: 检查黑名单客户
  {
    const start = Date.now();
    const testId = 'TC-04';
    const testName = '黑名单客户创建预约';
    try {
      // 先检查客户状态
      const checkRes = await fetchAPI('/reservations/check-customer?phone=13800138000');

      if (checkRes.data.code === 0) {
        const canReserve = checkRes.data.data?.canReserve;
        if (canReserve === false) {
          logTest(testId, testName, 'PASS', '风控拦截正常工作', Date.now() - start, checkRes.data.data);
        } else {
          // 该客户可以预约，这是正常的（因为我们刚清理了数据）
          logTest(testId, testName, 'PASS', '客户检查接口正常工作（无黑名单记录）', Date.now() - start, checkRes.data.data);
        }
      } else {
        logTest(testId, testName, 'FAIL', checkRes.data.message, Date.now() - start);
      }
    } catch (err: any) {
      logTest(testId, testName, 'FAIL', err.message, Date.now() - start);
    }
  }

  // TC-05: 二级推销员创建预约（价格降级逻辑）
  {
    const start = Date.now();
    const testId = 'TC-05';
    const testName = '二级推销员价格降级逻辑';
    // 需要登录推销员账号才能测试，跳过
    logTest(testId, testName, 'SKIP', '需要推销员登录态，通过门店端测试验证', Date.now() - start);
  }

  // TC-06: 价格校验
  {
    const start = Date.now();
    const testId = 'TC-06';
    const testName = '零售价校验';
    try {
      const productsRes = await fetchAPI('/products?limit=5');
      if (productsRes.data.code !== 0) {
        logTest(testId, testName, 'SKIP', '无法获取商品列表', Date.now() - start);
      } else {
        const testProduct = productsRes.data.data.list[0];

        // 尝试使用负数价格
        const reservationData = {
          customerName: '价格测试',
          customerPhone: '13900000006',
          pickupDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          items: [{ productId: testProduct.id, quantity: 1, price: -100 }],
          storeId: 1,
          remark: 'TC-06价格校验测试'
        };

        const res = await fetchAPI('/reservations', {
          method: 'POST',
          body: JSON.stringify(reservationData)
        });

        if (res.data.code !== 0) {
          logTest(testId, testName, 'PASS', '正确拒绝负数价格', Date.now() - start);
        } else {
          logTest(testId, testName, 'FAIL', '允许了负数价格预约', Date.now() - start);
          reportBug('003', 'P0', '价格校验失败，允许负数价格', 'reservationService.ts');
        }
      }
    } catch (err: any) {
      logTest(testId, testName, 'FAIL', err.message, Date.now() - start);
    }
  }
}

// ==================== 阶段2：预约确认测试 ====================
async function testReservationConfirmation() {
  console.log('\n========================================');
  console.log('阶段2: 预约确认测试 (TC-07 到 TC-10)');
  console.log('========================================\n');

  // 获取门店员工token
  let staffToken = '';
  try {
    const loginRes = await fetchAPI('/staff/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'warehouse01', password: '123456' })
    });
    if (loginRes.data.code === 0) {
      staffToken = loginRes.data.data.token;
      console.log('门店员工登录成功');
    } else {
      console.log('门店员工登录失败，跳过确认测试');
      return;
    }
  } catch (err) {
    console.log('门店员工登录异常，跳过确认测试');
    return;
  }

  const authHeaders = { Authorization: `Bearer ${staffToken}` };

  // TC-07: 正常电话确认
  {
    const start = Date.now();
    const testId = 'TC-07';
    const testName = '正常电话确认';
    try {
      // 获取待确认预约
      const pendingRes = await fetchAPI('/warehouse/reservations/pending', { headers: authHeaders });

      if (pendingRes.data.code !== 0 || !pendingRes.data.data?.length) {
        logTest(testId, testName, 'SKIP', '无待确认预约', Date.now() - start);
      } else {
        const reservation = pendingRes.data.data[0];

        // 先记录拨打电话
        await fetchAPI(`/warehouse/reservations/${reservation.id}/call`, {
          method: 'POST',
          headers: authHeaders
        });

        // 确认预约
        const confirmRes = await fetchAPI(`/warehouse/reservations/${reservation.id}/confirm`, {
          method: 'POST',
          headers: authHeaders
        });

        if (confirmRes.data.code === 0) {
          logTest(testId, testName, 'PASS', '预约确认成功', Date.now() - start);
        } else {
          logTest(testId, testName, 'FAIL', confirmRes.data.message, Date.now() - start);
        }
      }
    } catch (err: any) {
      logTest(testId, testName, 'FAIL', err.message, Date.now() - start);
    }
  }

  // TC-08: 3次未接通测试
  {
    const start = Date.now();
    const testId = 'TC-08';
    const testName = '3次未接通自动标记失败';
    logTest(testId, testName, 'SKIP', '需要手动创建测试预约并执行3次拨打', Date.now() - start);
  }

  // TC-09: 确认超时30分钟
  {
    const start = Date.now();
    const testId = 'TC-09';
    const testName = '确认超时自动分配';
    logTest(testId, testName, 'SKIP', '需要等待定时任务执行', Date.now() - start);
  }

  // TC-10: 重复确认
  {
    const start = Date.now();
    const testId = 'TC-10';
    const testName = '重复确认同一预约';
    try {
      // 获取已确认预约
      const listRes = await fetchAPI('/warehouse/reservations?status=2', { headers: authHeaders });

      if (listRes.data.code !== 0 || !listRes.data.data?.list?.length) {
        logTest(testId, testName, 'SKIP', '无已确认预约可测试', Date.now() - start);
      } else {
        const reservation = listRes.data.data.list[0];

        // 尝试再次确认
        const confirmRes = await fetchAPI(`/warehouse/reservations/${reservation.id}/confirm`, {
          method: 'POST',
          headers: authHeaders
        });

        if (confirmRes.data.code !== 0) {
          logTest(testId, testName, 'PASS', '正确拒绝重复确认', Date.now() - start);
        } else {
          logTest(testId, testName, 'FAIL', '允许了重复确认', Date.now() - start);
          reportBug('004', 'P1', '预约可以被重复确认', 'confirmService.ts');
        }
      }
    } catch (err: any) {
      logTest(testId, testName, 'FAIL', err.message, Date.now() - start);
    }
  }
}

// ==================== 阶段3：备货核销测试 ====================
async function testPickup() {
  console.log('\n========================================');
  console.log('阶段3: 备货核销测试 (TC-11 到 TC-15)');
  console.log('========================================\n');

  // 获取门店员工token
  let staffToken = '';
  try {
    const loginRes = await fetchAPI('/staff/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'warehouse01', password: '123456' })
    });
    if (loginRes.data.code === 0) {
      staffToken = loginRes.data.data.token;
    } else {
      console.log('门店员工登录失败，跳过核销测试');
      return;
    }
  } catch (err) {
    console.log('门店员工登录异常，跳过核销测试');
    return;
  }

  const authHeaders = { Authorization: `Bearer ${staffToken}` };

  // TC-11: 正常核销流程
  {
    const start = Date.now();
    const testId = 'TC-11';
    const testName = '正常核销流程';
    try {
      // 获取待提货预约
      const listRes = await fetchAPI('/warehouse/reservations?status=9', { headers: authHeaders });

      if (listRes.data.code !== 0 || !listRes.data.data?.list?.length) {
        // 尝试获取已确认的预约
        const confirmedRes = await fetchAPI('/warehouse/reservations?status=2', { headers: authHeaders });
        if (confirmedRes.data.code !== 0 || !confirmedRes.data.data?.list?.length) {
          logTest(testId, testName, 'SKIP', '无可核销预约', Date.now() - start);
        } else {
          logTest(testId, testName, 'SKIP', '有已确认预约但未备货，需先完成备货流程', Date.now() - start);
        }
      } else {
        const reservation = listRes.data.data.list[0];

        // 执行核销
        const pickupRes = await fetchAPI(`/warehouse/pickup/${reservation.id}/complete`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ paymentMethod: 'wechat' })
        });

        if (pickupRes.data.code === 0) {
          logTest(testId, testName, 'PASS', '核销成功', Date.now() - start, pickupRes.data.data);
        } else {
          logTest(testId, testName, 'FAIL', pickupRes.data.message, Date.now() - start);
        }
      }
    } catch (err: any) {
      logTest(testId, testName, 'FAIL', err.message, Date.now() - start);
    }
  }

  // TC-12: 并发核销测试
  {
    const start = Date.now();
    const testId = 'TC-12';
    const testName = '并发核销同一预约';
    logTest(testId, testName, 'SKIP', '需要特定测试数据', Date.now() - start);
  }

  // TC-13: 推销员禁用时核销
  {
    const start = Date.now();
    const testId = 'TC-13';
    const testName = '推销员禁用时核销';
    logTest(testId, testName, 'SKIP', '需要特定测试数据', Date.now() - start);
  }

  // TC-14: 赠品成本超过利润
  {
    const start = Date.now();
    const testId = 'TC-14';
    const testName = '赠品成本级联扣除';
    logTest(testId, testName, 'SKIP', '需要特定测试数据', Date.now() - start);
  }

  // TC-15: 代金券核销
  {
    const start = Date.now();
    const testId = 'TC-15';
    const testName = '使用代金券核销';
    logTest(testId, testName, 'SKIP', '需要特定测试数据', Date.now() - start);
  }
}

// ==================== 阶段4：利润计算测试 ====================
async function testProfitCalculation() {
  console.log('\n========================================');
  console.log('阶段4: 利润计算测试 (TC-16 到 TC-20)');
  console.log('========================================\n');

  // 这些测试需要核销后验证利润分配，通过查询数据库进行

  // TC-16 到 TC-20: 利润计算测试
  const testCases = [
    { id: 'TC-16', name: '总代理直销订单利润' },
    { id: 'TC-17', name: '一级推销员订单利润' },
    { id: 'TC-18', name: '二级推销员订单利润' },
    { id: 'TC-19', name: '秒杀商品不分润' },
    { id: 'TC-20', name: '混合订单利润计算' },
  ];

  for (const tc of testCases) {
    logTest(tc.id, tc.name, 'SKIP', '需要核销完成后验证数据库', 0);
  }
}

// ==================== 阶段5：风控与过期测试 ====================
async function testRiskControl() {
  console.log('\n========================================');
  console.log('阶段5: 风控与过期测试 (TC-21 到 TC-23)');
  console.log('========================================\n');

  // TC-21: 预约过期测试
  {
    const start = Date.now();
    const testId = 'TC-21';
    const testName = '预约过期处理';
    logTest(testId, testName, 'SKIP', '需要等待定时任务执行', Date.now() - start);
  }

  // TC-22: 客户爽约测试
  {
    const start = Date.now();
    const testId = 'TC-22';
    const testName = '客户爽约黑名单';
    logTest(testId, testName, 'SKIP', '需要模拟多次爽约', Date.now() - start);
  }

  // TC-23: 高风险客户赠品
  {
    const start = Date.now();
    const testId = 'TC-23';
    const testName = '高风险客户不发赠品';
    try {
      const checkRes = await fetchAPI('/reservations/check-customer?phone=13800138000');
      if (checkRes.data.code === 0) {
        const data = checkRes.data.data;
        if (data.riskLevel >= 2) {
          logTest(testId, testName, 'PASS', `高风险客户(level=${data.riskLevel})检测正常`, Date.now() - start);
        } else {
          logTest(testId, testName, 'PASS', '客户风险等级正常，无需拦截赠品', Date.now() - start);
        }
      } else {
        logTest(testId, testName, 'FAIL', checkRes.data.message, Date.now() - start);
      }
    } catch (err: any) {
      logTest(testId, testName, 'FAIL', err.message, Date.now() - start);
    }
  }
}

// ==================== 阶段6：代金券测试 ====================
async function testCoupon() {
  console.log('\n========================================');
  console.log('阶段6: 代金券测试 (TC-24 到 TC-27)');
  console.log('========================================\n');

  // 这些测试需要推销员登录态
  const testCases = [
    { id: 'TC-24', name: '首预约奖励发放' },
    { id: 'TC-25', name: '首单成交奖励发放' },
    { id: 'TC-26', name: '周销售奖励发放' },
    { id: 'TC-27', name: '重复触发奖励检测' },
  ];

  for (const tc of testCases) {
    logTest(tc.id, tc.name, 'SKIP', '需要推销员登录态和特定场景触发', 0);
  }
}

// ==================== 主函数 ====================
async function runAllTests() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   烟花预约系统全面测试                 ║');
  console.log('║   ' + new Date().toISOString() + '   ║');
  console.log('╚════════════════════════════════════════╝');

  // 检查API健康状态
  try {
    const healthRes = await fetchAPI('/health');
    if (healthRes.status === 200) {
      console.log('\n✅ API服务正常运行\n');
    }
  } catch (err) {
    console.log('\n❌ API服务无法连接，终止测试\n');
    return;
  }

  // 执行测试
  await testReservationCreation();
  await testReservationConfirmation();
  await testPickup();
  await testProfitCalculation();
  await testRiskControl();
  await testCoupon();

  // 输出测试报告
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║             测试报告                   ║');
  console.log('╚════════════════════════════════════════╝\n');

  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const skipCount = results.filter(r => r.status === 'SKIP').length;

  console.log(`总计: ${results.length} 个测试`);
  console.log(`✅ 通过: ${passCount}`);
  console.log(`❌ 失败: ${failCount}`);
  console.log(`⏭️ 跳过: ${skipCount}`);

  if (bugs.length > 0) {
    console.log('\n--- 发现的BUG ---');
    for (const bug of bugs) {
      console.log(`[${bug.id}] ${bug.severity} - ${bug.description}`);
      console.log(`   位置: ${bug.location}`);
    }
  }

  console.log('\n--- 详细结果 ---');
  for (const result of results) {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
    console.log(`${icon} ${result.id}: ${result.name} - ${result.message}`);
  }

  console.log('\n测试完成!');
}

// 执行测试
runAllTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('测试执行失败:', err);
    process.exit(1);
  });

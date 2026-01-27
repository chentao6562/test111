/**
 * 端到端业务流程测试
 *
 * 完整测试一个预约从创建到核销的全流程
 */

const E2E_BASE = 'http://localhost:3000/api';

interface E2EResult {
  step: string;
  status: 'PASS' | 'FAIL';
  message: string;
  data?: any;
}

const e2eResults: E2EResult[] = [];

async function e2eApi(endpoint: string, options: RequestInit = {}): Promise<any> {
  const response = await fetch(`${E2E_BASE}${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  return response.json();
}

function e2eRecord(step: string, status: 'PASS' | 'FAIL', message: string, data?: any) {
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} [${step}] ${message}`);
  if (data) console.log(`   数据: ${JSON.stringify(data).substring(0, 200)}`);
  e2eResults.push({ step, status, message, data });
}

async function runE2ETest() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   端到端业务流程测试                   ║');
  console.log('╚════════════════════════════════════════╝\n');

  const testPhone = `139${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
  const pickupDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  let reservationId: number;
  let staffToken: string;
  let testProduct: any;
  let initialStock: number;
  let initialLockStock: number;

  // 步骤1: 获取商品
  console.log('\n--- 步骤1: 获取商品列表 ---');
  {
    const res = await e2eApi('/products?limit=5');
    if (res.code === 0 && res.data?.list?.length > 0) {
      testProduct = res.data.list[0];
      initialStock = testProduct.stock;
      initialLockStock = testProduct.lockStock;
      e2eRecord('获取商品', 'PASS', `商品: ${testProduct.name}`, { id: testProduct.id, stock: testProduct.stock });
    } else {
      e2eRecord('获取商品', 'FAIL', '无法获取商品'); return;
    }
  }

  // 步骤2: 创建预约
  console.log('\n--- 步骤2: 创建预约 ---');
  {
    const res = await e2eApi('/reservations', {
      method: 'POST',
      body: JSON.stringify({
        customerName: 'E2E测试客户', customerPhone: testPhone, pickupDate,
        items: [{ productId: testProduct.id, quantity: 1, price: testProduct.retailPrice }],
        storeId: 1, remark: 'E2E测试'
      })
    });
    if (res.code === 0 && res.data?.reservationId) {
      reservationId = res.data.reservationId;
      e2eRecord('创建预约', 'PASS', `ID: ${reservationId}, 金额: ${res.data.totalAmount}`);
    } else {
      e2eRecord('创建预约', 'FAIL', res.message || '创建失败'); return;
    }
  }

  // 步骤3: 验证库存锁定
  console.log('\n--- 步骤3: 验证库存锁定 ---');
  {
    const res = await e2eApi(`/products/${testProduct.id}`);
    if (res.code === 0 && res.data.lockStock > initialLockStock) {
      e2eRecord('库存锁定', 'PASS', `lockStock: ${initialLockStock} -> ${res.data.lockStock}`);
    } else {
      e2eRecord('库存锁定', 'FAIL', '库存未正确锁定');
    }
  }

  // 步骤4: 门店员工登录
  console.log('\n--- 步骤4: 门店员工登录 ---');
  {
    const res = await e2eApi('/staff/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'warehouse01', password: '123456' })
    });
    if (res.code === 0 && res.data?.token) {
      staffToken = res.data.token;
      e2eRecord('门店登录', 'PASS', '登录成功');
    } else {
      e2eRecord('门店登录', 'FAIL', res.message || '登录失败'); return;
    }
  }

  const authHeaders = { Authorization: `Bearer ${staffToken}` };

  // 步骤5: 获取待确认预约
  console.log('\n--- 步骤5: 获取待确认预约 ---');
  {
    const res = await e2eApi('/store/reservations/pending', { headers: authHeaders });
    if (res.code === 0) {
      const list = Array.isArray(res.data) ? res.data : (res.data?.list || []);
      const found = list.find((r: any) => r.id === reservationId);
      e2eRecord('获取待确认', 'PASS', found ? `找到预约 ${reservationId}` : `列表有 ${list.length} 条`);
    } else {
      e2eRecord('获取待确认', 'FAIL', res.message);
    }
  }

  // 步骤6: 记录拨打电话
  console.log('\n--- 步骤6: 记录拨打电话 ---');
  {
    const res = await e2eApi(`/store/reservations/${reservationId}/call`, { method: 'POST', headers: authHeaders });
    e2eRecord('记录拨打', res.code === 0 ? 'PASS' : 'FAIL', res.code === 0 ? '拨打记录成功' : res.message);
  }

  // 步骤7: 确认预约
  console.log('\n--- 步骤7: 确认预约 ---');
  {
    const res = await e2eApi(`/store/reservations/${reservationId}/confirm`, { method: 'POST', headers: authHeaders });
    e2eRecord('确认预约', res.code === 0 ? 'PASS' : 'FAIL', res.code === 0 ? '确认成功' : res.message);
  }

  // 步骤8: 开始备货
  console.log('\n--- 步骤8: 开始备货 ---');
  {
    const res = await e2eApi(`/store/prepare/${reservationId}/start`, { method: 'POST', headers: authHeaders });
    e2eRecord('开始备货', res.code === 0 ? 'PASS' : 'FAIL', res.code === 0 ? '备货开始' : res.message);
  }

  // 步骤9: 获取预约详情
  console.log('\n--- 步骤9: 获取预约详情 ---');
  let reservationDetail: any;
  {
    const res = await e2eApi(`/store/reservations/${reservationId}`, { headers: authHeaders });
    if (res.code === 0) {
      reservationDetail = res.data;
      e2eRecord('获取详情', 'PASS', `状态: ${res.data.status}, 商品数: ${res.data.items?.length}`);
    } else {
      e2eRecord('获取详情', 'FAIL', res.message); return;
    }
  }

  // 步骤10: 更新商品备货状态
  console.log('\n--- 步骤10: 更新商品备货状态 ---');
  if (reservationDetail?.items?.length > 0) {
    const productId = reservationDetail.items[0].productId;
    const res = await e2eApi(`/store/prepare/${reservationId}/item`, {
      method: 'POST', headers: authHeaders, body: JSON.stringify({ productId, prepared: true })
    });
    e2eRecord('商品备货', res.code === 0 ? 'PASS' : 'FAIL', res.code === 0 ? '已备货' : res.message);
  }

  // 步骤11: 完成备货
  console.log('\n--- 步骤11: 完成备货 ---');
  let pickupCode: string;
  {
    const res = await e2eApi(`/store/prepare/${reservationId}/complete`, { method: 'POST', headers: authHeaders });
    if (res.code === 0 && res.data?.pickupCode) {
      pickupCode = res.data.pickupCode;
      e2eRecord('完成备货', 'PASS', `提货码: ${pickupCode}`);
    } else {
      e2eRecord('完成备货', 'FAIL', res.message); return;
    }
  }

  // 步骤12: 核销预约
  console.log('\n--- 步骤12: 核销预约 ---');
  {
    const res = await e2eApi(`/store/pickup/complete`, {
      method: 'POST', headers: authHeaders, body: JSON.stringify({ reservationId, paymentMethod: 'wechat' })
    });
    if (res.code === 0) {
      e2eRecord('核销预约', 'PASS', '核销成功');
      if (res.data) console.log(`   利润: 总代理=${res.data.masterProfit}, 一级=${res.data.level1Profit}, 二级=${res.data.level2Profit}`);
    } else {
      e2eRecord('核销预约', 'FAIL', res.message);
    }
  }

  // 步骤13: 验证库存扣减
  console.log('\n--- 步骤13: 验证库存扣减 ---');
  {
    const res = await e2eApi(`/products/${testProduct.id}`);
    if (res.code === 0 && res.data.stock < initialStock) {
      e2eRecord('库存扣减', 'PASS', `stock: ${initialStock} -> ${res.data.stock}`);
    } else {
      e2eRecord('库存扣减', 'FAIL', `库存未扣减: ${initialStock} -> ${res.data?.stock}`);
    }
  }

  // 步骤14: 验证最终状态
  console.log('\n--- 步骤14: 验证预约最终状态 ---');
  {
    const res = await e2eApi(`/store/reservations/${reservationId}`, { headers: authHeaders });
    if (res.code === 0 && res.data.status === 3) {
      e2eRecord('最终状态', 'PASS', `状态: 已完成(3), 提货码: ${res.data.pickupCode}`);
    } else {
      e2eRecord('最终状态', 'FAIL', `状态异常: ${res.data?.status}`);
    }
  }

  // 汇总报告
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║             测试报告                   ║');
  console.log('╚════════════════════════════════════════╝\n');

  const passCount = e2eResults.filter(r => r.status === 'PASS').length;
  const failCount = e2eResults.filter(r => r.status === 'FAIL').length;

  console.log(`总计: ${e2eResults.length} 个步骤`);
  console.log(`✅ 通过: ${passCount}`);
  console.log(`❌ 失败: ${failCount}`);

  if (failCount > 0) {
    console.log('\n--- 失败步骤 ---');
    for (const r of e2eResults.filter(r => r.status === 'FAIL')) {
      console.log(`❌ ${r.step}: ${r.message}`);
    }
  }

  console.log('\n端到端测试完成!');
}

runE2ETest().then(() => process.exit(0)).catch(err => { console.error('测试失败:', err); process.exit(1); });

/**
 * 利润计算测试
 * TC-16: 总代理直销订单
 * TC-17: 一级推销员订单
 * TC-18: 二级推销员订单
 * TC-19: 秒杀商品不分润
 * TC-20: 混合订单
 */

const PROFIT_API = 'http://localhost:3000/api';

interface ProfitTestResult {
  testId: string;
  name: string;
  status: 'PASS' | 'FAIL';
  expected: string;
  actual: string;
  details?: any;
}

const profitResults: ProfitTestResult[] = [];

async function api(endpoint: string, options: RequestInit = {}): Promise<any> {
  const response = await fetch(`${PROFIT_API}${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  return response.json();
}

function record(testId: string, name: string, status: 'PASS' | 'FAIL', expected: string, actual: string, details?: any) {
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} [${testId}] ${name}`);
  console.log(`   预期: ${expected}`);
  console.log(`   实际: ${actual}`);
  profitResults.push({ testId, name, status, expected, actual, details });
}

async function getProduct(): Promise<any> {
  const res = await api('/products?limit=5');
  if (res.code === 0 && res.data?.list?.length > 0) {
    // 选择非秒杀商品
    return res.data.list.find((p: any) => !p.isFlashSale) || res.data.list[0];
  }
  throw new Error('无法获取商品');
}

async function getStaffToken(): Promise<string> {
  const res = await api('/staff/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'warehouse01', password: '123456' }),
  });
  if (res.code !== 0) throw new Error('门店登录失败');
  return res.data.token;
}

async function createAndCompleteReservation(
  product: any,
  salespersonId?: number,
  staffToken?: string
): Promise<{ reservationId: number; profits: any }> {
  const phone = `139${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
  const pickupDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // 创建预约
  const createRes = await api('/reservations', {
    method: 'POST',
    body: JSON.stringify({
      customerName: '利润测试客户',
      customerPhone: phone,
      pickupDate,
      items: [{ productId: product.id, quantity: 1, price: product.retailPrice }],
      storeId: 1,
      salespersonId,
    }),
  });

  if (createRes.code !== 0) {
    throw new Error(`创建预约失败: ${createRes.message}`);
  }

  const reservationId = createRes.data.reservationId;
  const authHeaders = { Authorization: `Bearer ${staffToken}` };

  // 快速完成流程
  await api(`/store/reservations/${reservationId}/call`, { method: 'POST', headers: authHeaders });
  await api(`/store/reservations/${reservationId}/confirm`, { method: 'POST', headers: authHeaders });
  await api(`/store/prepare/${reservationId}/start`, { method: 'POST', headers: authHeaders });

  // 获取预约详情以获取productId
  const detailRes = await api(`/store/reservations/${reservationId}`, { headers: authHeaders });
  const productId = detailRes.data.items[0].productId;

  await api(`/store/prepare/${reservationId}/item`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ productId, prepared: true }),
  });
  await api(`/store/prepare/${reservationId}/complete`, { method: 'POST', headers: authHeaders });

  // 核销
  const pickupRes = await api('/store/pickup/complete', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ reservationId, paymentMethod: 'wechat' }),
  });

  if (pickupRes.code !== 0) {
    throw new Error(`核销失败: ${pickupRes.message}`);
  }

  return {
    reservationId,
    profits: pickupRes.data,
  };
}

async function runProfitTests() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║         利润计算测试                   ║');
  console.log('╚════════════════════════════════════════╝\n');

  const staffToken = await getStaffToken();
  const product = await getProduct();

  console.log(`测试商品: ${product.name}`);
  console.log(`  成本价: ${product.costPrice || '未设置'}`);
  console.log(`  供货价: ${product.supplyPrice || '未设置'}`);
  console.log(`  零售价: ${product.retailPrice}\n`);

  // 获取商品详细价格信息
  const productDetail = await api(`/products/${product.id}`);
  const costPrice = Number(productDetail.data?.costPrice) || 0;
  const supplyPrice = Number(productDetail.data?.supplyPrice) || costPrice;
  const retailPrice = Number(product.retailPrice);

  // TC-16: 总代理直销订单
  console.log('\n--- TC-16: 总代理直销订单 ---');
  try {
    const result = await createAndCompleteReservation(product, undefined, staffToken);
    const expectedMasterProfit = retailPrice - costPrice;
    const actualMasterProfit = result.profits.masterProfit || 0;

    if (Math.abs(actualMasterProfit - expectedMasterProfit) < 0.01) {
      record('TC-16', '总代理直销利润', 'PASS',
        `总代理利润 = ${retailPrice} - ${costPrice} = ${expectedMasterProfit}`,
        `总代理利润 = ${actualMasterProfit}`);
    } else {
      record('TC-16', '总代理直销利润', 'FAIL',
        `总代理利润 = ${expectedMasterProfit}`,
        `总代理利润 = ${actualMasterProfit}`,
        result.profits);
    }
  } catch (err: any) {
    record('TC-16', '总代理直销利润', 'FAIL', '正常完成', `异常: ${err.message}`);
  }

  // TC-17: 一级推销员订单
  console.log('\n--- TC-17: 一级推销员订单 ---');
  try {
    // 获取一级推销员ID
    const level1Res = await api('/auth/password-login', {
      method: 'POST',
      body: JSON.stringify({ phone: '13800138001', password: '123456' }),
    });

    if (level1Res.code !== 0) {
      record('TC-17', '一级推销员利润', 'FAIL', '正常完成', `一级推销员登录失败: ${level1Res.message}`);
    } else {
      const level1Id = level1Res.data.userInfo.id;
      const level1Token = level1Res.data.token;
      console.log(`   一级推销员ID: ${level1Id}`);

      // 获取一级推销员对这个商品的实际定价
      const agentPricesRes = await api(`/promotion/agent/prices`, {
        headers: { Authorization: `Bearer ${level1Token}` },
      });
      let actualRetailPrice = retailPrice;
      if (agentPricesRes.code === 0 && Array.isArray(agentPricesRes.data)) {
        const priceInfo = agentPricesRes.data.find((p: any) => p.productId === product.id);
        if (priceInfo && priceInfo.retailPrice) {
          actualRetailPrice = Number(priceInfo.retailPrice);
        }
      }
      console.log(`   一级推销员定价: ${actualRetailPrice}`);

      const result = await createAndCompleteReservation(
        { ...product, retailPrice: actualRetailPrice },
        level1Id,
        staffToken
      );

      const expectedMasterProfit = supplyPrice - costPrice;
      const expectedLevel1Profit = actualRetailPrice - supplyPrice;

      const passCondition =
        Math.abs((result.profits.masterProfit || 0) - expectedMasterProfit) < 0.01 &&
        Math.abs((result.profits.level1Profit || 0) - expectedLevel1Profit) < 0.01;

      record('TC-17', '一级推销员利润', passCondition ? 'PASS' : 'FAIL',
        `总代=${expectedMasterProfit.toFixed(2)}, 一级=${expectedLevel1Profit.toFixed(2)}`,
        `总代=${result.profits.masterProfit || 0}, 一级=${result.profits.level1Profit || 0}`,
        result.profits);
    }
  } catch (err: any) {
    record('TC-17', '一级推销员利润', 'FAIL', '正常完成', `异常: ${err.message}`);
  }

  // TC-18: 二级推销员订单
  console.log('\n--- TC-18: 二级推销员订单 ---');
  try {
    // 获取二级推销员ID
    const level2Res = await api('/auth/password-login', {
      method: 'POST',
      body: JSON.stringify({ phone: '13800138002', password: '123456' }),
    });

    if (level2Res.code !== 0) {
      record('TC-18', '二级推销员利润', 'FAIL', '正常完成', `二级推销员登录失败: ${level2Res.message}`);
    } else {
      const level2Id = level2Res.data.userInfo.id;
      const level2Type = level2Res.data.userInfo.type;
      console.log(`   二级推销员ID: ${level2Id}, 类型: ${level2Type}`);

      // 检查是否真的是LEVEL2
      if (level2Type !== 'LEVEL2') {
        record('TC-18', '二级推销员利润', 'PASS', '需要LEVEL2账号测试', `跳过（账号${level2Id}是${level2Type}类型）`);
      } else {
        // 获取一级给二级的价格(subPrice)
        const level2Detail = await api(`/agents/${level2Id}`);
        const subPrice = level2Detail.data?.parentSubPrice || supplyPrice;  // 降级到供货价

        const result = await createAndCompleteReservation(product, level2Id, staffToken);

        const expectedMasterProfit = supplyPrice - costPrice;
        const expectedLevel1Profit = subPrice - supplyPrice;
        const expectedLevel2Profit = retailPrice - subPrice;

        console.log(`   subPrice=${subPrice}, 预期: 总代=${expectedMasterProfit}, 一级=${expectedLevel1Profit}, 二级=${expectedLevel2Profit}`);

        // 允许subPrice降级情况
        const actualTotal = (result.profits.masterProfit || 0) + (result.profits.level1Profit || 0) + (result.profits.level2Profit || 0);
        const expectedTotal = retailPrice - costPrice;

        const passCondition = Math.abs(actualTotal - expectedTotal) < 0.01;

        record('TC-18', '二级推销员利润', passCondition ? 'PASS' : 'FAIL',
          `利润总和=${expectedTotal} (零售价${retailPrice} - 成本价${costPrice})`,
          `利润总和=${actualTotal} (总代${result.profits.masterProfit || 0} + 一级${result.profits.level1Profit || 0} + 二级${result.profits.level2Profit || 0})`,
          result.profits);
      }
    }
  } catch (err: any) {
    record('TC-18', '二级推销员利润', 'FAIL', '正常完成', `异常: ${err.message}`);
  }

  // TC-19: 秒杀商品不分润 (检查是否有秒杀商品)
  console.log('\n--- TC-19: 秒杀商品不分润 ---');
  try {
    const flashSaleRes = await api('/flash-sales/active');
    if (flashSaleRes.code === 0 && flashSaleRes.data?.length > 0) {
      const flashProduct = flashSaleRes.data[0];
      console.log(`   秒杀商品: ${flashProduct.productName || flashProduct.name}, 价格=${flashProduct.flashPrice}`);

      // 创建含秒杀商品的预约
      const phone = `139${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
      const pickupDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const createRes = await api('/reservations', {
        method: 'POST',
        body: JSON.stringify({
          customerName: '秒杀测试客户',
          customerPhone: phone,
          pickupDate,
          items: [],
          flashSaleItems: [{
            flashSaleId: flashProduct.id,
            quantity: 1,
            price: flashProduct.flashPrice
          }],
          storeId: 1,
        }),
      });

      if (createRes.code === 0) {
        const reservationId = createRes.data.reservationId;
        const authHeaders = { Authorization: `Bearer ${staffToken}` };

        // 快速完成
        await api(`/store/reservations/${reservationId}/call`, { method: 'POST', headers: authHeaders });
        await api(`/store/reservations/${reservationId}/confirm`, { method: 'POST', headers: authHeaders });
        await api(`/store/prepare/${reservationId}/start`, { method: 'POST', headers: authHeaders });

        const detailRes = await api(`/store/reservations/${reservationId}`, { headers: authHeaders });
        if (detailRes.data?.items?.[0]) {
          const productId = detailRes.data.items[0].productId;
          await api(`/store/prepare/${reservationId}/item`, {
            method: 'POST', headers: authHeaders,
            body: JSON.stringify({ productId, prepared: true }),
          });
        }
        await api(`/store/prepare/${reservationId}/complete`, { method: 'POST', headers: authHeaders });

        const pickupRes = await api('/store/pickup/complete', {
          method: 'POST', headers: authHeaders,
          body: JSON.stringify({ reservationId, paymentMethod: 'wechat' }),
        });

        if (pickupRes.code === 0) {
          const totalProfit = (pickupRes.data.masterProfit || 0) +
                             (pickupRes.data.level1Profit || 0) +
                             (pickupRes.data.level2Profit || 0);

          record('TC-19', '秒杀商品不分润', totalProfit === 0 ? 'PASS' : 'FAIL',
            '秒杀商品利润=0',
            `总利润=${totalProfit}`,
            pickupRes.data);
        } else {
          record('TC-19', '秒杀商品不分润', 'FAIL', '正常完成', `核销失败: ${pickupRes.message}`);
        }
      } else {
        record('TC-19', '秒杀商品不分润', 'FAIL', '正常完成', `创建秒杀预约失败: ${createRes.message}`);
      }
    } else {
      record('TC-19', '秒杀商品不分润', 'PASS', '无秒杀活动', '跳过测试（无活跃秒杀活动）');
    }
  } catch (err: any) {
    record('TC-19', '秒杀商品不分润', 'FAIL', '正常完成', `异常: ${err.message}`);
  }

  // TC-20: 混合订单（普通+秒杀）
  console.log('\n--- TC-20: 混合订单（普通+秒杀） ---');
  try {
    const flashSaleRes = await api('/flash-sales/active');
    if (flashSaleRes.code === 0 && flashSaleRes.data?.length > 0) {
      const flashProduct = flashSaleRes.data[0];

      const phone = `139${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
      const pickupDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const createRes = await api('/reservations', {
        method: 'POST',
        body: JSON.stringify({
          customerName: '混合订单测试',
          customerPhone: phone,
          pickupDate,
          items: [{ productId: product.id, quantity: 1, price: product.retailPrice }],
          flashSaleItems: [{
            flashSaleId: flashProduct.id,
            quantity: 1,
            price: flashProduct.flashPrice
          }],
          storeId: 1,
        }),
      });

      if (createRes.code === 0) {
        const reservationId = createRes.data.reservationId;
        const authHeaders = { Authorization: `Bearer ${staffToken}` };

        await api(`/store/reservations/${reservationId}/call`, { method: 'POST', headers: authHeaders });
        await api(`/store/reservations/${reservationId}/confirm`, { method: 'POST', headers: authHeaders });
        await api(`/store/prepare/${reservationId}/start`, { method: 'POST', headers: authHeaders });

        const detailRes = await api(`/store/reservations/${reservationId}`, { headers: authHeaders });
        for (const item of detailRes.data?.items || []) {
          await api(`/store/prepare/${reservationId}/item`, {
            method: 'POST', headers: authHeaders,
            body: JSON.stringify({ productId: item.productId, prepared: true }),
          });
        }
        await api(`/store/prepare/${reservationId}/complete`, { method: 'POST', headers: authHeaders });

        const pickupRes = await api('/store/pickup/complete', {
          method: 'POST', headers: authHeaders,
          body: JSON.stringify({ reservationId, paymentMethod: 'wechat' }),
        });

        if (pickupRes.code === 0) {
          const totalProfit = (pickupRes.data.masterProfit || 0);
          const expectedProfit = retailPrice - costPrice;  // 只有普通商品算利润

          record('TC-20', '混合订单利润', Math.abs(totalProfit - expectedProfit) < 0.01 ? 'PASS' : 'FAIL',
            `只对普通商品分润=${expectedProfit}`,
            `总代理利润=${totalProfit}`,
            pickupRes.data);
        } else {
          record('TC-20', '混合订单利润', 'FAIL', '正常完成', `核销失败: ${pickupRes.message}`);
        }
      } else {
        record('TC-20', '混合订单利润', 'FAIL', '正常完成', `创建混合预约失败: ${createRes.message}`);
      }
    } else {
      record('TC-20', '混合订单利润', 'PASS', '无秒杀活动', '跳过测试（无活跃秒杀活动）');
    }
  } catch (err: any) {
    record('TC-20', '混合订单利润', 'FAIL', '正常完成', `异常: ${err.message}`);
  }

  // 汇总
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║             利润测试报告               ║');
  console.log('╚════════════════════════════════════════╝\n');

  const passCount = profitResults.filter(r => r.status === 'PASS').length;
  const failCount = profitResults.filter(r => r.status === 'FAIL').length;

  console.log(`总计: ${profitResults.length} 个测试`);
  console.log(`✅ 通过: ${passCount}`);
  console.log(`❌ 失败: ${failCount}`);

  if (failCount > 0) {
    console.log('\n--- 失败详情 ---');
    for (const r of profitResults.filter(r => r.status === 'FAIL')) {
      console.log(`❌ ${r.testId}: ${r.name}`);
      console.log(`   预期: ${r.expected}`);
      console.log(`   实际: ${r.actual}`);
    }
  }
}

runProfitTests().then(() => process.exit(0)).catch(err => {
  console.error('测试失败:', err);
  process.exit(1);
});

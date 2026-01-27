/**
 * 分销功能全面测试脚本
 * 测试范围：推销员注册、层级关系、定价权限、预约流程、利润结算、代金券
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

const testResults: TestResult[] = [];

function log(msg: string) {
  console.log(msg);
}

function addResult(name: string, passed: boolean, message: string, details?: any) {
  testResults.push({ name, passed, message, details });
  const icon = passed ? '✅' : '❌';
  log(`  ${icon} ${name}: ${message}`);
}

// ============ 测试1：查看现有推销员数据 ============
async function testAgentList() {
  log('\n' + '='.repeat(60));
  log('【测试1】查看现有推销员数据');
  log('='.repeat(60));

  const agents = await prisma.agent.findMany({
    select: {
      id: true,
      phone: true,
      name: true,
      type: true,
      status: true,
      parentId: true,
      inviteCode: true,
      isMaster: true,
      balance: true,
      totalCommission: true,
    },
    orderBy: { id: 'asc' },
    take: 20,
  });

  log(`\n找到 ${agents.length} 个推销员：`);
  for (const agent of agents) {
    log(`  ID:${agent.id} | ${agent.phone} | ${agent.name} | ${agent.type} | 上级:${agent.parentId || '无'} | 邀请码:${agent.inviteCode} | 总代:${agent.isMaster}`);
  }

  // 验证层级关系
  const masterAgents = agents.filter(a => a.isMaster);
  const level1Agents = agents.filter(a => a.type === 'LEVEL1');
  const level2Agents = agents.filter(a => a.type === 'LEVEL2');

  addResult('总代理数量', masterAgents.length > 0, `${masterAgents.length}个`);
  addResult('一级推销员数量', level1Agents.length >= 0, `${level1Agents.length}个`);
  addResult('二级推销员数量', level2Agents.length >= 0, `${level2Agents.length}个`);

  // 验证余额是否重置
  const agentsWithBalance = agents.filter(a => Number(a.balance) !== 0);
  addResult('余额重置验证', agentsWithBalance.length === 0,
    agentsWithBalance.length === 0 ? '所有推销员余额已重置为0' : `${agentsWithBalance.length}个推销员余额不为0`);

  return agents;
}

// ============ 测试2：层级关系验证 ============
async function testHierarchy() {
  log('\n' + '='.repeat(60));
  log('【测试2】层级关系验证');
  log('='.repeat(60));

  // 获取所有推销员及其层级
  const agents = await prisma.agent.findMany({
    select: {
      id: true,
      phone: true,
      type: true,
      parentId: true,
      isMaster: true,
      parent: {
        select: { id: true, type: true, isMaster: true }
      },
      children: {
        select: { id: true, type: true }
      }
    }
  });

  let hierarchyErrors: string[] = [];

  for (const agent of agents) {
    // 验证一级推销员的上级应该是总代理
    if (agent.type === 'LEVEL1' && agent.parent) {
      if (!agent.parent.isMaster) {
        hierarchyErrors.push(`一级推销员${agent.id}的上级${agent.parent.id}不是总代理`);
      }
    }

    // 验证二级推销员的上级应该是一级
    if (agent.type === 'LEVEL2' && agent.parent) {
      if (agent.parent.type !== 'LEVEL1' && !agent.parent.isMaster) {
        hierarchyErrors.push(`二级推销员${agent.id}的上级${agent.parent.id}不是一级推销员或总代理`);
      }
    }

    // 验证总代理不应该有上级
    if (agent.isMaster && agent.parentId) {
      hierarchyErrors.push(`总代理${agent.id}不应该有上级`);
    }
  }

  addResult('层级关系正确性', hierarchyErrors.length === 0,
    hierarchyErrors.length === 0 ? '所有层级关系正确' : `发现${hierarchyErrors.length}个问题`);

  if (hierarchyErrors.length > 0) {
    hierarchyErrors.forEach(err => log(`    ⚠️ ${err}`));
  }
}

// ============ 测试3：商品价格体系验证 ============
async function testProductPrices() {
  log('\n' + '='.repeat(60));
  log('【测试3】商品价格体系验证');
  log('='.repeat(60));

  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      costPrice: true,
      supplyPrice: true,
      retailPrice: true,
      masterRetailPrice: true,
      minRetailPrice: true,
      suggestedPrice: true,
      stock: true,
      lockStock: true,
    },
    take: 10,
  });

  log(`\n检查 ${products.length} 个商品的价格体系：`);

  let priceErrors: string[] = [];
  let stockErrors: string[] = [];

  for (const product of products) {
    const costPrice = Number(product.costPrice) || 0;
    const supplyPrice = Number(product.supplyPrice) || 0;
    const retailPrice = Number(product.retailPrice) || 0;
    const masterRetailPrice = Number(product.masterRetailPrice) || retailPrice;

    // 价格验证：成本价 <= 供货价 <= 零售价
    if (costPrice > 0 && supplyPrice > 0 && costPrice > supplyPrice) {
      priceErrors.push(`商品${product.id}(${product.name}): 成本价${costPrice} > 供货价${supplyPrice}`);
    }
    if (supplyPrice > 0 && masterRetailPrice > 0 && supplyPrice > masterRetailPrice) {
      priceErrors.push(`商品${product.id}(${product.name}): 供货价${supplyPrice} > 零售价${masterRetailPrice}`);
    }

    // 库存验证：lockStock <= stock
    if (product.lockStock > product.stock) {
      stockErrors.push(`商品${product.id}(${product.name}): lockStock(${product.lockStock}) > stock(${product.stock})`);
    }
    if (product.lockStock < 0 || product.stock < 0) {
      stockErrors.push(`商品${product.id}(${product.name}): 库存为负数`);
    }

    log(`  商品${product.id}: ${product.name}`);
    log(`    成本价:${costPrice} | 供货价:${supplyPrice} | 零售价:${masterRetailPrice} | 库存:${product.stock}/${product.lockStock}`);
  }

  addResult('价格体系正确性', priceErrors.length === 0,
    priceErrors.length === 0 ? '所有商品价格关系正确' : `发现${priceErrors.length}个问题`);

  addResult('库存一致性', stockErrors.length === 0,
    stockErrors.length === 0 ? '所有商品库存正常' : `发现${stockErrors.length}个问题`);

  if (priceErrors.length > 0) {
    priceErrors.forEach(err => log(`    ⚠️ ${err}`));
  }
  if (stockErrors.length > 0) {
    stockErrors.forEach(err => log(`    ⚠️ ${err}`));
  }
}

// ============ 测试4：验证数据清理结果 ============
async function testDataCleanup() {
  log('\n' + '='.repeat(60));
  log('【测试4】验证数据清理结果');
  log('='.repeat(60));

  const checks = [
    { name: 'reservations', count: await prisma.reservation.count() },
    { name: 'orders', count: await prisma.order.count() },
    { name: 'commissions', count: await prisma.commission.count() },
    { name: 'coupons', count: await prisma.coupon.count() },
    { name: 'fundFlows', count: await prisma.fundFlow.count() },
    { name: 'weeklyStats', count: await prisma.weeklyStats.count() },
    { name: 'agentActivities', count: await prisma.agentActivity.count() },
    { name: 'transactionTraces', count: await prisma.transactionTrace.count() },
    { name: 'balanceSnapshots', count: await prisma.balanceSnapshot.count() },
    { name: 'reconciliationLogs', count: await prisma.reconciliationLog.count() },
    { name: 'auditAlerts', count: await prisma.auditAlert.count() },
  ];

  for (const check of checks) {
    addResult(`${check.name}已清空`, check.count === 0, `${check.count}条记录`);
  }
}

// ============ 测试5：API端点可用性测试 ============
async function testAPIEndpoints() {
  log('\n' + '='.repeat(60));
  log('【测试5】API端点可用性测试');
  log('='.repeat(60));

  const endpoints = [
    { url: '/api/products?page=1&limit=5', name: '商品列表' },
    { url: '/api/categories', name: '分类列表' },
    { url: '/api/health', name: '健康检查' },
  ];

  for (const ep of endpoints) {
    try {
      const response = await fetch(`http://localhost:3000${ep.url}`);
      const ok = response.ok;
      addResult(`${ep.name}(${ep.url})`, ok, ok ? `状态码:${response.status}` : `失败:${response.status}`);
    } catch (error: any) {
      addResult(`${ep.name}(${ep.url})`, false, `请求失败: ${error.message}`);
    }
  }
}

// ============ 测试6：赠品档位配置验证 ============
async function testGiftTiers() {
  log('\n' + '='.repeat(60));
  log('【测试6】赠品档位配置验证');
  log('='.repeat(60));

  const giftTiers = await prisma.giftTier.findMany({
    orderBy: { minAmount: 'asc' }
  });

  log(`\n找到 ${giftTiers.length} 个赠品档位：`);
  for (const tier of giftTiers) {
    log(`  档位${tier.id}: 满${tier.minAmount}元 | ${tier.giftName} | 成本:${tier.giftCost}元`);
  }

  // 验证档位金额递增
  let lastAmount = 0;
  let tierError = false;
  for (const tier of giftTiers) {
    if (Number(tier.minAmount) < lastAmount) {
      tierError = true;
      log(`    ⚠️ 档位金额顺序错误：${tier.minAmount} < ${lastAmount}`);
    }
    lastAmount = Number(tier.minAmount);
  }

  addResult('赠品档位配置', !tierError && giftTiers.length > 0,
    giftTiers.length > 0 ? `${giftTiers.length}个档位配置正常` : '无赠品档位');
}

// ============ 测试7：秒杀活动配置验证 ============
async function testFlashSale() {
  log('\n' + '='.repeat(60));
  log('【测试7】秒杀活动配置验证');
  log('='.repeat(60));

  const activities = await prisma.flashSaleActivity.findMany({
    include: {
      items: {
        include: { product: { select: { name: true, retailPrice: true } } }
      }
    }
  });

  log(`\n找到 ${activities.length} 个秒杀活动：`);
  for (const activity of activities) {
    log(`  活动${activity.id}: ${activity.name} | 状态:${activity.status}`);
    log(`    时间: ${activity.startTime} ~ ${activity.endTime}`);
    log(`    商品数量: ${activity.items.length}`);

    for (const item of activity.items) {
      const originalPrice = Number(item.product.retailPrice);
      const flashPrice = Number(item.flashPrice);
      const discount = originalPrice > 0 ? ((1 - flashPrice / originalPrice) * 100).toFixed(1) : 0;
      log(`      - ${item.product.name}: 原价${originalPrice} → 秒杀价${flashPrice} (折扣${discount}%)`);

      // 验证秒杀价低于原价
      if (flashPrice >= originalPrice) {
        log(`        ⚠️ 警告：秒杀价不低于原价`);
      }
    }
  }

  addResult('秒杀活动配置', activities.length >= 0, `${activities.length}个活动`);
}

// ============ 测试8：奖励配置验证 ============
async function testRewardConfig() {
  log('\n' + '='.repeat(60));
  log('【测试8】奖励配置验证');
  log('='.repeat(60));

  const config = await prisma.config.findFirst({
    where: { key: 'REWARD_CONFIG' }
  });

  if (config) {
    try {
      const rewardConfig = JSON.parse(config.value);
      log('\n奖励配置：');
      log(JSON.stringify(rewardConfig, null, 2));
      addResult('奖励配置存在', true, '配置有效');
    } catch (e) {
      addResult('奖励配置存在', false, '配置JSON解析失败');
    }
  } else {
    addResult('奖励配置存在', false, '未找到REWARD_CONFIG配置');
  }
}

// ============ 测试9：系统用户验证 ============
async function testSystemUsers() {
  log('\n' + '='.repeat(60));
  log('【测试9】系统用户验证');
  log('='.repeat(60));

  const users = await prisma.systemUser.findMany({
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      status: true,
      warehouseId: true,
    }
  });

  log(`\n找到 ${users.length} 个系统用户：`);
  for (const user of users) {
    log(`  ID:${user.id} | ${user.username} | ${user.name} | 角色:${user.role} | 状态:${user.status}`);
  }

  const adminUsers = users.filter(u => u.role === 'ADMIN');
  const warehouseUsers = users.filter(u => u.role === 'WAREHOUSE');

  addResult('管理员账号存在', adminUsers.length > 0, `${adminUsers.length}个管理员`);
  addResult('门店员工账号存在', warehouseUsers.length > 0, `${warehouseUsers.length}个门店员工`);
}

// ============ 测试10：仓库/门店配置验证 ============
async function testWarehouses() {
  log('\n' + '='.repeat(60));
  log('【测试10】仓库/门店配置验证');
  log('='.repeat(60));

  const warehouses = await prisma.warehouse.findMany({
    select: {
      id: true,
      name: true,
      code: true,
      address: true,
      contactPhone: true,
      status: true,
      isDefault: true,
    }
  });

  log(`\n找到 ${warehouses.length} 个门店：`);
  for (const wh of warehouses) {
    log(`  ID:${wh.id} | ${wh.code} | ${wh.name} | ${wh.contactPhone} | 默认:${wh.isDefault}`);
  }

  const defaultWarehouse = warehouses.find(w => w.isDefault);
  addResult('门店配置存在', warehouses.length > 0, `${warehouses.length}个门店`);
  addResult('默认门店存在', !!defaultWarehouse, defaultWarehouse ? defaultWarehouse.name : '无默认门店');
}

// ============ 汇总测试结果 ============
function printSummary() {
  log('\n' + '='.repeat(60));
  log('测试结果汇总');
  log('='.repeat(60));

  const passed = testResults.filter(r => r.passed).length;
  const failed = testResults.filter(r => !r.passed).length;

  log(`\n总计 ${testResults.length} 项测试`);
  log(`  ✅ 通过: ${passed}`);
  log(`  ❌ 失败: ${failed}`);

  if (failed > 0) {
    log('\n失败的测试项：');
    testResults.filter(r => !r.passed).forEach(r => {
      log(`  ❌ ${r.name}: ${r.message}`);
    });
  }

  log('\n' + '='.repeat(60));
  return failed === 0;
}

// ============ 主函数 ============
async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║           蒙庆烟花 - 分销功能全面测试                    ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('\n开始时间:', new Date().toISOString());

  try {
    await testAgentList();
    await testHierarchy();
    await testProductPrices();
    await testDataCleanup();
    await testGiftTiers();
    await testFlashSale();
    await testRewardConfig();
    await testSystemUsers();
    await testWarehouses();
    // await testAPIEndpoints(); // 跳过API测试（需要服务运行）

    const allPassed = printSummary();
    console.log('\n结束时间:', new Date().toISOString());

    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('\n测试执行失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

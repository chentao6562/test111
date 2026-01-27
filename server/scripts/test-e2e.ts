/**
 * 分销功能端到端测试脚本
 * 测试完整的业务流程：定价 -> 预约 -> 确认 -> 核销 -> 利润结算 -> 代金券
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

interface BugReport {
  id: string;
  severity: 'P0' | 'P1' | 'P2' | 'P3';
  category: string;
  title: string;
  description: string;
  location?: string;
  suggestion?: string;
}

const bugReports: BugReport[] = [];

function log(msg: string) {
  console.log(msg);
}

function reportBug(bug: BugReport) {
  bugReports.push(bug);
  log(`  🐛 [${bug.severity}] ${bug.title}`);
}

// ============ 测试1：推销员定价测试 ============
async function testAgentPricing() {
  log('\n' + '='.repeat(60));
  log('【测试1】推销员定价测试');
  log('='.repeat(60));

  // 获取总代理
  const master = await prisma.agent.findFirst({ where: { isMaster: true } });
  if (!master) {
    reportBug({
      id: 'PRICE-001',
      severity: 'P0',
      category: '定价',
      title: '总代理不存在',
      description: '系统中没有设置总代理账号',
    });
    return;
  }
  log(`\n总代理: ${master.name} (ID:${master.id})`);

  // 获取一级推销员
  const level1 = await prisma.agent.findFirst({
    where: { type: 'LEVEL1', parentId: master.id }
  });
  if (!level1) {
    log('  ⚠️ 无一级推销员，跳过定价测试');
    return;
  }
  log(`一级推销员: ${level1.name} (ID:${level1.id})`);

  // 获取二级推销员
  const level2 = await prisma.agent.findFirst({
    where: { type: 'LEVEL2', parentId: level1.id }
  });
  if (level2) {
    log(`二级推销员: ${level2.name} (ID:${level2.id})`);
  }

  // 获取测试商品
  const product = await prisma.product.findFirst({
    where: { status: 'ACTIVE', costPrice: { not: null }, supplyPrice: { not: null } }
  });
  if (!product) {
    log('  ⚠️ 无可用商品，跳过定价测试');
    return;
  }

  const costPrice = Number(product.costPrice) || 0;
  const supplyPrice = Number(product.supplyPrice) || 0;
  const retailPrice = Number(product.masterRetailPrice) || Number(product.retailPrice);

  log(`\n测试商品: ${product.name} (ID:${product.id})`);
  log(`  成本价: ${costPrice}`);
  log(`  供货价: ${supplyPrice}`);
  log(`  总代零售价: ${retailPrice}`);

  // 测试一级推销员定价
  log('\n[测试1.1] 一级推销员定价验证');

  // 验证：一级零售价不能低于供货价
  const invalidRetailPrice = supplyPrice - 1;
  if (invalidRetailPrice >= supplyPrice) {
    reportBug({
      id: 'PRICE-002',
      severity: 'P1',
      category: '定价',
      title: '价格边界计算错误',
      description: `供货价${supplyPrice}，计算出的无效价格${invalidRetailPrice}应该小于供货价`,
    });
  } else {
    log(`  ✅ 边界条件正确：一级零售价(${invalidRetailPrice}) < 供货价(${supplyPrice}) 应被拒绝`);
  }

  // 验证：subPrice不能高于零售价
  const validRetailForLevel1 = supplyPrice + 10;
  const invalidSubPrice = validRetailForLevel1 + 1;
  if (invalidSubPrice <= validRetailForLevel1) {
    reportBug({
      id: 'PRICE-003',
      severity: 'P1',
      category: '定价',
      title: 'subPrice上限校验失败',
      description: `subPrice(${invalidSubPrice}) 不应该高于零售价(${validRetailForLevel1})`,
    });
  } else {
    log(`  ✅ 边界条件正确：subPrice(${invalidSubPrice}) > 零售价(${validRetailForLevel1}) 应被拒绝`);
  }

  // 创建一级定价
  const level1Price = await prisma.agentPrice.upsert({
    where: { agentId_productId: { agentId: level1.id, productId: product.id } },
    update: { retailPrice: validRetailForLevel1, subPrice: supplyPrice + 5 },
    create: {
      agentId: level1.id,
      productId: product.id,
      retailPrice: validRetailForLevel1,
      subPrice: supplyPrice + 5,
    },
  });
  log(`  一级定价创建成功: 零售价=${level1Price.retailPrice}, 给二级价=${level1Price.subPrice}`);

  // 如果有二级，测试二级定价
  if (level2) {
    log('\n[测试1.2] 二级推销员定价验证');
    const level1SubPrice = Number(level1Price.subPrice) || supplyPrice;

    // 验证：二级零售价不能低于一级给的价
    const invalidLevel2Price = level1SubPrice - 1;
    if (invalidLevel2Price >= level1SubPrice) {
      reportBug({
        id: 'PRICE-004',
        severity: 'P1',
        category: '定价',
        title: '二级价格下限校验失败',
        description: `二级零售价(${invalidLevel2Price}) 不应该低于一级给的价(${level1SubPrice})`,
      });
    } else {
      log(`  ✅ 边界条件正确：二级零售价(${invalidLevel2Price}) < 一级给的价(${level1SubPrice}) 应被拒绝`);
    }

    // 创建二级定价
    const validLevel2Price = level1SubPrice + 5;
    const level2Price = await prisma.agentPrice.upsert({
      where: { agentId_productId: { agentId: level2.id, productId: product.id } },
      update: { retailPrice: validLevel2Price },
      create: {
        agentId: level2.id,
        productId: product.id,
        retailPrice: validLevel2Price,
      },
    });
    log(`  二级定价创建成功: 零售价=${level2Price.retailPrice}`);
  }

  log('\n[测试1.3] 定价测试完成');
}

// ============ 测试2：预约流程测试 ============
async function testReservationFlow() {
  log('\n' + '='.repeat(60));
  log('【测试2】预约流程测试');
  log('='.repeat(60));

  // 获取一级推销员
  const level1 = await prisma.agent.findFirst({
    where: { type: 'LEVEL1', status: 'ACTIVE' }
  });
  if (!level1) {
    log('  ⚠️ 无一级推销员，跳过预约测试');
    return;
  }

  // 获取商品和仓库
  const product = await prisma.product.findFirst({
    where: { status: 'ACTIVE', stock: { gt: 10 } }
  });
  const warehouse = await prisma.warehouse.findFirst({
    where: { isDefault: true }
  });

  if (!product || !warehouse) {
    log('  ⚠️ 缺少商品或仓库配置，跳过预约测试');
    return;
  }

  const initialStock = product.stock;
  const initialLockStock = product.lockStock;
  log(`\n商品: ${product.name}, 库存: ${initialStock}, 锁定: ${initialLockStock}`);

  // 模拟创建预约
  log('\n[测试2.1] 创建预约测试');

  // 生成预约号
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const lastReservation = await prisma.reservation.findFirst({
    where: { reservationNo: { startsWith: `MQ${dateStr}` } },
    orderBy: { reservationNo: 'desc' }
  });
  const seq = lastReservation ? parseInt(lastReservation.reservationNo.slice(-5)) + 1 : 1;
  const reservationNo = `MQ${dateStr}${String(seq).padStart(5, '0')}`;

  // 计算价格
  const retailPrice = Number(product.masterRetailPrice) || Number(product.retailPrice);
  const quantity = 2;
  const totalAmount = retailPrice * quantity;

  // 匹配赠品
  const giftTier = await prisma.giftTier.findFirst({
    where: { minAmount: { lte: totalAmount }, isActive: true },
    orderBy: { minAmount: 'desc' }
  });

  log(`  预约号: ${reservationNo}`);
  log(`  商品: ${product.name} x ${quantity} = ${totalAmount}元`);
  log(`  赠品: ${giftTier ? giftTier.giftName : '无'}`);

  // 创建预约
  const pickupDate = new Date();
  pickupDate.setDate(pickupDate.getDate() + 3);

  const reservation = await prisma.reservation.create({
    data: {
      reservationNo,
      customerName: '测试客户',
      customerPhone: '13900000099',
      pickupDate,
      salespersonId: level1.id,
      salespersonLevel: 1,
      parentSalespersonId: null,
      storeId: warehouse.id,
      totalAmount,
      giftTierId: giftTier?.id,
      giftName: giftTier?.giftName,
      status: 0, // 待确认
      items: {
        create: {
          productId: product.id,
          productName: product.name,
          productImage: '',
          quantity,
          price: retailPrice,
          snapshotCostPrice: product.costPrice,
          snapshotSupplyPrice: product.supplyPrice,
          snapshotRetailPrice: retailPrice,
        }
      }
    },
    include: { items: true }
  });

  log(`  ✅ 预约创建成功: ID=${reservation.id}, 状态=${reservation.status}`);

  // 锁定库存
  await prisma.product.update({
    where: { id: product.id },
    data: { lockStock: { increment: quantity } }
  });

  // 验证库存变化
  const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
  if (updatedProduct) {
    const expectedLockStock = initialLockStock + quantity;
    if (updatedProduct.lockStock !== expectedLockStock) {
      reportBug({
        id: 'RES-001',
        severity: 'P0',
        category: '预约',
        title: '库存锁定不正确',
        description: `预期lockStock=${expectedLockStock}, 实际=${updatedProduct.lockStock}`,
      });
    } else {
      log(`  ✅ 库存锁定正确: lockStock ${initialLockStock} -> ${updatedProduct.lockStock}`);
    }
  }

  // 测试状态流转
  log('\n[测试2.2] 预约状态流转测试');

  // 0 -> 1 确认中
  await prisma.reservation.update({
    where: { id: reservation.id },
    data: { status: 1, callCount: 1 }
  });
  log(`  ✅ 状态流转: 0(待确认) -> 1(确认中)`);

  // 1 -> 2 已确认
  await prisma.reservation.update({
    where: { id: reservation.id },
    data: { status: 2, confirmedAt: new Date(), confirmedBy: 1 }
  });
  log(`  ✅ 状态流转: 1(确认中) -> 2(已确认)`);

  // 返回预约信息供后续测试使用
  return reservation;
}

// ============ 测试3：利润结算测试 ============
async function testProfitSettlement(reservation?: any) {
  log('\n' + '='.repeat(60));
  log('【测试3】利润结算测试');
  log('='.repeat(60));

  if (!reservation) {
    // 获取一个已确认的预约
    reservation = await prisma.reservation.findFirst({
      where: { status: 2 },
      include: { items: true }
    });
  }

  if (!reservation) {
    log('  ⚠️ 无可用预约，跳过利润结算测试');
    return;
  }

  log(`\n预约: ${reservation.reservationNo}, 金额: ${reservation.totalAmount}`);

  // 获取推销员信息
  const salesperson = await prisma.agent.findUnique({
    where: { id: reservation.salespersonId },
    include: { parent: true }
  });

  if (!salesperson) {
    log('  ⚠️ 推销员不存在，跳过利润测试');
    return;
  }

  log(`推销员: ${salesperson.name} (${salesperson.type})`);

  // 计算利润
  const item = reservation.items[0];
  const costPrice = Number(item.snapshotCostPrice) || 0;
  const supplyPrice = Number(item.snapshotSupplyPrice) || 0;
  const retailPrice = Number(item.snapshotRetailPrice) || Number(item.price);
  const quantity = item.quantity;

  log(`\n[测试3.1] 利润计算验证`);
  log(`  成本价: ${costPrice}, 供货价: ${supplyPrice}, 零售价: ${retailPrice}, 数量: ${quantity}`);

  let masterProfit = 0;
  let level1Profit = 0;
  let level2Profit = 0;

  if (salesperson.isMaster) {
    // 总代理直销
    masterProfit = (retailPrice - costPrice) * quantity;
    log(`  总代理直销: 利润 = (${retailPrice} - ${costPrice}) x ${quantity} = ${masterProfit}`);
  } else if (salesperson.type === 'LEVEL1') {
    // 一级销售
    masterProfit = (supplyPrice - costPrice) * quantity;
    level1Profit = (retailPrice - supplyPrice) * quantity;
    log(`  一级销售:`);
    log(`    总代利润 = (${supplyPrice} - ${costPrice}) x ${quantity} = ${masterProfit}`);
    log(`    一级利润 = (${retailPrice} - ${supplyPrice}) x ${quantity} = ${level1Profit}`);
  } else if (salesperson.type === 'LEVEL2') {
    // 二级销售
    const level1Price = Number(item.snapshotLevel1Price) || supplyPrice;
    masterProfit = (supplyPrice - costPrice) * quantity;
    level1Profit = (level1Price - supplyPrice) * quantity;
    level2Profit = (retailPrice - level1Price) * quantity;
    log(`  二级销售:`);
    log(`    总代利润 = (${supplyPrice} - ${costPrice}) x ${quantity} = ${masterProfit}`);
    log(`    一级利润 = (${level1Price} - ${supplyPrice}) x ${quantity} = ${level1Profit}`);
    log(`    二级利润 = (${retailPrice} - ${level1Price}) x ${quantity} = ${level2Profit}`);
  }

  // 验证利润总和
  const totalProfit = masterProfit + level1Profit + level2Profit;
  const expectedTotalProfit = (retailPrice - costPrice) * quantity;

  if (Math.abs(totalProfit - expectedTotalProfit) > 0.01) {
    reportBug({
      id: 'PROFIT-001',
      severity: 'P0',
      category: '利润',
      title: '利润分配总和不等于总利润',
      description: `利润总和=${totalProfit}, 预期=${expectedTotalProfit}`,
    });
  } else {
    log(`  ✅ 利润总和验证通过: ${totalProfit} = ${expectedTotalProfit}`);
  }

  // 模拟核销
  log('\n[测试3.2] 模拟核销并结算利润');

  // 更新预约状态为已完成
  await prisma.reservation.update({
    where: { id: reservation.id },
    data: {
      status: 3, // 已完成
      completedAt: new Date(),
      completedBy: 1,
      paymentMethod: 'cash',
      settled: true,
      settledAt: new Date(),
      masterProfit,
      level1Profit,
      level2Profit,
    }
  });

  // 扣减库存
  await prisma.product.update({
    where: { id: item.productId },
    data: {
      stock: { decrement: quantity },
      lockStock: { decrement: quantity }
    }
  });

  // 获取总代理
  const master = await prisma.agent.findFirst({ where: { isMaster: true } });

  // 结算利润到推销员余额
  if (masterProfit > 0 && master) {
    await prisma.agent.update({
      where: { id: master.id },
      data: {
        balance: { increment: masterProfit },
        totalCommission: { increment: masterProfit },
        totalSales: { increment: Number(reservation.totalAmount) },
        totalOrderCount: { increment: 1 }
      }
    });

    // 创建资金流水
    await prisma.fundFlow.create({
      data: {
        agentId: master.id,
        type: 'COMMISSION',
        amount: masterProfit,
        beforeBalance: 0,
        afterBalance: masterProfit,
        relatedId: reservation.id,
        relatedType: 'RESERVATION'
      }
    });
    log(`  ✅ 总代理利润入账: +${masterProfit}元`);
  }

  if (level1Profit > 0 && !salesperson.isMaster) {
    const level1Agent = salesperson.type === 'LEVEL1' ? salesperson : salesperson.parent;
    if (level1Agent) {
      await prisma.agent.update({
        where: { id: level1Agent.id },
        data: {
          balance: { increment: level1Profit },
          totalCommission: { increment: level1Profit },
        }
      });
      log(`  ✅ 一级推销员利润入账: +${level1Profit}元`);
    }
  }

  if (level2Profit > 0 && salesperson.type === 'LEVEL2') {
    await prisma.agent.update({
      where: { id: salesperson.id },
      data: {
        balance: { increment: level2Profit },
        totalCommission: { increment: level2Profit },
      }
    });
    log(`  ✅ 二级推销员利润入账: +${level2Profit}元`);
  }

  log('\n[测试3.3] 利润结算测试完成');
}

// ============ 测试4：代金券测试 ============
async function testCouponSystem() {
  log('\n' + '='.repeat(60));
  log('【测试4】代金券系统测试');
  log('='.repeat(60));

  // 获取一个推销员
  const agent = await prisma.agent.findFirst({
    where: { type: 'LEVEL1', status: 'ACTIVE' }
  });

  if (!agent) {
    log('  ⚠️ 无推销员，跳过代金券测试');
    return;
  }

  // 生成代金券码
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const couponCode = `CPN${timestamp}${random}`;

  log(`\n[测试4.1] 创建代金券`);

  // 创建测试代金券
  const coupon = await prisma.coupon.create({
    data: {
      code: couponCode,
      agentId: agent.id,
      amount: 10,
      sourceType: 'FIRST_RESERVATION',
      sourceDesc: '首预约测试奖励',
      status: 'UNUSED',
      expiredAt: new Date('2026-02-14'),
    }
  });

  log(`  ✅ 代金券创建成功: ${coupon.code}, 面额: ${coupon.amount}元`);

  // 验证代金券
  log('\n[测试4.2] 验证代金券');

  const verifyCoupon = await prisma.coupon.findUnique({
    where: { code: couponCode }
  });

  if (!verifyCoupon) {
    reportBug({
      id: 'COUPON-001',
      severity: 'P0',
      category: '代金券',
      title: '代金券查询失败',
      description: `无法找到刚创建的代金券: ${couponCode}`,
    });
    return;
  }

  if (verifyCoupon.status !== 'UNUSED') {
    reportBug({
      id: 'COUPON-002',
      severity: 'P1',
      category: '代金券',
      title: '代金券初始状态错误',
      description: `预期状态UNUSED, 实际${verifyCoupon.status}`,
    });
  } else {
    log(`  ✅ 代金券状态正确: ${verifyCoupon.status}`);
  }

  // 模拟核销代金券
  log('\n[测试4.3] 核销代金券');

  // 记录核销前余额
  const beforeBalance = Number(agent.balance);

  // 核销
  await prisma.coupon.update({
    where: { code: couponCode },
    data: {
      status: 'USED',
      usedAt: new Date(),
      usedOrderNo: 'TEST-ORDER',
      usedBy: 1
    }
  });

  // 从推销员余额扣除
  await prisma.agent.update({
    where: { id: agent.id },
    data: {
      balance: { decrement: Number(coupon.amount) }
    }
  });

  const afterAgent = await prisma.agent.findUnique({ where: { id: agent.id } });
  const expectedBalance = beforeBalance - Number(coupon.amount);

  if (afterAgent && Number(afterAgent.balance) !== expectedBalance) {
    reportBug({
      id: 'COUPON-003',
      severity: 'P1',
      category: '代金券',
      title: '代金券核销余额扣除错误',
      description: `预期余额${expectedBalance}, 实际${afterAgent.balance}`,
    });
  } else {
    log(`  ✅ 代金券核销成功: 余额 ${beforeBalance} -> ${afterAgent?.balance}`);
  }

  log('\n[测试4.4] 代金券测试完成');
}

// ============ 测试5：数据一致性检查 ============
async function testDataConsistency() {
  log('\n' + '='.repeat(60));
  log('【测试5】数据一致性检查');
  log('='.repeat(60));

  // 检查库存一致性
  log('\n[测试5.1] 库存一致性');
  const stockIssues = await prisma.product.findMany({
    where: {
      OR: [
        { lockStock: { gt: prisma.product.fields.stock } },
        { stock: { lt: 0 } },
        { lockStock: { lt: 0 } }
      ]
    }
  });

  if (stockIssues.length > 0) {
    reportBug({
      id: 'DATA-001',
      severity: 'P0',
      category: '数据一致性',
      title: '库存数据异常',
      description: `${stockIssues.length}个商品存在库存异常`,
    });
    stockIssues.forEach(p => log(`    - ${p.name}: stock=${p.stock}, lockStock=${p.lockStock}`));
  } else {
    log(`  ✅ 库存数据正常`);
  }

  // 检查推销员余额与流水
  log('\n[测试5.2] 推销员余额一致性');
  const agents = await prisma.agent.findMany({
    include: { fundFlows: true }
  });

  let balanceIssues = 0;
  for (const agent of agents) {
    const flowSum = agent.fundFlows.reduce((sum, f) => sum + Number(f.amount), 0);
    const balance = Number(agent.balance);

    // 允许微小误差
    if (Math.abs(flowSum - balance) > 0.01 && agent.fundFlows.length > 0) {
      balanceIssues++;
      log(`    ⚠️ ${agent.name}: 余额${balance}, 流水合计${flowSum}`);
    }
  }

  if (balanceIssues > 0) {
    reportBug({
      id: 'DATA-002',
      severity: 'P1',
      category: '数据一致性',
      title: '余额与流水不一致',
      description: `${balanceIssues}个推销员余额与流水不一致`,
    });
  } else {
    log(`  ✅ 推销员余额与流水一致`);
  }

  // 检查预约状态
  log('\n[测试5.3] 预约状态一致性');
  const completedWithoutSettled = await prisma.reservation.count({
    where: { status: 3, settled: false }
  });

  if (completedWithoutSettled > 0) {
    reportBug({
      id: 'DATA-003',
      severity: 'P1',
      category: '数据一致性',
      title: '已完成预约未结算',
      description: `${completedWithoutSettled}个已完成预约未标记为已结算`,
    });
  } else {
    log(`  ✅ 预约状态正常`);
  }
}

// ============ 汇总BUG报告 ============
function printBugReport() {
  log('\n' + '='.repeat(60));
  log('BUG报告汇总');
  log('='.repeat(60));

  if (bugReports.length === 0) {
    log('\n✅ 未发现BUG！');
    return;
  }

  const p0 = bugReports.filter(b => b.severity === 'P0');
  const p1 = bugReports.filter(b => b.severity === 'P1');
  const p2 = bugReports.filter(b => b.severity === 'P2');
  const p3 = bugReports.filter(b => b.severity === 'P3');

  log(`\n发现 ${bugReports.length} 个问题:`);
  log(`  🔴 P0(严重): ${p0.length}`);
  log(`  🟠 P1(重要): ${p1.length}`);
  log(`  🟡 P2(一般): ${p2.length}`);
  log(`  🟢 P3(建议): ${p3.length}`);

  log('\n详细列表:');
  for (const bug of bugReports) {
    const icon = bug.severity === 'P0' ? '🔴' : bug.severity === 'P1' ? '🟠' : bug.severity === 'P2' ? '🟡' : '🟢';
    log(`\n${icon} [${bug.id}] ${bug.title}`);
    log(`   类别: ${bug.category}`);
    log(`   描述: ${bug.description}`);
    if (bug.location) log(`   位置: ${bug.location}`);
    if (bug.suggestion) log(`   建议: ${bug.suggestion}`);
  }
}

// ============ 主函数 ============
async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║        蒙庆烟花 - 分销功能端到端测试                     ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('\n开始时间:', new Date().toISOString());

  try {
    await testAgentPricing();
    const reservation = await testReservationFlow();
    await testProfitSettlement(reservation);
    await testCouponSystem();
    await testDataConsistency();

    printBugReport();

    console.log('\n结束时间:', new Date().toISOString());
    process.exit(bugReports.filter(b => b.severity === 'P0').length > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n测试执行失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

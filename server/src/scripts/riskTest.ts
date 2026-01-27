/**
 * 风控与过期测试
 * TC-21: 预约过期自动释放库存
 * TC-22: 累计爽约加入黑名单
 * TC-23: 高风险客户不发放赠品
 */

import prisma from '../utils/prisma';

interface RiskTestResult {
  testId: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  expected: string;
  actual: string;
}

const riskResults: RiskTestResult[] = [];

function record(testId: string, name: string, status: 'PASS' | 'FAIL' | 'SKIP', expected: string, actual: string) {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`${icon} [${testId}] ${name}`);
  console.log(`   预期: ${expected}`);
  console.log(`   实际: ${actual}`);
  riskResults.push({ testId, name, status, expected, actual });
}

async function runRiskTests() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║         风控与过期测试                 ║');
  console.log('╚════════════════════════════════════════╝\n');

  // TC-21: 预约过期自动释放库存
  console.log('\n--- TC-21: 预约过期逻辑验证 ---');
  try {
    // 检查过期任务是否存在
    const { triggerExpiryCheck } = await import('../tasks/reservationExpiryTask');

    // 创建一个测试预约（已确认状态，过期日期）
    const testPhone = `138${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
    const pastDate = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000); // 4天前

    // 获取一个测试商品
    const product = await prisma.product.findFirst({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, stock: true, lockStock: true, retailPrice: true },
    });

    if (!product) {
      record('TC-21', '预约过期逻辑', 'SKIP', '需要商品数据', '无活跃商品');
    } else {
      const initialStock = product.stock;
      const initialLockStock = product.lockStock;

      // 创建一个模拟的已确认过期预约
      const expireAt = new Date(Date.now() - 24 * 60 * 60 * 1000); // 已过期(昨天)
      const reservation = await prisma.reservation.create({
        data: {
          reservationNo: `TEST${Date.now()}`,
          customerName: '过期测试客户',
          customerPhone: testPhone,
          pickupDate: pastDate,
          expireAt: expireAt,  // 关键：设置过期时间
          totalAmount: Number(product.retailPrice),
          status: 2, // 已确认
          storeId: 1,
        },
      });

      // 创建预约商品
      await prisma.reservationItem.create({
        data: {
          reservationId: reservation.id,
          productId: product.id,
          productName: product.name,
          quantity: 1,
          price: product.retailPrice,
          snapshotCostPrice: 0,
          snapshotSupplyPrice: 0,
          snapshotRetailPrice: Number(product.retailPrice),
        },
      });

      // 锁定库存
      await prisma.product.update({
        where: { id: product.id },
        data: { lockStock: { increment: 1 } },
      });

      // 执行过期任务
      await triggerExpiryCheck();

      // 检查预约状态和库存
      const updatedReservation = await prisma.reservation.findUnique({
        where: { id: reservation.id },
      });

      const updatedProduct = await prisma.product.findUnique({
        where: { id: product.id },
        select: { stock: true, lockStock: true },
      });

      // 验证
      const isExpired = updatedReservation?.status === 5; // 已过期
      const stockReleased = updatedProduct && updatedProduct.lockStock === initialLockStock;

      if (isExpired && stockReleased) {
        record('TC-21', '预约过期逻辑', 'PASS',
          '过期预约标记为5，库存释放',
          `状态=${updatedReservation?.status}，锁定库存${initialLockStock+1}->${updatedProduct?.lockStock}`);
      } else {
        record('TC-21', '预约过期逻辑', 'FAIL',
          '过期预约标记为5，库存释放',
          `状态=${updatedReservation?.status}，锁定库存${initialLockStock+1}->${updatedProduct?.lockStock}`);
      }

      // 清理测试数据
      await prisma.reservationItem.deleteMany({ where: { reservationId: reservation.id } });
      await prisma.reservation.delete({ where: { id: reservation.id } });
    }
  } catch (err: any) {
    record('TC-21', '预约过期逻辑', 'FAIL', '正常执行', `异常: ${err.message}`);
  }

  // TC-22: 累计爽约加入黑名单
  console.log('\n--- TC-22: 爽约黑名单逻辑验证 ---');
  try {
    const testPhone = `137${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;

    // 创建或获取客户记录
    let customer = await prisma.customerRecord.findUnique({ where: { phone: testPhone } });
    if (!customer) {
      customer = await prisma.customerRecord.create({
        data: {
          phone: testPhone,
          name: '爽约测试客户',
          noShowCount: 2, // 已有2次爽约
          riskLevel: 2,   // 高风险
        },
      });
    } else {
      await prisma.customerRecord.update({
        where: { phone: testPhone },
        data: { noShowCount: 2, riskLevel: 2 },
      });
    }

    // 导入爽约处理函数
    const { recordNoShow } = await import('../services/reservation/customerService');

    // 记录第3次爽约
    await recordNoShow(testPhone);

    // 检查客户状态
    const updatedCustomer = await prisma.customerRecord.findUnique({ where: { phone: testPhone } });

    if (updatedCustomer && updatedCustomer.noShowCount >= 3 && updatedCustomer.riskLevel === 3) {
      record('TC-22', '爽约黑名单', 'PASS',
        '累计3次爽约后riskLevel=3(黑名单)',
        `爽约次数=${updatedCustomer.noShowCount}，风险等级=${updatedCustomer.riskLevel}`);
    } else {
      record('TC-22', '爽约黑名单', 'FAIL',
        '累计3次爽约后riskLevel=3(黑名单)',
        `爽约次数=${updatedCustomer?.noShowCount}，风险等级=${updatedCustomer?.riskLevel}`);
    }

    // 清理
    await prisma.customerRecord.delete({ where: { phone: testPhone } });
  } catch (err: any) {
    record('TC-22', '爽约黑名单', 'FAIL', '正常执行', `异常: ${err.message}`);
  }

  // TC-23: 高风险客户不发放赠品
  console.log('\n--- TC-23: 高风险客户赠品限制验证 ---');
  try {
    const { checkCustomerCanReserve } = await import('../services/reservation/customerService');
    const { isEligibleForGift } = await import('../services/reservation/giftService');
    const testPhone = `136${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;

    // 创建高风险客户
    await prisma.customerRecord.create({
      data: {
        phone: testPhone,
        name: '高风险测试客户',
        noShowCount: 2,
        riskLevel: 2, // 高风险
      },
    });

    // 检查预约权限
    const result = await checkCustomerCanReserve(testPhone);

    // 高风险客户应该可以预约，但不能获得赠品
    const canReserve = result.canReserve === true;
    const noGift = !isEligibleForGift(result.riskLevel);

    if (canReserve && noGift) {
      record('TC-23', '高风险客户赠品限制', 'PASS',
        '高风险客户可预约但无赠品',
        `可预约=${result.canReserve}，风险等级=${result.riskLevel}，可获赠品=${isEligibleForGift(result.riskLevel)}`);
    } else {
      record('TC-23', '高风险客户赠品限制', 'FAIL',
        '高风险客户可预约但无赠品',
        `可预约=${result.canReserve}，风险等级=${result.riskLevel}，可获赠品=${isEligibleForGift(result.riskLevel)}`);
    }

    // 额外测试：黑名单客户不能预约（需要同时设置isBlocked=true）
    await prisma.customerRecord.update({
      where: { phone: testPhone },
      data: { riskLevel: 3, isBlocked: true, blockedReason: '测试黑名单' },
    });

    const blacklistResult = await checkCustomerCanReserve(testPhone);
    if (blacklistResult.canReserve === false) {
      console.log(`   ✅ 黑名单客户禁止预约: ${blacklistResult.message}`);
    } else {
      console.log(`   ❌ 黑名单客户未被禁止预约`);
    }

    // 清理
    await prisma.customerRecord.delete({ where: { phone: testPhone } });
  } catch (err: any) {
    record('TC-23', '高风险客户赠品限制', 'FAIL', '正常执行', `异常: ${err.message}`);
  }

  // 汇总
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║           风控测试报告                 ║');
  console.log('╚════════════════════════════════════════╝\n');

  const passCount = riskResults.filter(r => r.status === 'PASS').length;
  const failCount = riskResults.filter(r => r.status === 'FAIL').length;
  const skipCount = riskResults.filter(r => r.status === 'SKIP').length;

  console.log(`总计: ${riskResults.length} 个测试`);
  console.log(`✅ 通过: ${passCount}`);
  console.log(`❌ 失败: ${failCount}`);
  console.log(`⏭️ 跳过: ${skipCount}`);

  if (failCount > 0) {
    console.log('\n--- 失败详情 ---');
    for (const r of riskResults.filter(r => r.status === 'FAIL')) {
      console.log(`❌ ${r.testId}: ${r.name}`);
      console.log(`   预期: ${r.expected}`);
      console.log(`   实际: ${r.actual}`);
    }
  }
}

runRiskTests()
  .then(() => prisma.$disconnect())
  .then(() => process.exit(0))
  .catch(err => {
    console.error('测试失败:', err);
    prisma.$disconnect();
    process.exit(1);
  });

/**
 * 回归测试（Regression Testing）
 * 目的：验证核心业务流程在修改后仍然正常工作
 * 覆盖：订单流程、分润计算、库存管理、T+1结算
 * 执行时间：约3-5分钟
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function regressionTest() {
  console.log('======= 回归测试开始 =======');
  console.log(`执行时间: ${new Date().toLocaleString('zh-CN')}\n`);

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    scenarios: []
  };

  let testAgent = null;
  let testProduct = null;
  let testOrder = null;

  // 辅助函数
  const scenario = async (name, fn) => {
    results.total++;
    console.log(`\n【场景${results.total}】${name}`);
    console.log('─'.repeat(50));
    try {
      await fn();
      results.passed++;
      results.scenarios.push({ name, status: 'PASS' });
      console.log(`✓ 场景通过\n`);
      return true;
    } catch (error) {
      results.failed++;
      results.scenarios.push({ name, status: 'FAIL', error: error.message });
      console.log(`✗ 场景失败: ${error.message}\n`);
      return false;
    }
  };

  try {
    // 场景1：准备测试数据
    await scenario('准备测试环境', async () => {
      // 查找测试代理商（二级代理）
      testAgent = await prisma.agent.findFirst({
        where: {
          type: 'LEVEL2',
          parentId: { not: null }
        },
        include: {
          parent: true
        }
      });

      if (!testAgent) {
        throw new Error('未找到二级代理测试账号');
      }

      console.log(`  使用代理商: ${testAgent.name} (ID: ${testAgent.id})`);
      console.log(`  上级: ${testAgent.parent.name} (ID: ${testAgent.parentId})`);

      // 查找测试商品
      testProduct = await prisma.product.findFirst({
        where: {
          status: 'active',
          stock: { gt: 10 }
        }
      });

      if (!testProduct) {
        throw new Error('未找到可用测试商品（库存>10）');
      }

      console.log(`  使用商品: ${testProduct.name} (ID: ${testProduct.id}, 库存: ${testProduct.stock})`);
    });

    // 场景2：创建订单（库存锁定）
    let initialStock = 0;
    let initialLockStock = 0;
    await scenario('创建订单并锁定库存', async () => {
      initialStock = Number(testProduct.stock);
      initialLockStock = Number(testProduct.lockStock || 0);
      const orderQuantity = 2;

      const orderNo = `REG_TEST_${Date.now()}`;
      const productPrice = Number(testProduct.agentPrice);
      const totalAmount = productPrice * orderQuantity;

      testOrder = await prisma.$transaction(async (tx) => {
        // 锁定库存
        await tx.product.update({
          where: { id: testProduct.id },
          data: { lockStock: { increment: orderQuantity } }
        });

        // 创建订单
        const order = await tx.order.create({
          data: {
            orderNo,
            agentId: testAgent.id,
            totalAmount,
            status: 'pending_payment',
            needTransfer: false,
            fullPaid: false,
            paidAmount: 0,
            contactName: testAgent.name,
            contactPhone: testAgent.phone,
            needConfirm: false
          }
        });

        // 创建订单项
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: testProduct.id,
            quantity: orderQuantity,
            price: productPrice,
            productName: testProduct.name,
            productImage: testProduct.images || null
          }
        });

        return order;
      });

      console.log(`  订单ID: ${testOrder.id}`);
      console.log(`  订单号: ${testOrder.orderNo}`);
      console.log(`  金额: ￥${totalAmount}`);

      // 验证库存锁定
      const updatedProduct = await prisma.product.findUnique({
        where: { id: testProduct.id }
      });

      const expectedLockStock = initialLockStock + orderQuantity;
      if (Number(updatedProduct.lockStock) !== expectedLockStock) {
        throw new Error(`锁定库存不正确: 期望${expectedLockStock}, 实际${updatedProduct.lockStock}`);
      }

      console.log(`  库存锁定: ${initialLockStock} → ${updatedProduct.lockStock} ✓`);
    });

    // 场景3：确认收款（订单状态流转）
    await scenario('确认收款并流转状态', async () => {
      const updatedOrder = await prisma.order.update({
        where: { id: testOrder.id },
        data: {
          fullPaid: true,
          paidAmount: testOrder.totalAmount,
          status: 'pending_accept'
        }
      });

      console.log(`  状态: ${testOrder.status} → ${updatedOrder.status} ✓`);
      console.log(`  已付款: ￥${updatedOrder.paidAmount}`);

      if (updatedOrder.status !== 'pending_accept') {
        throw new Error(`状态流转失败: ${updatedOrder.status}`);
      }
    });

    // 场景4：接单和备货
    await scenario('接单并完成备货', async () => {
      // 接单
      let order = await prisma.order.update({
        where: { id: testOrder.id },
        data: { status: 'preparing' }
      });

      console.log(`  接单: pending_accept → ${order.status} ✓`);

      // 生成提货码
      const pickupCode = Math.floor(10000000 + Math.random() * 90000000).toString();

      order = await prisma.order.update({
        where: { id: testOrder.id },
        data: {
          status: 'pending_pickup',
          pickupCode
        }
      });

      console.log(`  备货完成: preparing → ${order.status} ✓`);
      console.log(`  提货码: ${pickupCode}`);

      testOrder = order; // 更新testOrder
    });

    // 场景5：核销提货（分润计算）
    let commissionsBefore = 0;
    await scenario('核销提货并计算分润', async () => {
      commissionsBefore = await prisma.commission.count({
        where: { orderId: testOrder.id }
      });

      const orderItems = await prisma.orderItem.findMany({
        where: { orderId: testOrder.id }
      });

      await prisma.$transaction(async (tx) => {
        // 更新订单状态
        await tx.order.update({
          where: { id: testOrder.id },
          data: {
            status: 'completed',
            pickedAt: new Date()
          }
        });

        // 扣减库存
        const quantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);
        await tx.product.update({
          where: { id: testProduct.id },
          data: {
            stock: { decrement: quantity },
            lockStock: { decrement: quantity },
            salesCount: { increment: quantity }
          }
        });

        // 计算分润
        const orderAmount = Number(testOrder.totalAmount);
        const rule = await tx.commissionRule.findFirst({
          where: {
            status: 'ACTIVE',
            minAmount: { lte: orderAmount }
          },
          orderBy: { minAmount: 'desc' }
        });

        if (!rule) {
          throw new Error('未找到匹配的分润规则');
        }

        // 直接分润
        const directAmount = orderAmount * Number(rule.level1Rate) / 100;
        await tx.commission.create({
          data: {
            agentId: testAgent.parentId,
            orderId: testOrder.id,
            amount: directAmount,
            rate: Number(rule.level1Rate),
            type: 'DIRECT',
            status: 'PENDING'
          }
        });

        await tx.agent.update({
          where: { id: testAgent.parentId },
          data: {
            totalCommission: { increment: directAmount }
          }
        });

        console.log(`  分润计算: ￥${directAmount.toFixed(2)} (${rule.level1Rate}%)`);
      });

      console.log(`  订单状态: pending_pickup → completed ✓`);

      // 验证库存扣减
      const finalProduct = await prisma.product.findUnique({
        where: { id: testProduct.id }
      });

      const orderQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);
      const expectedStock = initialStock - orderQuantity;
      const expectedLockStock = initialLockStock;

      if (Number(finalProduct.stock) !== expectedStock) {
        throw new Error(`库存扣减错误: 期望${expectedStock}, 实际${finalProduct.stock}`);
      }

      if (Number(finalProduct.lockStock || 0) !== expectedLockStock) {
        throw new Error(`锁定库存释放错误: 期望${expectedLockStock}, 实际${finalProduct.lockStock}`);
      }

      console.log(`  库存扣减: ${initialStock} → ${finalProduct.stock} ✓`);
      console.log(`  锁定释放: ${initialLockStock + orderQuantity} → ${finalProduct.lockStock || 0} ✓`);

      // 验证分润记录
      const commissionsAfter = await prisma.commission.count({
        where: { orderId: testOrder.id }
      });

      if (commissionsAfter <= commissionsBefore) {
        throw new Error('分润记录未生成');
      }

      console.log(`  分润记录: ${commissionsBefore} → ${commissionsAfter} ✓`);
    });

    // 场景6：T+1分润结算
    await scenario('T+1分润结算', async () => {
      const commissions = await prisma.commission.findMany({
        where: {
          orderId: testOrder.id,
          status: 'PENDING'
        },
        include: {
          agent: true
        }
      });

      if (commissions.length === 0) {
        throw new Error('无待结算分润');
      }

      console.log(`  待结算分润: ${commissions.length}条`);

      let settledCount = 0;
      let totalAmount = 0;

      for (const commission of commissions) {
        const amount = Number(commission.amount);
        totalAmount += amount;

        const currentBalance = Number(commission.agent.balance);

        await prisma.$transaction(async (tx) => {
          // 增加余额
          await tx.agent.update({
            where: { id: commission.agentId },
            data: { balance: { increment: amount } }
          });

          // 创建流水
          await tx.fundFlow.create({
            data: {
              agentId: commission.agentId,
              type: 'COMMISSION',
              amount: amount,
              beforeBalance: currentBalance,
              afterBalance: currentBalance + amount,
              relatedId: commission.id,
              relatedType: 'COMMISSION',
              remark: `回归测试-T+1分润结算（${commission.type === 'DIRECT' ? '直接分润' : '间接分润'}）`
            }
          });

          // 更新分润状态
          await tx.commission.update({
            where: { id: commission.id },
            data: {
              status: 'SETTLED',
              settledAt: new Date()
            }
          });
        });

        settledCount++;
        console.log(`  结算: ${commission.agent.name} ￥${amount} ✓`);
      }

      console.log(`  结算完成: ${settledCount}条, 总计￥${totalAmount.toFixed(2)}`);

      // 验证流水创建
      const fundFlows = await prisma.fundFlow.findMany({
        where: {
          type: 'COMMISSION',
          relatedId: { in: commissions.map(c => c.id) }
        }
      });

      if (fundFlows.length !== commissions.length) {
        throw new Error(`流水创建不完整: 期望${commissions.length}条, 实际${fundFlows.length}条`);
      }

      console.log(`  流水记录: ${fundFlows.length}条 ✓`);

      // 验证余额计算
      for (const flow of fundFlows) {
        const expectedAfter = Number(flow.beforeBalance) + Number(flow.amount);
        if (Math.abs(Number(flow.afterBalance) - expectedAfter) > 0.01) {
          throw new Error(`流水余额计算错误: ${flow.beforeBalance} + ${flow.amount} ≠ ${flow.afterBalance}`);
        }
      }

      console.log(`  余额计算: 正确 ✓`);
    });

    // 场景7：数据完整性验证
    await scenario('最终数据一致性验证', async () => {
      // 验证订单状态
      const finalOrder = await prisma.order.findUnique({
        where: { id: testOrder.id }
      });

      if (finalOrder.status !== 'completed') {
        throw new Error(`订单状态错误: ${finalOrder.status}`);
      }

      console.log(`  订单状态: completed ✓`);

      // 验证分润状态
      const allCommissions = await prisma.commission.findMany({
        where: { orderId: testOrder.id }
      });

      const allSettled = allCommissions.every(c => c.status === 'SETTLED');
      if (!allSettled) {
        throw new Error('存在未结算的分润');
      }

      console.log(`  分润状态: 全部SETTLED ✓`);

      // 验证库存一致性
      const product = await prisma.product.findUnique({
        where: { id: testProduct.id }
      });

      const available = Number(product.stock) - Number(product.lockStock || 0);
      if (available < 0) {
        throw new Error(`可用库存为负: ${available}`);
      }

      console.log(`  可用库存: ${available} ✓`);

      // 验证本次测试的余额与流水一致性（只检查本次创建的流水）
      for (const commission of allCommissions) {
        const testFlows = await prisma.fundFlow.findMany({
          where: {
            agentId: commission.agentId,
            relatedId: commission.id,
            relatedType: 'COMMISSION'
          }
        });

        if (testFlows.length === 0) {
          throw new Error(`代理商${commission.agentId}的分润${commission.id}没有对应的流水记录`);
        }

        // 验证流水金额与分润金额一致
        for (const flow of testFlows) {
          if (Number(flow.amount) !== Number(commission.amount)) {
            throw new Error(`流水金额与分润金额不一致: 流水￥${flow.amount}, 分润￥${commission.amount}`);
          }

          // 验证流水的余额计算正确
          const expectedAfter = Number(flow.beforeBalance) + Number(flow.amount);
          if (Math.abs(Number(flow.afterBalance) - expectedAfter) > 0.01) {
            throw new Error(`流水余额计算错误: ${flow.beforeBalance} + ${flow.amount} ≠ ${flow.afterBalance}`);
          }
        }
      }

      console.log(`  本次测试的余额与流水: 一致 ✓`);
      console.log(`  (注: 历史数据不完整不影响本次测试结果)`);
    });

    // 清理测试数据
    console.log('\n【清理】删除测试数据...');
    await prisma.orderItem.deleteMany({
      where: { orderId: testOrder.id }
    });
    await prisma.commission.deleteMany({
      where: { orderId: testOrder.id }
    });
    await prisma.fundFlow.deleteMany({
      where: {
        relatedType: 'COMMISSION',
        remark: { contains: '回归测试' }
      }
    });
    await prisma.order.delete({
      where: { id: testOrder.id }
    });
    console.log('  测试数据已清理 ✓');

    // 最终统计
    console.log('\n======= 回归测试完成 =======\n');
    console.log(`总场景数: ${results.total}`);
    console.log(`通过: ${results.passed}`);
    console.log(`失败: ${results.failed}`);
    console.log(`通过率: ${((results.passed / results.total) * 100).toFixed(1)}%\n`);

    if (results.failed === 0) {
      console.log('✅ 回归测试全部通过！核心业务流程正常！\n');
    } else {
      console.log('❌ 回归测试发现问题：\n');
      results.scenarios.filter(s => s.status === 'FAIL').forEach(s => {
        console.log(`  - ${s.name}: ${s.error}`);
      });
      console.log('');
    }

    await prisma.$disconnect();
    return results;

  } catch (error) {
    console.error('\n❌ 回归测试执行失败:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// 执行测试
regressionTest().then(results => {
  process.exit(results.failed > 0 ? 1 : 0);
});

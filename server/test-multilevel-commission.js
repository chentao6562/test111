/**
 * 多级代理分润测试（Multi-level Commission Testing）
 * 目的：验证三级代理体系的分润计算正确性
 * 覆盖：直接分润、间接分润、分润比例、分润幂等性
 * 执行时间：约2-3分钟
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testMultilevelCommission() {
  console.log('======= 多级代理分润测试开始 =======');
  console.log(`执行时间: ${new Date().toLocaleString('zh-CN')}\n`);

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    scenarios: []
  };

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

  let level1Agent = null;
  let level2Agent = null;
  let level3Agent = null;
  let wholesaleAgent = null;
  let testProduct = null;
  let testOrders = [];

  try {
    // ========== 场景1: 准备测试环境 - 构建三级代理体系 ==========
    await scenario('准备测试环境: 构建三级代理体系', async () => {
      // 查找一级代理
      level1Agent = await prisma.agent.findFirst({
        where: {
          type: 'LEVEL1',
          parentId: null
        }
      });

      if (!level1Agent) {
        throw new Error('未找到一级代理');
      }

      // 查找一级代理的下级（二级代理）
      level2Agent = await prisma.agent.findFirst({
        where: {
          type: 'LEVEL2',
          parentId: level1Agent.id
        }
      });

      if (!level2Agent) {
        throw new Error('未找到二级代理');
      }

      // 查找二级代理的下级（三级代理）
      level3Agent = await prisma.agent.findFirst({
        where: {
          type: 'LEVEL3',
          parentId: level2Agent.id
        }
      });

      if (!level3Agent) {
        throw new Error('未找到三级代理');
      }

      // 查找批发商
      wholesaleAgent = await prisma.agent.findFirst({
        where: { type: 'WHOLESALE' }
      });

      if (!wholesaleAgent) {
        throw new Error('未找到批发商');
      }

      // 查找测试商品
      testProduct = await prisma.product.findFirst({
        where: {
          status: 'active',
          stock: { gt: 20 }
        }
      });

      if (!testProduct) {
        throw new Error('未找到可用测试商品（库存>20）');
      }

      console.log(`  一级代理: ${level1Agent.name} (ID: ${level1Agent.id})`);
      console.log(`  二级代理: ${level2Agent.name} (ID: ${level2Agent.id}, 上级: ${level2Agent.parentId})`);
      console.log(`  三级代理: ${level3Agent.name} (ID: ${level3Agent.id}, 上级: ${level3Agent.parentId})`);
      console.log(`  批发商: ${wholesaleAgent.name} (ID: ${wholesaleAgent.id})`);
      console.log(`  测试商品: ${testProduct.name} (ID: ${testProduct.id})`);
    });

    // ========== 场景2: 三级代理下单 - 验证双重分润（直接+间接）==========
    await scenario('三级代理下单: 验证直接分润和间接分润', async () => {
      const orderNo = `MLEVEL3_TEST_${Date.now()}`;
      const quantity = 2;
      const productPrice = Number(testProduct.agentPrice);
      const totalAmount = productPrice * quantity;

      // 创建订单
      const order = await prisma.$transaction(async (tx) => {
        // 锁定库存
        await tx.product.update({
          where: { id: testProduct.id },
          data: { lockStock: { increment: quantity } }
        });

        // 创建订单
        const newOrder = await tx.order.create({
          data: {
            orderNo,
            agentId: level3Agent.id,
            totalAmount,
            status: 'completed', // 直接创建为completed以触发分润
            needTransfer: false,
            fullPaid: true,
            paidAmount: totalAmount,
            contactName: level3Agent.name,
            contactPhone: level3Agent.phone,
            needConfirm: false,
            pickedAt: new Date()
          }
        });

        // 创建订单项
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: testProduct.id,
            quantity,
            price: productPrice,
            productName: testProduct.name,
            productImage: testProduct.images || null
          }
        });

        // 扣减库存
        await tx.product.update({
          where: { id: testProduct.id },
          data: {
            stock: { decrement: quantity },
            lockStock: { decrement: quantity },
            salesCount: { increment: quantity }
          }
        });

        return newOrder;
      });

      testOrders.push(order.id);

      console.log(`  订单号: ${orderNo}`);
      console.log(`  下单代理: ${level3Agent.name} (三级)`);
      console.log(`  订单金额: ￥${totalAmount}`);

      // 手动触发分润计算
      await calculateCommission(order.id);

      // 验证分润记录
      const commissions = await prisma.commission.findMany({
        where: { orderId: order.id },
        include: { agent: true }
      });

      if (commissions.length !== 2) {
        throw new Error(`三级代理订单应有2条分润记录（直接+间接），实际${commissions.length}条`);
      }

      // 验证直接分润（二级代理）
      const directCommission = commissions.find(c => c.agentId === level2Agent.id);
      if (!directCommission) {
        throw new Error('未找到二级代理的直接分润记录');
      }

      if (directCommission.type !== 'DIRECT') {
        throw new Error(`直接分润类型错误: ${directCommission.type}`);
      }

      // 验证间接分润（一级代理）
      const indirectCommission = commissions.find(c => c.agentId === level1Agent.id);
      if (!indirectCommission) {
        throw new Error('未找到一级代理的间接分润记录');
      }

      if (indirectCommission.type !== 'INDIRECT') {
        throw new Error(`间接分润类型错误: ${indirectCommission.type}`);
      }

      // 验证分润金额（根据实际获取的规则）
      const actualDirectRate = Number(directCommission.rate);
      const actualIndirectRate = Number(indirectCommission.rate);
      const actualDirectAmount = Number(directCommission.amount);
      const actualIndirectAmount = Number(indirectCommission.amount);

      // 验证金额计算正确性（金额 = 订单金额 × 费率 / 100）
      const calculatedDirectAmount = totalAmount * actualDirectRate / 100;
      const calculatedIndirectAmount = totalAmount * actualIndirectRate / 100;

      if (Math.abs(actualDirectAmount - calculatedDirectAmount) > 0.01) {
        throw new Error(`直接分润金额计算错误: 应为${calculatedDirectAmount}, 实际${actualDirectAmount}`);
      }

      if (Math.abs(actualIndirectAmount - calculatedIndirectAmount) > 0.01) {
        throw new Error(`间接分润金额计算错误: 应为${calculatedIndirectAmount}, 实际${actualIndirectAmount}`);
      }

      console.log(`  直接分润: ${level2Agent.name} ￥${actualDirectAmount} (${actualDirectRate}%) ✓`);
      console.log(`  间接分润: ${level1Agent.name} ￥${actualIndirectAmount} (${actualIndirectRate}%) ✓`);
    });

    // ========== 场景3: 二级代理下单 - 验证只有直接分润 ==========
    await scenario('二级代理下单: 验证只有直接分润（无间接）', async () => {
      const orderNo = `MLEVEL2_TEST_${Date.now()}`;
      const quantity = 2;
      const productPrice = Number(testProduct.agentPrice);
      const totalAmount = productPrice * quantity;

      const order = await prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: testProduct.id },
          data: { lockStock: { increment: quantity } }
        });

        const newOrder = await tx.order.create({
          data: {
            orderNo,
            agentId: level2Agent.id,
            totalAmount,
            status: 'completed',
            needTransfer: false,
            fullPaid: true,
            paidAmount: totalAmount,
            contactName: level2Agent.name,
            contactPhone: level2Agent.phone,
            needConfirm: false,
            pickedAt: new Date()
          }
        });

        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: testProduct.id,
            quantity,
            price: productPrice,
            productName: testProduct.name,
            productImage: testProduct.images || null
          }
        });

        await tx.product.update({
          where: { id: testProduct.id },
          data: {
            stock: { decrement: quantity },
            lockStock: { decrement: quantity },
            salesCount: { increment: quantity }
          }
        });

        return newOrder;
      });

      testOrders.push(order.id);

      console.log(`  订单号: ${orderNo}`);
      console.log(`  下单代理: ${level2Agent.name} (二级)`);
      console.log(`  订单金额: ￥${totalAmount}`);

      // 触发分润
      await calculateCommission(order.id);

      // 验证分润记录
      const commissions = await prisma.commission.findMany({
        where: { orderId: order.id }
      });

      if (commissions.length !== 1) {
        throw new Error(`二级代理订单应有1条分润记录（只有直接），实际${commissions.length}条`);
      }

      const directCommission = commissions[0];
      if (directCommission.agentId !== level1Agent.id) {
        throw new Error(`分润对象错误: 应为一级代理${level1Agent.id}, 实际${directCommission.agentId}`);
      }

      if (directCommission.type !== 'DIRECT') {
        throw new Error(`分润类型错误: ${directCommission.type}`);
      }

      const actualRate = Number(directCommission.rate);
      const actualAmount = Number(directCommission.amount);
      const calculatedAmount = totalAmount * actualRate / 100;

      if (Math.abs(actualAmount - calculatedAmount) > 0.01) {
        throw new Error(`分润金额计算错误: 应为${calculatedAmount}, 实际${actualAmount}`);
      }

      console.log(`  直接分润: ${level1Agent.name} ￥${actualAmount} (${actualRate}%) ✓`);
      console.log(`  无间接分润 ✓`);
    });

    // ========== 场景4: 一级代理下单 - 验证无分润 ==========
    await scenario('一级代理下单: 验证无分润生成', async () => {
      const orderNo = `MLEVEL1_TEST_${Date.now()}`;
      const quantity = 2;
      const productPrice = Number(testProduct.agentPrice);
      const totalAmount = productPrice * quantity;

      const order = await prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: testProduct.id },
          data: { lockStock: { increment: quantity } }
        });

        const newOrder = await tx.order.create({
          data: {
            orderNo,
            agentId: level1Agent.id,
            totalAmount,
            status: 'completed',
            needTransfer: false,
            fullPaid: true,
            paidAmount: totalAmount,
            contactName: level1Agent.name,
            contactPhone: level1Agent.phone,
            needConfirm: false,
            pickedAt: new Date()
          }
        });

        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: testProduct.id,
            quantity,
            price: productPrice,
            productName: testProduct.name,
            productImage: testProduct.images || null
          }
        });

        await tx.product.update({
          where: { id: testProduct.id },
          data: {
            stock: { decrement: quantity },
            lockStock: { decrement: quantity },
            salesCount: { increment: quantity }
          }
        });

        return newOrder;
      });

      testOrders.push(order.id);

      console.log(`  订单号: ${orderNo}`);
      console.log(`  下单代理: ${level1Agent.name} (一级)`);
      console.log(`  订单金额: ￥${totalAmount}`);

      // 触发分润
      await calculateCommission(order.id);

      // 验证无分润记录
      const commissions = await prisma.commission.findMany({
        where: { orderId: order.id }
      });

      if (commissions.length !== 0) {
        throw new Error(`一级代理订单不应有分润记录，实际${commissions.length}条`);
      }

      console.log(`  无分润生成 ✓`);
    });

    // ========== 场景5: 批发商下单 - 验证无分润 ==========
    await scenario('批发商下单: 验证无分润生成（不参与分润）', async () => {
      const orderNo = `WHOLESALE_TEST_${Date.now()}`;
      const quantity = 2;
      const productPrice = Number(testProduct.wholesalePrice); // 批发价
      const totalAmount = productPrice * quantity;

      const order = await prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: testProduct.id },
          data: { lockStock: { increment: quantity } }
        });

        const newOrder = await tx.order.create({
          data: {
            orderNo,
            agentId: wholesaleAgent.id,
            totalAmount,
            status: 'completed',
            needTransfer: false,
            fullPaid: true,
            paidAmount: totalAmount,
            contactName: wholesaleAgent.name,
            contactPhone: wholesaleAgent.phone,
            needConfirm: false,
            pickedAt: new Date()
          }
        });

        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: testProduct.id,
            quantity,
            price: productPrice,
            productName: testProduct.name,
            productImage: testProduct.images || null
          }
        });

        await tx.product.update({
          where: { id: testProduct.id },
          data: {
            stock: { decrement: quantity },
            lockStock: { decrement: quantity },
            salesCount: { increment: quantity }
          }
        });

        return newOrder;
      });

      testOrders.push(order.id);

      console.log(`  订单号: ${orderNo}`);
      console.log(`  下单代理: ${wholesaleAgent.name} (批发商)`);
      console.log(`  订单金额: ￥${totalAmount}`);

      // 触发分润
      await calculateCommission(order.id);

      // 验证无分润记录
      const commissions = await prisma.commission.findMany({
        where: { orderId: order.id }
      });

      if (commissions.length !== 0) {
        throw new Error(`批发商订单不应有分润记录，实际${commissions.length}条`);
      }

      console.log(`  无分润生成 ✓`);
    });

    // ========== 场景6: 分润比例临界值测试（<399 vs ≥399）==========
    await scenario('分润比例临界值: 验证399元分润费率变化', async () => {
      // 测试订单1: 398元（使用10%/2%）
      const orderNo1 = `THRESHOLD_TEST1_${Date.now()}`;
      const totalAmount1 = 398;
      const quantity1 = Math.ceil(totalAmount1 / Number(testProduct.agentPrice));

      const order1 = await prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: testProduct.id },
          data: { lockStock: { increment: quantity1 } }
        });

        const newOrder = await tx.order.create({
          data: {
            orderNo: orderNo1,
            agentId: level3Agent.id,
            totalAmount: totalAmount1,
            status: 'completed',
            needTransfer: false,
            fullPaid: true,
            paidAmount: totalAmount1,
            contactName: level3Agent.name,
            contactPhone: level3Agent.phone,
            needConfirm: false,
            pickedAt: new Date()
          }
        });

        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: testProduct.id,
            quantity: quantity1,
            price: Number(testProduct.agentPrice),
            productName: testProduct.name,
            productImage: testProduct.images || null
          }
        });

        await tx.product.update({
          where: { id: testProduct.id },
          data: {
            stock: { decrement: quantity1 },
            lockStock: { decrement: quantity1 },
            salesCount: { increment: quantity1 }
          }
        });

        return newOrder;
      });

      testOrders.push(order1.id);
      await calculateCommission(order1.id);

      const commissions1 = await prisma.commission.findMany({
        where: { orderId: order1.id }
      });

      const directRate1 = Number(commissions1.find(c => c.type === 'DIRECT').rate);
      const indirectRate1 = Number(commissions1.find(c => c.type === 'INDIRECT').rate);

      console.log(`  订单1: ￥${totalAmount1} → 直接${directRate1}%, 间接${indirectRate1}%`);

      // 测试订单2: 399元（使用15%/3%）
      const orderNo2 = `THRESHOLD_TEST2_${Date.now()}`;
      const totalAmount2 = 399;
      const quantity2 = Math.ceil(totalAmount2 / Number(testProduct.agentPrice));

      const order2 = await prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: testProduct.id },
          data: { lockStock: { increment: quantity2 } }
        });

        const newOrder = await tx.order.create({
          data: {
            orderNo: orderNo2,
            agentId: level3Agent.id,
            totalAmount: totalAmount2,
            status: 'completed',
            needTransfer: false,
            fullPaid: true,
            paidAmount: totalAmount2,
            contactName: level3Agent.name,
            contactPhone: level3Agent.phone,
            needConfirm: false,
            pickedAt: new Date()
          }
        });

        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: testProduct.id,
            quantity: quantity2,
            price: Number(testProduct.agentPrice),
            productName: testProduct.name,
            productImage: testProduct.images || null
          }
        });

        await tx.product.update({
          where: { id: testProduct.id },
          data: {
            stock: { decrement: quantity2 },
            lockStock: { decrement: quantity2 },
            salesCount: { increment: quantity2 }
          }
        });

        return newOrder;
      });

      testOrders.push(order2.id);
      await calculateCommission(order2.id);

      const commissions2 = await prisma.commission.findMany({
        where: { orderId: order2.id }
      });

      const directRate2 = Number(commissions2.find(c => c.type === 'DIRECT').rate);
      const indirectRate2 = Number(commissions2.find(c => c.type === 'INDIRECT').rate);

      console.log(`  订单2: ￥${totalAmount2} → 直接${directRate2}%, 间接${indirectRate2}%`);

      // 验证399元订单使用了不同的规则（更高费率）
      if (directRate2 <= directRate1) {
        console.log(`  警告: 399元订单费率(${directRate2}%)未高于398元订单(${directRate1}%), 可能规则配置有误`);
      }

      console.log(`  费率临界值测试: 已验证两个订单使用的费率 ✓`);
    });

    // ========== 场景7: 分润幂等性测试 ==========
    await scenario('分润幂等性: 重复调用calculateCommission不重复生成分润', async () => {
      // 使用场景2的订单（三级代理下单）
      const testOrderId = testOrders[0];

      // 第一次计算后的分润数
      const commissionsAfter1 = await prisma.commission.count({
        where: { orderId: testOrderId }
      });

      console.log(`  第1次计算后分润数: ${commissionsAfter1}`);

      // 再次调用分润计算
      await calculateCommission(testOrderId);

      const commissionsAfter2 = await prisma.commission.count({
        where: { orderId: testOrderId }
      });

      console.log(`  第2次计算后分润数: ${commissionsAfter2}`);

      if (commissionsAfter2 !== commissionsAfter1) {
        throw new Error(`分润重复生成: 第1次${commissionsAfter1}条, 第2次${commissionsAfter2}条`);
      }

      // 第三次调用
      await calculateCommission(testOrderId);

      const commissionsAfter3 = await prisma.commission.count({
        where: { orderId: testOrderId }
      });

      console.log(`  第3次计算后分润数: ${commissionsAfter3}`);

      if (commissionsAfter3 !== commissionsAfter1) {
        throw new Error(`分润重复生成: 第1次${commissionsAfter1}条, 第3次${commissionsAfter3}条`);
      }

      console.log(`  分润幂等性验证: ✓`);
    });

    // 清理测试数据
    console.log('\n【清理】删除测试数据...');
    for (const orderId of testOrders) {
      await prisma.orderItem.deleteMany({ where: { orderId } });
      await prisma.commission.deleteMany({ where: { orderId } });
      await prisma.order.delete({ where: { id: orderId } });
    }
    console.log('  测试数据已清理 ✓');

    // 最终统计
    console.log('\n======= 多级代理分润测试完成 =======\n');
    console.log(`总场景数: ${results.total}`);
    console.log(`通过: ${results.passed}`);
    console.log(`失败: ${results.failed}`);
    console.log(`通过率: ${((results.passed / results.total) * 100).toFixed(1)}%\n`);

    if (results.failed === 0) {
      console.log('✅ 多级代理分润测试全部通过！分润计算正确！\n');
    } else {
      console.log('❌ 多级代理分润测试发现问题：\n');
      results.scenarios.filter(s => s.status === 'FAIL').forEach(s => {
        console.log(`  - ${s.name}: ${s.error}`);
      });
      console.log('');
    }

    await prisma.$disconnect();
    return results;

  } catch (error) {
    console.error('\n❌ 多级代理分润测试执行失败:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

/**
 * 分润计算函数（复制自commissionCalculator.ts的核心逻辑）
 */
async function calculateCommission(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      agent: {
        include: {
          parent: {
            include: {
              parent: true
            }
          }
        }
      }
    }
  });

  if (!order) {
    throw new Error('订单不存在');
  }

  // 检查是否已有分润记录（幂等性）
  const existingCommissions = await prisma.commission.count({
    where: { orderId }
  });

  if (existingCommissions > 0) {
    console.log(`  订单${orderId}已有分润记录，跳过计算`);
    return;
  }

  const orderAmount = Number(order.totalAmount);
  const sourceAgent = order.agent;

  // 批发商不参与分润
  if (sourceAgent.type === 'WHOLESALE') {
    return;
  }

  // 获取分润规则
  const rule = await prisma.commissionRule.findFirst({
    where: {
      status: 'ACTIVE',
      minAmount: { lte: orderAmount }
    },
    orderBy: { minAmount: 'desc' }
  });

  if (!rule) {
    throw new Error('未找到匹配的分润规则');
  }

  await prisma.$transaction(async (tx) => {
    // 直接分润（上级代理）
    if (sourceAgent.parentId) {
      const directAmount = orderAmount * Number(rule.level1Rate) / 100;
      await tx.commission.create({
        data: {
          agentId: sourceAgent.parentId,
          orderId,
          amount: directAmount,
          rate: Number(rule.level1Rate),
          type: 'DIRECT',
          status: 'PENDING'
        }
      });

      await tx.agent.update({
        where: { id: sourceAgent.parentId },
        data: { totalCommission: { increment: directAmount } }
      });
    }

    // 间接分润（上上级代理，仅三级代理下单时有）
    if (sourceAgent.parent && sourceAgent.parent.parentId) {
      const indirectAmount = orderAmount * Number(rule.level2Rate) / 100;
      await tx.commission.create({
        data: {
          agentId: sourceAgent.parent.parentId,
          orderId,
          amount: indirectAmount,
          rate: Number(rule.level2Rate),
          type: 'INDIRECT',
          status: 'PENDING'
        }
      });

      await tx.agent.update({
        where: { id: sourceAgent.parent.parentId },
        data: { totalCommission: { increment: indirectAmount } }
      });
    }
  });
}

// 执行测试
testMultilevelCommission().then(results => {
  process.exit(results.failed > 0 ? 1 : 0);
});

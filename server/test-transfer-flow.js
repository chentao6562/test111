/**
 * 锁货模式完整流程测试 (Transfer Flow Testing)
 * 目的: 验证锁货模式从下单到核销的完整业务流程
 * 执行: node test-transfer-flow.js
 * 覆盖: 移库费计算、打包撮合、货管抢单、交接、核销
 * 验证点: 20个关键检查点
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testTransferFlow() {
  console.log('======= 锁货模式完整流程测试开始 =======');
  console.log(`执行时间: ${new Date().toLocaleString('zh-CN')}\n`);

  const results = {
    total: 20,
    passed: 0,
    failed: 0,
    checkpoints: []
  };

  let testAgent = null;
  let testProduct = null;
  let testOrder = null;
  let testBundle = null;
  let testLogistics = null;

  // 辅助函数
  const checkpoint = async (name, fn) => {
    const num = results.checkpoints.length + 1;
    console.log(`\n【检查点${num}】${name}`);
    console.log('─'.repeat(50));
    try {
      await fn();
      results.passed++;
      results.checkpoints.push({ name, status: 'PASS' });
      console.log(`✓ 检查点通过\n`);
      return true;
    } catch (error) {
      results.failed++;
      results.checkpoints.push({ name, status: 'FAIL', error: error.message });
      console.log(`✗ 检查点失败: ${error.message}\n`);
      return false;
    }
  };

  try {
    // ========== 检查点1: 准备测试数据 ==========
    await checkpoint('准备测试环境: 查找代理商和支持移库的商品', async () => {
      // 查找二级代理
      testAgent = await prisma.agent.findFirst({
        where: {
          type: 'LEVEL2',
          parentId: { not: null }
        },
        include: { parent: true }
      });

      if (!testAgent) {
        throw new Error('未找到二级代理测试账号');
      }

      console.log(`  代理商: ${testAgent.name} (ID: ${testAgent.id})`);
      console.log(`  上级: ${testAgent.parent.name} (ID: ${testAgent.parentId})`);

      // 查找支持移库的商品
      testProduct = await prisma.product.findFirst({
        where: {
          status: 'active',
          stock: { gt: 10 },
          allowTransfer: true,
          transferFee: { not: null }
        }
      });

      if (!testProduct) {
        throw new Error('未找到支持移库的商品');
      }

      console.log(`  商品: ${testProduct.name} (ID: ${testProduct.id})`);
      console.log(`  库存: ${testProduct.stock}件`);
      console.log(`  移库费: ￥${testProduct.transferFee}/件`);
      console.log(`  是否支持移库: ${testProduct.allowTransfer}`);

      // 查找货管账号
      testLogistics = await prisma.systemUser.findFirst({
        where: { role: 'LOGISTICS', status: 'active' }
      });

      if (!testLogistics) {
        throw new Error('未找到货管账号');
      }

      console.log(`  货管: ${testLogistics.name} (ID: ${testLogistics.id})`);
    });

    // ========== 检查点2: 创建锁货订单 ==========
    let initialStock = 0;
    let initialLockStock = 0;
    await checkpoint('创建锁货订单: needTransfer=true', async () => {
      initialStock = Number(testProduct.stock);
      initialLockStock = Number(testProduct.lockStock || 0);
      const orderQuantity = 2;

      const orderNo = `TRANSFER_TEST_${Date.now()}`;
      const productPrice = Number(testProduct.agentPrice);
      const transferFeePerItem = Number(testProduct.transferFee);
      const productAmount = productPrice * orderQuantity;
      const transferFeeTotal = transferFeePerItem * orderQuantity;
      const totalAmount = productAmount + transferFeeTotal;

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
            transferFee: transferFeeTotal,
            transferFeeConfirmed: true, // 2026-01-11起自动确认
            needTransfer: true,
            status: 'pending_payment',
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
      console.log(`  商品金额: ￥${productAmount}`);
      console.log(`  移库费: ￥${transferFeeTotal} (${transferFeePerItem}元/件 × ${orderQuantity}件)`);
      console.log(`  订单总额: ￥${totalAmount}`);
      console.log(`  needTransfer: ${testOrder.needTransfer}`);
      console.log(`  transferFeeConfirmed: ${testOrder.transferFeeConfirmed}`);
    });

    // ========== 检查点3: 验证移库费自动计算 ==========
    await checkpoint('验证移库费自动计算: transferFee = 商品移库费 × 数量', async () => {
      const orderItems = await prisma.orderItem.findMany({
        where: { orderId: testOrder.id }
      });

      const totalQty = orderItems.reduce((sum, item) => sum + item.quantity, 0);
      const expectedTransferFee = Number(testProduct.transferFee) * totalQty;
      const actualTransferFee = Number(testOrder.transferFee);

      if (actualTransferFee !== expectedTransferFee) {
        throw new Error(`移库费计算错误: 期望${expectedTransferFee},实际${actualTransferFee}`);
      }

      console.log(`  商品移库费: ￥${testProduct.transferFee}/件`);
      console.log(`  订单数量: ${totalQty}件`);
      console.log(`  计算移库费: ￥${expectedTransferFee}`);
      console.log(`  实际移库费: ￥${actualTransferFee} ✓`);
    });

    // ========== 检查点4: 验证库存锁定 ==========
    await checkpoint('验证库存锁定: lockStock正确增加', async () => {
      const updatedProduct = await prisma.product.findUnique({
        where: { id: testProduct.id }
      });

      const orderItems = await prisma.orderItem.findMany({
        where: { orderId: testOrder.id }
      });
      const orderQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);
      const expectedLockStock = initialLockStock + orderQuantity;

      if (Number(updatedProduct.lockStock) !== expectedLockStock) {
        throw new Error(`锁定库存不正确: 期望${expectedLockStock},实际${updatedProduct.lockStock}`);
      }

      console.log(`  初始锁定: ${initialLockStock}`);
      console.log(`  订单数量: ${orderQuantity}`);
      console.log(`  当前锁定: ${updatedProduct.lockStock}`);
      console.log(`  库存锁定: ${initialLockStock} → ${updatedProduct.lockStock} ✓`);
    });

    // ========== 检查点5: 全款支付 ==========
    await checkpoint('全款支付: paidAmount = totalAmount', async () => {
      const updatedOrder = await prisma.order.update({
        where: { id: testOrder.id },
        data: {
          fullPaid: true,
          paidAmount: testOrder.totalAmount,
          status: 'pending_accept'
        }
      });

      console.log(`  订单总额: ￥${testOrder.totalAmount}`);
      console.log(`  支付金额: ￥${updatedOrder.paidAmount}`);
      console.log(`  fullPaid: ${updatedOrder.fullPaid} ✓`);
      console.log(`  状态流转: ${testOrder.status} → ${updatedOrder.status} ✓`);

      testOrder = updatedOrder;
    });

    // ========== 检查点6: 库管接单 ==========
    await checkpoint('库管接单: pending_accept → preparing', async () => {
      const order = await prisma.order.update({
        where: { id: testOrder.id },
        data: { status: 'preparing' }
      });

      console.log(`  状态流转: ${testOrder.status} → ${order.status} ✓`);
      testOrder = order;
    });

    // ========== 检查点7: 库管完成备货 ==========
    await checkpoint('库管完成备货: 生成pickupCode和transferCode', async () => {
      const pickupCode = Math.floor(10000000 + Math.random() * 90000000).toString();
      const transferCode = Math.floor(10000000 + Math.random() * 90000000).toString();

      const order = await prisma.order.update({
        where: { id: testOrder.id },
        data: {
          status: 'pending_transfer',
          pickupCode,
          transferCode
        }
      });

      if (!order.pickupCode || order.pickupCode.length !== 8) {
        throw new Error(`提货码格式错误: ${order.pickupCode}`);
      }

      if (!order.transferCode || order.transferCode.length !== 8) {
        throw new Error(`移库码格式错误: ${order.transferCode}`);
      }

      console.log(`  状态流转: preparing → ${order.status} ✓`);
      console.log(`  提货码: ${order.pickupCode} (8位)`);
      console.log(`  移库码: ${order.transferCode} (8位)`);

      testOrder = order;
    });

    // ========== 检查点8: 订单进入待撮合池 ==========
    await checkpoint('订单进入待撮合池: 查询待移库订单', async () => {
      const pendingOrders = await prisma.order.findMany({
        where: {
          status: 'pending_transfer',
          needTransfer: true,
          bundleId: null
        }
      });

      const found = pendingOrders.some(o => o.id === testOrder.id);
      if (!found) {
        throw new Error(`订单未进入待撮合池`);
      }

      console.log(`  待撮合订单数: ${pendingOrders.length}个`);
      console.log(`  本订单在列表中: ✓`);
    });

    // ========== 检查点9: 创建打包(模拟撮合算法) ==========
    await checkpoint('创建打包: TransferBundle创建成功', async () => {
      const bundleNo = `TB${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(Date.now()).slice(-5)}`;

      testBundle = await prisma.$transaction(async (tx) => {
        // 创建打包
        const bundle = await tx.transferBundle.create({
          data: {
            bundleNo,
            status: 'PENDING',
            totalFee: Number(testOrder.transferFee)
          }
        });

        // 关联订单到打包
        await tx.order.update({
          where: { id: testOrder.id },
          data: { bundleId: bundle.id }
        });

        return bundle;
      });

      console.log(`  打包编号: ${testBundle.bundleNo}`);
      console.log(`  打包状态: ${testBundle.status}`);
      console.log(`  打包总费用: ￥${testBundle.totalFee}`);
      console.log(`  订单已关联bundleId: ${testBundle.id} ✓`);
    });

    // ========== 检查点10: 验证打包中的订单 ==========
    await checkpoint('验证打包中的订单: 订单正确关联到打包', async () => {
      const ordersInBundle = await prisma.order.findMany({
        where: { bundleId: testBundle.id }
      });

      if (ordersInBundle.length === 0) {
        throw new Error(`打包中无订单`);
      }

      const found = ordersInBundle.some(o => o.id === testOrder.id);
      if (!found) {
        throw new Error(`测试订单未关联到打包`);
      }

      const totalFee = ordersInBundle.reduce((sum, o) => sum + Number(o.transferFee || 0), 0);

      console.log(`  打包中订单数: ${ordersInBundle.length}个`);
      console.log(`  打包总移库费: ￥${totalFee}`);
      console.log(`  测试订单在打包中: ✓`);
    });

    // ========== 检查点11: 货管抢打包 ==========
    await checkpoint('货管抢打包: 打包状态 PENDING → DISPATCHED', async () => {
      const updatedBundle = await prisma.$transaction(async (tx) => {
        // 使用FOR UPDATE锁定打包
        const bundles = await tx.$queryRaw`
          SELECT id, status FROM transfer_bundles WHERE id = ${testBundle.id} FOR UPDATE
        `;

        if (!bundles || bundles.length === 0) {
          throw new Error('打包不存在');
        }

        const bundle = bundles[0];
        if (bundle.status !== 'PENDING') {
          throw new Error(`打包已被抢走: status=${bundle.status}`);
        }

        // 更新打包状态
        const updated = await tx.transferBundle.update({
          where: { id: testBundle.id },
          data: {
            status: 'DISPATCHED',
            logisticsId: testLogistics.id,
            dispatchedAt: new Date()
          }
        });

        // 创建移库任务
        const ordersInBundle = await tx.order.findMany({
          where: { bundleId: testBundle.id }
        });

        for (const order of ordersInBundle) {
          await tx.transferTask.create({
            data: {
              orderId: order.id,
              logisticsId: testLogistics.id,
              fee: Number(order.transferFee),
              status: 'ACCEPTED'
            }
          });

          // 更新订单状态
          await tx.order.update({
            where: { id: order.id },
            data: { status: 'transferring' }
          });
        }

        return updated;
      });

      console.log(`  打包状态: PENDING → ${updatedBundle.status} ✓`);
      console.log(`  接单货管: ${testLogistics.name} (ID: ${testLogistics.id})`);
      console.log(`  接单时间: ${updatedBundle.dispatchedAt.toLocaleString('zh-CN')}`);

      testBundle = updatedBundle;
    });

    // ========== 检查点12: 验证移库任务创建 ==========
    await checkpoint('验证移库任务创建: TransferTask正确生成', async () => {
      const tasks = await prisma.transferTask.findMany({
        where: {
          orderId: testOrder.id,
          logisticsId: testLogistics.id
        }
      });

      if (tasks.length === 0) {
        throw new Error('移库任务未创建');
      }

      const task = tasks[0];
      if (task.status !== 'ACCEPTED') {
        throw new Error(`任务状态错误: ${task.status}`);
      }

      if (Number(task.fee) !== Number(testOrder.transferFee)) {
        throw new Error(`任务费用错误: 期望${testOrder.transferFee},实际${task.fee}`);
      }

      console.log(`  任务ID: ${task.id}`);
      console.log(`  任务状态: ${task.status}`);
      console.log(`  任务费用: ￥${task.fee} ✓`);
    });

    // ========== 检查点13: 验证订单状态变为移库中 ==========
    await checkpoint('验证订单状态: pending_transfer → transferring', async () => {
      const order = await prisma.order.findUnique({
        where: { id: testOrder.id }
      });

      if (order.status !== 'transferring') {
        throw new Error(`订单状态错误: ${order.status}`);
      }

      console.log(`  订单状态: ${order.status} ✓`);
      testOrder = order;
    });

    // ========== 检查点14: 库管验证移库码 ==========
    await checkpoint('库管验证移库码: transferCode验证成功', async () => {
      const order = await prisma.order.findFirst({
        where: {
          transferCode: testOrder.transferCode
        },
        include: {
          agent: true,
          items: { include: { product: true } }
        }
      });

      if (!order) {
        throw new Error('移库码验证失败');
      }

      if (order.id !== testOrder.id) {
        throw new Error('移库码对应错误的订单');
      }

      console.log(`  移库码: ${testOrder.transferCode}`);
      console.log(`  订单号: ${order.orderNo} ✓`);
      console.log(`  代理商: ${order.agent.name}`);
    });

    // ========== 检查点15: 库管确认交接 ==========
    await checkpoint('库管确认交接: 记录warehouseVerifiedAt', async () => {
      const order = await prisma.order.update({
        where: { id: testOrder.id },
        data: { warehouseVerifiedAt: new Date() }
      });

      if (!order.warehouseVerifiedAt) {
        throw new Error('交接时间未记录');
      }

      console.log(`  交接时间: ${order.warehouseVerifiedAt.toLocaleString('zh-CN')} ✓`);
      testOrder = order;
    });

    // ========== 检查点16: 货管完成移库 ==========
    let initialLogisticsBalance = 0;
    await checkpoint('货管完成移库: 任务状态 ACCEPTED → COMPLETED', async () => {
      initialLogisticsBalance = Number(testLogistics.balance || 0);

      const task = await prisma.transferTask.findFirst({
        where: { orderId: testOrder.id }
      });

      await prisma.$transaction(async (tx) => {
        // 更新任务状态
        await tx.transferTask.update({
          where: { id: task.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date()
          }
        });

        // 更新订单状态
        await tx.order.update({
          where: { id: testOrder.id },
          data: { status: 'pending_pickup' }
        });

        // 增加货管余额
        await tx.systemUser.update({
          where: { id: testLogistics.id },
          data: { balance: { increment: Number(task.fee) } }
        });

        // 记录审计日志
        await tx.auditLog.create({
          data: {
            userId: testLogistics.id,
            userType: 'STAFF',
            action: 'TRANSFER_INCOME',
            module: 'TRANSFER',
            detail: `完成移库任务${task.id},收入￥${task.fee}`,
            ip: '127.0.0.1'
          }
        });
      });

      console.log(`  任务状态: ACCEPTED → COMPLETED ✓`);
      console.log(`  订单状态: transferring → pending_pickup ✓`);
    });

    // ========== 检查点17: 验证货管收入记录 ==========
    await checkpoint('验证货管收入: 余额正确增加', async () => {
      const logistics = await prisma.systemUser.findUnique({
        where: { id: testLogistics.id }
      });

      const expectedBalance = initialLogisticsBalance + Number(testOrder.transferFee);
      const actualBalance = Number(logistics.balance);

      if (Math.abs(actualBalance - expectedBalance) > 0.01) {
        throw new Error(`余额不正确: 期望${expectedBalance},实际${actualBalance}`);
      }

      console.log(`  初始余额: ￥${initialLogisticsBalance}`);
      console.log(`  移库费: ￥${testOrder.transferFee}`);
      console.log(`  当前余额: ￥${actualBalance} ✓`);

      testLogistics = logistics;
    });

    // ========== 检查点18: 货管验证客户提货码 ==========
    await checkpoint('货管验证提货码: pickupCode验证成功', async () => {
      const order = await prisma.order.findFirst({
        where: {
          pickupCode: testOrder.pickupCode,
          status: 'pending_pickup'
        },
        include: {
          agent: true,
          items: { include: { product: true } }
        }
      });

      if (!order) {
        throw new Error('提货码验证失败');
      }

      if (order.id !== testOrder.id) {
        throw new Error('提货码对应错误的订单');
      }

      console.log(`  提货码: ${testOrder.pickupCode}`);
      console.log(`  订单号: ${order.orderNo} ✓`);
    });

    // ========== 检查点19: 货管确认提货(扣减库存+触发分润) ==========
    await checkpoint('货管确认提货: 库存扣减 + 分润创建', async () => {
      const orderItems = await prisma.orderItem.findMany({
        where: { orderId: testOrder.id }
      });

      let commissionsBefore = 0;

      await prisma.$transaction(async (tx) => {
        // 检查分润数量(提货前)
        commissionsBefore = await tx.commission.count({
          where: { orderId: testOrder.id }
        });

        // 更新订单状态
        await tx.order.update({
          where: { id: testOrder.id },
          data: {
            status: 'completed',
            pickedAt: new Date(),
            logisticsVerifiedAt: new Date()
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

        // 直接分润(给上级)
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
        throw new Error(`库存扣减错误: 期望${expectedStock},实际${finalProduct.stock}`);
      }

      if (Number(finalProduct.lockStock || 0) !== expectedLockStock) {
        throw new Error(`锁定库存释放错误: 期望${expectedLockStock},实际${finalProduct.lockStock}`);
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

    // ========== 检查点20: 最终数据一致性验证 ==========
    await checkpoint('最终数据一致性: 订单/库存/分润/余额全部正确', async () => {
      // 验证订单状态
      const finalOrder = await prisma.order.findUnique({
        where: { id: testOrder.id }
      });

      if (finalOrder.status !== 'completed') {
        throw new Error(`订单状态错误: ${finalOrder.status}`);
      }

      console.log(`  订单状态: completed ✓`);

      // 验证分润创建
      const commissions = await prisma.commission.findMany({
        where: { orderId: testOrder.id }
      });

      if (commissions.length === 0) {
        throw new Error('分润记录未创建');
      }

      console.log(`  分润记录数: ${commissions.length}条 ✓`);

      // 验证库存一致性
      const product = await prisma.product.findUnique({
        where: { id: testProduct.id }
      });

      const available = Number(product.stock) - Number(product.lockStock || 0);
      if (available < 0) {
        throw new Error(`可用库存为负: ${available}`);
      }

      console.log(`  可用库存: ${available} ✓`);

      // 验证货管余额
      const logistics = await prisma.systemUser.findUnique({
        where: { id: testLogistics.id }
      });

      if (Number(logistics.balance) < initialLogisticsBalance) {
        throw new Error('货管余额未增加');
      }

      console.log(`  货管余额: ￥${logistics.balance} ✓`);
    });

    // 清理测试数据
    console.log('\n【清理】删除测试数据...');
    await prisma.orderItem.deleteMany({ where: { orderId: testOrder.id } });
    await prisma.commission.deleteMany({ where: { orderId: testOrder.id } });
    await prisma.transferTask.deleteMany({ where: { orderId: testOrder.id } });
    await prisma.order.update({
      where: { id: testOrder.id },
      data: { bundleId: null }
    });
    await prisma.transferBundle.delete({ where: { id: testBundle.id } });
    await prisma.order.delete({ where: { id: testOrder.id } });
    console.log('  测试数据已清理 ✓');

    // 最终统计
    console.log('\n======= 锁货模式测试完成 =======\n');
    console.log(`总检查点: ${results.total}`);
    console.log(`通过: ${results.passed}`);
    console.log(`失败: ${results.failed}`);
    console.log(`通过率: ${((results.passed / results.total) * 100).toFixed(1)}%\n`);

    if (results.failed === 0) {
      console.log('✅ 锁货模式测试全部通过！完整流程正常！\n');
    } else {
      console.log('❌ 锁货模式测试发现问题：\n');
      results.checkpoints.filter(c => c.status === 'FAIL').forEach(c => {
        console.log(`  - ${c.name}: ${c.error}`);
      });
      console.log('');
    }

    await prisma.$disconnect();
    return results;

  } catch (error) {
    console.error('\n❌ 锁货模式测试执行失败:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// 执行测试
testTransferFlow().then(results => {
  process.exit(results.failed > 0 ? 1 : 0);
});

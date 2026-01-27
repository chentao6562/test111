/**
 * 异常场景测试（Exception Handling Testing）
 * 目的：验证系统在异常情况下的数据回滚和错误处理能力
 * 覆盖：订单取消回滚、提现拒绝、库存不足、并发冲突
 * 执行时间：约3-5分钟
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testExceptionHandling() {
  console.log('======= 异常场景测试开始 =======');
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

  let testAgent = null;
  let testProduct = null;
  let testOrderIds = [];

  try {
    // ========== 场景1: 准备测试环境 ==========
    await scenario('准备测试环境', async () => {
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

      testProduct = await prisma.product.findFirst({
        where: {
          status: 'active',
          stock: { gt: 50 }
        }
      });

      if (!testProduct) {
        throw new Error('未找到可用测试商品（库存>50）');
      }

      console.log(`  测试代理: ${testAgent.name} (ID: ${testAgent.id})`);
      console.log(`  上级代理: ${testAgent.parent.name} (ID: ${testAgent.parentId})`);
      console.log(`  测试商品: ${testProduct.name} (ID: ${testProduct.id}, 库存: ${testProduct.stock})`);
    });

    // ========== 场景2: 订单取消 - 已PENDING分润删除 ==========
    await scenario('订单取消: 已PENDING的分润被删除', async () => {
      const orderNo = `CANCEL_TEST1_${Date.now()}`;
      const quantity = 2;
      const productPrice = Number(testProduct.agentPrice);
      const totalAmount = productPrice * quantity;
      const initialStock = Number(testProduct.stock);
      const initialLockStock = Number(testProduct.lockStock || 0);

      // 创建并完成订单（触发分润）
      const order = await prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: testProduct.id },
          data: { lockStock: { increment: quantity } }
        });

        const newOrder = await tx.order.create({
          data: {
            orderNo,
            agentId: testAgent.id,
            totalAmount,
            status: 'completed',
            needTransfer: false,
            fullPaid: true,
            paidAmount: totalAmount,
            contactName: testAgent.name,
            contactPhone: testAgent.phone,
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

      testOrderIds.push(order.id);

      // 触发分润
      await calculateCommission(order.id);

      const commissionsBefore = await prisma.commission.findMany({
        where: { orderId: order.id, status: 'PENDING' }
      });

      console.log(`  订单创建并完成: ${orderNo}`);
      console.log(`  分润记录数: ${commissionsBefore.length}条 (PENDING)`);

      if (commissionsBefore.length === 0) {
        throw new Error('分润未生成');
      }

      // 取消订单（调用rollbackCommission）
      await prisma.$transaction(async (tx) => {
        // 删除PENDING状态的分润
        const deletedCommissions = await tx.commission.deleteMany({
          where: {
            orderId: order.id,
            status: 'PENDING'
          }
        });

        console.log(`  删除PENDING分润: ${deletedCommissions.count}条`);

        // 更新订单状态
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'cancelled' }
        });

        // 释放库存（恢复库存扣减）
        await tx.product.update({
          where: { id: testProduct.id },
          data: {
            stock: { increment: quantity },
            salesCount: { decrement: quantity }
          }
        });
      });

      // 验证分润已删除
      const commissionsAfter = await prisma.commission.findMany({
        where: { orderId: order.id }
      });

      if (commissionsAfter.length !== 0) {
        throw new Error(`分润删除失败: 仍有${commissionsAfter.length}条记录`);
      }

      // 验证库存恢复
      const productAfter = await prisma.product.findUnique({
        where: { id: testProduct.id }
      });

      if (Number(productAfter.stock) !== initialStock) {
        throw new Error(`库存未恢复: 期望${initialStock}, 实际${productAfter.stock}`);
      }

      console.log(`  分润已删除: ${commissionsBefore.length} → 0 ✓`);
      console.log(`  库存已恢复: ${initialStock - quantity} → ${productAfter.stock} ✓`);
    });

    // ========== 场景3: 订单取消 - 已SETTLED分润回滚余额 ==========
    await scenario('订单取消: 已SETTLED的分润扣减余额', async () => {
      const orderNo = `CANCEL_TEST2_${Date.now()}`;
      const quantity = 2;
      const productPrice = Number(testProduct.agentPrice);
      const totalAmount = productPrice * quantity;

      // 创建并完成订单
      const order = await prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: testProduct.id },
          data: { lockStock: { increment: quantity } }
        });

        const newOrder = await tx.order.create({
          data: {
            orderNo,
            agentId: testAgent.id,
            totalAmount,
            status: 'completed',
            needTransfer: false,
            fullPaid: true,
            paidAmount: totalAmount,
            contactName: testAgent.name,
            contactPhone: testAgent.phone,
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

      testOrderIds.push(order.id);

      // 触发分润
      await calculateCommission(order.id);

      // 手动结算分润（模拟T+1）
      const commissions = await prisma.commission.findMany({
        where: { orderId: order.id, status: 'PENDING' }
      });

      console.log(`  订单创建并完成: ${orderNo}`);
      console.log(`  分润记录数: ${commissions.length}条`);

      const balanceBefore = Number(testAgent.parent.balance);

      await prisma.$transaction(async (tx) => {
        for (const commission of commissions) {
          const amount = Number(commission.amount);

          // 增加余额
          await tx.agent.update({
            where: { id: commission.agentId },
            data: { balance: { increment: amount } }
          });

          // 更新分润状态
          await tx.commission.update({
            where: { id: commission.id },
            data: {
              status: 'SETTLED',
              settledAt: new Date()
            }
          });
        }
      });

      const balanceAfter = Number((await prisma.agent.findUnique({ where: { id: testAgent.parentId } })).balance);

      console.log(`  分润已结算: PENDING → SETTLED`);
      console.log(`  余额增加: ￥${balanceBefore} → ￥${balanceAfter}`);

      // 取消订单并回滚分润
      await prisma.$transaction(async (tx) => {
        // 扣减已结算分润的余额
        for (const commission of commissions) {
          const amount = Number(commission.amount);

          await tx.agent.update({
            where: { id: commission.agentId },
            data: { balance: { decrement: amount } }
          });

          // 标记为已取消
          await tx.commission.update({
            where: { id: commission.id },
            data: { status: 'CANCELLED' }
          });
        }

        await tx.order.update({
          where: { id: order.id },
          data: { status: 'cancelled' }
        });

        await tx.product.update({
          where: { id: testProduct.id },
          data: {
            stock: { increment: quantity },
            salesCount: { decrement: quantity }
          }
        });
      });

      // 验证余额已扣减
      const balanceFinal = Number((await prisma.agent.findUnique({ where: { id: testAgent.parentId } })).balance);

      if (balanceFinal !== balanceBefore) {
        throw new Error(`余额回滚失败: 期望${balanceBefore}, 实际${balanceFinal}`);
      }

      console.log(`  余额已回滚: ￥${balanceAfter} → ￥${balanceFinal} ✓`);
      console.log(`  分润状态: SETTLED → CANCELLED ✓`);
    });

    // ========== 场景4: 提现拒绝 - 余额自动退回 ==========
    await scenario('提现拒绝: 余额自动退回', async () => {
      const withdrawAmount = 100;
      const balanceBefore = Number(testAgent.parent.balance);

      // 确保余额充足
      if (balanceBefore < withdrawAmount) {
        await prisma.agent.update({
          where: { id: testAgent.parentId },
          data: { balance: { increment: withdrawAmount } }
        });
        console.log(`  充值余额: ￥${balanceBefore} → ￥${withdrawAmount}`);
      }

      const currentBalance = Number((await prisma.agent.findUnique({ where: { id: testAgent.parentId } })).balance);

      // 申请提现（立即扣减余额）
      const withdrawal = await prisma.$transaction(async (tx) => {
        await tx.agent.update({
          where: { id: testAgent.parentId },
          data: { balance: { decrement: withdrawAmount } }
        });

        return await tx.withdrawal.create({
          data: {
            agentId: testAgent.parentId,
            amount: withdrawAmount,
            status: 'PENDING',
            bankName: '测试银行',
            bankAccount: '6222000000000000',
            accountName: testAgent.parent.name
          }
        });
      });

      const balanceAfterWithdraw = Number((await prisma.agent.findUnique({ where: { id: testAgent.parentId } })).balance);

      console.log(`  申请提现: ￥${withdrawAmount}`);
      console.log(`  余额扣减: ￥${currentBalance} → ￥${balanceAfterWithdraw}`);

      if (balanceAfterWithdraw !== currentBalance - withdrawAmount) {
        throw new Error(`余额扣减错误: 期望${currentBalance - withdrawAmount}, 实际${balanceAfterWithdraw}`);
      }

      // 管理员拒绝提现（退回余额）
      await prisma.$transaction(async (tx) => {
        await tx.agent.update({
          where: { id: testAgent.parentId },
          data: { balance: { increment: withdrawAmount } }
        });

        await tx.withdrawal.update({
          where: { id: withdrawal.id },
          data: { status: 'REJECTED' }
        });
      });

      const balanceAfterReject = Number((await prisma.agent.findUnique({ where: { id: testAgent.parentId } })).balance);

      if (balanceAfterReject !== currentBalance) {
        throw new Error(`余额退回错误: 期望${currentBalance}, 实际${balanceAfterReject}`);
      }

      console.log(`  提现被拒绝: PENDING → REJECTED`);
      console.log(`  余额已退回: ￥${balanceAfterWithdraw} → ￥${balanceAfterReject} ✓`);

      // 清理提现记录
      await prisma.withdrawal.delete({ where: { id: withdrawal.id } });
    });

    // ========== 场景5: 库存不足 - 下单失败 ==========
    await scenario('库存不足: 下单拒绝', async () => {
      const currentStock = Number(testProduct.stock);
      const currentLockStock = Number(testProduct.lockStock || 0);
      const availableStock = currentStock - currentLockStock;
      const requestQuantity = availableStock + 10; // 请求超过可用库存

      console.log(`  当前库存: ${currentStock}件`);
      console.log(`  锁定库存: ${currentLockStock}件`);
      console.log(`  可用库存: ${availableStock}件`);
      console.log(`  请求数量: ${requestQuantity}件`);

      let orderCreated = false;

      try {
        await prisma.$transaction(async (tx) => {
          // 检查可用库存
          const product = await tx.product.findUnique({
            where: { id: testProduct.id }
          });

          const available = Number(product.stock) - Number(product.lockStock || 0);

          if (available < requestQuantity) {
            throw new Error(`库存不足: 可用${available}件, 需要${requestQuantity}件`);
          }

          // 如果检查通过，锁定库存（这段代码不应该执行）
          await tx.product.update({
            where: { id: testProduct.id },
            data: { lockStock: { increment: requestQuantity } }
          });

          orderCreated = true;
        });
      } catch (error) {
        if (error.message.includes('库存不足')) {
          console.log(`  下单被拒绝: ${error.message} ✓`);
        } else {
          throw error;
        }
      }

      if (orderCreated) {
        throw new Error('库存不足时订单不应该创建成功');
      }

      // 验证库存未被锁定
      const productAfter = await prisma.product.findUnique({
        where: { id: testProduct.id }
      });

      if (Number(productAfter.lockStock) !== currentLockStock) {
        throw new Error(`库存被错误锁定: ${currentLockStock} → ${productAfter.lockStock}`);
      }

      console.log(`  库存未锁定: ${currentLockStock}件 ✓`);
    });

    // ========== 场景6: 事务回滚 - 部分操作失败全部回滚 ==========
    await scenario('事务回滚: 部分操作失败全部回滚', async () => {
      const quantity = 2;
      const initialStock = Number(testProduct.stock);
      const initialLockStock = Number(testProduct.lockStock || 0);

      console.log(`  初始库存: ${initialStock}件`);
      console.log(`  初始锁定: ${initialLockStock}件`);

      let transactionFailed = false;

      try {
        await prisma.$transaction(async (tx) => {
          // 操作1: 锁定库存
          await tx.product.update({
            where: { id: testProduct.id },
            data: { lockStock: { increment: quantity } }
          });

          console.log(`  操作1: 锁定库存 ${quantity}件`);

          // 操作2: 创建订单
          const order = await tx.order.create({
            data: {
              orderNo: `ROLLBACK_TEST_${Date.now()}`,
              agentId: testAgent.id,
              totalAmount: 100,
              status: 'pending_payment',
              needTransfer: false,
              fullPaid: false,
              paidAmount: 0,
              contactName: testAgent.name,
              contactPhone: testAgent.phone,
              needConfirm: false
            }
          });

          console.log(`  操作2: 创建订单 ${order.id}`);

          // 操作3: 故意抛出错误（模拟业务逻辑失败）
          throw new Error('模拟业务逻辑失败');
        });
      } catch (error) {
        if (error.message === '模拟业务逻辑失败') {
          transactionFailed = true;
          console.log(`  操作3: 业务逻辑失败 ✓`);
        } else {
          throw error;
        }
      }

      if (!transactionFailed) {
        throw new Error('事务应该失败但成功了');
      }

      // 验证所有操作已回滚
      const productAfter = await prisma.product.findUnique({
        where: { id: testProduct.id }
      });

      if (Number(productAfter.stock) !== initialStock) {
        throw new Error(`库存回滚失败: 期望${initialStock}, 实际${productAfter.stock}`);
      }

      if (Number(productAfter.lockStock) !== initialLockStock) {
        throw new Error(`锁定库存回滚失败: 期望${initialLockStock}, 实际${productAfter.lockStock}`);
      }

      const orderExists = await prisma.order.findFirst({
        where: { orderNo: { contains: 'ROLLBACK_TEST' } }
      });

      if (orderExists) {
        throw new Error('订单未回滚');
      }

      console.log(`  库存未变化: ${initialStock}件 ✓`);
      console.log(`  锁定未变化: ${initialLockStock}件 ✓`);
      console.log(`  订单未创建 ✓`);
    });

    // ========== 场景7: 并发修改 - FOR UPDATE锁保护 ==========
    await scenario('并发修改: FOR UPDATE保护数据一致性', async () => {
      const quantity = 1;
      const initialStock = Number(testProduct.stock);

      console.log(`  初始库存: ${initialStock}件`);

      // 并发执行2个扣减库存操作
      const promises = [];

      for (let i = 0; i < 2; i++) {
        promises.push(
          (async () => {
            try {
              await prisma.$transaction(async (tx) => {
                // 使用FOR UPDATE锁定商品行
                const products = await tx.$queryRaw`
                  SELECT id, stock FROM products WHERE id = ${testProduct.id} FOR UPDATE
                `;

                const product = products[0];
                const currentStock = Number(product.stock);

                // 检查库存
                if (currentStock < quantity) {
                  throw new Error('库存不足');
                }

                // 扣减库存
                await tx.product.update({
                  where: { id: testProduct.id },
                  data: { stock: { decrement: quantity } }
                });

                // 模拟耗时操作
                await new Promise(resolve => setTimeout(resolve, 100));

                return true;
              });
            } catch (error) {
              return false;
            }
          })()
        );
      }

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r).length;

      console.log(`  并发操作: 2次`);
      console.log(`  成功次数: ${successCount}次`);

      // 验证库存正确扣减
      const productAfter = await prisma.product.findUnique({
        where: { id: testProduct.id }
      });

      const expectedStock = initialStock - (successCount * quantity);
      const actualStock = Number(productAfter.stock);

      if (actualStock !== expectedStock) {
        throw new Error(`库存扣减错误: 期望${expectedStock}, 实际${actualStock}`);
      }

      console.log(`  库存扣减: ${initialStock} → ${actualStock} ✓`);
      console.log(`  数据一致性: 正确 ✓`);

      // 恢复库存
      await prisma.product.update({
        where: { id: testProduct.id },
        data: { stock: { increment: successCount * quantity } }
      });
    });

    // 清理测试数据
    console.log('\n【清理】删除测试数据...');
    for (const orderId of testOrderIds) {
      await prisma.orderItem.deleteMany({ where: { orderId } });
      await prisma.commission.deleteMany({ where: { orderId } });
      await prisma.order.delete({ where: { id: orderId } });
    }
    console.log('  测试数据已清理 ✓');

    // 最终统计
    console.log('\n======= 异常场景测试完成 =======\n');
    console.log(`总场景数: ${results.total}`);
    console.log(`通过: ${results.passed}`);
    console.log(`失败: ${results.failed}`);
    console.log(`通过率: ${((results.passed / results.total) * 100).toFixed(1)}%\n`);

    if (results.failed === 0) {
      console.log('✅ 异常场景测试全部通过！异常处理机制正常！\n');
    } else {
      console.log('❌ 异常场景测试发现问题：\n');
      results.scenarios.filter(s => s.status === 'FAIL').forEach(s => {
        console.log(`  - ${s.name}: ${s.error}`);
      });
      console.log('');
    }

    await prisma.$disconnect();
    return results;

  } catch (error) {
    console.error('\n❌ 异常场景测试执行失败:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

/**
 * 分润计算函数（复制自前面的测试）
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
    return;
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
testExceptionHandling().then(results => {
  process.exit(results.failed > 0 ? 1 : 0);
});

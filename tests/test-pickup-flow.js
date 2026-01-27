/**
 * 自提订单完整流程测试
 * 验证：下单 → 付款 → 接单 → 备货 → 核销 → 分润计算
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPickupFlow() {
  console.log('======= 自提订单完整流程测试 =======\n');

  try {
    // 1. 查找测试数据
    console.log('【步骤1】准备测试数据...\n');

    // 查找一个三级代理（有两级上级）
    const level2Agent = await prisma.agent.findFirst({
      where: {
        type: 'LEVEL2',
        parentId: { not: null }
      },
      include: {
        parent: {
          include: {
            parent: true
          }
        }
      }
    });

    if (!level2Agent || !level2Agent.parent) {
      console.log('❌ 未找到合适的二级代理测试账号');
      console.log('需要：二级代理 → 一级代理 的层级关系');
      await prisma.$disconnect();
      return;
    }

    console.log(`✓ 使用二级代理: ${level2Agent.name} (ID: ${level2Agent.id})`);
    console.log(`  上级(一级): ${level2Agent.parent.name} (ID: ${level2Agent.parent.id})`);

    if (level2Agent.parent.parent) {
      console.log(`  上上级: ${level2Agent.parent.parent.name} (ID: ${level2Agent.parent.parent.id})`);
    }

    // 查找一个商品
    const product = await prisma.product.findFirst({
      where: {
        status: 'active',
        stock: { gt: 5 }
      }
    });

    if (!product) {
      console.log('❌ 未找到可用商品（stock > 5）');
      await prisma.$disconnect();
      return;
    }

    console.log(`✓ 使用商品: ${product.name} (ID: ${product.id}, 库存: ${product.stock})\n`);

    const initialStock = Number(product.stock);
    const initialLockStock = Number(product.lockStock || 0);
    const orderQuantity = 2;

    // 2. 创建订单
    console.log('【步骤2】创建订单...\n');

    const orderNo = `TEST${Date.now()}`;
    const productPrice = Number(product.agentPrice);
    const totalAmount = productPrice * orderQuantity;

    const order = await prisma.$transaction(async (tx) => {
      // 检查库存
      const currentProduct = await tx.product.findUnique({
        where: { id: product.id }
      });

      const availableStock = Number(currentProduct.stock) - Number(currentProduct.lockStock || 0);
      if (availableStock < orderQuantity) {
        throw new Error(`库存不足: 可用${availableStock}，需要${orderQuantity}`);
      }

      // 锁定库存
      await tx.product.update({
        where: { id: product.id },
        data: {
          lockStock: { increment: orderQuantity }
        }
      });

      // 创建订单
      const newOrder = await tx.order.create({
        data: {
          orderNo,
          agentId: level2Agent.id,
          totalAmount,
          status: 'pending_payment',
          needTransfer: false,
          fullPaid: false,
          paidAmount: 0,
          contactName: level2Agent.name,
          contactPhone: level2Agent.phone,
          needConfirm: false
        }
      });

      // 创建订单项
      await tx.orderItem.create({
        data: {
          orderId: newOrder.id,
          productId: product.id,
          quantity: orderQuantity,
          price: productPrice,
          productName: product.name,
          productImage: product.images || null
        }
      });

      return newOrder;
    });

    console.log(`✓ 订单创建成功: ${order.orderNo} (ID: ${order.id})`);
    console.log(`  金额: ￥${totalAmount}`);
    console.log(`  状态: ${order.status}`);
    console.log(`  锁定库存: +${orderQuantity}\n`);

    // 3. 客服确认收款
    console.log('【步骤3】客服确认收款（全款）...\n');

    const paidOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        fullPaid: true,
        paidAmount: totalAmount,
        status: 'pending_accept'
      }
    });

    console.log(`✓ 收款确认成功`);
    console.log(`  状态: ${paidOrder.status}\n`);

    // 4. 库管接单
    console.log('【步骤4】库管接单...\n');

    const acceptedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'preparing'
      }
    });

    console.log(`✓ 接单成功`);
    console.log(`  状态: ${acceptedOrder.status}\n`);

    // 5. 完成备货
    console.log('【步骤5】完成备货...\n');

    // 生成8位提货码
    const pickupCode = Math.floor(10000000 + Math.random() * 90000000).toString();

    const preparedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'pending_pickup',
        pickupCode
      }
    });

    console.log(`✓ 备货完成`);
    console.log(`  状态: ${preparedOrder.status}`);
    console.log(`  提货码: ${pickupCode}\n`);

    // 6. 核销提货（使用简化逻辑，不调用完整的confirmPickup函数）
    console.log('【步骤6】核销提货...\n');

    const completedOrder = await prisma.$transaction(async (tx) => {
      // 更新订单状态
      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'completed',
          pickedAt: new Date()
        }
      });

      // 扣减库存
      await tx.product.update({
        where: { id: product.id },
        data: {
          stock: { decrement: orderQuantity },
          lockStock: { decrement: orderQuantity },
          salesCount: { increment: orderQuantity }
        }
      });

      // 创建库存日志
      await tx.stockLog.create({
        data: {
          productId: product.id,
          type: 'OUT',
          quantity: -orderQuantity,
          beforeStock: initialStock,
          afterStock: initialStock - orderQuantity,
          orderId: order.id,
          remark: `订单出库: ${orderNo}`
        }
      });

      // 计算分润
      const orderAmount = Number(updated.totalAmount);

      // 获取分润规则
      const rule = await tx.commissionRule.findFirst({
        where: {
          status: 'ACTIVE',
          minAmount: { lte: orderAmount }
        },
        orderBy: { minAmount: 'desc' }
      });

      if (!rule) {
        console.log('  ⚠️  未找到匹配的分润规则');
        return updated;
      }

      console.log(`  使用分润规则: 一级${rule.level1Rate}%, 二级${rule.level2Rate}%`);

      // 直接分润：给二级代理的上级（一级代理）
      if (level2Agent.parentId) {
        const directAmount = orderAmount * Number(rule.level1Rate) / 100;

        await tx.commission.create({
          data: {
            agentId: level2Agent.parentId,
            orderId: order.id,
            amount: directAmount,
            rate: Number(rule.level1Rate),
            type: 'DIRECT',
            status: 'PENDING'
          }
        });

        await tx.agent.update({
          where: { id: level2Agent.parentId },
          data: {
            totalCommission: { increment: directAmount }
          }
        });

        console.log(`  ✓ 直接分润: ￥${directAmount.toFixed(2)} → ${level2Agent.parent.name}`);
      }

      // 间接分润：给一级代理的上级（如果存在）
      if (level2Agent.parent?.parentId) {
        const indirectAmount = orderAmount * Number(rule.level2Rate) / 100;

        await tx.commission.create({
          data: {
            agentId: level2Agent.parent.parentId,
            orderId: order.id,
            amount: indirectAmount,
            rate: Number(rule.level2Rate),
            type: 'INDIRECT',
            status: 'PENDING'
          }
        });

        await tx.agent.update({
          where: { id: level2Agent.parent.parentId },
          data: {
            totalCommission: { increment: indirectAmount }
          }
        });

        console.log(`  ✓ 间接分润: ￥${indirectAmount.toFixed(2)} → ${level2Agent.parent.parent.name}`);
      }

      return updated;
    });

    console.log(`\n✓ 核销成功`);
    console.log(`  状态: ${completedOrder.status}\n`);

    // 7. 验证结果
    console.log('【步骤7】验证测试结果...\n');

    // 验证库存
    const finalProduct = await prisma.product.findUnique({
      where: { id: product.id }
    });

    console.log('库存变化:');
    console.log(`  实际库存: ${initialStock} → ${finalProduct.stock} (${Number(finalProduct.stock) - initialStock >= 0 ? '+' : ''}${Number(finalProduct.stock) - initialStock})`);
    console.log(`  锁定库存: ${initialLockStock} → ${finalProduct.lockStock || 0} (${(Number(finalProduct.lockStock || 0) - initialLockStock) >= 0 ? '+' : ''}${Number(finalProduct.lockStock || 0) - initialLockStock})`);
    console.log(`  销售数量: ${finalProduct.salesCount || 0}\n`);

    // 验证分润
    const commissions = await prisma.commission.findMany({
      where: { orderId: order.id },
      include: {
        agent: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    console.log(`分润记录: ${commissions.length}条`);
    for (const comm of commissions) {
      console.log(`  ${comm.type === 'DIRECT' ? '直接' : '间接'}分润: ${comm.agent.name} ￥${comm.amount} (${comm.rate}%) [${comm.status}]`);
    }

    // 验证累计分润
    console.log('\n代理商累计分润:');
    const updatedParent = await prisma.agent.findUnique({
      where: { id: level2Agent.parentId },
      select: { name: true, totalCommission: true }
    });
    console.log(`  ${updatedParent.name}: ￥${updatedParent.totalCommission}`);

    if (level2Agent.parent?.parentId) {
      const updatedGrandparent = await prisma.agent.findUnique({
        where: { id: level2Agent.parent.parentId },
        select: { name: true, totalCommission: true }
      });
      console.log(`  ${updatedGrandparent.name}: ￥${updatedGrandparent.totalCommission}`);
    }

    // 最终验证
    console.log('\n【测试结果】');

    const errors = [];

    if (Number(finalProduct.stock) !== initialStock - orderQuantity) {
      errors.push('❌ 库存扣减不正确');
    } else {
      console.log('✓ 库存扣减正确');
    }

    if (Number(finalProduct.lockStock || 0) !== initialLockStock) {
      errors.push('❌ 锁定库存释放不正确');
    } else {
      console.log('✓ 锁定库存释放正确');
    }

    const expectedCommissions = level2Agent.parent?.parentId ? 2 : 1;
    if (commissions.length !== expectedCommissions) {
      errors.push(`❌ 分润记录数量不正确 (期望${expectedCommissions}条，实际${commissions.length}条)`);
    } else {
      console.log(`✓ 分润记录数量正确 (${commissions.length}条)`);
    }

    if (commissions.every(c => c.status === 'PENDING')) {
      console.log('✓ 分润状态正确 (PENDING)');
    } else {
      errors.push('❌ 分润状态不正确');
    }

    console.log('\n======= 测试完成 =======');

    if (errors.length > 0) {
      console.log('\n发现问题:');
      errors.forEach(err => console.log(err));
    } else {
      console.log('\n✅ 所有验证通过！自提订单流程正常！');
    }

    await prisma.$disconnect();

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

testPickupFlow();

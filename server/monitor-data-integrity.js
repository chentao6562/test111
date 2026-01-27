/**
 * 数据一致性监控脚本
 * 用途：每日自动检查数据完整性，确保系统健康运行
 * 使用：node monitor-data-integrity.js
 * 建议：添加到crontab，每日凌晨3:00执行（T+1结算后1小时）
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDataIntegrity() {
  console.log('======= 数据一致性监控 =======');
  console.log(`执行时间: ${new Date().toLocaleString('zh-CN')}\n`);

  const errors = [];
  const warnings = [];

  try {
    // 1. 检查余额与流水是否一致
    console.log('【检查1】余额与流水一致性...');
    const balanceMismatch = await prisma.$queryRaw`
      SELECT
        a.id,
        a.name,
        a.balance,
        COALESCE(SUM(CASE
          WHEN ff.type IN ('COMMISSION', 'WITHDRAWAL_REFUND', 'RECHARGE') THEN ff.amount
          WHEN ff.type IN ('COMMISSION_REFUND', 'WITHDRAWAL') THEN -ff.amount
          ELSE 0
        END), 0) AS calculated_balance
      FROM agents a
      LEFT JOIN fund_flows ff ON a.id = ff.agentId
      GROUP BY a.id
      HAVING ABS(a.balance - calculated_balance) > 0.01
    `;

    if (balanceMismatch.length > 0) {
      errors.push(`❌ 发现${balanceMismatch.length}个代理商余额与流水不一致`);
      balanceMismatch.forEach(agent => {
        console.log(`  ⚠️  ${agent.name}: 余额￥${agent.balance}, 计算值￥${agent.calculated_balance}`);
      });
    } else {
      console.log('  ✓ 所有代理商余额与流水一致\n');
    }

    // 2. 检查已完成订单是否都有分润记录
    console.log('【检查2】已完成订单分润完整性...');
    const ordersWithoutCommission = await prisma.$queryRaw`
      SELECT
        o.id,
        o.orderNo,
        o.totalAmount,
        a.name AS agentName,
        a.type AS agentType,
        a.parentId
      FROM orders o
      JOIN agents a ON o.agentId = a.id
      LEFT JOIN commissions c ON o.id = c.orderId
      WHERE o.status = 'completed'
        AND c.id IS NULL
        AND a.type != 'WHOLESALE'
        AND a.parentId IS NOT NULL
    `;

    if (ordersWithoutCommission.length > 0) {
      errors.push(`❌ 发现${ordersWithoutCommission.length}个已完成订单缺失分润记录`);
      ordersWithoutCommission.forEach(order => {
        console.log(`  ⚠️  订单${order.orderNo}: 代理商${order.agentName}(${order.agentType}), 上级ID=${order.parentId}`);
      });
    } else {
      console.log('  ✓ 所有应分润订单都有分润记录\n');
    }

    // 3. 检查库存异常
    console.log('【检查3】库存数据完整性...');

    // 3.1 负库存
    const negativeStock = await prisma.product.findMany({
      where: {
        OR: [
          { stock: { lt: 0 } },
          { lockStock: { lt: 0 } }
        ]
      },
      select: { id: true, name: true, stock: true, lockStock: true }
    });

    if (negativeStock.length > 0) {
      errors.push(`❌ 发现${negativeStock.length}个商品存在负库存`);
      negativeStock.forEach(product => {
        console.log(`  ⚠️  ${product.name}: 库存=${product.stock}, 锁定=${product.lockStock}`);
      });
    } else {
      console.log('  ✓ 无负库存');
    }

    // 3.2 可用库存为负
    const availableStockNegative = await prisma.$queryRaw`
      SELECT id, name, stock, lockStock, (stock - lockStock) AS available
      FROM products
      WHERE (stock - lockStock) < 0
    `;

    if (availableStockNegative.length > 0) {
      errors.push(`❌ 发现${availableStockNegative.length}个商品可用库存为负`);
      availableStockNegative.forEach(product => {
        console.log(`  ⚠️  ${product.name}: 可用=${product.available} (库存${product.stock}-锁定${product.lockStock})`);
      });
    } else {
      console.log('  ✓ 所有商品可用库存正常');
    }

    // 3.3 库存预警
    const lowStockProducts = await prisma.product.findMany({
      where: {
        stock: { lte: prisma.product.fields.minStock }
      },
      select: { id: true, name: true, stock: true, minStock: true }
    });

    if (lowStockProducts.length > 0) {
      warnings.push(`⚠️  ${lowStockProducts.length}个商品库存低于预警线`);
      lowStockProducts.forEach(product => {
        console.log(`  ⚠️  ${product.name}: 库存=${product.stock}, 预警线=${product.minStock}`);
      });
    } else {
      console.log('  ✓ 无库存预警\n');
    }

    // 4. 检查待结算分润时长
    console.log('【检查4】分润结算及时性...');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const overdueCommissions = await prisma.commission.findMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: yesterday }
      },
      include: {
        agent: { select: { name: true } },
        order: { select: { orderNo: true } }
      }
    });

    if (overdueCommissions.length > 0) {
      warnings.push(`⚠️  ${overdueCommissions.length}条分润超过24小时未结算`);
      overdueCommissions.forEach(comm => {
        const days = Math.floor((Date.now() - comm.createdAt.getTime()) / (24 * 60 * 60 * 1000));
        console.log(`  ⚠️  分润${comm.id}: ${comm.agent.name}, ￥${comm.amount}, 已${days}天`);
      });
    } else {
      console.log('  ✓ 所有分润结算及时\n');
    }

    // 5. 检查提现异常
    console.log('【检查5】提现数据完整性...');

    // 5.1 长期待审核提现
    const overdueWithdrawals = await prisma.withdrawal.findMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } // 3天前
      },
      include: {
        agent: { select: { name: true } }
      }
    });

    if (overdueWithdrawals.length > 0) {
      warnings.push(`⚠️  ${overdueWithdrawals.length}笔提现超过3天未审核`);
      overdueWithdrawals.forEach(w => {
        const days = Math.floor((Date.now() - w.createdAt.getTime()) / (24 * 60 * 60 * 1000));
        console.log(`  ⚠️  提现${w.id}: ${w.agent.name}, ￥${w.amount}, 已${days}天`);
      });
    } else {
      console.log('  ✓ 提现审核及时');
    }

    // 5.2 已通过未完成的提现
    const approvedNotCompleted = await prisma.withdrawal.findMany({
      where: {
        status: 'APPROVED',
        reviewedAt: { lt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) } // 2天前审核通过
      },
      include: {
        agent: { select: { name: true } }
      }
    });

    if (approvedNotCompleted.length > 0) {
      warnings.push(`⚠️  ${approvedNotCompleted.length}笔提现已审核超过2天未打款`);
      approvedNotCompleted.forEach(w => {
        const days = Math.floor((Date.now() - w.reviewedAt.getTime()) / (24 * 60 * 60 * 1000));
        console.log(`  ⚠️  提现${w.id}: ${w.agent.name}, ￥${w.amount}, 审核后${days}天`);
      });
    } else {
      console.log('  ✓ 提现打款及时\n');
    }

    // 6. 统计概览
    console.log('【统计概览】');
    const stats = await Promise.all([
      prisma.order.count({ where: { status: 'completed' } }),
      prisma.commission.count({ where: { status: 'SETTLED' } }),
      prisma.fundFlow.count({ where: { type: 'COMMISSION' } }),
      prisma.agent.aggregate({ _sum: { balance: true } }),
      prisma.commission.aggregate({
        where: { status: 'SETTLED' },
        _sum: { amount: true }
      })
    ]);

    console.log(`  已完成订单: ${stats[0]}单`);
    console.log(`  已结算分润: ${stats[1]}条`);
    console.log(`  分润流水记录: ${stats[2]}条`);
    console.log(`  代理商总余额: ￥${Number(stats[3]._sum.balance || 0).toFixed(2)}`);
    console.log(`  已结算总金额: ￥${Number(stats[4]._sum.amount || 0).toFixed(2)}\n`);

    // 最终报告
    console.log('======= 监控结果 =======\n');

    if (errors.length === 0 && warnings.length === 0) {
      console.log('✅ 系统数据完整，无异常！\n');
      return { status: 'healthy', errors: [], warnings: [] };
    }

    if (errors.length > 0) {
      console.log('❌ 发现严重问题:');
      errors.forEach(err => console.log(err));
      console.log('');
    }

    if (warnings.length > 0) {
      console.log('⚠️  发现需关注事项:');
      warnings.forEach(warn => console.log(warn));
      console.log('');
    }

    return { status: errors.length > 0 ? 'error' : 'warning', errors, warnings };

  } catch (error) {
    console.error('\n❌ 监控执行失败:', error);
    return { status: 'failed', error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

// 执行监控
checkDataIntegrity().then(result => {
  if (result.status === 'failed' || result.status === 'error') {
    process.exit(1);
  }
  process.exit(0);
});

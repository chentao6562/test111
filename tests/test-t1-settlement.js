/**
 * T+1分润结算测试
 * 验证：分润结算 → 余额增加 → 资金流水创建
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testT1Settlement() {
  console.log('======= T+1分润结算测试 =======\n');

  try {
    // 1. 查找待结算的分润
    console.log('【步骤1】查找待结算分润...\n');

    const pendingCommissions = await prisma.commission.findMany({
      where: { status: 'PENDING' },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            balance: true
          }
        }
      }
    });

    console.log(`找到 ${pendingCommissions.length} 条待结算分润\n`);

    if (pendingCommissions.length === 0) {
      console.log('⚠️  无待结算分润，测试结束');
      await prisma.$disconnect();
      return;
    }

    for (const comm of pendingCommissions) {
      console.log(`分润${comm.id}: ${comm.agent.name} ￥${comm.amount} (${comm.type})`);
      console.log(`  当前余额: ￥${comm.agent.balance}`);
    }

    // 2. 执行T+1结算
    console.log('\n【步骤2】执行T+1分润结算...\n');

    // 使用昨天的日期（测试刚创建的分润是今天的）
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // 由于测试数据是刚创建的，我们需要手动更新createdAt为昨天
    console.log('  调整测试数据日期为昨天...');
    await prisma.commission.updateMany({
      where: { status: 'PENDING' },
      data: {
        createdAt: yesterday
      }
    });

    // 现在执行结算
    const result = await settleCommissionsByDate(yesterday);

    console.log(`\n✓ 结算完成`);
    console.log(`  结算数量: ${result.count}条`);
    console.log(`  结算金额: ￥${result.amount.toFixed(2)}\n`);

    // 3. 验证结果
    console.log('【步骤3】验证结算结果...\n');

    // 验证分润状态
    const settledCommissions = await prisma.commission.findMany({
      where: {
        id: { in: pendingCommissions.map(c => c.id) }
      }
    });

    console.log('分润状态:');
    for (const comm of settledCommissions) {
      console.log(`  分润${comm.id}: ${comm.status} (结算时间: ${comm.settledAt || '未设置'})`);
    }

    // 验证余额变化
    console.log('\n代理商余额变化:');
    for (const originalComm of pendingCommissions) {
      const updatedAgent = await prisma.agent.findUnique({
        where: { id: originalComm.agentId },
        select: { name: true, balance: true }
      });

      const originalBalance = Number(originalComm.agent.balance);
      const newBalance = Number(updatedAgent.balance);
      const expectedBalance = originalBalance + Number(originalComm.amount);

      console.log(`  ${updatedAgent.name}:`);
      console.log(`    原余额: ￥${originalBalance}`);
      console.log(`    新余额: ￥${newBalance}`);
      console.log(`    应为: ￥${expectedBalance}`);
      console.log(`    ${newBalance === expectedBalance ? '✓ 正确' : '❌ 错误'}`);
    }

    // 验证资金流水
    console.log('\n资金流水记录:');
    const fundFlows = await prisma.fundFlow.findMany({
      where: {
        type: 'COMMISSION',
        relatedId: { in: pendingCommissions.map(c => c.id) }
      },
      include: {
        agent: {
          select: {
            name: true
          }
        }
      }
    });

    console.log(`  找到 ${fundFlows.length} 条流水记录\n`);

    for (const flow of fundFlows) {
      console.log(`  流水${flow.id}: ${flow.agent.name}`);
      console.log(`    金额: ￥${flow.amount}`);
      console.log(`    结算前余额: ￥${flow.beforeBalance}`);
      console.log(`    结算后余额: ￥${flow.afterBalance}`);
      console.log(`    备注: ${flow.remark}`);
    }

    // 最终验证
    console.log('\n【测试结果】');

    const errors = [];

    // 验证所有分润已结算
    const allSettled = settledCommissions.every(c => c.status === 'SETTLED');
    if (!allSettled) {
      errors.push('❌ 存在未结算的分润');
    } else {
      console.log('✓ 所有分润已结算');
    }

    // 验证所有分润都有settledAt时间
    const allHaveSettledAt = settledCommissions.every(c => c.settledAt !== null);
    if (!allHaveSettledAt) {
      errors.push('❌ 存在settledAt为空的分润');
    } else {
      console.log('✓ 所有分润都有结算时间');
    }

    // 验证余额是否正确
    let balanceCorrect = true;
    for (const originalComm of pendingCommissions) {
      const updatedAgent = await prisma.agent.findUnique({
        where: { id: originalComm.agentId },
        select: { balance: true }
      });

      const originalBalance = Number(originalComm.agent.balance);
      const newBalance = Number(updatedAgent.balance);
      const expectedBalance = originalBalance + Number(originalComm.amount);

      if (newBalance !== expectedBalance) {
        balanceCorrect = false;
        break;
      }
    }

    if (!balanceCorrect) {
      errors.push('❌ 余额更新不正确');
    } else {
      console.log('✓ 余额更新正确');
    }

    // 验证资金流水
    if (fundFlows.length !== pendingCommissions.length) {
      errors.push(`❌ 资金流水数量不正确 (期望${pendingCommissions.length}条，实际${fundFlows.length}条)`);
    } else {
      console.log(`✓ 资金流水数量正确 (${fundFlows.length}条)`);
    }

    // 验证流水的beforeBalance和afterBalance
    let flowBalanceCorrect = true;
    for (const flow of fundFlows) {
      const expectedAfterBalance = Number(flow.beforeBalance) + Number(flow.amount);
      if (Number(flow.afterBalance) !== expectedAfterBalance) {
        flowBalanceCorrect = false;
        break;
      }
    }

    if (!flowBalanceCorrect) {
      errors.push('❌ 资金流水余额计算不正确');
    } else {
      console.log('✓ 资金流水余额计算正确');
    }

    console.log('\n======= 测试完成 =======');

    if (errors.length > 0) {
      console.log('\n发现问题:');
      errors.forEach(err => console.log(err));
    } else {
      console.log('\n✅ 所有验证通过！T+1结算功能正常！');
    }

    await prisma.$disconnect();

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

/**
 * T+1结算函数（从commissionRuleService.ts复制）
 */
async function settleCommissionsByDate(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setDate(endOfDay.getDate() + 1);
  endOfDay.setHours(0, 0, 0, 0);

  return prisma.$transaction(async (tx) => {
    const pendingCommissions = await tx.commission.findMany({
      where: {
        status: 'PENDING',
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    if (pendingCommissions.length === 0) {
      console.log(`  ${date.toISOString().split('T')[0]} 无待结算分润`);
      return { count: 0, amount: 0 };
    }

    let totalAmount = 0;

    for (const commission of pendingCommissions) {
      const amount = Number(commission.amount);
      totalAmount += amount;

      const agent = await tx.agent.findUnique({
        where: { id: commission.agentId },
        select: { balance: true },
      });

      const currentBalance = Number(agent?.balance || 0);

      await tx.agent.update({
        where: { id: commission.agentId },
        data: {
          balance: { increment: amount },
        },
      });

      await tx.fundFlow.create({
        data: {
          agentId: commission.agentId,
          type: 'COMMISSION',
          amount: amount,
          beforeBalance: currentBalance,
          afterBalance: currentBalance + amount,
          relatedId: commission.id,
          relatedType: 'COMMISSION',
          remark: `T+1分润结算（${commission.type === 'DIRECT' ? '直接分润' : '间接分润'}）`,
        },
      });

      await tx.commission.update({
        where: { id: commission.id },
        data: {
          status: 'SETTLED',
          settledAt: new Date(),
        },
      });
    }

    console.log(`  ${date.toISOString().split('T')[0]} 结算: ${pendingCommissions.length}条, ￥${totalAmount.toFixed(2)}`);
    return { count: pendingCommissions.length, amount: totalAmount };
  });
}

testT1Settlement();

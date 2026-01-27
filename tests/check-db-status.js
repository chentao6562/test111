const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDBStatus() {
  console.log('======= 检查数据库状态 =======\n');

  try {
    const completedOrders = await prisma.order.findMany({
      where: { status: 'completed' },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            type: true,
            parentId: true
          }
        },
        commissions: true
      },
      orderBy: { id: 'asc' }
    });

    console.log(`找到 ${completedOrders.length} 个已完成订单\n`);

    for (const order of completedOrders) {
      console.log(`订单${order.id} (${order.orderNo})`);
      console.log(`  金额: ￥${order.totalAmount}`);
      console.log(`  代理商: ${order.agent.name} (${order.agent.type})`);
      console.log(`  上级ID: ${order.agent.parentId || '无'}`);
      console.log(`  分润记录数: ${order.commissions.length}`);
      console.log('');
    }

    const settledCommissions = await prisma.commission.findMany({
      where: { status: 'SETTLED' },
      include: {
        agent: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    console.log(`\n找到 ${settledCommissions.length} 条已结算分润\n`);

    for (const comm of settledCommissions) {
      console.log(`分润${comm.id}: 代理商${comm.agent.name}, 金额￥${comm.amount}, 订单${comm.orderId}`);
    }

    const fundFlows = await prisma.fundFlow.findMany({
      where: { type: 'COMMISSION' }
    });

    console.log(`\n\n找到 ${fundFlows.length} 条分润类型的资金流水`);

    await prisma.$disconnect();

  } catch (error) {
    console.error('检查失败:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkDBStatus();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllOrders() {
  console.log('======= 检查所有订单状态 =======\n');

  try {
    const allOrders = await prisma.order.findMany({
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            type: true,
            parentId: true
          }
        }
      },
      orderBy: { id: 'desc' },
      take: 20
    });

    console.log(`数据库中共有订单: ${allOrders.length} 条（最近20条）\n`);

    const statusCount = {};
    for (const order of allOrders) {
      statusCount[order.status] = (statusCount[order.status] || 0) + 1;
    }

    console.log('订单状态统计:');
    for (const [status, count] of Object.entries(statusCount)) {
      console.log(`  ${status}: ${count}条`);
    }

    console.log('\n最近订单详情:\n');
    for (const order of allOrders.slice(0, 10)) {
      console.log(`订单${order.id} - ${order.orderNo}`);
      console.log(`  状态: ${order.status}`);
      console.log(`  金额: ￥${order.totalAmount}`);
      console.log(`  代理商: ${order.agent.name} (${order.agent.type}, 上级: ${order.agent.parentId || '无'})`);
      console.log(`  创建时间: ${order.createdAt}`);
      console.log('');
    }

    const commissionCount = await prisma.commission.count();
    const agentCount = await prisma.agent.count();

    console.log('\n其他统计:');
    console.log(`  代理商总数: ${agentCount}`);
    console.log(`  分润记录总数: ${commissionCount}`);

    await prisma.$disconnect();

  } catch (error) {
    console.error('检查失败:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkAllOrders();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearData() {
  try {
    console.log('开始清空数据...\n');

    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');

    // 清空预约相关
    const r1 = await prisma.reservationItem.deleteMany();
    console.log('删除预约明细:', r1.count);

    const r2 = await prisma.reservation.deleteMany();
    console.log('删除预约单:', r2.count);

    // 清空推销员定价
    const r3 = await prisma.agentPrice.deleteMany();
    console.log('删除推销员定价:', r3.count);

    // 清空资金流水和奖励
    const r4 = await prisma.fundFlow.deleteMany();
    console.log('删除资金流水:', r4.count);

    const r5 = await prisma.rewardRecord.deleteMany();
    console.log('删除奖励记录:', r5.count);

    // 清空客户记录
    const r6 = await prisma.customerRecord.deleteMany();
    console.log('删除客户记录:', r6.count);

    // 清空商品
    const r7 = await prisma.product.deleteMany();
    console.log('删除商品:', r7.count);

    // 清空推销员（保留总代理）
    const r8 = await prisma.agent.deleteMany({ where: { isMaster: false } });
    console.log('删除推销员(保留总代理):', r8.count);

    // 重置总代理余额
    const r9 = await prisma.agent.updateMany({
      where: { isMaster: true },
      data: { balance: 0, totalSales: 0, teamSales: 0, monthlyTeamSales: 0 }
    });
    console.log('重置总代理余额:', r9.count);

    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\n=== 数据清空完成 ===\n');

    // 验证
    const agentCount = await prisma.agent.count();
    const masterAgent = await prisma.agent.findFirst({ where: { isMaster: true } });
    console.log('剩余推销员数量:', agentCount);
    if (masterAgent) {
      console.log('总代理账号:', masterAgent.phone, masterAgent.name);
    }

    const productCount = await prisma.product.count();
    console.log('剩余商品数量:', productCount);

    const reservationCount = await prisma.reservation.count();
    console.log('剩余预约数量:', reservationCount);

    await prisma.$disconnect();
  } catch(e) {
    console.error('Error:', e.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

clearData();

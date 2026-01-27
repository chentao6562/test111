const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createMasterAgent() {
  try {
    // 检查是否已存在总代理
    const existing = await prisma.agent.findFirst({ where: { isMaster: true } });
    if (existing) {
      console.log('总代理已存在:', existing.phone, existing.name);
      await prisma.$disconnect();
      return;
    }

    // 创建总代理账号
    const master = await prisma.agent.create({
      data: {
        phone: '13190531439',
        name: '蒙庆烟花总代理',
        type: 'LEVEL1',
        isMaster: true,
        status: 'ACTIVE',
        inviteCode: 'MASTER001',
        balance: 0,
        totalSales: 0,
        teamSales: 0,
        monthlyTeamSales: 0,
        isActivated: true,
      }
    });

    console.log('总代理创建成功:');
    console.log('  手机号:', master.phone);
    console.log('  名称:', master.name);
    console.log('  邀请码:', master.inviteCode);
    console.log('  ID:', master.id);

    await prisma.$disconnect();
  } catch(e) {
    console.error('Error:', e.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

createMasterAgent();

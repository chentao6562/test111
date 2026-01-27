const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  // 删除非总代理的用户
  const result = await prisma.agent.deleteMany({ where: { isMaster: false } });
  console.log('删除非总代理用户:', result.count);

  // 验证
  const agents = await prisma.agent.findMany();
  console.log('剩余用户:', agents.map(a => a.name + '(' + a.phone + ')').join(', '));

  await prisma.$disconnect();
}

cleanup();

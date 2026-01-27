const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  console.log('=== 数据验证 ===\n');

  // 商品
  const products = await prisma.product.findMany({
    select: { id: true, name: true, retailPrice: true, costPrice: true, supplyPrice: true, stock: true, categoryId: true },
    orderBy: { id: 'asc' }
  });
  console.log('商品总数:', products.length);
  console.log('\n商品列表:');
  products.forEach(p => console.log(`  [${p.id}] ${p.name}: 零售价¥${p.retailPrice}, 成本价¥${p.costPrice}, 供货价¥${p.supplyPrice}, 库存${p.stock}`));

  // 分类
  const categories = await prisma.category.findMany();
  console.log('\n分类总数:', categories.length);
  categories.forEach(c => console.log(`  - ${c.name} (ID:${c.id})`));

  // 推销员
  const agents = await prisma.agent.findMany();
  console.log('\n推销员总数:', agents.length);
  agents.forEach(a => console.log(`  - ${a.name} (${a.phone}), isMaster:${a.isMaster}`));

  // 预约
  const reservations = await prisma.reservation.count();
  console.log('\n预约单总数:', reservations);

  await prisma.$disconnect();
}

verify();

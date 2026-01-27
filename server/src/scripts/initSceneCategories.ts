/**
 * 初始化场景分类脚本
 * 【2026-01-25】创建5个场景分类：网红款、居家款、套餐、常规款、特效礼花
 *
 * 运行方式：npx ts-node src/scripts/initSceneCategories.ts
 */
import prisma from '../utils/prisma';

async function main() {
  console.log('开始初始化场景分类...');

  const sceneCategories = [
    { name: '网红款', icon: 'trending_up', sort: 1 },
    { name: '居家款', icon: 'home', sort: 2 },
    { name: '套餐', icon: 'inventory_2', sort: 3 },
    { name: '常规款', icon: 'category', sort: 4 },
    { name: '特效礼花', icon: 'celebration', sort: 5 },
  ];

  for (const cat of sceneCategories) {
    // 检查是否已存在
    const existing = await prisma.category.findFirst({
      where: { name: cat.name },
    });

    if (existing) {
      console.log(`分类 "${cat.name}" 已存在 (ID: ${existing.id})`);
    } else {
      const newCat = await prisma.category.create({
        data: {
          name: cat.name,
          icon: cat.icon,
          sort: cat.sort,
          status: 'ACTIVE',
        },
      });
      console.log(`创建分类 "${cat.name}" 成功 (ID: ${newCat.id})`);
    }
  }

  console.log('场景分类初始化完成！');

  // 显示所有分类
  const allCategories = await prisma.category.findMany({
    orderBy: { sort: 'asc' },
    include: {
      _count: { select: { products: true } },
    },
  });

  console.log('\n当前所有分类：');
  console.log('ID\t商品数\t分类名称');
  console.log('─'.repeat(40));
  for (const cat of allCategories) {
    console.log(`${cat.id}\t${cat._count.products}\t${cat.name}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('初始化失败:', e);
  process.exit(1);
});

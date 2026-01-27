/**
 * 分类迁移脚本
 * 【2026-01-25】将现有商品迁移到5个新场景分类，删除旧分类
 *
 * 迁移规则：
 * - 网红款(24) ← 网红加特林(19)
 * - 居家款(25) ← 儿童入门(13)、手持喷花(14)、地面喷花(18)
 * - 套餐(26) ← 保留为空（前端做特殊处理跳转到套餐列表）
 * - 常规款(27) ← 创意彩花(15)、礼盒套装(16)、组合烟花(20)、家用礼花(22)、鞭炮(23)
 * - 特效礼花(28) ← 旋转升空(17)、大型组合(21)
 *
 * 运行方式：npx ts-node src/scripts/migrateCategories.ts
 */
import prisma from '../utils/prisma';

// 迁移映射：新分类ID -> 旧分类ID列表
const migrationMap: Record<number, number[]> = {
  24: [19],           // 网红款 ← 网红加特林
  25: [13, 14, 18],   // 居家款 ← 儿童入门、手持喷花、地面喷花
  26: [],             // 套餐 ← 空（特殊分类）
  27: [15, 16, 20, 22, 23], // 常规款 ← 创意彩花、礼盒套装、组合烟花、家用礼花、鞭炮
  28: [17, 21],       // 特效礼花 ← 旋转升空、大型组合
};

// 新分类名称
const newCategoryNames: Record<number, string> = {
  24: '网红款',
  25: '居家款',
  26: '套餐',
  27: '常规款',
  28: '特效礼花',
};

async function main() {
  console.log('========================================');
  console.log('开始分类迁移...');
  console.log('========================================\n');

  // 1. 检查新分类是否存在
  console.log('步骤1: 验证新分类...');
  const newCategoryIds = Object.keys(migrationMap).map(Number);
  const newCategories = await prisma.category.findMany({
    where: { id: { in: newCategoryIds } },
  });

  if (newCategories.length !== 5) {
    console.error('错误: 5个新分类不完整，请先执行 initSceneCategories.ts');
    process.exit(1);
  }
  console.log('  ✓ 5个新分类已存在\n');

  // 2. 迁移商品
  console.log('步骤2: 迁移商品到新分类...\n');

  let totalMigrated = 0;
  for (const [newCatId, oldCatIds] of Object.entries(migrationMap)) {
    const newId = Number(newCatId);
    const catName = newCategoryNames[newId];

    if (oldCatIds.length === 0) {
      console.log(`[${catName}] 跳过（特殊分类，无需迁移商品）`);
      continue;
    }

    // 批量更新商品分类
    const result = await prisma.product.updateMany({
      where: {
        categoryId: { in: oldCatIds },
      },
      data: {
        categoryId: newId,
      },
    });

    console.log(`[${catName}] 迁移 ${result.count} 个商品 (来自分类ID: ${oldCatIds.join(', ')})`);
    totalMigrated += result.count;
  }

  console.log(`\n  ✓ 共迁移 ${totalMigrated} 个商品\n`);

  // 3. 删除旧分类
  console.log('步骤3: 删除旧分类...');

  // 收集所有旧分类ID
  const oldCategoryIds: number[] = [];
  for (const oldCatIds of Object.values(migrationMap)) {
    oldCategoryIds.push(...oldCatIds);
  }

  // 先验证旧分类下没有商品了
  const productsInOldCats = await prisma.product.count({
    where: { categoryId: { in: oldCategoryIds } },
  });

  if (productsInOldCats > 0) {
    console.error(`  错误: 旧分类下仍有 ${productsInOldCats} 个商品，无法删除`);
    process.exit(1);
  }

  // 删除旧分类
  const deleteResult = await prisma.category.deleteMany({
    where: { id: { in: oldCategoryIds } },
  });

  console.log(`  ✓ 已删除 ${deleteResult.count} 个旧分类\n`);

  // 4. 更新新分类的排序
  console.log('步骤4: 更新分类排序...');

  const sortUpdates = [
    { id: 24, sort: 1 }, // 网红款
    { id: 25, sort: 2 }, // 居家款
    { id: 26, sort: 3 }, // 套餐
    { id: 27, sort: 4 }, // 常规款
    { id: 28, sort: 5 }, // 特效礼花
  ];

  for (const update of sortUpdates) {
    await prisma.category.update({
      where: { id: update.id },
      data: { sort: update.sort },
    });
  }
  console.log('  ✓ 分类排序已更新\n');

  // 5. 验证结果
  console.log('========================================');
  console.log('步骤5: 验证迁移结果\n');

  const finalCategories = await prisma.category.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { sort: 'asc' },
    include: {
      _count: { select: { products: true } },
    },
  });

  console.log('序号\t分类名称\t商品数');
  console.log('─'.repeat(40));
  for (const cat of finalCategories) {
    console.log(`${cat.sort}\t${cat.name}\t\t${cat._count.products}个`);
  }

  console.log('\n========================================');
  console.log('✓ 分类迁移完成！');
  console.log('========================================');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('迁移失败:', e);
  process.exit(1);
});

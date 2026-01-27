/**
 * 创建测试套餐脚本
 * 【2026-01-25】用于测试套餐功能
 *
 * 运行方式：npx ts-node src/scripts/createTestPackage.ts
 */
import prisma from '../utils/prisma';

async function main() {
  console.log('开始创建测试套餐...');

  // 先检查是否已存在
  const existing = await prisma.productPackage.findFirst({
    where: { code: 'PKG001' }
  });

  if (existing) {
    console.log('测试套餐已存在:', existing.name);
    await prisma.$disconnect();
    return;
  }

  // 获取一些商品ID用于测试
  const products = await prisma.product.findMany({
    take: 3,
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, costPrice: true, supplyPrice: true, retailPrice: true }
  });

  if (products.length < 2) {
    console.log('商品数量不足，无法创建测试套餐');
    await prisma.$disconnect();
    return;
  }

  console.log('使用商品:', products.map(p => p.name).join(', '));

  // 创建测试套餐
  const pkg = await prisma.productPackage.create({
    data: {
      code: 'PKG001',
      name: '欢乐体验装',
      positioning: 'ENTRY',
      description: '入门级套餐，适合第一次购买烟花的客户',
      images: JSON.stringify(['/uploads/products/placeholder.svg']),
      costPrice: 65.5,
      supplyPrice: 92,
      suggestedPrice: 200,
      masterRetailPrice: 214,
      grossMargin: 0.57,
      sceneTags: JSON.stringify(['入门尝鲜', '性价比']),
      targetAudience: '入门客户',
      stockStrategy: 'COMPONENT',
      sort: 1,
      status: 'ACTIVE',
      createdBy: 1
    }
  });

  console.log('创建套餐成功:', pkg.name, '(ID:', pkg.id, ')');

  // 添加套餐商品
  for (let i = 0; i < Math.min(2, products.length); i++) {
    const product = products[i];
    await prisma.packageItem.create({
      data: {
        packageId: pkg.id,
        productId: product.id,
        quantity: i + 1,
        snapshotCostPrice: product.costPrice,
        snapshotSupplyPrice: product.supplyPrice,
        snapshotRetailPrice: product.retailPrice,
        sort: i + 1
      }
    });
    console.log(`  添加商品: ${product.name} x${i + 1}`);
  }

  // 创建第二个测试套餐
  const pkg2 = await prisma.productPackage.create({
    data: {
      code: 'PKG002',
      name: '亲子时光',
      positioning: 'HOT',
      description: '爆款套餐，适合家庭亲子活动',
      images: JSON.stringify(['/uploads/products/placeholder.svg']),
      costPrice: 98.5,
      supplyPrice: 138,
      suggestedPrice: 260,
      masterRetailPrice: 284,
      grossMargin: 0.51,
      sceneTags: JSON.stringify(['家庭', '亲子']),
      targetAudience: '有孩家庭',
      stockStrategy: 'COMPONENT',
      sort: 2,
      status: 'ACTIVE',
      createdBy: 1
    }
  });

  console.log('创建套餐成功:', pkg2.name, '(ID:', pkg2.id, ')');

  // 添加套餐商品
  if (products.length >= 3) {
    for (let i = 0; i < 3; i++) {
      const product = products[i];
      await prisma.packageItem.create({
        data: {
          packageId: pkg2.id,
          productId: product.id,
          quantity: 1,
          snapshotCostPrice: product.costPrice,
          snapshotSupplyPrice: product.supplyPrice,
          snapshotRetailPrice: product.retailPrice,
          sort: i + 1
        }
      });
      console.log(`  添加商品: ${product.name} x1`);
    }
  }

  console.log('\n测试套餐创建完成！');

  // 验证
  const allPackages = await prisma.productPackage.findMany({
    include: {
      items: {
        include: { product: { select: { name: true } } }
      }
    }
  });

  console.log('\n当前所有套餐:');
  for (const p of allPackages) {
    console.log(`- ${p.name} (${p.code}): ${p.items.length}个商品, 零售价¥${p.masterRetailPrice}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('创建失败:', e);
  process.exit(1);
});

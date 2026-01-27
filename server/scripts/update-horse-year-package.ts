/**
 * 更新马年套餐内容
 * 根据用户提供的黄色图片配置
 *
 * 执行方式：npx ts-node scripts/update-horse-year-package.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const packageId = 15; // 马年吉祥包

  console.log('开始更新马年吉祥包 (id=15)...');

  // 获取当前套餐内容
  const currentPackage = await prisma.productPackage.findUnique({
    where: { id: packageId },
    include: { items: { include: { product: true } } }
  });

  if (!currentPackage) {
    console.error('套餐不存在！');
    return;
  }

  console.log('当前套餐内容：');
  for (const item of currentPackage.items) {
    console.log(`  - ${item.product.name} x${item.quantity}`);
  }

  // 新的商品配置（根据黄色图片）
  const newItems = [
    { productId: 1157, quantity: 6 },  // 20发缤纷缢彩 6个
    { productId: 1158, quantity: 6 },  // 20发富贵礼炮 6个 (替换闪光蕾)
    { productId: 1159, quantity: 2 },  // 丰运树/黄金树 2个 (幸运树+黄金树)
    { productId: 1160, quantity: 1 },  // 马上有钱/来财 1个
    { productId: 1161, quantity: 1 },  // 忆童年100发霸王雷 1个 (替换金银财宝100发)
    { productId: 1162, quantity: 2 },  // 富贵喜炮30公分 2盘
    { productId: 1163, quantity: 1 },  // 688开门红顺财神 1盘
    { productId: 1164, quantity: 2 },  // 非凡加特林 2根
  ];

  // 验证商品是否存在
  console.log('\n验证新商品配置...');
  for (const item of newItems) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } });
    if (!product) {
      console.error(`商品 id=${item.productId} 不存在！`);
      return;
    }
    console.log(`  ✓ ${product.name} (id=${item.productId}) x${item.quantity}`);
  }

  // 在事务中更新
  await prisma.$transaction(async (tx) => {
    // 删除旧的商品项
    console.log('\n删除旧的商品项...');
    await tx.packageItem.deleteMany({ where: { packageId } });

    // 添加新的商品项
    console.log('添加新的商品项...');
    let sort = 1;
    for (const item of newItems) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (product) {
        await tx.packageItem.create({
          data: {
            packageId,
            productId: item.productId,
            quantity: item.quantity,
            snapshotCostPrice: product.costPrice,
            snapshotSupplyPrice: product.supplyPrice,
            snapshotRetailPrice: product.retailPrice,
            sort: sort++
          }
        });
      }
    }

    // 更新套餐总成本和价格（可选）
    // 这里保持原有的定价不变
  });

  // 验证更新结果
  const updatedPackage = await prisma.productPackage.findUnique({
    where: { id: packageId },
    include: { items: { include: { product: true } } }
  });

  console.log('\n更新后的套餐内容：');
  if (updatedPackage) {
    for (const item of updatedPackage.items) {
      console.log(`  - ${item.product.name} x${item.quantity}`);
    }
  }

  console.log('\n✓ 马年吉祥包更新完成！');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

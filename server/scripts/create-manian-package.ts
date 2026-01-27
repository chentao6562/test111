/**
 * 创建马年套餐 (499元)
 * 根据用户提供的清单创建，部分商品用相似商品替代
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('开始创建马年套餐...');

  // 套餐商品配置（用现有商品替代）
  const packageItems = [
    { productId: 1160, quantity: 1 },  // 马上有钱/来财 (替代: 马上有钱100发)
    { productId: 1186, quantity: 1 },  // 发财蕾36发 (替代: 金龙蕾100发)
    { productId: 1139, quantity: 1 },  // 金银财宝100发 (替代: 幸运树100发)
    { productId: 1159, quantity: 1 },  // 丰运树/黄金树 (替代: 黄金树60发)
    { productId: 1157, quantity: 6 },  // 20发缤纷缢彩 (替代: 花似锦20发)
    { productId: 1184, quantity: 6 },  // 闪光蕾 (替代: 财运蕾20发)
    { productId: 1163, quantity: 1 },  // 688开门红顺财神60公分盘炮
    { productId: 1164, quantity: 2 },  // 非凡加特林
    { productId: 1162, quantity: 2 },  // 富贵喜炮25公分盘炮
  ];

  // 获取商品信息计算成本
  const productIds = packageItems.map(item => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, costPrice: true, supplyPrice: true, retailPrice: true }
  });

  const productMap = new Map(products.map(p => [p.id, p]));

  // 计算成本
  let totalCost = 0;
  let totalSupply = 0;
  let totalRetail = 0;

  console.log('\n套餐商品:');
  for (const item of packageItems) {
    const product = productMap.get(item.productId);
    if (!product) {
      console.log(`  ⚠ 商品不存在: ID ${item.productId}`);
      continue;
    }
    const cost = Number(product.costPrice || 0) * item.quantity;
    const supply = Number(product.supplyPrice || 0) * item.quantity;
    const retail = Number(product.retailPrice) * item.quantity;
    totalCost += cost;
    totalSupply += supply;
    totalRetail += retail;
    console.log(`  - ${product.name} x${item.quantity} (成本:¥${cost.toFixed(0)})`);
  }

  console.log(`\n成本合计: ¥${totalCost.toFixed(0)}`);
  console.log(`供货价合计: ¥${totalSupply.toFixed(0)}`);
  console.log(`零售价合计: ¥${totalRetail.toFixed(0)}`);

  // 套餐定价
  const retailPrice = 499;
  const costPrice = Math.round(totalCost * 0.85); // 给点折扣
  const supplyPrice = Math.round(costPrice * 1.3);
  const grossMargin = ((retailPrice - costPrice) / retailPrice).toFixed(2);

  console.log(`\n套餐定价:`);
  console.log(`  零售价: ¥${retailPrice}`);
  console.log(`  成本价: ¥${costPrice}`);
  console.log(`  供货价: ¥${supplyPrice}`);
  console.log(`  毛利率: ${Number(grossMargin) * 100}%`);

  // 创建套餐
  const pkg = await prisma.productPackage.create({
    data: {
      code: 'PKG007',
      name: '马年吉祥包',
      positioning: 'HOT',
      description: '资质齐全·正规渠道，适用节日庆典、商业活动',
      targetAudience: '节日庆典',
      sceneTags: JSON.stringify(['马年', '吉祥', '庆典', '商业活动']),
      costPrice: costPrice,
      supplyPrice: supplyPrice,
      suggestedPrice: 599,
      masterRetailPrice: retailPrice,
      grossMargin: parseFloat(grossMargin),
      stockStrategy: 'COMPONENT',
      independentStock: 0,
      sort: 7,
      status: 'ACTIVE',
      createdBy: 1,
      images: '[]',
    }
  });

  console.log(`\n✅ 套餐创建成功: ${pkg.name} (ID: ${pkg.id})`);

  // 创建套餐商品关联
  let sortIndex = 1;
  for (const item of packageItems) {
    const product = productMap.get(item.productId);
    if (!product) continue;

    await prisma.packageItem.create({
      data: {
        packageId: pkg.id,
        productId: item.productId,
        quantity: item.quantity,
        snapshotCostPrice: product.costPrice,
        snapshotSupplyPrice: product.supplyPrice,
        snapshotRetailPrice: product.retailPrice,
        sort: sortIndex++,
      }
    });
  }

  console.log(`  关联商品: ${sortIndex - 1} 件`);

  await prisma.$disconnect();
}

main().catch(console.error);

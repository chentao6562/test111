/**
 * 创建6款精选套餐脚本
 * 【2026-01-25】根据营销方案上线6款套餐
 *
 * 运行方式：npx ts-node src/scripts/create6Packages.ts
 */
import prisma from '../utils/prisma';

// 套餐配置数据
const packagesData = [
  {
    code: 'PKG001',
    name: '欢乐体验装',
    positioning: 'ENTRY',
    costPrice: 65.5,
    supplyPrice: 92,
    masterRetailPrice: 214,
    grossMargin: 0.57,
    sceneTags: ['入门尝鲜', '预算有限'],
    targetAudience: '入门尝鲜、预算有限',
    description: '入门级套餐，适合第一次购买烟花的客户，性价比超高',
    // 商品配置: 水母×3 + 迷你加特林×4 + 仙女棒28寸×10 + 精彩变色×3 + 孔雀×2
    products: [
      { keyword: '水母', quantity: 3 },
      { keyword: '迷你加特林', quantity: 4 },
      { keyword: '28寸', quantity: 10 },
      { keyword: '精彩', quantity: 3 },
      { keyword: '孔雀', quantity: 2 }
    ]
  },
  {
    code: 'PKG002',
    name: '加特林风暴',
    positioning: 'ENTRY',
    costPrice: 105.5,
    supplyPrice: 148,
    masterRetailPrice: 280,
    grossMargin: 0.47,
    sceneTags: ['男孩子', '青少年'],
    targetAudience: '男孩子、青少年',
    description: '加特林系列组合，火力全开，男孩子的最爱',
    // 商品配置: 悟空加特林×6 + 极速英雄×2 + 迷你加特林×4 + 仙女棒28寸×5
    products: [
      { keyword: '悟空加特林', quantity: 6 },
      { keyword: '极速英雄', quantity: 2 },
      { keyword: '迷你加特林', quantity: 4 },
      { keyword: '28寸', quantity: 5 }
    ]
  },
  {
    code: 'PKG003',
    name: '亲子时光',
    positioning: 'HOT',
    costPrice: 98.5,
    supplyPrice: 138,
    masterRetailPrice: 284,
    grossMargin: 0.51,
    sceneTags: ['有孩家庭', '主推'],
    targetAudience: '有孩家庭【主推】',
    description: '爆款套餐，适合家庭亲子活动，安全又好玩',
    // 商品配置: 水母×4 + 悟空加特林×3 + 仙女棒36寸×6 + 蘑菇精灵×2 + 变变变×3 + 孔雀×2
    products: [
      { keyword: '水母', quantity: 4 },
      { keyword: '悟空加特林', quantity: 3 },
      { keyword: '36寸', quantity: 6 },
      { keyword: '蘑菇', quantity: 2 },
      { keyword: '变', quantity: 3 },
      { keyword: '孔雀', quantity: 2 }
    ]
  },
  {
    code: 'PKG004',
    name: '阖家欢乐',
    positioning: 'HOT',
    costPrice: 152.6,
    supplyPrice: 214,
    masterRetailPrice: 377,
    grossMargin: 0.43,
    sceneTags: ['家庭团圆', '主推'],
    targetAudience: '家庭团圆、要烟花【主推】',
    description: '爆款套餐，适合家庭团圆场合，大型烟花+小型互动',
    // 商品配置: 60发一帆风顺×1 + 水母×3 + 悟空加特林×3 + 炫彩三分钟×2 + 仙女棒36寸×8
    products: [
      { keyword: '一帆风顺', quantity: 1 },
      { keyword: '水母', quantity: 3 },
      { keyword: '悟空加特林', quantity: 3 },
      { keyword: '炫彩', quantity: 2 },
      { keyword: '36寸', quantity: 8 }
    ]
  },
  {
    code: 'PKG005',
    name: '幸福满堂',
    positioning: 'PROFIT',
    costPrice: 187,
    supplyPrice: 262,
    masterRetailPrice: 460,
    grossMargin: 0.43,
    sceneTags: ['高端家庭', '送礼'],
    targetAudience: '高端家庭、送礼',
    description: '利润款套餐，适合高端送礼，大气上档次',
    // 商品配置: 大吉81发×1 + 水母×4 + 悟空加特林×4 + 黄金三分钟×2 + 仙女棒36寸×10
    products: [
      { keyword: '大吉', quantity: 1 },
      { keyword: '水母', quantity: 4 },
      { keyword: '悟空加特林', quantity: 4 },
      { keyword: '黄金', quantity: 2 },
      { keyword: '36寸', quantity: 10 }
    ]
  },
  {
    code: 'PKG006',
    name: '璀璨庭院',
    positioning: 'PROFIT',
    costPrice: 193.5,
    supplyPrice: 271,
    masterRetailPrice: 460,
    grossMargin: 0.41,
    sceneTags: ['有院子', '农村'],
    targetAudience: '有院子、农村',
    description: '利润款套餐，适合有院子的家庭，效果震撼',
    // 商品配置: 60发一帆风顺×1 + 飞天孔雀×1 + 悟空加特林×4 + 水母×4 + 黄金三分钟×2
    products: [
      { keyword: '一帆风顺', quantity: 1 },
      { keyword: '飞天孔雀', quantity: 1 },
      { keyword: '悟空加特林', quantity: 4 },
      { keyword: '水母', quantity: 4 },
      { keyword: '黄金', quantity: 2 }
    ]
  }
];

async function findProductByKeyword(keyword: string) {
  const product = await prisma.product.findFirst({
    where: {
      status: 'ACTIVE',
      name: { contains: keyword }
    },
    select: { id: true, name: true, costPrice: true, supplyPrice: true, retailPrice: true }
  });
  return product;
}

async function main() {
  console.log('========================================');
  console.log('开始创建6款精选套餐...');
  console.log('========================================\n');

  // 1. 删除现有测试套餐
  console.log('步骤1: 清理现有套餐数据...');
  await prisma.packageItem.deleteMany({});
  await prisma.packageAgentPrice.deleteMany({});
  await prisma.productPackage.deleteMany({});
  console.log('  ✓ 已清理所有现有套餐数据\n');

  // 2. 获取所有商品列表
  console.log('步骤2: 获取商品列表...');
  const allProducts = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, costPrice: true, supplyPrice: true, retailPrice: true }
  });
  console.log(`  ✓ 共找到 ${allProducts.length} 个上架商品\n`);

  // 3. 创建套餐
  console.log('步骤3: 创建套餐...\n');

  for (let i = 0; i < packagesData.length; i++) {
    const pkgData = packagesData[i];
    console.log(`[${i + 1}/6] 创建套餐: ${pkgData.name} (${pkgData.code})`);
    console.log(`     定位: ${pkgData.positioning}, 成本: ¥${pkgData.costPrice}, 供货价: ¥${pkgData.supplyPrice}, 零售价: ¥${pkgData.masterRetailPrice}`);

    // 创建套餐
    const pkg = await prisma.productPackage.create({
      data: {
        code: pkgData.code,
        name: pkgData.name,
        positioning: pkgData.positioning,
        description: pkgData.description,
        images: JSON.stringify(['/uploads/products/placeholder.svg']),
        costPrice: pkgData.costPrice,
        supplyPrice: pkgData.supplyPrice,
        suggestedPrice: Math.round(pkgData.masterRetailPrice * 0.9),
        masterRetailPrice: pkgData.masterRetailPrice,
        grossMargin: pkgData.grossMargin,
        sceneTags: JSON.stringify(pkgData.sceneTags),
        targetAudience: pkgData.targetAudience,
        stockStrategy: 'COMPONENT',
        sort: i + 1,
        status: 'ACTIVE',
        createdBy: 1
      }
    });

    // 匹配并添加商品
    console.log('     商品配置:');
    let itemSort = 1;
    for (const productConfig of pkgData.products) {
      const product = await findProductByKeyword(productConfig.keyword);
      if (product) {
        await prisma.packageItem.create({
          data: {
            packageId: pkg.id,
            productId: product.id,
            quantity: productConfig.quantity,
            snapshotCostPrice: product.costPrice,
            snapshotSupplyPrice: product.supplyPrice,
            snapshotRetailPrice: product.retailPrice,
            sort: itemSort++
          }
        });
        console.log(`       ✓ ${product.name} x${productConfig.quantity}`);
      } else {
        console.log(`       ✗ 未找到商品: ${productConfig.keyword}`);
      }
    }
    console.log('');
  }

  // 4. 验证结果
  console.log('========================================');
  console.log('步骤4: 验证套餐创建结果...\n');

  const allPackages = await prisma.productPackage.findMany({
    include: {
      items: {
        include: { product: { select: { name: true } } }
      }
    },
    orderBy: { sort: 'asc' }
  });

  console.log('序号\t套餐名称\t\t定位\t商品数\t零售价\t毛利率');
  console.log('─'.repeat(70));
  for (const p of allPackages) {
    const posLabel = p.positioning === 'ENTRY' ? '引流款' : p.positioning === 'HOT' ? '爆款' : '利润款';
    console.log(`${p.sort}\t${p.name}\t\t${posLabel}\t${p.items.length}\t¥${p.masterRetailPrice}\t${(Number(p.grossMargin) * 100).toFixed(0)}%`);
  }

  console.log('\n========================================');
  console.log('✓ 6款精选套餐创建完成！');
  console.log('========================================');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('创建失败:', e);
  process.exit(1);
});

/**
 * 更新套餐数据脚本 v2
 *
 * 根据 蒙庆烟花_6款套餐方案_1.26.xlsx 更新套餐
 * 执行: npx ts-node scripts/update-packages-v2.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 新套餐配置
const NEW_PACKAGES = [
  {
    code: 'PKG001',
    name: '童趣欢乐包',
    positioning: 'ENTRY',
    description: '安全互动·亲子时光，适合有3-12岁孩子的家庭',
    targetAudience: '儿童首选',
    sceneTags: ['儿童', '亲子', '安全'],
    retailPrice: 168,
    marketPrice: 190,
    costPrice: 62,
    sort: 1,
    items: [
      { productId: 1112, quantity: 3 },  // 棒棒糖
      { productId: 1113, quantity: 5 },  // 18寸魔法仙女棒
      { productId: 1114, quantity: 3 },  // 28寸魔法仙女棒
      { productId: 1116, quantity: 3 },  // 精彩四变色
      { productId: 1117, quantity: 2 },  // 超级变变变
      { productId: 1126, quantity: 3 },  // 孔雀开屏
      { productId: 1133, quantity: 3 },  // 迷你加特林
    ]
  },
  {
    code: 'PKG002',
    name: '小区热闹包',
    positioning: 'ENTRY',
    description: '花样齐全·超值之选，新手闭眼入',
    targetAudience: '入门首选',
    sceneTags: ['新手', '超值', '花样多'],
    retailPrice: 299,
    marketPrice: 375,
    costPrice: 125,
    sort: 2,
    items: [
      { productId: 1133, quantity: 4 },  // 迷你加特林
      { productId: 1137, quantity: 2 },  // 悟空加特林
      { productId: 1123, quantity: 3 },  // 水母派对
      { productId: 1118, quantity: 2 },  // 超级棒棒糖
      { productId: 1129, quantity: 2 },  // 喜传炫彩三分钟
      { productId: 1126, quantity: 4 },  // 孔雀开屏
      { productId: 1116, quantity: 3 },  // 精彩四变色
      { productId: 1124, quantity: 3 },  // 星际水母带接驳器
    ]
  },
  {
    code: 'PKG003',
    name: '阖家团圆包',
    positioning: 'HOT',
    description: '大小皆宜·其乐融融，含20发礼花撑场面',
    targetAudience: '家庭主推',
    sceneTags: ['家庭', '主推', '全家'],
    retailPrice: 458,
    marketPrice: 479,
    costPrice: 171,
    sort: 3,
    items: [
      { productId: 1138, quantity: 1 },  // 虎城之花20发
      { productId: 1164, quantity: 3 },  // 非凡加特林
      { productId: 1165, quantity: 2 },  // 超能加特林
      { productId: 1123, quantity: 4 },  // 水母派对
      { productId: 1131, quantity: 2 },  // 黄金三分钟
      { productId: 1118, quantity: 3 },  // 超级棒棒糖
      { productId: 1126, quantity: 4 },  // 孔雀开屏
      { productId: 1116, quantity: 3 },  // 精彩四变色
    ]
  },
  {
    code: 'PKG004',
    name: '红火迎春包',
    positioning: 'HOT',
    description: '效果震撼·年味十足，双礼花组合燃放20分钟+',
    targetAudience: '经典升级',
    sceneTags: ['震撼', '双礼花', '年味'],
    retailPrice: 688,
    marketPrice: 727,
    costPrice: 315,
    sort: 4,
    items: [
      { productId: 1141, quantity: 1 },  // 60发一帆风顺
      { productId: 1144, quantity: 1 },  // 大吉系列81发
      { productId: 1134, quantity: 3 },  // 极速英雄加特林
      { productId: 1135, quantity: 2 },  // 幻影加特林
      { productId: 1137, quantity: 2 },  // 悟空加特林
      { productId: 1123, quantity: 4 },  // 水母派对
      { productId: 1118, quantity: 3 },  // 超级棒棒糖
      { productId: 1127, quantity: 1 },  // 飞天孔雀（大型号）
    ]
  },
  {
    code: 'PKG005',
    name: '金玉满堂包',
    positioning: 'PROFIT',
    description: '好名好彩·财运亨通，100发大礼花寓意超好',
    targetAudience: '寓意吉祥',
    sceneTags: ['吉祥', '好彩头', '送礼'],
    retailPrice: 1088,
    marketPrice: 1118,
    costPrice: 532,
    sort: 5,
    items: [
      { productId: 1143, quantity: 1 },  // 凤舞成祥80发
      { productId: 1139, quantity: 1 },  // 金银财宝100发
      { productId: 1159, quantity: 1 },  // 丰运树/黄金树
      { productId: 1160, quantity: 1 },  // 马上有钱/来财
      { productId: 1136, quantity: 2 },  // 七彩风暴/七彩魔方加特林
      { productId: 1137, quantity: 3 },  // 悟空加特林
      { productId: 1130, quantity: 3 },  // 凡美炫彩三分钟
      { productId: 1119, quantity: 2 },  // 网红棒棒糖
      { productId: 1127, quantity: 1 },  // 飞天孔雀（大型号）
    ]
  },
  {
    code: 'PKG006',
    name: '霸气冲天包',
    positioning: 'PROFIT',
    description: '全村最亮·邻居羡慕，138发+100发双王炸燃放30分钟+',
    targetAudience: '土豪专属',
    sceneTags: ['土豪', '最震撼', '双王炸'],
    retailPrice: 1888,
    marketPrice: 2257,
    costPrice: 1106,
    sort: 6,
    items: [
      { productId: 1150, quantity: 1 },  // 美不胜收138发
      { productId: 1147, quantity: 1 },  // 100发蓝色海洋
      { productId: 1140, quantity: 1 },  // 国色天香
      { productId: 1138, quantity: 1 },  // 虎城之花20发
      { productId: 1136, quantity: 3 },  // 七彩风暴/七彩魔方加特林
      { productId: 1165, quantity: 4 },  // 超能加特林
      { productId: 1130, quantity: 3 },  // 凡美炫彩三分钟
      { productId: 1120, quantity: 2 },  // 王者无敌棒棒糖
      { productId: 1128, quantity: 2 },  // 星空孔雀
    ]
  },
];

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║        套餐数据更新工具 v2 - 1.26新方案                   ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('\n开始时间:', new Date().toISOString());

  try {
    // 1. 删除旧套餐数据
    console.log('\n[步骤1] 删除旧套餐数据...');

    // 先删除套餐商品关联
    const deletedItems = await prisma.packageItem.deleteMany({});
    console.log(`  删除套餐商品关联: ${deletedItems.count} 条`);

    // 再删除套餐
    const deletedPackages = await prisma.productPackage.deleteMany({});
    console.log(`  删除套餐: ${deletedPackages.count} 条`);

    // 2. 获取商品价格信息
    console.log('\n[步骤2] 获取商品价格信息...');
    const productIds = [...new Set(NEW_PACKAGES.flatMap(p => p.items.map(i => i.productId)))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, costPrice: true, supplyPrice: true, masterRetailPrice: true }
    });
    const productMap = new Map(products.map(p => [p.id, p]));
    console.log(`  加载 ${products.length} 个商品信息`);

    // 3. 创建新套餐
    console.log('\n[步骤3] 创建新套餐...');

    for (const pkg of NEW_PACKAGES) {
      // 计算供货价（成本 * 1.3）
      const supplyPrice = Math.round(pkg.costPrice * 1.3);
      // 毛利率
      const grossMargin = ((pkg.retailPrice - pkg.costPrice) / pkg.retailPrice).toFixed(2);

      // 创建套餐
      const createdPackage = await prisma.productPackage.create({
        data: {
          code: pkg.code,
          name: pkg.name,
          positioning: pkg.positioning,
          description: pkg.description,
          targetAudience: pkg.targetAudience,
          sceneTags: JSON.stringify(pkg.sceneTags),
          costPrice: pkg.costPrice,
          supplyPrice: supplyPrice,
          suggestedPrice: pkg.marketPrice,
          masterRetailPrice: pkg.retailPrice,
          grossMargin: parseFloat(grossMargin),
          stockStrategy: 'COMPONENT',
          independentStock: 0,
          sort: pkg.sort,
          status: 'ACTIVE',
          createdBy: 1,
          images: '[]',
        }
      });

      console.log(`\n  ✓ 创建套餐: ${pkg.name} (ID: ${createdPackage.id})`);
      console.log(`    零售价: ¥${pkg.retailPrice} | 市场价: ¥${pkg.marketPrice} | 成本: ¥${pkg.costPrice}`);

      // 创建套餐商品关联
      let sortIndex = 1;
      for (const item of pkg.items) {
        const product = productMap.get(item.productId);
        if (!product) {
          console.log(`    ⚠ 商品不存在: ID ${item.productId}`);
          continue;
        }

        await prisma.packageItem.create({
          data: {
            packageId: createdPackage.id,
            productId: item.productId,
            quantity: item.quantity,
            snapshotCostPrice: product.costPrice,
            snapshotSupplyPrice: product.supplyPrice,
            snapshotRetailPrice: product.masterRetailPrice,
            sort: sortIndex++,
          }
        });
        console.log(`    - ${product.name} x${item.quantity}`);
      }
    }

    // 4. 统计结果
    const finalCount = await prisma.productPackage.count({ where: { status: 'ACTIVE' } });
    const itemCount = await prisma.packageItem.count();

    console.log('\n' + '='.repeat(60));
    console.log('更新完成！');
    console.log('='.repeat(60));
    console.log(`  套餐数量: ${finalCount}`);
    console.log(`  商品关联: ${itemCount}`);
    console.log('结束时间:', new Date().toISOString());

  } catch (error) {
    console.error('\n[ERROR] 更新失败！');
    console.error(error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();

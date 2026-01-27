/**
 * 添加6个套餐方案到数据库
 * 【2026-01-26】根据蒙庆烟花_6款套餐方案_1.26.xlsx
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 套餐定义
const packages = [
  {
    code: 'PKG-TONGQU',
    name: '童趣欢乐包',
    positioning: 'ENTRY',
    description: '安全互动·亲子时光，低噪音不吓人，可手持安全玩',
    costPrice: 62,
    supplyPrice: 84,  // 成本+35%
    masterRetailPrice: 168,
    grossMargin: 63,  // (168-62)/168*100
    sceneTags: ['儿童首选', '亲子互动', '安全低噪'],
    targetAudience: '有3-12岁孩子的家庭',
    items: [
      { name: '棒棒糖', quantity: 3 },
      { name: '18寸魔法仙女棒', quantity: 5 },
      { name: '28寸魔法仙女棒', quantity: 3 },
      { name: '精彩四变色', quantity: 3 },
      { name: '超级变变变', quantity: 2 },
      { name: '孔雀开屏', quantity: 3 },
      { name: '迷你加特林', quantity: 3 },
    ]
  },
  {
    code: 'PKG-XIAOQU',
    name: '小区热闹包',
    positioning: 'ENTRY',
    description: '花样齐全·超值之选，23件数量超多，8种花样不重复',
    costPrice: 125,
    supplyPrice: 169,
    masterRetailPrice: 299,
    grossMargin: 58,
    sceneTags: ['入门首选', '花样齐全', '超值'],
    targetAudience: '预算有限、想热闹的家庭',
    items: [
      { name: '迷你加特林', quantity: 4 },
      { name: '悟空加特林', quantity: 2 },
      { name: '水母派对', quantity: 3 },
      { name: '超级棒棒糖', quantity: 2 },
      { name: '喜传炫彩三分钟', quantity: 2 },
      { name: '孔雀开屏', quantity: 4 },
      { name: '精彩四变色', quantity: 3 },
      { name: '星际水母带接驳器', quantity: 3 },
    ]
  },
  {
    code: 'PKG-HEJIA',
    name: '阖家团圆包',
    positioning: 'HOT',
    description: '大小皆宜·其乐融融，含20发礼花撑场面，燃放15分钟+',
    costPrice: 171,
    supplyPrice: 230,
    masterRetailPrice: 458,
    grossMargin: 63,
    sceneTags: ['家庭主推', '大人小孩都能玩', '燃放时间长'],
    targetAudience: '3-5口之家，想要完整体验',
    items: [
      { name: '虎城之花20发', quantity: 1 },
      { name: '非凡加特林', quantity: 3 },
      { name: '超能加特林', quantity: 2 },
      { name: '水母派对', quantity: 4 },
      { name: '黄金三分钟', quantity: 2 },
      { name: '超级棒棒糖', quantity: 3 },
      { name: '孔雀开屏', quantity: 4 },
      { name: '精彩四变色', quantity: 3 },
    ]
  },
  {
    code: 'PKG-HONGHUO',
    name: '红火迎春包',
    positioning: 'HOT',
    description: '效果震撼·年味十足，双礼花组合，6款加特林，燃放20分钟+',
    costPrice: 315,
    supplyPrice: 425,
    masterRetailPrice: 688,
    grossMargin: 54,
    sceneTags: ['经典升级', '效果震撼', '双礼花'],
    targetAudience: '追求燃放效果的客户',
    items: [
      { name: '60发一帆风顺', quantity: 1 },
      { name: '大吉系列81发', quantity: 1 },
      { name: '极速英雄加特林', quantity: 3 },
      { name: '幻影加特林', quantity: 2 },
      { name: '悟空加特林', quantity: 2 },
      { name: '水母派对', quantity: 4 },
      { name: '超级棒棒糖', quantity: 3 },
      { name: '飞天孔雀', quantity: 1 },
    ]
  },
  {
    code: 'PKG-JINYU',
    name: '金玉满堂包',
    positioning: 'PROFIT',
    description: '好名好彩·财运亨通，产品名寓意超好，100发大礼花',
    costPrice: 532,
    supplyPrice: 720,
    masterRetailPrice: 1088,
    grossMargin: 51,
    sceneTags: ['寓意吉祥', '好彩头', '100发大礼花'],
    targetAudience: '注重仪式感、讲究好彩头',
    items: [
      { name: '凤舞成祥80发', quantity: 1 },
      { name: '金银财宝100发', quantity: 1 },
      { name: '丰运树', quantity: 1 },
      { name: '马上有钱', quantity: 1 },
      { name: '七彩风暴加特林', quantity: 2 },
      { name: '悟空加特林', quantity: 3 },
      { name: '凡美炫彩三分钟', quantity: 3 },
      { name: '网红棒棒糖', quantity: 2 },
      { name: '飞天孔雀', quantity: 1 },
    ]
  },
  {
    code: 'PKG-BAQI',
    name: '霸气冲天包',
    positioning: 'PROFIT',
    description: '全村最亮·邻居羡慕，138发+100发双王炸，燃放30分钟+',
    costPrice: 1106,
    supplyPrice: 1490,
    masterRetailPrice: 1888,
    grossMargin: 41,
    sceneTags: ['土豪专属', '效果炸裂', '双王炸'],
    targetAudience: '预算充足、追求最震撼效果',
    items: [
      { name: '美不胜收138发', quantity: 1 },
      { name: '100发蓝色海洋', quantity: 1 },
      { name: '国色天香', quantity: 1 },
      { name: '虎城之花20发', quantity: 1 },
      { name: '七彩风暴加特林', quantity: 3 },
      { name: '超能加特林', quantity: 4 },
      { name: '凡美炫彩三分钟', quantity: 3 },
      { name: '王者无敌棒棒糖', quantity: 2 },
      { name: '星空孔雀', quantity: 2 },
    ]
  }
];

async function findProductByName(name: string) {
  // 模糊匹配产品名称
  const product = await prisma.product.findFirst({
    where: {
      OR: [
        { name: { contains: name } },
        { name: { contains: name.replace(/[/／]/g, '') } },
      ],
      status: 'ACTIVE',
    },
    select: { id: true, name: true, costPrice: true, supplyPrice: true, retailPrice: true },
  });
  return product;
}

async function main() {
  console.log('开始添加6个套餐...\n');

  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i];
    console.log(`\n===== 处理套餐 ${i + 1}: ${pkg.name} =====`);

    // 检查是否已存在
    const existing = await prisma.productPackage.findFirst({
      where: { code: pkg.code },
    });
    if (existing) {
      console.log(`套餐 ${pkg.name} 已存在 (ID: ${existing.id})，跳过`);
      continue;
    }

    // 查找商品
    const items: { productId: number; quantity: number; name: string }[] = [];
    let allFound = true;

    for (const item of pkg.items) {
      const product = await findProductByName(item.name);
      if (product) {
        items.push({
          productId: product.id,
          quantity: item.quantity,
          name: product.name,
        });
        console.log(`  ✓ 找到商品: ${item.name} -> ${product.name} (ID: ${product.id})`);
      } else {
        console.log(`  ✗ 未找到商品: ${item.name}`);
        allFound = false;
      }
    }

    if (!allFound) {
      console.log(`\n套餐 ${pkg.name} 有商品未找到，请手动处理`);
      continue;
    }

    // 创建套餐
    try {
      const newPkg = await prisma.productPackage.create({
        data: {
          code: pkg.code,
          name: pkg.name,
          positioning: pkg.positioning,
          description: pkg.description,
          images: '[]',
          costPrice: pkg.costPrice,
          supplyPrice: pkg.supplyPrice,
          masterRetailPrice: pkg.masterRetailPrice,
          grossMargin: pkg.grossMargin,
          sceneTags: JSON.stringify(pkg.sceneTags),
          targetAudience: pkg.targetAudience,
          stockStrategy: 'COMPONENT',
          independentStock: 0,
          sort: i + 1,  // 按顺序排序
          status: 'ACTIVE',
          createdBy: 1,
        },
      });

      console.log(`\n创建套餐成功: ${newPkg.name} (ID: ${newPkg.id})`);

      // 添加套餐商品
      for (let j = 0; j < items.length; j++) {
        const item = items[j];
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { costPrice: true, supplyPrice: true, retailPrice: true },
        });

        await prisma.packageItem.create({
          data: {
            packageId: newPkg.id,
            productId: item.productId,
            quantity: item.quantity,
            snapshotCostPrice: product?.costPrice || 0,
            snapshotSupplyPrice: product?.supplyPrice || 0,
            snapshotRetailPrice: product?.retailPrice || 0,
            sort: j,
          },
        });
        console.log(`  添加商品: ${item.name} x${item.quantity}`);
      }
    } catch (error) {
      console.error(`创建套餐 ${pkg.name} 失败:`, error);
    }
  }

  console.log('\n\n===== 完成 =====');

  // 列出所有套餐
  const allPackages = await prisma.productPackage.findMany({
    orderBy: { sort: 'asc' },
    select: { id: true, code: true, name: true, sort: true, status: true },
  });
  console.log('\n当前所有套餐:');
  allPackages.forEach(p => {
    console.log(`  ${p.sort}. [${p.code}] ${p.name} (ID: ${p.id}, ${p.status})`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

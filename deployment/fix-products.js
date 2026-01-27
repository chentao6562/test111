const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 商品数据（来自CSV价格表，带正确的分类和单位）
const products = [
  // 娱乐类（9个）
  { name: '棒棒糖', category: '娱乐类', spec: '42个/1件', unit: '个', costPrice: 4.0, supplyPrice: 5.6, suggestedPrice: 6.4, retailPrice: 8, image: '1棒棒糖.jpg' },
  { name: '18寸魔法仙女棒', category: '娱乐类', spec: '8个/10包/10盒/1件', unit: '盒', costPrice: 0.8, supplyPrice: 1.1, suggestedPrice: 1.2, retailPrice: 2, image: '2.18寸仙女棒.jpg' },
  { name: '28寸魔法仙女棒', category: '娱乐类', spec: '8个/60盒/1件', unit: '盒', costPrice: 1.3, supplyPrice: 1.8, suggestedPrice: 2.0, retailPrice: 3, image: '3.28寸仙女棒.jpg' },
  { name: '36寸魔法仙女棒', category: '娱乐类', spec: '6个/50盒/1件', unit: '盒', costPrice: 1.5, supplyPrice: 2.1, suggestedPrice: 2.4, retailPrice: 3, image: '4.36寸仙女棒.jpg' },
  { name: '精彩四变色', category: '娱乐类', spec: '18个/100盒/1件', unit: '盒', costPrice: 2.0, supplyPrice: 2.8, suggestedPrice: 3.2, retailPrice: 4, image: '5精彩四变色.jpg' },
  { name: '超级变变变', category: '娱乐类', spec: '10个/60盒/1件', unit: '盒', costPrice: 3.0, supplyPrice: 4.2, suggestedPrice: 4.8, retailPrice: 6, image: '6超级变变变.png' },
  { name: '超级棒棒糖', category: '娱乐类', spec: '30个/1件', unit: '个', costPrice: 5.8, supplyPrice: 8.3, suggestedPrice: 9.5, retailPrice: 12, image: '7超级棒棒糖.jpg' },
  { name: '网红棒棒糖', category: '娱乐类', spec: '20个/1件', unit: '个', costPrice: 10.5, supplyPrice: 14.3, suggestedPrice: 16.1, retailPrice: 20, image: '8网红棒棒糖.jpg' },
  { name: '王者无敌棒棒糖', category: '娱乐类', spec: '8个/1件', unit: '个', costPrice: 18.5, supplyPrice: 25.5, suggestedPrice: 28.8, retailPrice: 36, image: '9无敌棒棒糖.png' },

  // 彩花类（10个）
  { name: '精灵布布', category: '彩花类', spec: '16个/1件', unit: '个', costPrice: 13.0, supplyPrice: 17.8, suggestedPrice: 20.1, retailPrice: 25, image: '10精灵布布.png' },
  { name: '水母派对', category: '彩花类', spec: '10个/20盒/1件', unit: '盒', costPrice: 5.5, supplyPrice: 7.7, suggestedPrice: 8.7, retailPrice: 11, image: '12水母派对.jpg' },
  { name: '星际水母带接驳器', category: '彩花类', spec: '10个/20盒/1件', unit: '盒', costPrice: 5.5, supplyPrice: 7.7, suggestedPrice: 8.7, retailPrice: 11, image: '13星际水母带接驳器.png' },
  { name: '蘑菇精灵', category: '彩花类', spec: '4个/30盒/1件', unit: '盒', costPrice: 10.0, supplyPrice: 13.6, suggestedPrice: 15.3, retailPrice: 19, image: '14 蘑菇精灵.jpg' },
  { name: '孔雀开屏', category: '彩花类', spec: '24个/1件', unit: '个', costPrice: 5.0, supplyPrice: 7.0, suggestedPrice: 7.9, retailPrice: 10, image: '15孔雀开屏.png' },
  { name: '飞天孔雀', category: '彩花类', spec: '12个/1件', unit: '个', costPrice: 31.5, supplyPrice: 42.9, suggestedPrice: 48.3, retailPrice: 60, image: '16飞天孔雀.png' },
  { name: '星空孔雀', category: '彩花类', spec: '20个/1件', unit: '个', costPrice: 17.5, supplyPrice: 24.1, suggestedPrice: 27.2, retailPrice: 34, image: '17星空孔雀.png' },
  { name: '炫彩三分钟', category: '彩花类', spec: '24个/1件', unit: '个', costPrice: 7.8, supplyPrice: 10.7, suggestedPrice: 12.1, retailPrice: 15, image: '18炫彩三分钟.png' },
  { name: '黄金三分钟', category: '彩花类', spec: '24个/1件', unit: '个', costPrice: 11.0, supplyPrice: 15.0, suggestedPrice: 16.9, retailPrice: 21, image: '19黄金三分钟.png' },
  { name: '卡通系列—西游记', category: '彩花类', spec: '24个/1件', unit: '个', costPrice: 10.5, supplyPrice: 14.3, suggestedPrice: 16.1, retailPrice: 20, image: '20卡通西游记.png' },

  // 网红加特林类（5个）
  { name: '迷你加特林', category: '网红加特林类', spec: '30个/1件', unit: '个', costPrice: 5.0, supplyPrice: 7.0, suggestedPrice: 7.9, retailPrice: 10, image: '23迷你加特林.jpg' },
  { name: '极速英雄加特林', category: '网红加特林类', spec: '12个/1件', unit: '个', costPrice: 11.0, supplyPrice: 15.0, suggestedPrice: 16.9, retailPrice: 21, image: '24极速英雄加特林.png' },
  { name: '幻影加特林', category: '网红加特林类', spec: '12个/1件', unit: '个', costPrice: 11.0, supplyPrice: 15.0, suggestedPrice: 16.9, retailPrice: 21, image: '25幻影加特林.png' },
  { name: '七彩加特林', category: '网红加特林类', spec: '8个/1件', unit: '个', costPrice: 24.0, supplyPrice: 32.8, suggestedPrice: 37.0, retailPrice: 46, image: '26 七彩风暴七彩魔方加特林.jpg' },
  { name: '悟空加特林', category: '网红加特林类', spec: '12个/1件', unit: '个', costPrice: 9.5, supplyPrice: 13.3, suggestedPrice: 15.1, retailPrice: 19, image: '27悟空加特林.jpg' },

  // 儿童套餐（1个）
  { name: '欢乐宝盒', category: '儿童套餐', spec: '24个/礼盒', unit: '礼盒', costPrice: 270.0, supplyPrice: 368.0, suggestedPrice: 414.5, retailPrice: 515, image: '11 欢乐宝盒.png' },

  // 家用礼花（1个）
  { name: '20发缤纷溢彩', category: '家用礼花', spec: '1份/箱', unit: '箱', costPrice: 370.0, supplyPrice: 504.0, suggestedPrice: 567.6, retailPrice: 705, image: '28.缤纷溢彩20发.jpg' },
];

async function fixProducts() {
  try {
    console.log('=== 开始修正商品数据 ===\n');

    // 1. 删除现有商品
    const deleteResult = await prisma.product.deleteMany();
    console.log('删除现有商品:', deleteResult.count, '个');

    // 2. 删除不需要的旧分类（保留娱乐类、彩花类、网红加特林类，删除其他）
    const oldCategories = await prisma.category.findMany();
    console.log('\n现有分类:', oldCategories.map(c => c.name).join(', '));

    // 需要的分类
    const neededCategories = ['娱乐类', '彩花类', '网红加特林类', '儿童套餐', '家用礼花'];
    const categoryMap = {};

    // 创建或获取分类
    for (let i = 0; i < neededCategories.length; i++) {
      const name = neededCategories[i];
      let category = await prisma.category.findFirst({ where: { name } });
      if (!category) {
        category = await prisma.category.create({
          data: { name, sort: i + 1 }
        });
        console.log('创建分类:', name, '- ID:', category.id);
      } else {
        console.log('分类已存在:', name, '- ID:', category.id);
      }
      categoryMap[name] = category.id;
    }

    console.log('\n开始创建商品...\n');

    // 3. 创建商品
    let created = 0;
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      const imageUrl = `/uploads/products/${encodeURIComponent(p.image)}`;

      const product = await prisma.product.create({
        data: {
          name: p.name,
          categoryId: categoryMap[p.category],
          description: `${p.name} - ${p.spec}`,
          images: JSON.stringify([imageUrl]),
          // 必填价格字段
          retailPrice: p.retailPrice,
          agentPrice: p.supplyPrice,
          wholesalePrice: p.supplyPrice,
          // 可选价格字段
          costPrice: p.costPrice,
          supplyPrice: p.supplyPrice,
          suggestedPrice: p.suggestedPrice,
          masterRetailPrice: p.retailPrice,
          minRetailPrice: p.supplyPrice,
          // 库存
          stock: 100,
          lockStock: 0,
          status: 'ACTIVE',
          unit: p.unit,  // 使用正确的单位
          sort: i + 1,
        }
      });

      console.log(`[${i + 1}/${products.length}] ${p.name} - ¥${p.retailPrice}/${p.unit} - 分类:${p.category} - ID:${product.id}`);
      created++;
    }

    console.log(`\n=== 商品修正完成 ===`);
    console.log(`创建商品: ${created} 个`);

    // 4. 验证
    const totalProducts = await prisma.product.count();
    const productsByCategory = await prisma.product.groupBy({
      by: ['categoryId'],
      _count: { id: true }
    });

    console.log(`\n数据库中商品总数: ${totalProducts}`);
    console.log('\n按分类统计:');
    for (const stat of productsByCategory) {
      const cat = await prisma.category.findUnique({ where: { id: stat.categoryId } });
      console.log(`  - ${cat.name}: ${stat._count.id} 个`);
    }

    // 显示单位分布
    const productList = await prisma.product.findMany({ select: { name: true, unit: true } });
    const unitCounts = {};
    productList.forEach(p => {
      unitCounts[p.unit] = (unitCounts[p.unit] || 0) + 1;
    });
    console.log('\n按单位统计:');
    for (const [unit, count] of Object.entries(unitCounts)) {
      console.log(`  - ${unit}: ${count} 个商品`);
    }

    await prisma.$disconnect();
  } catch(e) {
    console.error('Error:', e.message);
    console.error(e.stack);
    await prisma.$disconnect();
    process.exit(1);
  }
}

fixProducts();

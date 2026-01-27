const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 商品数据（来自CSV价格表）
const products = [
  // 娱乐类
  { name: '棒棒糖', category: '娱乐类', spec: '42个/件', costPrice: 4.0, supplyPrice: 5.6, suggestedPrice: 6.4, retailPrice: 8, image: '1棒棒糖.jpg' },
  { name: '18寸魔法仙女棒', category: '娱乐类', spec: '8个/10包/10盒/件', costPrice: 0.8, supplyPrice: 1.1, suggestedPrice: 1.2, retailPrice: 2, image: '2.18寸仙女棒.jpg' },
  { name: '28寸魔法仙女棒', category: '娱乐类', spec: '8个/60盒/件', costPrice: 1.3, supplyPrice: 1.8, suggestedPrice: 2.0, retailPrice: 3, image: '3.28寸仙女棒.jpg' },
  { name: '36寸魔法仙女棒', category: '娱乐类', spec: '6个/50盒/件', costPrice: 1.5, supplyPrice: 2.1, suggestedPrice: 2.4, retailPrice: 3, image: '4.36寸仙女棒.jpg' },
  { name: '精彩四变色', category: '娱乐类', spec: '18个/100盒/件', costPrice: 2.0, supplyPrice: 2.8, suggestedPrice: 3.2, retailPrice: 4, image: '5精彩四变色.jpg' },
  { name: '超级变变变', category: '娱乐类', spec: '10个/60盒/件', costPrice: 3.0, supplyPrice: 4.2, suggestedPrice: 4.8, retailPrice: 6, image: '6超级变变变.png' },
  { name: '超级棒棒糖', category: '娱乐类', spec: '30个/件', costPrice: 5.8, supplyPrice: 8.3, suggestedPrice: 9.5, retailPrice: 12, image: '7超级棒棒糖.jpg' },
  { name: '网红棒棒糖', category: '娱乐类', spec: '20个/件', costPrice: 10.5, supplyPrice: 14.3, suggestedPrice: 16.1, retailPrice: 20, image: '8网红棒棒糖.jpg' },
  { name: '王者无敌棒棒糖', category: '娱乐类', spec: '8个/件', costPrice: 18.5, supplyPrice: 25.5, suggestedPrice: 28.8, retailPrice: 36, image: '9无敌棒棒糖.png' },

  // 彩花类
  { name: '精灵布布', category: '彩花类', spec: '16个/件', costPrice: 13.0, supplyPrice: 17.8, suggestedPrice: 20.1, retailPrice: 25, image: '10精灵布布.png' },
  { name: '水母派对', category: '彩花类', spec: '10个/20盒/件', costPrice: 5.5, supplyPrice: 7.7, suggestedPrice: 8.7, retailPrice: 11, image: '12水母派对.jpg' },
  { name: '星际水母带接驳器', category: '彩花类', spec: '10个/20盒/件', costPrice: 5.5, supplyPrice: 7.7, suggestedPrice: 8.7, retailPrice: 11, image: '13星际水母带接驳器.png' },
  { name: '蘑菇精灵', category: '彩花类', spec: '4个/30盒/件', costPrice: 10.0, supplyPrice: 13.6, suggestedPrice: 15.3, retailPrice: 19, image: '14 蘑菇精灵.jpg' },
  { name: '孔雀开屏', category: '彩花类', spec: '24个/件', costPrice: 5.0, supplyPrice: 7.0, suggestedPrice: 7.9, retailPrice: 10, image: '15孔雀开屏.png' },
  { name: '飞天孔雀', category: '彩花类', spec: '12个/件', costPrice: 31.5, supplyPrice: 42.9, suggestedPrice: 48.3, retailPrice: 60, image: '16飞天孔雀.png' },
  { name: '星空孔雀', category: '彩花类', spec: '20个/件', costPrice: 17.5, supplyPrice: 24.1, suggestedPrice: 27.2, retailPrice: 34, image: '17星空孔雀.png' },
  { name: '炫彩三分钟', category: '彩花类', spec: '24个/件', costPrice: 7.8, supplyPrice: 10.7, suggestedPrice: 12.1, retailPrice: 15, image: '18炫彩三分钟.png' },
  { name: '黄金三分钟', category: '彩花类', spec: '24个/件', costPrice: 11.0, supplyPrice: 15.0, suggestedPrice: 16.9, retailPrice: 21, image: '19黄金三分钟.png' },
  { name: '卡通系列—西游记', category: '彩花类', spec: '24个/件', costPrice: 10.5, supplyPrice: 14.3, suggestedPrice: 16.1, retailPrice: 20, image: '20卡通西游记.png' },

  // 网红加特林类
  { name: '迷你加特林', category: '网红加特林类', spec: '30个/件', costPrice: 5.0, supplyPrice: 7.0, suggestedPrice: 7.9, retailPrice: 10, image: '23迷你加特林.jpg' },
  { name: '极速英雄加特林', category: '网红加特林类', spec: '12个/件', costPrice: 11.0, supplyPrice: 15.0, suggestedPrice: 16.9, retailPrice: 21, image: '24极速英雄加特林.png' },
  { name: '幻影加特林', category: '网红加特林类', spec: '12个/件', costPrice: 11.0, supplyPrice: 15.0, suggestedPrice: 16.9, retailPrice: 21, image: '25幻影加特林.png' },
  { name: '七彩加特林', category: '网红加特林类', spec: '8个/件', costPrice: 24.0, supplyPrice: 32.8, suggestedPrice: 37.0, retailPrice: 46, image: '26 七彩风暴七彩魔方加特林.jpg' },
  { name: '悟空加特林', category: '网红加特林类', spec: '12个/件', costPrice: 9.5, supplyPrice: 13.3, suggestedPrice: 15.1, retailPrice: 19, image: '27悟空加特林.jpg' },

  // 套餐类
  { name: '欢乐宝盒', category: '套餐类', spec: '24个/礼盒', costPrice: 270.0, supplyPrice: 368.0, suggestedPrice: 414.5, retailPrice: 515, image: '11 欢乐宝盒.png' },
  { name: '20发缤纷溢彩', category: '套餐类', spec: '1份/箱', costPrice: 370.0, supplyPrice: 504.0, suggestedPrice: 567.6, retailPrice: 705, image: '28.缤纷溢彩20发.jpg' },
];

async function createProducts() {
  try {
    console.log('开始创建商品分类和商品...\n');

    // 获取或创建分类
    const categoryNames = [...new Set(products.map(p => p.category))];
    const categoryMap = {};

    for (const name of categoryNames) {
      let category = await prisma.category.findFirst({ where: { name } });
      if (!category) {
        category = await prisma.category.create({
          data: { name, sort: categoryNames.indexOf(name) + 1 }
        });
        console.log('创建分类:', name, '- ID:', category.id);
      } else {
        console.log('分类已存在:', name, '- ID:', category.id);
      }
      categoryMap[name] = category.id;
    }

    console.log('\n开始创建商品...\n');

    // 创建商品
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
          agentPrice: p.supplyPrice,      // 代理价 = 供货价
          wholesalePrice: p.supplyPrice,  // 批发价 = 供货价
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
          unit: '个',
          sort: i + 1,
        }
      });

      console.log(`[${i + 1}/${products.length}] 创建商品: ${p.name} - ¥${p.retailPrice} - ID:${product.id}`);
      created++;
    }

    console.log(`\n=== 商品创建完成 ===`);
    console.log(`创建分类: ${categoryNames.length} 个`);
    console.log(`创建商品: ${created} 个`);

    // 验证
    const totalProducts = await prisma.product.count();
    const totalCategories = await prisma.category.count();
    console.log(`\n数据库中商品总数: ${totalProducts}`);
    console.log(`数据库中分类总数: ${totalCategories}`);

    await prisma.$disconnect();
  } catch(e) {
    console.error('Error:', e.message);
    console.error(e.stack);
    await prisma.$disconnect();
    process.exit(1);
  }
}

createProducts();

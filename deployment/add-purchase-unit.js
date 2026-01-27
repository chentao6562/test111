const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 商品进货单位换算配置
// 从规格中解析：42个/1件 => { purchaseUnit: '件', unitConversion: 42 }
const productUnitConfig = {
  '棒棒糖': { purchaseUnit: '件', unitConversion: 42, unit: '个' },
  '18寸魔法仙女棒': { purchaseUnit: '件', unitConversion: 800, unit: '盒' },  // 8个/10包/10盒/1件 = 800盒
  '28寸魔法仙女棒': { purchaseUnit: '件', unitConversion: 60, unit: '盒' },   // 8个/60盒/1件
  '36寸魔法仙女棒': { purchaseUnit: '件', unitConversion: 50, unit: '盒' },   // 6个/50盒/1件
  '精彩四变色': { purchaseUnit: '件', unitConversion: 100, unit: '盒' },       // 18个/100盒/1件
  '超级变变变': { purchaseUnit: '件', unitConversion: 60, unit: '盒' },        // 10个/60盒/1件
  '超级棒棒糖': { purchaseUnit: '件', unitConversion: 30, unit: '个' },        // 30个/1件
  '网红棒棒糖': { purchaseUnit: '件', unitConversion: 20, unit: '个' },        // 20个/1件
  '王者无敌棒棒糖': { purchaseUnit: '件', unitConversion: 8, unit: '个' },     // 8个/1件
  '精灵布布': { purchaseUnit: '件', unitConversion: 16, unit: '个' },          // 16个/1件
  '水母派对': { purchaseUnit: '件', unitConversion: 20, unit: '盒' },          // 10个/20盒/1件
  '星际水母带接驳器': { purchaseUnit: '件', unitConversion: 20, unit: '盒' },  // 10个/20盒/1件
  '蘑菇精灵': { purchaseUnit: '件', unitConversion: 30, unit: '盒' },          // 4个/30盒/1件
  '孔雀开屏': { purchaseUnit: '件', unitConversion: 24, unit: '个' },          // 24个/1件
  '飞天孔雀': { purchaseUnit: '件', unitConversion: 12, unit: '个' },          // 12个/1件
  '星空孔雀': { purchaseUnit: '件', unitConversion: 20, unit: '个' },          // 20个/1件
  '炫彩三分钟': { purchaseUnit: '件', unitConversion: 24, unit: '个' },        // 24个/1件
  '黄金三分钟': { purchaseUnit: '件', unitConversion: 24, unit: '个' },        // 24个/1件
  '卡通系列—西游记': { purchaseUnit: '件', unitConversion: 24, unit: '个' },   // 24个/1件
  '迷你加特林': { purchaseUnit: '件', unitConversion: 30, unit: '个' },        // 30个/1件
  '极速英雄加特林': { purchaseUnit: '件', unitConversion: 12, unit: '个' },    // 12个/1件
  '幻影加特林': { purchaseUnit: '件', unitConversion: 12, unit: '个' },        // 12个/1件
  '七彩加特林': { purchaseUnit: '件', unitConversion: 8, unit: '个' },         // 8个/1件
  '悟空加特林': { purchaseUnit: '件', unitConversion: 12, unit: '个' },        // 12个/1件
  '欢乐宝盒': { purchaseUnit: '礼盒', unitConversion: 1, unit: '礼盒' },       // 24个/礼盒 - 按礼盒卖
  '20发缤纷溢彩': { purchaseUnit: '箱', unitConversion: 1, unit: '箱' },       // 1份/箱 - 按箱卖
};

async function addPurchaseUnit() {
  try {
    console.log('=== 添加进货单位字段 ===\n');

    // 1. 先检查字段是否存在，如果不存在则添加
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE products
        ADD COLUMN purchase_unit VARCHAR(20) DEFAULT '件',
        ADD COLUMN unit_conversion INT DEFAULT 1
      `);
      console.log('数据库字段添加成功');
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('字段已存在，跳过创建');
      } else {
        throw e;
      }
    }

    // 2. 更新每个商品的进货单位配置
    console.log('\n开始更新商品进货单位...\n');

    const products = await prisma.product.findMany();
    let updated = 0;

    for (const product of products) {
      const config = productUnitConfig[product.name];
      if (config) {
        await prisma.$executeRawUnsafe(`
          UPDATE products
          SET purchase_unit = '${config.purchaseUnit}',
              unit_conversion = ${config.unitConversion},
              unit = '${config.unit}'
          WHERE id = ${product.id}
        `);
        console.log(`[${++updated}] ${product.name}: 1${config.purchaseUnit} = ${config.unitConversion}${config.unit}`);
      } else {
        console.log(`[跳过] ${product.name}: 未找到配置`);
      }
    }

    console.log(`\n=== 更新完成 ===`);
    console.log(`更新商品: ${updated} 个`);

    // 3. 验证结果
    const result = await prisma.$queryRawUnsafe(`
      SELECT name, unit, purchase_unit, unit_conversion
      FROM products
      ORDER BY id
    `);

    console.log('\n商品单位配置:');
    console.log('商品名称 | 销售单位 | 进货单位 | 换算比例');
    console.log('-'.repeat(60));
    result.forEach(r => {
      console.log(`${r.name} | ${r.unit} | ${r.purchase_unit} | 1${r.purchase_unit}=${r.unit_conversion}${r.unit}`);
    });

    await prisma.$disconnect();
  } catch(e) {
    console.error('Error:', e.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

addPurchaseUnit();

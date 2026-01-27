/**
 * 贾录新增门店产品导入脚本
 *
 * 导入20个新产品到数据库
 * 价格规则：
 * - 零售价：图片标注价格
 * - 成本价：零售价 ÷ 1.2
 * - 供货价：成本价 × 1.05
 *
 * 执行方式：npx ts-node scripts/import-jialu-products.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 图片基础URL
const IMAGE_BASE_URL = 'http://39.104.113.121/uploads/products/jialu';

// 分类ID
const CATEGORY_REGULAR = 27;  // 常规款
const CATEGORY_SPECIAL = 28;  // 特效礼花

// 产品数据
interface ProductData {
  sort: number;
  name: string;
  retailPrice: number;
  costPrice: number;
  supplyPrice: number;
  categoryId: number;
  unit: string;
  imageFileName: string;
  description?: string;
}

const PRODUCTS: ProductData[] = [
  // 鞭炮类 - 常规款
  {
    sort: 1,
    name: '鞭炮爆竹王',
    retailPrice: 6,
    costPrice: 5,
    supplyPrice: 5.2,
    categoryId: CATEGORY_REGULAR,
    unit: '个',
    imageFileName: '1.鞭炮爆竹王特价零售价6元.jpg',
    description: '传统爆竹王，声响清脆，适合节日庆典'
  },
  {
    sort: 2,
    name: '鞭炮极品爆竹王',
    retailPrice: 8,
    costPrice: 6.67,
    supplyPrice: 7,
    categoryId: CATEGORY_REGULAR,
    unit: '个',
    imageFileName: '2.鞭炮极品爆竹王特价零售价8元.jpg',
    description: '极品爆竹王，效果更响亮，品质升级'
  },
  {
    sort: 3,
    name: '鞭炮金玉满堂',
    retailPrice: 10,
    costPrice: 8.33,
    supplyPrice: 8.7,
    categoryId: CATEGORY_REGULAR,
    unit: '个',
    imageFileName: '3.鞭炮金玉满堂特价10元.jpg',
    description: '金玉满堂鞭炮，寓意吉祥富贵'
  },
  {
    sort: 4,
    name: '鞭炮恭喜发财',
    retailPrice: 15,
    costPrice: 12.5,
    supplyPrice: 13.1,
    categoryId: CATEGORY_REGULAR,
    unit: '个',
    imageFileName: '4.鞭炮恭喜发财特价15元.jpg',
    description: '恭喜发财鞭炮，新年必备，财运亨通'
  },
  {
    sort: 5,
    name: '直径30公分盘炮',
    retailPrice: 15,
    costPrice: 12.5,
    supplyPrice: 13.1,
    categoryId: CATEGORY_REGULAR,
    unit: '盘',
    imageFileName: '5.鞭炮直径30公分盘炮15元.jpg',
    description: '30公分盘炮，经典款式，声势浩大'
  },
  {
    sort: 6,
    name: '直径40公分盘炮',
    retailPrice: 25,
    costPrice: 20.83,
    supplyPrice: 21.9,
    categoryId: CATEGORY_REGULAR,
    unit: '盘',
    imageFileName: '6.鞭炮直径40公分盘炮25元.jpg',
    description: '40公分盘炮，加大版，燃放时间更长'
  },
  {
    sort: 7,
    name: '直径50公分盘炮',
    retailPrice: 40,
    costPrice: 33.33,
    supplyPrice: 35,
    categoryId: CATEGORY_REGULAR,
    unit: '盘',
    imageFileName: '7.鞭炮直径50公分盘炮40元.jpg',
    description: '50公分盘炮，超大版，效果震撼'
  },
  {
    sort: 8,
    name: '直径60公分盘炮',
    retailPrice: 60,
    costPrice: 50,
    supplyPrice: 52.5,
    categoryId: CATEGORY_REGULAR,
    unit: '盘',
    imageFileName: '8.鞭炮直径60公分盘炮60元.jpg',
    description: '60公分盘炮，旗舰版，燃放效果最佳'
  },
  // 礼炮类 - 特效礼花
  {
    sort: 9,
    name: '48发锦绣乐章/所向无敌',
    retailPrice: 68,
    costPrice: 56.67,
    supplyPrice: 59.5,
    categoryId: CATEGORY_SPECIAL,
    unit: '个',
    imageFileName: '9.礼炮48发锦绣乐章、所向无敌各68元.jpg',
    description: '48发礼炮，锦绣乐章/所向无敌系列，效果绚丽'
  },
  {
    sort: 10,
    name: '100秒夜焰/橙焰系列',
    retailPrice: 138,
    costPrice: 115,
    supplyPrice: 120.8,
    categoryId: CATEGORY_SPECIAL,
    unit: '个',
    imageFileName: '10.礼炮100秒时长 夜焰、橙焰系列各138元.jpg',
    description: '100秒超长时长礼炮，夜焰/橙焰系列，持续绽放'
  },
  {
    sort: 11,
    name: '60秒红满堂系列',
    retailPrice: 108,
    costPrice: 90,
    supplyPrice: 94.5,
    categoryId: CATEGORY_SPECIAL,
    unit: '个',
    imageFileName: '11.礼炮60秒时长红满堂系列108元.jpg',
    description: '60秒时长礼炮，红满堂系列，喜庆红火'
  },
  {
    sort: 12,
    name: '80秒凤舞系列',
    retailPrice: 138,
    costPrice: 115,
    supplyPrice: 120.8,
    categoryId: CATEGORY_SPECIAL,
    unit: '个',
    imageFileName: '12.礼炮80秒时长凤舞系列138元.jpg',
    description: '80秒时长礼炮，凤舞系列，华丽绽放'
  },
  {
    sort: 13,
    name: '春晓秋冬100发',
    retailPrice: 88,
    costPrice: 73.33,
    supplyPrice: 77,
    categoryId: CATEGORY_SPECIAL,
    unit: '个',
    imageFileName: '13.礼炮春晓秋冬100发系列88元.jpg',
    description: '100发春晓秋冬系列，四季主题，色彩缤纷'
  },
  {
    sort: 14,
    name: '火树银花100发',
    retailPrice: 158,
    costPrice: 131.67,
    supplyPrice: 138.3,
    categoryId: CATEGORY_SPECIAL,
    unit: '个',
    imageFileName: '14.礼炮火树银花100发158元.jpg',
    description: '100发火树银花，经典款式，银花璀璨'
  },
  {
    sort: 15,
    name: '81秒抱福抱财大运系列',
    retailPrice: 108,
    costPrice: 90,
    supplyPrice: 94.5,
    categoryId: CATEGORY_SPECIAL,
    unit: '个',
    imageFileName: '15.礼炮81秒时长抱福抱财大运系列108元.jpg',
    description: '81秒时长礼炮，抱福抱财大运系列，招财进宝'
  },
  {
    sort: 16,
    name: '36发礼炮',
    retailPrice: 8,
    costPrice: 6.67,
    supplyPrice: 7,
    categoryId: CATEGORY_SPECIAL,
    unit: '个',
    imageFileName: '16.礼炮36发8元.jpg',
    description: '36发入门款礼炮，小巧实惠'
  },
  {
    sort: 17,
    name: '闪光蕾',
    retailPrice: 10,
    costPrice: 8.33,
    supplyPrice: 8.7,
    categoryId: CATEGORY_SPECIAL,
    unit: '个',
    imageFileName: '17.礼炮闪光蕾10元.jpg',
    description: '闪光蕾礼炮，闪烁效果，适合营造气氛'
  },
  {
    sort: 18,
    name: '霸王蕾/发财蕾19发',
    retailPrice: 12,
    costPrice: 10,
    supplyPrice: 10.5,
    categoryId: CATEGORY_SPECIAL,
    unit: '个',
    imageFileName: '18.礼炮霸王蕾、发财蕾19发12元.jpg',
    description: '19发霸王蕾/发财蕾，效果出众'
  },
  {
    sort: 19,
    name: '发财蕾36发',
    retailPrice: 24,
    costPrice: 20,
    supplyPrice: 21,
    categoryId: CATEGORY_SPECIAL,
    unit: '个',
    imageFileName: '19.礼炮发财蕾36发24元.jpg',
    description: '36发发财蕾，升级版，效果加倍'
  },
  {
    sort: 20,
    name: '亿万富翁138发',
    retailPrice: 688,
    costPrice: 573.33,
    supplyPrice: 602,
    categoryId: CATEGORY_SPECIAL,
    unit: '个',
    imageFileName: '20.精品特效138发亿万富翁688元.jpg',
    description: '138发精品特效礼花，亿万富翁系列，顶级效果，庆典首选'
  },
];

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║        贾录新增门店产品导入工具 - 20个产品              ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('\n开始时间:', new Date().toISOString());

  try {
    let successCount = 0;
    let failCount = 0;

    for (const product of PRODUCTS) {
      try {
        // 构建图片URL
        const imageUrl = `${IMAGE_BASE_URL}/${encodeURIComponent(product.imageFileName)}`;

        // 创建商品
        const created = await prisma.product.create({
          data: {
            name: product.name,
            categoryId: product.categoryId,
            retailPrice: product.retailPrice,
            agentPrice: product.costPrice,
            wholesalePrice: product.costPrice,
            costPrice: product.costPrice,
            supplyPrice: product.supplyPrice,
            suggestedPrice: product.retailPrice,
            minRetailPrice: product.supplyPrice,
            masterRetailPrice: product.retailPrice,
            stock: 100,  // 默认库存
            lockStock: 0,
            unit: product.unit,
            purchaseUnit: '件',
            unitConversion: 1,
            images: JSON.stringify([imageUrl]),
            description: product.description || '',
            status: 'ACTIVE',
            sort: 1000 + product.sort,  // 排序：1001-1020，放在现有产品后面
            barcode: `JL${String(product.sort).padStart(4, '0')}`,
            sku: `JIALU${String(product.sort).padStart(4, '0')}`,
          }
        });

        console.log(`  ✓ ${product.name} (ID: ${created.id}, 零售价: ¥${product.retailPrice})`);
        successCount++;

      } catch (err) {
        console.log(`  ✗ ${product.name}: ${err}`);
        failCount++;
      }
    }

    // 打印结果
    console.log('\n' + '='.repeat(60));
    console.log('导入完成！');
    console.log('='.repeat(60));
    console.log(`  成功导入: ${successCount} 个产品`);
    console.log(`  导入失败: ${failCount} 个产品`);
    console.log('结束时间:', new Date().toISOString());

  } catch (error) {
    console.error('\n[ERROR] 导入失败！');
    console.error(error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();

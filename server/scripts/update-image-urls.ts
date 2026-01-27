/**
 * 更新商品图片URL脚本
 * 将商品的图片URL更新为本地服务器URL
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 服务器上的图片列表
const SERVER_IMAGES = [
  '100发蓝色海洋.jpg',
  '100发虎啸.jpg',
  '100发霸王蕾.jpg',
  '18寸仙女棒.jpg',
  '20发虎城之花.jpg',
  '258发米兰之夜.jpg',
  '28寸仙女棒.jpg',
  '36寸仙女棒.jpg',
  '60发一帆风顺.jpg',
  '60发万事顺.jpg',
  '60发发财树.jpg',
  '80发凤舞呈祥.jpg',
  '七彩风暴七彩魔方加特林.jpg',
  '前程似锦.jpg',
  '卡通西游记.jpg',
  '发发财树.jpg',
  '发霸王蕾.jpg',
  '国色天香.jpg',
  '大吉系列81发.jpg',
  '孔雀开屏.jpg',
  '富贵喜炮盘炮.jpg',
  '富贵礼炮20发.jpg',
  '寸仙女棒.jpg',
  '幸运树60发.jpg',
  '幻影加特林.jpg',
  '心想事成.jpg',
  '悟空加特林.jpg',
  '我爱你中国.jpg',
  '抱福系列.jpg',
  '无敌棒棒糖.jpg',
  '星空孔雀.jpg',
  '星际水母带接驳器.jpg',
  '月20日.jpg',
  '极速英雄加特林.jpg',
  '棒棒糖.jpg',
  '欢乐宝盒24个详情.jpg',
  '欢乐宝盒.jpg',
  '水母派对.jpg',
  '炫彩三分钟.jpg',
  '百花齐放.jpg',
  '礼炮100秒时长夜焰、橙焰系列各.jpg',
  '礼炮36发.jpg',
  '礼炮48发锦绣乐章、所向无敌各.jpg',
  '礼炮60秒时长红满堂系列.jpg',
  '礼炮80秒时长凤舞系列.jpg',
  '礼炮81秒时长抱福抱财大运系列.jpg',
  '礼炮发财蕾36发.jpg',
  '礼炮春晓秋冬100发系列.jpg',
  '礼炮火树银花100发.jpg',
  '礼炮闪光蕾.jpg',
  '礼炮霸王蕾、发财蕾19发.jpg',
  '精品特效138发亿万富翁.jpg',
  '精彩四变色.jpg',
  '精灵布布.jpg',
  '缤纷溢彩20发.jpg',
  '网红棒棒糖.jpg',
  '美不胜收138发.jpg',
  '蘑菇精灵.jpg',
  '虎城花王.jpg',
  '超级变变变.jpg',
  '超级棒棒糖.jpg',
  '超能加特林.jpg',
  '迷你加特林.jpg',
  '金银财宝100发.jpg',
  '非凡大师加特林.jpg',
  '鞭炮恭喜发财.jpg',
  '鞭炮极品爆竹王特价零.jpg',
  '鞭炮爆竹王特价零.jpg',
  '鞭炮直径30公分盘炮.jpg',
  '鞭炮直径40公分盘炮.jpg',
  '鞭炮直径50公分盘炮.jpg',
  '鞭炮直径60公分盘炮.jpg',
  '鞭炮金玉满堂.jpg',
  '顶天立地.jpg',
  '顺财神盘炮688型开门红.jpg',
  '飞天孔雀.jpg',
  '马上有钱.jpg',
  '高山流水.jpg',
  '黄金三分钟.jpg',
  '黄金树60发.jpg',
];

const IMAGE_BASE_URL = 'http://39.104.58.26/products';

// 商品名到图片文件的映射
const PRODUCT_IMAGE_MAPPING: Record<string, string | null> = {
  // 儿童入门类
  '棒棒糖': '棒棒糖.jpg',
  '18寸魔法仙女棒': '18寸仙女棒.jpg',
  '18寸仙女棒': '18寸仙女棒.jpg',
  '28寸魔法仙女棒': '28寸仙女棒.jpg',
  '28寸仙女棒': '28寸仙女棒.jpg',
  '36寸魔法仙女棒': '36寸仙女棒.jpg',
  '36寸仙女棒': '36寸仙女棒.jpg',
  '精彩四变色': '精彩四变色.jpg',
  '超级变变变': '超级变变变.jpg',

  // 手持喷花类
  '超级棒棒糖': '超级棒棒糖.jpg',
  '网红棒棒糖': '网红棒棒糖.jpg',
  '王者无敌棒棒糖': '无敌棒棒糖.jpg',
  '无敌棒棒糖': '无敌棒棒糖.jpg',

  // 创意彩花类
  '精灵布布': '精灵布布.jpg',

  // 礼盒套装
  '欢乐宝盒': '欢乐宝盒.jpg',

  // 旋转升空类
  '水母派对': '水母派对.jpg',
  '星际水母带接驳器': '星际水母带接驳器.jpg',

  // 地面喷花类
  '蘑菇精灵': '蘑菇精灵.jpg',
  '孔雀开屏': '孔雀开屏.jpg',
  '飞天孔雀': '飞天孔雀.jpg',
  '飞天孔雀（大型号）': '飞天孔雀.jpg',
  '星空孔雀': '星空孔雀.jpg',
  '喜传炫彩三分钟': '炫彩三分钟.jpg',
  '凡美炫彩三分钟': '炫彩三分钟.jpg',
  '炫彩三分钟': '炫彩三分钟.jpg',
  '黄金三分钟': '黄金三分钟.jpg',
  '卡通西游记': '卡通西游记.jpg',
  '卡通系列—西游记': '卡通西游记.jpg',

  // 网红加特林类
  '迷你加特林': '迷你加特林.jpg',
  '极速英雄加特林': '极速英雄加特林.jpg',
  '幻影加特林': '幻影加特林.jpg',
  '七彩风暴七彩魔方加特林': '七彩风暴七彩魔方加特林.jpg',
  '七彩风暴/七彩魔方加特林': '七彩风暴七彩魔方加特林.jpg',
  '悟空加特林': '悟空加特林.jpg',
  '超能加特林': '超能加特林.jpg',
  '非凡大师加特林': '非凡大师加特林.jpg',
  '非凡加特林': '非凡大师加特林.jpg',

  // 组合烟花类
  '20发虎城之花': '20发虎城之花.jpg',
  '虎城之花20发': '20发虎城之花.jpg',
  '60发万事顺': '60发万事顺.jpg',
  '万事顺60发': '60发万事顺.jpg',
  '80发凤舞呈祥': '80发凤舞呈祥.jpg',
  '凤舞成祥80发': '80发凤舞呈祥.jpg',
  '大吉系列81发': '大吉系列81发.jpg',
  '抱福系列81发': '抱福系列.jpg',
  '抱福系列': '抱福系列.jpg',
  '100发虎啸': '100发虎啸.jpg',
  '虎啸100发': '100发虎啸.jpg',
  '100发蓝色海洋': '100发蓝色海洋.jpg',
  '虎城花王528发': '虎城花王.jpg',
  '虎城花王': '虎城花王.jpg',
  '金银财宝100发': '金银财宝100发.jpg',
  '60发一帆风顺': '60发一帆风顺.jpg',
  '百花齐放100发': '百花齐放.jpg',
  '百花齐放': '百花齐放.jpg',
  '高山流水100发': '高山流水.jpg',
  '高山流水': '高山流水.jpg',

  // 大型组合类
  '258发米兰之夜': '258发米兰之夜.jpg',
  '国色天香': '国色天香.jpg',
  '前程似锦168发': '前程似锦.jpg',
  '前程似锦': '前程似锦.jpg',
  '美不胜收138发': '美不胜收138发.jpg',
  '美不胜收': '美不胜收138发.jpg',
  '顶天立地198发': '顶天立地.jpg',
  '顶天立地': '顶天立地.jpg',
  '我爱你中国308发': '我爱你中国.jpg',
  '我爱你中国': '我爱你中国.jpg',
  '心想事成228发': '心想事成.jpg',
  '心想事成': '心想事成.jpg',

  // 家用礼花类（份炮）
  '20发缤纷缢彩': '缤纷溢彩20发.jpg',
  '缤纷缢彩礼炮36发': '缤纷溢彩20发.jpg',
  '20发富贵礼炮': '富贵礼炮20发.jpg',
  '富贵礼炮36发': '富贵礼炮20发.jpg',
  '丰运树/黄金树': '幸运树60发.jpg',
  '60发发财树': '60发发财树.jpg',
  '马上有钱/来财': '马上有钱.jpg',
  '马上有钱72发': '马上有钱.jpg',
  '忆童年100发霸王雷': '100发霸王蕾.jpg',
  '100发霸王蕾': '100发霸王蕾.jpg',

  // 鞭炮类
  '富贵喜炮25公分盘炮': '富贵喜炮盘炮.jpg',
  '富贵喜炮': '富贵喜炮盘炮.jpg',
  '688开门红顺财神60公分盘炮': '顺财神盘炮688型开门红.jpg',
  '688开门红盘炮': '顺财神盘炮688型开门红.jpg',
};

async function updateImageUrls() {
  console.log('='.repeat(60));
  console.log('更新商品图片URL');
  console.log('开始时间:', new Date().toISOString());
  console.log('='.repeat(60));

  try {
    // 获取所有商品
    const products = await prisma.product.findMany({
      select: { id: true, name: true, images: true },
    });

    console.log(`\n共找到 ${products.length} 个商品\n`);

    let updated = 0;
    let skipped = 0;
    let noImage = 0;
    const failures: string[] = [];

    for (const product of products) {
      // 查找匹配的图片文件
      let imageFile = PRODUCT_IMAGE_MAPPING[product.name];

      // 如果没有精确匹配，尝试模糊匹配
      if (imageFile === undefined) {
        // 尝试在图片列表中找到包含商品名的图片
        const match = SERVER_IMAGES.find(img => {
          const imageName = img.replace('.jpg', '');
          return product.name.includes(imageName) || imageName.includes(product.name);
        });
        if (match) {
          imageFile = match;
        }
      }

      if (imageFile === null) {
        // 明确标记为无图片的商品
        noImage++;
        console.log(`  ⚠️ ${product.name} - 无对应图片`);
        continue;
      }

      if (!imageFile) {
        // 未找到匹配
        failures.push(product.name);
        console.log(`  ❌ ${product.name} - 未找到匹配图片`);
        continue;
      }

      const newImageUrl = `${IMAGE_BASE_URL}/${encodeURIComponent(imageFile)}`;
      const newImagesJson = JSON.stringify([newImageUrl]);

      // 检查是否需要更新
      let currentImages: string[] = [];
      try {
        if (product.images) {
          currentImages = JSON.parse(product.images);
        }
      } catch (e) {
        // 解析失败，视为空数组
      }
      if (currentImages.length > 0 && currentImages[0] === newImageUrl) {
        skipped++;
        continue;
      }

      // 更新图片URL（存储为JSON字符串）
      await prisma.product.update({
        where: { id: product.id },
        data: { images: newImagesJson },
      });

      updated++;
      console.log(`  ✅ ${product.name} → ${imageFile}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('更新完成！');
    console.log('='.repeat(60));
    console.log(`  更新: ${updated} 个`);
    console.log(`  跳过: ${skipped} 个`);
    console.log(`  无图片: ${noImage} 个`);
    console.log(`  失败: ${failures.length} 个`);

    if (failures.length > 0) {
      console.log('\n未匹配商品:');
      failures.forEach(name => console.log(`  - ${name}`));
    }

  } catch (error) {
    console.error('更新失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateImageUrls();

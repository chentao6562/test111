/**
 * 更新商品视频URL脚本
 * 将商品的视频URL更新为本地服务器URL
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 服务器上的视频列表
const SERVER_VIDEOS = [
  '100发蓝色海洋.mp4',
  '100发虎啸.mp4',
  '18寸仙女棒.mp4',
  '20发虎城之花.mp4',
  '258发米兰之夜.mp4',
  '28寸仙女棒.mp4',
  '36寸仙女棒.mp4',
  '60发一帆风顺.mp4',
  '60发万事顺.mp4',
  '80发凤舞呈祥.mp4',
  '七彩风暴七彩魔方加特林.mp4',
  '前程似锦.mp4',
  '卡通西游记.mp4',
  '国色天香.mp4',
  '大吉系列81发.mp4',
  '孔雀开屏.mp4',
  '幻影加特林.mp4',
  '心想事成.mp4',
  '我爱你中国.mp4',
  '抱福系列.mp4',
  '无敌棒棒糖.mp4',
  '星空孔雀.mp4',
  '星际水母带接驳器.mp4',
  '月20日 (1)(15).mp4',
  '月20日 (1)(8).mp4',
  '极速英雄加特林.mp4',
  '棒棒糖.mp4',
  '炫彩三分钟.mp4',
  '百花齐放.mp4',
  '精彩四变色.mp4',
  '精灵布布.mp4',
  '网红棒棒糖.mp4',
  '美不胜收.mp4',
  '蘑菇精灵.mp4',
  '虎城花王.mp4',
  '超级变变变.mp4',
  '超级棒棒糖.mp4',
  '超能加特林.mp4',
  '金银财宝100发.mp4',
  '非凡大师加特林.mp4',
  '顶天立地.mp4',
  '飞天孔雀.mp4',
  '高山流水.mp4',
  '黄金三分钟.mp4',
];

const VIDEO_BASE_URL = 'http://39.104.58.26/videos';

// 商品名到视频文件的映射
const PRODUCT_VIDEO_MAPPING: Record<string, string | null> = {
  '18寸仙女棒': '18寸仙女棒.mp4',
  '18寸魔法仙女棒': '18寸仙女棒.mp4',
  '28寸仙女棒': '28寸仙女棒.mp4',
  '28寸魔法仙女棒': '28寸仙女棒.mp4',
  '36寸仙女棒': '36寸仙女棒.mp4',
  '36寸魔法仙女棒': '36寸仙女棒.mp4',
  '棒棒糖': '棒棒糖.mp4',
  '超级棒棒糖': '超级棒棒糖.mp4',
  '网红棒棒糖': '网红棒棒糖.mp4',
  '王者无敌棒棒糖': '无敌棒棒糖.mp4',
  '无敌棒棒糖': '无敌棒棒糖.mp4',
  '精彩四变色': '精彩四变色.mp4',
  '超级变变变': '超级变变变.mp4',
  '精灵布布': '精灵布布.mp4',
  '欢乐宝盒': '月20日 (1)(15).mp4',
  '水母派对': null, // 无对应视频
  '星际水母带接驳器': '星际水母带接驳器.mp4',
  '蘑菇精灵': '蘑菇精灵.mp4',
  '孔雀开屏': '孔雀开屏.mp4',
  '飞天孔雀': '飞天孔雀.mp4',
  '星空孔雀': '星空孔雀.mp4',
  '喜传三分钟': '炫彩三分钟.mp4',
  '炫彩三分钟': '炫彩三分钟.mp4',
  '黄金三分钟': '黄金三分钟.mp4',
  '卡通西游记': '卡通西游记.mp4',
  '卡通系列—西游记': '卡通西游记.mp4',
  '迷你加特林': null, // 无对应视频
  '极速英雄加特林': '极速英雄加特林.mp4',
  '幻影加特林': '幻影加特林.mp4',
  '七彩风暴七彩魔方加特林': '七彩风暴七彩魔方加特林.mp4',
  '七彩风暴/七彩魔方加特林': '七彩风暴七彩魔方加特林.mp4',
  '悟空加特林': null, // 无对应视频
  '超能加特林': '超能加特林.mp4',
  '非凡大师加特林': '非凡大师加特林.mp4',
  '非凡加特林': '非凡大师加特林.mp4',
  '20发虎城之花': '20发虎城之花.mp4',
  '虎城之花20发': '20发虎城之花.mp4',
  '60发万事顺': '60发万事顺.mp4',
  '万事顺60发': '60发万事顺.mp4',
  '80发凤舞呈祥': '80发凤舞呈祥.mp4',
  '凤舞成祥80发': '80发凤舞呈祥.mp4',
  '大吉系列81发': '大吉系列81发.mp4',
  '抱福系列': '抱福系列.mp4',
  '100发虎啸': '100发虎啸.mp4',
  '虎啸100发': '100发虎啸.mp4',
  '100发蓝色海洋': '100发蓝色海洋.mp4',
  '虎城花王': '虎城花王.mp4',
  '金银财宝100发': '金银财宝100发.mp4',
  '60发一帆风顺': '60发一帆风顺.mp4',
  '258发米兰之夜': '258发米兰之夜.mp4',
  '国色天香': '国色天香.mp4',
  '前程似锦': '前程似锦.mp4',
  '百花齐放': '百花齐放.mp4',
  '美不胜收': '美不胜收.mp4',
  '顶天立地': '顶天立地.mp4',
  '高山流水': '高山流水.mp4',
  '心想事成': '心想事成.mp4',
  '我爱你中国': '我爱你中国.mp4',
  // 份炮类
  '缤纷缢彩礼炮36发': null,
  '富贵礼炮36发': null,
  '20发缤纷缢彩': null,
  '20发富贵礼炮': null,
  '60发发财树': null,
  '丰运树/黄金树': null,
  '马上有钱72发': null,
  '马上有钱/来财': null,
  '100发霸王蕾': null,
  '忆童年100发霸王雷': null,
  // 鞭炮类
  '富贵喜炮': null,
  '富贵喜炮25公分盘炮': null,
  '688开门红盘炮': null,
  '688开门红顺财神60公分盘炮': null,
};

async function updateVideoUrls() {
  console.log('='.repeat(60));
  console.log('更新商品视频URL');
  console.log('开始时间:', new Date().toISOString());
  console.log('='.repeat(60));

  try {
    // 获取所有商品
    const products = await prisma.product.findMany({
      select: { id: true, name: true, videoUrl: true },
    });

    console.log(`\n共找到 ${products.length} 个商品\n`);

    let updated = 0;
    let skipped = 0;
    let noVideo = 0;
    const failures: string[] = [];

    for (const product of products) {
      // 查找匹配的视频文件
      let videoFile = PRODUCT_VIDEO_MAPPING[product.name];

      // 如果没有精确匹配，尝试模糊匹配
      if (videoFile === undefined) {
        // 尝试在视频列表中找到包含商品名的视频
        const match = SERVER_VIDEOS.find(v => {
          const videoName = v.replace('.mp4', '');
          return product.name.includes(videoName) || videoName.includes(product.name);
        });
        if (match) {
          videoFile = match;
        }
      }

      if (videoFile === null) {
        // 明确标记为无视频的商品
        noVideo++;
        console.log(`  ⚠️ ${product.name} - 无对应视频`);
        continue;
      }

      if (!videoFile) {
        // 未找到匹配
        failures.push(product.name);
        console.log(`  ❌ ${product.name} - 未找到匹配视频`);
        continue;
      }

      const newVideoUrl = `${VIDEO_BASE_URL}/${encodeURIComponent(videoFile)}`;

      // 检查是否需要更新
      if (product.videoUrl === newVideoUrl) {
        skipped++;
        continue;
      }

      // 更新视频URL
      await prisma.product.update({
        where: { id: product.id },
        data: { videoUrl: newVideoUrl },
      });

      updated++;
      console.log(`  ✅ ${product.name} → ${videoFile}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('更新完成！');
    console.log('='.repeat(60));
    console.log(`  更新: ${updated} 个`);
    console.log(`  跳过: ${skipped} 个`);
    console.log(`  无视频: ${noVideo} 个`);
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

updateVideoUrls();

/**
 * 恢复使用外部视频链接脚本
 * 将商品的视频URL从本地服务器恢复为外部CDN链接，提升加载速度
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 商品名到外部视频链接的映射（来自CSV）
const EXTERNAL_VIDEO_LINKS: Record<string, string> = {
  '18寸仙女棒': 'https://app.if1f.com/?p30822',
  '18寸魔法仙女棒': 'https://app.if1f.com/?p30822',
  '28寸仙女棒': 'https://app.if1f.com/?p30821',
  '28寸魔法仙女棒': 'https://app.if1f.com/?p30821',
  '36寸仙女棒': 'https://app.if1f.com/?p30818',
  '36寸魔法仙女棒': 'https://app.if1f.com/?p30818',
  '七彩风暴七彩魔方加特林': 'https://app.if1f.com/?p54353',
  '七彩风暴/七彩魔方加特林': 'https://app.if1f.com/?p54353',
  '卡通西游记': 'https://app.if1f.com/?p204770',
  '卡通系列—西游记': 'https://app.if1f.com/?p204770',
  '孔雀开屏': 'https://app.if1f.com/?p191856',
  '幻影加特林': 'https://app.if1f.com/?p208842',
  '悟空加特林': 'https://app.if1f.com/?p36220',
  '无敌棒棒糖': 'https://app.if1f.com/?p185484',
  '王者无敌棒棒糖': 'https://app.if1f.com/?p185484',
  '星空孔雀': 'https://app.if1f.com/?p203054',
  '星际水母带接驳器': 'https://app.if1f.com/?p157317',
  '极速英雄加特林': 'https://app.if1f.com/?p212490',
  '棒棒糖': 'https://app.if1f.com/?p39611',
  '炫彩三分钟': 'https://app.if1f.com/?p98483',
  '喜传炫彩三分钟': 'https://app.if1f.com/?p98483',
  '凡美炫彩三分钟': 'https://app.if1f.com/?p98483',
  '精彩四变色': 'https://app.if1f.com/?p29848',
  '精灵布布': 'https://app.if1f.com/?p216362',
  '网红棒棒糖': 'https://app.if1f.com/?p214237',
  '蘑菇精灵': 'https://app.if1f.com/?p40476',
  '超级变变变': 'https://app.if1f.com/?p36988',
  '超级棒棒糖': 'https://app.if1f.com/?p192399',
  '超能加特林': 'https://app.if1f.com/?p192296',
  '非凡大师加特林': 'https://app.if1f.com/?p188996',
  '非凡加特林': 'https://app.if1f.com/?p188996',
  '飞天孔雀': 'https://app.if1f.com/?p203053',
  '飞天孔雀（大型号）': 'https://app.if1f.com/?p203053',
  '黄金三分钟': 'https://app.if1f.com/?p160530',
  // 虎城烟花链接
  '100发蓝色海洋': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=119',
  '100发虎啸': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=120',
  '虎啸100发': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=120',
  '20发虎城之花': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=295',
  '虎城之花20发': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=295',
  '258发米兰之夜': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=121',
  '60发一帆风顺': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=567',
  '60发万事顺': 'https://app.if1f.com/?p22341',
  '万事顺60发': 'https://app.if1f.com/?p22341',
  '80发凤舞呈祥': 'https://app.if1f.com/?p22339',
  '凤舞成祥80发': 'https://app.if1f.com/?p22339',
  '前程似锦': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=528',
  '前程似锦168发': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=528',
  '国色天香': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=566',
  '大吉系列81发': 'https://app.if1f.com/?p38747',
  '心想事成': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=550',
  '心想事成228发': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=550',
  '我爱你中国': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=549',
  '我爱你中国308发': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=549',
  '抱福系列': 'https://app.if1f.com/?p94856',
  '抱福系列81发': 'https://app.if1f.com/?p94856',
  '百花齐放': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=536',
  '百花齐放100发': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=536',
  '美不胜收': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=548',
  '美不胜收138发': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=548',
  '虎城花王': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=122',
  '虎城花王528发': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=122',
  '金银财宝100发': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=382',
  '顶天立地': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=532',
  '顶天立地198发': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=532',
  '高山流水': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=545',
  '高山流水100发': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=545',
  // 欢乐宝盒
  '欢乐宝盒': 'https://cs.if1f.com/?p100452',
};

async function restoreExternalVideos() {
  console.log('='.repeat(60));
  console.log('恢复使用外部视频链接');
  console.log('开始时间:', new Date().toISOString());
  console.log('='.repeat(60));

  try {
    const products = await prisma.product.findMany({
      select: { id: true, name: true, videoUrl: true },
    });

    console.log(`\n共找到 ${products.length} 个商品\n`);

    let updated = 0;
    let skipped = 0;
    let noVideo = 0;
    const failures: string[] = [];

    for (const product of products) {
      const externalUrl = EXTERNAL_VIDEO_LINKS[product.name];

      if (!externalUrl) {
        noVideo++;
        console.log(`  ⚠️ ${product.name} - 无外部视频链接`);
        continue;
      }

      // 检查是否已经是外部链接
      if (product.videoUrl === externalUrl) {
        skipped++;
        continue;
      }

      // 更新为外部链接
      await prisma.product.update({
        where: { id: product.id },
        data: { videoUrl: externalUrl },
      });

      updated++;
      console.log(`  ✅ ${product.name} → ${externalUrl.substring(0, 50)}...`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('更新完成！');
    console.log('='.repeat(60));
    console.log(`  更新: ${updated} 个`);
    console.log(`  跳过: ${skipped} 个`);
    console.log(`  无视频: ${noVideo} 个`);

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

restoreExternalVideos();

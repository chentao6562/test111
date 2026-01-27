/**
 * 检查商品图片和视频URL
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProducts() {
  try {
    const products = await prisma.product.findMany({
      select: { name: true, images: true, videoUrl: true },
    });

    console.log('='.repeat(80));
    console.log('商品媒体URL检查结果');
    console.log('='.repeat(80));

    let withImage = 0;
    let withVideo = 0;
    let noImage = 0;
    let noVideo = 0;

    for (const p of products) {
      // images是JSON字符串，需要解析
      let parsedImages: string[] = [];
      try {
        if (p.images) {
          parsedImages = JSON.parse(p.images);
        }
      } catch (e) {
        // 解析失败
      }
      const hasImage = parsedImages.length > 0 && !!parsedImages[0];
      const hasVideo = !!p.videoUrl;

      if (hasImage) withImage++;
      else noImage++;
      if (hasVideo) withVideo++;
      else noVideo++;

      const imgStatus = hasImage ? '✅' : '❌';
      const vidStatus = hasVideo ? '✅' : '⚠️';

      console.log(`${imgStatus}${vidStatus} ${p.name}`);
      if (hasImage) {
        const img = parsedImages[0];
        console.log(`   图片: ${img.substring(0, 60)}...`);
      }
      if (hasVideo && p.videoUrl) {
        console.log(`   视频: ${p.videoUrl.substring(0, 60)}...`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('统计结果');
    console.log('='.repeat(80));
    console.log(`总商品数: ${products.length}`);
    console.log(`有图片: ${withImage} 个`);
    console.log(`无图片: ${noImage} 个`);
    console.log(`有视频: ${withVideo} 个`);
    console.log(`无视频: ${noVideo} 个`);

  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProducts();

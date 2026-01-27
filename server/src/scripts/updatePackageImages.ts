/**
 * 更新套餐图片脚本
 * 【2026-01-25】使用套餐中第一个商品的图片作为套餐封面
 *
 * 运行方式：npx ts-node src/scripts/updatePackageImages.ts
 */
import prisma from '../utils/prisma';

async function main() {
  console.log('开始更新套餐图片...\n');

  // 获取所有套餐及其商品
  const packages = await prisma.productPackage.findMany({
    include: {
      items: {
        orderBy: { sort: 'asc' },
        include: {
          product: {
            select: { id: true, name: true, images: true }
          }
        }
      }
    }
  });

  for (const pkg of packages) {
    if (pkg.items.length === 0) {
      console.log(`[${pkg.name}] 无商品，跳过`);
      continue;
    }

    // 收集所有商品图片（去重）
    const allImages: string[] = [];
    for (const item of pkg.items) {
      if (item.product.images) {
        try {
          const productImages = JSON.parse(item.product.images as string);
          if (Array.isArray(productImages) && productImages.length > 0) {
            // 只取第一张图片
            if (!allImages.includes(productImages[0])) {
              allImages.push(productImages[0]);
            }
          }
        } catch (e) {
          // 如果images不是JSON，直接使用
          if (typeof item.product.images === 'string' && !allImages.includes(item.product.images)) {
            allImages.push(item.product.images);
          }
        }
      }
    }

    if (allImages.length === 0) {
      console.log(`[${pkg.name}] 无可用图片，跳过`);
      continue;
    }

    // 最多取前3张图片
    const selectedImages = allImages.slice(0, 3);

    // 更新套餐图片
    await prisma.productPackage.update({
      where: { id: pkg.id },
      data: {
        images: JSON.stringify(selectedImages)
      }
    });

    console.log(`[${pkg.name}] 更新图片: ${selectedImages.length}张`);
    selectedImages.forEach((img, idx) => {
      console.log(`  ${idx + 1}. ${img.substring(0, 60)}...`);
    });
  }

  console.log('\n✓ 套餐图片更新完成！');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('更新失败:', e);
  process.exit(1);
});

/**
 * 检查所有产品的图片状态
 * 用法：npx ts-node scripts/check-product-images.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, images: true },
    orderBy: { id: 'asc' }
  });

  let updated = 0, old = 0, empty = 0;
  const oldProducts: { id: number; name: string; images: string }[] = [];

  console.log('产品图片状态检查:\n');

  for (const p of products) {
    if (!p.images || p.images === '[]' || p.images === '') {
      empty++;
    } else if (p.images.includes('/uploads/products/') && !p.images.includes('%')) {
      updated++;
    } else {
      old++;
      oldProducts.push({ id: p.id, name: p.name, images: p.images });
    }
  }

  if (oldProducts.length > 0) {
    console.log('仍使用旧格式图片的产品:\n');
    for (const p of oldProducts) {
      console.log(`ID:${p.id} ${p.name}`);
      console.log(`  图片: ${p.images.substring(0, 80)}`);
    }
  }

  console.log(`\n========== 统计 ==========`);
  console.log(`✓ 已更新: ${updated}`);
  console.log(`✗ 旧格式: ${old}`);
  console.log(`⚠ 无图片: ${empty}`);
  console.log(`总计: ${products.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

/**
 * 修复剩余3个产品的图片路径
 * 用法：npx ts-node scripts/fix-remaining-images.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 需要修复的产品映射
const fixes = [
  { id: 1094, name: '王者无敌棒棒糖', newImage: '/uploads/products/无敌棒棒糖.jpg' },
  { id: 1104, name: '卡通系列—西游记', newImage: '/uploads/products/卡通西游记.jpg' },
  { id: 1108, name: '七彩加特林', newImage: '/uploads/products/七彩风暴加特林.jpg' }
];

async function main() {
  console.log('开始修复产品图片路径...\n');

  for (const fix of fixes) {
    try {
      const result = await prisma.product.update({
        where: { id: fix.id },
        data: {
          images: JSON.stringify([fix.newImage])
        }
      });
      console.log(`✓ ${fix.name} (ID: ${fix.id}) - 更新成功`);
      console.log(`  新图片: ${fix.newImage}`);
    } catch (error) {
      console.log(`✗ ${fix.name} (ID: ${fix.id}) - 更新失败`);
      console.error(error);
    }
  }

  console.log('\n修复完成！');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

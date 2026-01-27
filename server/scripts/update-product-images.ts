/**
 * 更新数据库商品图片和描述脚本
 * 功能：将处理后的图片路径和卖点文案更新到Product表
 *
 * 用法：npx ts-node scripts/update-product-images.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// 配置
const CONFIG = {
  // 处理后图片目录
  imageDir: path.join(__dirname, '../uploads/products'),
  // 产品描述配置文件
  descriptionsFile: path.join(__dirname, '../data/product-descriptions.json'),
  // 图片URL前缀（相对路径，前端会拼接域名）
  imageUrlPrefix: '/uploads/products'
};

// 产品名称到数据库商品的模糊匹配映射
const productNameMatchers: { pattern: RegExp; dbName: string }[] = [
  { pattern: /棒棒糖/i, dbName: '棒棒糖' },
  { pattern: /18.*仙女棒/i, dbName: '18寸魔法仙女棒' },
  { pattern: /28.*仙女棒/i, dbName: '28寸魔法仙女棒' },
  { pattern: /36.*仙女棒/i, dbName: '36寸魔法仙女棒' },
  { pattern: /四变色/i, dbName: '精彩四变色' },
  { pattern: /超级变/i, dbName: '超级变变变' },
  { pattern: /超级棒/i, dbName: '超级棒棒糖' },
  { pattern: /网红棒/i, dbName: '网红棒棒糖' },
  { pattern: /无敌棒/i, dbName: '无敌棒棒糖' },
  { pattern: /精灵布布/i, dbName: '精灵布布' },
  { pattern: /欢乐宝盒/i, dbName: '欢乐宝盒' },
  { pattern: /水母派对/i, dbName: '水母派对' },
  { pattern: /星际水母/i, dbName: '星际水母带接驳器' },
  { pattern: /蘑菇精灵/i, dbName: '蘑菇精灵' },
  { pattern: /孔雀开屏/i, dbName: '孔雀开屏' },
  { pattern: /飞天孔雀/i, dbName: '飞天孔雀' },
  { pattern: /星空孔雀/i, dbName: '星空孔雀' },
  { pattern: /炫彩.*分钟/i, dbName: '炫彩三分钟' },
  { pattern: /黄金.*分钟/i, dbName: '黄金三分钟' },
  { pattern: /西游记/i, dbName: '卡通西游记' },
  { pattern: /非凡.*加特林/i, dbName: '非凡大师加特林' },
  { pattern: /超能.*加特林/i, dbName: '超能加特林' },
  { pattern: /迷你.*加特林/i, dbName: '迷你加特林' },
  { pattern: /极速.*加特林/i, dbName: '极速英雄加特林' },
  { pattern: /幻影.*加特林/i, dbName: '幻影加特林' },
  { pattern: /七彩.*加特林/i, dbName: '七彩风暴加特林' },
  { pattern: /悟空.*加特林/i, dbName: '悟空加特林' },
  { pattern: /缤纷/i, dbName: '缤纷溢彩20发' },
  { pattern: /富贵礼炮/i, dbName: '富贵礼炮20发' },
  { pattern: /幸运树/i, dbName: '幸运树60发' },
  { pattern: /黄金树/i, dbName: '黄金树60发' },
  { pattern: /发财树/i, dbName: '60发发财树' },
  { pattern: /马上有钱/i, dbName: '马上有钱' },
  { pattern: /霸王蕾/i, dbName: '100发霸王蕾' },
  { pattern: /富贵喜炮/i, dbName: '富贵喜炮盘炮' },
  { pattern: /顺财神/i, dbName: '顺财神盘炮688型' }
];

interface ProductDescription {
  description: string;
  scene: string;
  highlight: string;
}

/**
 * 加载产品描述配置
 */
function loadDescriptions(): Record<string, ProductDescription> {
  if (!fs.existsSync(CONFIG.descriptionsFile)) {
    console.error(`产品描述文件不存在: ${CONFIG.descriptionsFile}`);
    return {};
  }
  const content = fs.readFileSync(CONFIG.descriptionsFile, 'utf-8');
  return JSON.parse(content);
}

/**
 * 获取图片文件列表
 */
function getImageFiles(): string[] {
  if (!fs.existsSync(CONFIG.imageDir)) {
    return [];
  }
  return fs.readdirSync(CONFIG.imageDir)
    .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f) && !f.startsWith('_'));
}

/**
 * 根据图片文件名查找对应的描述
 */
function findDescription(
  imageName: string,
  descriptions: Record<string, ProductDescription>
): ProductDescription | null {
  // 移除扩展名
  const baseName = imageName.replace(/\.(jpg|jpeg|png|webp)$/i, '');

  // 精确匹配
  if (descriptions[baseName]) {
    return descriptions[baseName];
  }

  // 模糊匹配
  for (const key of Object.keys(descriptions)) {
    if (baseName.includes(key) || key.includes(baseName)) {
      return descriptions[key];
    }
  }

  return null;
}

/**
 * 根据图片文件名查找数据库中的商品
 */
async function findProductByImageName(imageName: string): Promise<{ id: number; name: string } | null> {
  const baseName = imageName.replace(/\.(jpg|jpeg|png|webp)$/i, '');

  // 先尝试精确匹配
  let product = await prisma.product.findFirst({
    where: { name: baseName },
    select: { id: true, name: true }
  });

  if (product) return product;

  // 使用模式匹配
  for (const matcher of productNameMatchers) {
    if (matcher.pattern.test(baseName)) {
      product = await prisma.product.findFirst({
        where: {
          OR: [
            { name: matcher.dbName },
            { name: { contains: matcher.dbName.split(/[0-9]/)[0] } }
          ]
        },
        select: { id: true, name: true }
      });
      if (product) return product;
    }
  }

  // 模糊匹配：包含关系
  product = await prisma.product.findFirst({
    where: {
      OR: [
        { name: { contains: baseName } },
        { name: { contains: baseName.substring(0, Math.min(4, baseName.length)) } }
      ]
    },
    select: { id: true, name: true }
  });

  return product;
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  console.log('====================================');
  console.log('更新数据库商品图片和描述');
  console.log('====================================\n');

  // 加载产品描述
  const descriptions = loadDescriptions();
  console.log(`加载了 ${Object.keys(descriptions).length} 个产品描述\n`);

  // 获取图片文件
  const imageFiles = getImageFiles();
  console.log(`找到 ${imageFiles.length} 个处理后的图片\n`);

  if (imageFiles.length === 0) {
    console.log('没有找到图片文件，请先运行 process-product-images.ts');
    return;
  }

  // 获取数据库中所有商品
  const allProducts = await prisma.product.findMany({
    select: { id: true, name: true, images: true, description: true }
  });
  console.log(`数据库中有 ${allProducts.length} 个商品\n`);

  const results: {
    imageName: string;
    productId: number | null;
    productName: string | null;
    updated: boolean;
    error?: string;
  }[] = [];

  // 处理每个图片
  for (const imageFile of imageFiles) {
    console.log(`处理: ${imageFile}`);

    // 查找对应的商品
    const product = await findProductByImageName(imageFile);

    if (!product) {
      console.log(`  ✗ 未找到对应商品\n`);
      results.push({
        imageName: imageFile,
        productId: null,
        productName: null,
        updated: false,
        error: '未找到对应商品'
      });
      continue;
    }

    console.log(`  → 匹配商品: ${product.name} (ID: ${product.id})`);

    // 构建图片URL
    const imageUrl = `${CONFIG.imageUrlPrefix}/${imageFile}`;

    // 查找产品描述
    const desc = findDescription(imageFile, descriptions);

    try {
      // 更新数据库
      const updateData: any = {
        images: JSON.stringify([imageUrl])
      };

      // 如果有描述，更新description字段
      if (desc) {
        // 组合完整描述
        updateData.description = `${desc.description}\n\n【适用场景】${desc.scene}\n\n【产品特点】${desc.highlight}`;
        console.log(`  → 更新描述: ${desc.description.substring(0, 30)}...`);
      }

      await prisma.product.update({
        where: { id: product.id },
        data: updateData
      });

      console.log(`  ✓ 更新成功\n`);
      results.push({
        imageName: imageFile,
        productId: product.id,
        productName: product.name,
        updated: true
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`  ✗ 更新失败: ${errorMsg}\n`);
      results.push({
        imageName: imageFile,
        productId: product.id,
        productName: product.name,
        updated: false,
        error: errorMsg
      });
    }
  }

  // 输出统计
  console.log('\n====================================');
  console.log('更新完成');
  console.log('====================================');
  const successCount = results.filter(r => r.updated).length;
  const failCount = results.filter(r => !r.updated).length;
  console.log(`成功: ${successCount}, 失败: ${failCount}`);

  if (failCount > 0) {
    console.log('\n未匹配/失败的图片:');
    results.filter(r => !r.updated).forEach(r => {
      console.log(`  - ${r.imageName}: ${r.error}`);
    });
  }

  // 列出未更新的数据库商品
  const updatedProductIds = results.filter(r => r.updated).map(r => r.productId);
  const notUpdatedProducts = allProducts.filter(p => !updatedProductIds.includes(p.id));

  if (notUpdatedProducts.length > 0) {
    console.log('\n数据库中未更新的商品:');
    notUpdatedProducts.forEach(p => {
      console.log(`  - ${p.name} (ID: ${p.id})`);
    });
  }

  // 保存更新结果
  const resultFile = path.join(CONFIG.imageDir, '_update_result.json');
  fs.writeFileSync(resultFile, JSON.stringify(results, null, 2));
  console.log(`\n更新结果已保存到: ${resultFile}`);
}

// 执行
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

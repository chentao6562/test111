/**
 * 套餐图片生成脚本（Sharp版本）
 *
 * 功能：为6款套餐生成主图（750x750px）
 * 设计风格：喜庆红+金色（过年氛围）
 * 特点：商品图片拼接 + 数量角标
 *
 * 执行方式：npx ts-node scripts/generate-package-images.ts
 * 依赖：npm install sharp
 */

import sharp from 'sharp';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

const prisma = new PrismaClient();

// 配置
const OUTPUT_DIR = path.join(__dirname, '../uploads/products/packages');
const IMAGE_SIZE = 750;

// 颜色定义（喜庆红+金色）
const COLORS = {
  background: '#FFF5F5',
  primaryRed: '#D32F2F',
  darkRed: '#B71C1C',
  gold: '#FFD700',
  darkGold: '#DAA520',
  white: '#FFFFFF',
  black: '#333333',
  lightGray: '#F5F5F5',
  entryGreen: '#4CAF50',
};

// 定位标签配置
const POSITIONING_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  'ENTRY': { label: '引流款', color: COLORS.white, bgColor: COLORS.entryGreen },
  'HOT': { label: '爆款推荐', color: COLORS.white, bgColor: COLORS.primaryRed },
  'PROFIT': { label: '利润款', color: COLORS.black, bgColor: COLORS.gold },
};

interface PackageItem {
  quantity: number;
  product: {
    id: number;
    name: string;
    images: string;
  };
}

interface Package {
  id: number;
  code: string;
  name: string;
  positioning: string;
  masterRetailPrice: any; // Prisma Decimal
  suggestedPrice: any; // Prisma Decimal
  items: PackageItem[];
}

// 下载图片为Buffer
async function downloadImageBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadImageBuffer(redirectUrl).then(resolve).catch(reject);
          return;
        }
      }

      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      response.on('error', reject);
    }).on('error', reject);
  });
}

// 创建圆角矩形SVG
function createRoundedRect(width: number, height: number, radius: number, fill: string): string {
  return `<svg width="${width}" height="${height}">
    <rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="${fill}"/>
  </svg>`;
}

// 创建数量角标SVG
function createQuantityBadge(quantity: number, size: number = 36): string {
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${COLORS.gold}" stroke="${COLORS.darkGold}" stroke-width="2"/>
    <text x="${size/2}" y="${size/2 + 5}" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="${COLORS.darkRed}" text-anchor="middle">×${quantity}</text>
  </svg>`;
}

// 创建定位标签SVG
function createPositioningTag(positioning: string): string {
  const config = POSITIONING_CONFIG[positioning] || POSITIONING_CONFIG['HOT'];
  const width = config.label.length * 18 + 24;
  return `<svg width="${width}" height="32" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${width}" height="32" rx="4" ry="4" fill="${config.bgColor}"/>
    <text x="${width/2}" y="21" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="${config.color}" text-anchor="middle">${config.label}</text>
  </svg>`;
}

// 创建商品数量标签SVG
function createCountTag(totalItems: number): string {
  const text = `共${totalItems}件`;
  const width = text.length * 16 + 20;
  return `<svg width="${width}" height="32" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${width}" height="32" rx="4" ry="4" fill="${COLORS.gold}"/>
    <text x="${width/2}" y="21" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="${COLORS.darkRed}" text-anchor="middle">${text}</text>
  </svg>`;
}

// 创建底部信息SVG
function createBottomInfo(name: string, retailPrice: number, suggestedPrice: number): string {
  const originalPrice = Math.round(suggestedPrice * 1.2);
  const savings = Math.round((1 - retailPrice / originalPrice) * 100);

  return `<svg width="${IMAGE_SIZE}" height="230" xmlns="http://www.w3.org/2000/svg">
    <!-- 套餐名称 -->
    <text x="${IMAGE_SIZE/2}" y="40" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="${COLORS.darkRed}" text-anchor="middle">${name}</text>

    <!-- 金色装饰线 -->
    <line x1="${IMAGE_SIZE/2 - 100}" y1="60" x2="${IMAGE_SIZE/2 + 100}" y2="60" stroke="${COLORS.gold}" stroke-width="2"/>

    <!-- 现价 -->
    <text x="${IMAGE_SIZE/2}" y="110" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="${COLORS.primaryRed}" text-anchor="middle">¥${retailPrice}</text>

    <!-- 原价（带删除线） -->
    <text x="${IMAGE_SIZE/2 - 60}" y="150" font-family="Arial, sans-serif" font-size="20" fill="#999" text-anchor="middle">原价¥${originalPrice}</text>
    <line x1="${IMAGE_SIZE/2 - 100}" y1="146" x2="${IMAGE_SIZE/2 - 20}" y2="146" stroke="#999" stroke-width="1"/>

    <!-- 省多少 -->
    <text x="${IMAGE_SIZE/2 + 60}" y="150" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="${COLORS.gold}" text-anchor="middle">省${savings}%</text>

    <!-- 底部装饰 -->
    <text x="${IMAGE_SIZE/2}" y="200" font-family="Arial, sans-serif" font-size="14" fill="${COLORS.darkRed}" text-anchor="middle">🎆 春节特惠 · 限时抢购 🎆</text>
  </svg>`;
}

// 创建边框SVG
function createBorder(): string {
  return `<svg width="${IMAGE_SIZE}" height="${IMAGE_SIZE}" xmlns="http://www.w3.org/2000/svg">
    <!-- 红色渐变边框 -->
    <defs>
      <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${COLORS.primaryRed}"/>
        <stop offset="100%" style="stop-color:${COLORS.darkRed}"/>
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="${IMAGE_SIZE - 8}" height="${IMAGE_SIZE - 8}" rx="0" ry="0" fill="none" stroke="url(#redGradient)" stroke-width="8"/>
    <!-- 金色内边框 -->
    <rect x="14" y="14" width="${IMAGE_SIZE - 28}" height="${IMAGE_SIZE - 28}" rx="0" ry="0" fill="none" stroke="${COLORS.gold}" stroke-width="2"/>
  </svg>`;
}

// 生成商品卡片
async function generateProductCard(
  item: PackageItem,
  width: number,
  height: number
): Promise<Buffer | null> {
  try {
    const images = JSON.parse(item.product.images || '[]');
    if (images.length === 0) {
      // 创建占位图
      return sharp({
        create: {
          width,
          height,
          channels: 4,
          background: { r: 245, g: 245, b: 245, alpha: 1 }
        }
      }).png().toBuffer();
    }

    // 下载图片
    const imgBuffer = await downloadImageBuffer(images[0]);

    // 调整大小并裁剪为正方形
    const imageHeight = height - 40;
    const resized = await sharp(imgBuffer)
      .resize(width - 8, imageHeight - 8, {
        fit: 'cover',
        position: 'center'
      })
      .toBuffer();

    // 创建白色背景卡片
    const card = sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    });

    // 创建商品名称SVG
    let productName = item.product.name;
    if (productName.length > 8) {
      productName = productName.substring(0, 7) + '...';
    }
    const nameSvg = `<svg width="${width}" height="40" xmlns="http://www.w3.org/2000/svg">
      <text x="${width/2}" y="25" font-family="Arial, sans-serif" font-size="12" fill="${COLORS.black}" text-anchor="middle">${productName}</text>
    </svg>`;

    // 组合卡片
    const cardBuffer = await card
      .composite([
        { input: resized, top: 4, left: 4 },
        { input: Buffer.from(nameSvg), top: height - 40, left: 0 },
        { input: Buffer.from(createQuantityBadge(item.quantity)), top: 4, left: width - 40 }
      ])
      .png()
      .toBuffer();

    return cardBuffer;
  } catch (err) {
    console.log(`    警告: 无法加载图片 ${item.product.name}:`, err);
    // 返回占位图
    return sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 245, g: 245, b: 245, alpha: 1 }
      }
    }).png().toBuffer();
  }
}

// 生成套餐主图
async function generatePackageImage(pkg: Package): Promise<string> {
  console.log(`\n处理套餐: ${pkg.name} (${pkg.items.length}个商品)`);

  // 创建背景
  const background = sharp({
    create: {
      width: IMAGE_SIZE,
      height: IMAGE_SIZE,
      channels: 4,
      background: { r: 255, g: 245, b: 245, alpha: 1 } // 浅红色背景
    }
  });

  // 计算商品总数
  const totalItems = pkg.items.reduce((sum, item) => sum + item.quantity, 0);

  // 计算布局
  const itemCount = pkg.items.length;
  const gridStartY = 80;
  const gridHeight = 420;
  const gridPadding = 20;
  const gridWidth = IMAGE_SIZE - gridPadding * 2;

  let cols: number, rows: number;
  if (itemCount <= 3) {
    cols = itemCount;
    rows = 1;
  } else if (itemCount <= 4) {
    cols = 2;
    rows = 2;
  } else if (itemCount <= 6) {
    cols = 3;
    rows = 2;
  } else {
    cols = 3;
    rows = Math.ceil(itemCount / 3);
  }

  const gap = 10;
  const cardWidth = Math.floor((gridWidth - gap * (cols - 1)) / cols);
  const cardHeight = Math.floor((gridHeight - gap * (rows - 1)) / rows);

  // 生成商品卡片
  const composites: sharp.OverlayOptions[] = [];

  for (let i = 0; i < pkg.items.length; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = gridPadding + col * (cardWidth + gap);
    const y = gridStartY + row * (cardHeight + gap);

    const cardBuffer = await generateProductCard(pkg.items[i], cardWidth, cardHeight);
    if (cardBuffer) {
      composites.push({ input: cardBuffer, top: y, left: x });
    }
    console.log(`  ✓ ${pkg.items[i].product.name} x${pkg.items[i].quantity}`);
  }

  // 添加边框
  composites.push({ input: Buffer.from(createBorder()), top: 0, left: 0 });

  // 添加定位标签
  composites.push({ input: Buffer.from(createPositioningTag(pkg.positioning)), top: 30, left: 30 });

  // 添加数量标签
  const countTagSvg = createCountTag(totalItems);
  const countTagWidth = (`共${totalItems}件`).length * 16 + 20;
  composites.push({ input: Buffer.from(countTagSvg), top: 30, left: IMAGE_SIZE - countTagWidth - 30 });

  // 添加底部信息
  const bottomInfo = createBottomInfo(
    pkg.name,
    parseFloat(pkg.masterRetailPrice),
    parseFloat(pkg.suggestedPrice)
  );
  composites.push({ input: Buffer.from(bottomInfo), top: IMAGE_SIZE - 230, left: 0 });

  // 生成最终图片
  const fileName = `package-${pkg.id}-main.png`;
  const filePath = path.join(OUTPUT_DIR, fileName);

  await background
    .composite(composites)
    .png()
    .toFile(filePath);

  console.log(`  ✓ 生成套餐图片: ${fileName}`);

  return `/uploads/products/packages/${fileName}`;
}

// 主函数
async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║        套餐图片生成工具 - 喜庆红金风格 (Sharp版)         ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('\n开始时间:', new Date().toISOString());

  try {
    // 确保输出目录存在
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      console.log(`\n创建输出目录: ${OUTPUT_DIR}`);
    }

    // 获取所有套餐
    const packages = await prisma.productPackage.findMany({
      where: { status: 'ACTIVE' },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, images: true }
            }
          },
          orderBy: { sort: 'asc' }
        }
      },
      orderBy: { sort: 'asc' }
    }) as Package[];

    console.log(`\n找到 ${packages.length} 个活跃套餐\n`);

    const results: { id: number; name: string; imageUrl: string }[] = [];

    // 生成每个套餐的图片
    for (const pkg of packages) {
      const imageUrl = await generatePackageImage(pkg);
      results.push({ id: pkg.id, name: pkg.name, imageUrl });
    }

    // 更新数据库
    console.log('\n\n更新数据库中的套餐图片...');
    for (const result of results) {
      const fullUrl = `http://39.104.113.121${result.imageUrl}`;
      await prisma.productPackage.update({
        where: { id: result.id },
        data: {
          images: JSON.stringify([fullUrl])
        }
      });
      console.log(`  ✓ ${result.name}: ${fullUrl}`);
    }

    // 打印结果
    console.log('\n' + '='.repeat(60));
    console.log('生成完成！');
    console.log('='.repeat(60));
    console.log(`  成功生成: ${results.length} 张套餐主图`);
    console.log('结束时间:', new Date().toISOString());

  } catch (error) {
    console.error('\n[ERROR] 生成失败！');
    console.error(error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();

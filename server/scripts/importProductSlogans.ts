/**
 * 产品卖点数据导入脚本
 * 【2026-01-22】
 *
 * 将CSV中的产品卖点信息导入数据库
 *
 * 使用方法：
 * npx ts-node scripts/importProductSlogans.ts
 *
 * CSV字段映射：
 * - 一句话卖点 -> slogan
 * - 营销标签 -> sellingPoints (JSON数组)
 * - 使用场景 -> usageScenes (JSON数组)
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// CSV解析函数
function parseCSV(content: string): Array<Record<string, string>> {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  // 解析表头
  const headers = parseCSVLine(lines[0]);
  const results: Array<Record<string, string>> = [];

  // 解析数据行
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim() || '';
    });

    results.push(row);
  }

  return results;
}

// 解析CSV行（处理引号内的逗号）
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

// 解析营销标签为数组
function parseMarketingTags(tagStr: string): Array<{ icon: string; text: string }> {
  if (!tagStr) return [];

  // 标签格式：儿童首选/安全无烟/抖音10w+
  const tags = tagStr.split('/').filter(t => t.trim());

  // 为不同类型的标签分配图标
  const iconMap: Record<string, string> = {
    '儿童': '👶',
    '安全': '🛡️',
    '抖音': '📱',
    '小红书': '📕',
    '爆款': '🔥',
    '热销': '🔥',
    '神器': '✨',
    '推荐': '👍',
    '首选': '⭐',
    '必备': '💯',
    '最爱': '❤️',
    '天花板': '🏆',
    '顶配': '🏆',
    '入门': '🎯',
    '性价比': '💰',
    '浪漫': '💕',
    '国潮': '🇨🇳',
    '经典': '👑',
    '送礼': '🎁',
    '招财': '💰',
    '发财': '💰',
  };

  return tags.map(tag => {
    // 根据标签内容匹配图标
    let icon = '🏷️';
    for (const [keyword, emoji] of Object.entries(iconMap)) {
      if (tag.includes(keyword)) {
        icon = emoji;
        break;
      }
    }

    return { icon, text: tag };
  });
}

// 解析使用场景为数组
function parseUsageScenes(sceneStr: string): Array<{ icon: string; name: string }> {
  if (!sceneStr) return [];

  // 场景格式：除夕夜给孩子玩、拍新年亲子照、小区里和小朋友一起玩
  const scenes = sceneStr.split('、').filter(s => s.trim());

  // 为不同场景分配图标
  const sceneIcons: Record<string, string> = {
    '除夕': '🧨',
    '新年': '🎊',
    '春节': '🧧',
    '跨年': '🎆',
    '婚礼': '💒',
    '求婚': '💍',
    '生日': '🎂',
    '派对': '🎉',
    '聚会': '👥',
    '拍照': '📸',
    '视频': '🎬',
    '抖音': '📱',
    '小区': '🏘️',
    '院子': '🏡',
    '开业': '🏪',
    '开门': '🚪',
    '送礼': '🎁',
    '送给': '🎁',
    '孩子': '👶',
    '亲子': '👨‍👩‍👧',
    '长辈': '👴',
    '朋友': '🤝',
    '纪念日': '💑',
    '情人节': '💝',
  };

  return scenes.slice(0, 4).map(scene => {
    let icon = '🎯';
    for (const [keyword, emoji] of Object.entries(sceneIcons)) {
      if (scene.includes(keyword)) {
        icon = emoji;
        break;
      }
    }

    // 截取场景名称（最多10个字）
    const name = scene.length > 10 ? scene.substring(0, 10) : scene;
    return { icon, name };
  });
}

// 根据产品名称模糊匹配数据库中的产品
async function findProductByName(productTitle: string): Promise<number | null> {
  // 从标题中提取关键词
  const cleanTitle = productTitle
    .replace(/【.*?】/g, '')  // 移除方括号内容
    .replace(/\d+发/g, '')    // 移除发数
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '') // 只保留中文、英文、数字
    .trim();

  if (!cleanTitle) return null;

  // 尝试模糊搜索
  const product = await prisma.product.findFirst({
    where: {
      OR: [
        { name: { contains: cleanTitle.substring(0, 6) } },
        { name: { contains: productTitle.split('】')[1]?.substring(0, 8) || '' } },
      ]
    },
    select: { id: true, name: true }
  });

  return product?.id || null;
}

async function main() {
  console.log('=== 产品卖点数据导入脚本 ===\n');

  // 读取CSV文件
  const csvPath = path.join(__dirname, '../../蒙庆烟花电商产品介绍_用户思维版.csv');

  if (!fs.existsSync(csvPath)) {
    console.error('CSV文件不存在:', csvPath);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(csvContent);

  console.log(`解析到 ${rows.length} 行数据\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const row of rows) {
    const productTitle = row['产品标题（含搜索关键词）'];
    const slogan = row['一句话卖点'];
    const marketingTags = row['营销标签'];
    const usageScenes = row['使用场景'];

    if (!productTitle || !slogan) {
      skipCount++;
      continue;
    }

    // 查找匹配的产品
    const productId = await findProductByName(productTitle);

    if (!productId) {
      console.log(`未找到匹配产品: ${productTitle.substring(0, 30)}...`);
      skipCount++;
      continue;
    }

    // 解析数据
    const sellingPoints = parseMarketingTags(marketingTags);
    const scenes = parseUsageScenes(usageScenes);

    try {
      // 更新产品
      await prisma.product.update({
        where: { id: productId },
        data: {
          slogan,
          sellingPoints: sellingPoints.length > 0 ? sellingPoints : undefined,
          usageScenes: scenes.length > 0 ? scenes : undefined,
        }
      });

      console.log(`✓ 更新成功: ID=${productId}, slogan="${slogan.substring(0, 20)}..."`);
      successCount++;
    } catch (err) {
      console.error(`✗ 更新失败: ${productTitle}`, err);
      errorCount++;
    }
  }

  console.log('\n=== 导入完成 ===');
  console.log(`成功: ${successCount}`);
  console.log(`跳过: ${skipCount}`);
  console.log(`失败: ${errorCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

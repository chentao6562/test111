/**
 * 产品图片批量处理脚本
 * 功能：为产品图片添加统一边框、品牌Logo、压缩优化
 *
 * 用法：npx ts-node scripts/process-product-images.ts
 */

import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

// 配置
const CONFIG = {
  // 源图片目录
  sourceDir: path.join(__dirname, '../../产品详细清单/线上烟花图'),
  // 输出目录
  outputDir: path.join(__dirname, '../uploads/products'),
  // 目标尺寸
  targetWidth: 750,
  targetHeight: 1125,
  // 边框配置
  border: {
    width: 8,
    color: '#EF062D' // 红色边框
  },
  // 顶部Logo区域
  logoArea: {
    height: 60,
    backgroundColor: '#FFFFFF',
    textColor: '#EF062D',
    text: '蒙庆烟花'
  },
  // 输出质量
  quality: 80
};

// 产品名称映射（文件名 -> 产品名称）
const productNameMapping: Record<string, string> = {
  '1棒棒糖': '棒棒糖',
  '2.18寸仙女棒': '18寸魔法仙女棒',
  '3.28寸仙女棒': '28寸魔法仙女棒',
  '4.36寸仙女棒': '36寸魔法仙女棒',
  '5精彩四变色': '精彩四变色',
  '6超级变变变': '超级变变变',
  '7超级棒棒糖': '超级棒棒糖',
  '8网红棒棒糖': '网红棒棒糖',
  '9无敌棒棒糖': '无敌棒棒糖',
  '10精灵布布': '精灵布布',
  '11 欢乐宝盒': '欢乐宝盒',
  '11.欢乐宝盒24个详情': '欢乐宝盒',
  '12水母派对': '水母派对',
  '13星际水母带接驳器': '星际水母带接驳器',
  '14 蘑菇精灵': '蘑菇精灵',
  '15孔雀开屏': '孔雀开屏',
  '16飞天孔雀': '飞天孔雀',
  '17星空孔雀': '星空孔雀',
  '18炫彩三分钟': '炫彩三分钟',
  '19黄金三分钟': '黄金三分钟',
  '20卡通西游记': '卡通西游记',
  '21非凡大师加特林': '非凡大师加特林',
  '22超能加特林': '超能加特林',
  '23迷你加特林': '迷你加特林',
  '24极速英雄加特林': '极速英雄加特林',
  '25幻影加特林': '幻影加特林',
  '26 七彩风暴七彩魔方加特林': '七彩风暴加特林',
  '27悟空加特林': '悟空加特林',
  '28.缤纷溢彩20发': '缤纷溢彩20发',
  '29 富贵礼炮20发': '富贵礼炮20发',
  '30幸运树60发': '幸运树60发',
  '31黄金树60发': '黄金树60发',
  '32.60发发财树': '60发发财树',
  '33马上有钱': '马上有钱',
  '34.100发霸王蕾': '100发霸王蕾',
  '35富贵喜炮盘炮': '富贵喜炮盘炮',
  '36 顺财神盘炮688型开门红': '顺财神盘炮688型'
};

/**
 * 创建顶部Logo条SVG
 */
function createLogoSvg(width: number): Buffer {
  const svg = `
    <svg width="${width}" height="${CONFIG.logoArea.height}">
      <rect width="100%" height="100%" fill="${CONFIG.logoArea.backgroundColor}"/>
      <text
        x="50%"
        y="50%"
        dominant-baseline="middle"
        text-anchor="middle"
        font-family="Microsoft YaHei, SimHei, sans-serif"
        font-size="28"
        font-weight="bold"
        fill="${CONFIG.logoArea.textColor}"
      >
        ${CONFIG.logoArea.text}
      </text>
      <line x1="0" y1="${CONFIG.logoArea.height - 2}" x2="${width}" y2="${CONFIG.logoArea.height - 2}"
            stroke="${CONFIG.border.color}" stroke-width="4"/>
    </svg>
  `;
  return Buffer.from(svg);
}

/**
 * 创建底部品牌条SVG
 */
function createBottomSvg(width: number): Buffer {
  const height = 40;
  const svg = `
    <svg width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="${CONFIG.logoArea.backgroundColor}"/>
      <line x1="0" y1="2" x2="${width}" y2="2"
            stroke="${CONFIG.border.color}" stroke-width="4"/>
      <text
        x="50%"
        y="55%"
        dominant-baseline="middle"
        text-anchor="middle"
        font-family="Microsoft YaHei, SimHei, sans-serif"
        font-size="16"
        fill="${CONFIG.logoArea.textColor}"
      >
        蒙庆烟花 · 正品保证
      </text>
    </svg>
  `;
  return Buffer.from(svg);
}

/**
 * 处理单张图片
 */
async function processImage(inputPath: string, outputPath: string): Promise<void> {
  try {
    // 获取原图信息
    const metadata = await sharp(inputPath).metadata();
    console.log(`  原图尺寸: ${metadata.width}x${metadata.height}`);

    // 计算内容区域尺寸（去除顶部Logo和底部品牌条的高度）
    const contentWidth = CONFIG.targetWidth - CONFIG.border.width * 2;
    const contentHeight = CONFIG.targetHeight - CONFIG.logoArea.height - 40 - CONFIG.border.width * 2;

    // 1. 调整原图尺寸以适应内容区域
    const resizedImage = await sharp(inputPath)
      .resize(contentWidth, contentHeight, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .toBuffer();

    // 2. 创建Logo和底部条
    const logoSvg = createLogoSvg(CONFIG.targetWidth);
    const bottomSvg = createBottomSvg(CONFIG.targetWidth);

    // 3. 创建最终合成图片
    // 先创建白色背景画布
    const canvas = await sharp({
      create: {
        width: CONFIG.targetWidth,
        height: CONFIG.targetHeight,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
    .composite([
      // 顶部Logo
      {
        input: logoSvg,
        top: 0,
        left: 0
      },
      // 主图内容
      {
        input: resizedImage,
        top: CONFIG.logoArea.height + CONFIG.border.width,
        left: CONFIG.border.width
      },
      // 底部品牌条
      {
        input: bottomSvg,
        top: CONFIG.targetHeight - 40,
        left: 0
      }
    ])
    .jpeg({ quality: CONFIG.quality })
    .toBuffer();

    // 4. 添加红色边框
    await sharp(canvas)
      .extend({
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        background: { r: 239, g: 6, b: 45, alpha: 1 }
      })
      .toFile(outputPath);

    const outputStats = fs.statSync(outputPath);
    console.log(`  输出尺寸: ${CONFIG.targetWidth}x${CONFIG.targetHeight}`);
    console.log(`  文件大小: ${(outputStats.size / 1024).toFixed(1)}KB`);
  } catch (error) {
    console.error(`  处理失败:`, error);
    throw error;
  }
}

/**
 * 获取文件名（不含扩展名）
 */
function getFileNameWithoutExt(filePath: string): string {
  const basename = path.basename(filePath);
  return basename.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  console.log('====================================');
  console.log('产品图片批量处理脚本');
  console.log('====================================\n');

  // 检查源目录
  if (!fs.existsSync(CONFIG.sourceDir)) {
    console.error(`源目录不存在: ${CONFIG.sourceDir}`);
    process.exit(1);
  }

  // 确保输出目录存在
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  // 获取所有图片文件
  const files = fs.readdirSync(CONFIG.sourceDir)
    .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));

  console.log(`找到 ${files.length} 个图片文件\n`);

  const results: { file: string; productName: string; success: boolean; error?: string }[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const inputPath = path.join(CONFIG.sourceDir, file);
    const fileNameNoExt = getFileNameWithoutExt(file);

    // 获取产品名称
    const productName = productNameMapping[fileNameNoExt] || fileNameNoExt;

    // 输出文件名使用产品名称
    const outputFileName = `${productName.replace(/[\/\\:*?"<>|]/g, '_')}.jpg`;
    const outputPath = path.join(CONFIG.outputDir, outputFileName);

    console.log(`[${i + 1}/${files.length}] 处理: ${file}`);
    console.log(`  产品名称: ${productName}`);

    try {
      await processImage(inputPath, outputPath);
      results.push({ file, productName, success: true });
      console.log(`  ✓ 完成\n`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.push({ file, productName, success: false, error: errorMsg });
      console.log(`  ✗ 失败: ${errorMsg}\n`);
    }
  }

  // 输出统计
  console.log('\n====================================');
  console.log('处理完成');
  console.log('====================================');
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  console.log(`成功: ${successCount}, 失败: ${failCount}`);

  if (failCount > 0) {
    console.log('\n失败的文件:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.file}: ${r.error}`);
    });
  }

  // 保存处理结果到JSON文件
  const resultFile = path.join(CONFIG.outputDir, '_process_result.json');
  fs.writeFileSync(resultFile, JSON.stringify(results, null, 2));
  console.log(`\n处理结果已保存到: ${resultFile}`);
}

// 执行
main().catch(console.error);

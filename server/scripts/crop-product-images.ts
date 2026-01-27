/**
 * 产品图片批量裁剪脚本
 * 用于裁剪场景展示型图片，去除过多的背景留白
 * 【2026-01-25】
 */

import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

// 输入输出目录
const INPUT_DIR = 'c:/Users/Administrator/Desktop/烟花6/产品信息/修改后图片';
const OUTPUT_DIR = 'c:/Users/Administrator/Desktop/烟花6/产品信息/裁剪后图片';

// 需要裁剪的图片配置
// cropPercent: 裁剪边缘的百分比（0.15 = 裁掉每边15%）
// cropTop: 顶部额外裁剪（用于去除品牌logo区域）
interface CropConfig {
  filename: string;
  cropPercent: number;  // 四边裁剪比例
  cropTop?: number;     // 顶部额外裁剪比例
  cropBottom?: number;  // 底部额外裁剪比例
}

const IMAGES_TO_CROP: CropConfig[] = [
  // 棒棒糖系列 - 彩色背景+展台（更激进裁剪）
  { filename: '网红棒棒糖.jpg', cropPercent: 0.18, cropTop: 0.08, cropBottom: 0.05 },
  { filename: '超级棒棒糖.jpg', cropPercent: 0.18, cropTop: 0.08, cropBottom: 0.05 },
  { filename: '棒棒糖.jpg', cropPercent: 0.18, cropTop: 0.08, cropBottom: 0.05 },

  // 精灵布布 - 彩色背景+展台+品牌logo（减少底部裁剪，保留完整产品）
  { filename: '精灵布布.jpg', cropPercent: 0.10, cropTop: 0.10, cropBottom: 0.02 },

  // 仙女棒系列 - 场景展示+大量留白（适度裁剪）
  { filename: '18寸仙女棒.jpg', cropPercent: 0.15, cropTop: 0.08 },
  { filename: '28寸仙女棒.jpg', cropPercent: 0.15, cropTop: 0.08 },
  { filename: '36寸仙女棒.jpg', cropPercent: 0.15, cropTop: 0.08 },

  // 孔雀系列 - 粉色背景+品牌logo+展台（减少裁剪，保留完整产品）
  { filename: '孔雀开屏.jpg', cropPercent: 0.08, cropTop: 0.10, cropBottom: 0.03 },
  { filename: '飞天孔雀.jpg', cropPercent: 0.08, cropTop: 0.10, cropBottom: 0.03 },
  { filename: '星空孔雀.jpg', cropPercent: 0.08, cropTop: 0.10, cropBottom: 0.03 },

  // 超级变变变 - 蓝色背景+品牌logo（更激进裁剪）
  { filename: '超级变变变.jpg', cropPercent: 0.18, cropTop: 0.15, cropBottom: 0.05 },

  // 精彩四变色 - 蓝绿背景（新增）
  { filename: '精彩四变色.jpg', cropPercent: 0.18, cropTop: 0.10, cropBottom: 0.08 },

  // 星际水母 - 橙色背景+品牌logo
  { filename: '星际水母带接驳器.jpg', cropPercent: 0.12, cropTop: 0.12, cropBottom: 0.05 },

  // 水母派对
  { filename: '水母派对.jpg', cropPercent: 0.15, cropTop: 0.12, cropBottom: 0.05 },

  // 蘑菇精灵
  { filename: '蘑菇精灵.jpg', cropPercent: 0.15, cropTop: 0.12, cropBottom: 0.05 },

  // 三分钟系列
  { filename: '炫彩三分钟.jpg', cropPercent: 0.12, cropTop: 0.08 },
  { filename: '黄金三分钟.jpg', cropPercent: 0.12, cropTop: 0.08 },

  // 加特林系列（更激进裁剪）
  { filename: '非凡大师加特林.jpg', cropPercent: 0.15, cropTop: 0.12, cropBottom: 0.05 },
  { filename: '超能加特林.jpg', cropPercent: 0.15, cropTop: 0.12, cropBottom: 0.05 },
  { filename: '迷你加特林.jpg', cropPercent: 0.15, cropTop: 0.12, cropBottom: 0.05 },
  { filename: '极速英雄加特林.jpg', cropPercent: 0.15, cropTop: 0.12, cropBottom: 0.05 },
  { filename: '幻影加特林.jpg', cropPercent: 0.15, cropTop: 0.12, cropBottom: 0.05 },
  { filename: '七彩风暴七彩魔方加特林.jpg', cropPercent: 0.15, cropTop: 0.12, cropBottom: 0.05 },
  { filename: '悟空加特林.jpg', cropPercent: 0.15, cropTop: 0.12, cropBottom: 0.05 },

  // 卡通西游记
  { filename: '卡通西游记.jpg', cropPercent: 0.15, cropTop: 0.12, cropBottom: 0.05 },

  // 欢乐宝盒
  { filename: '欢乐宝盒.jpg', cropPercent: 0.15, cropTop: 0.12, cropBottom: 0.05 },
];

/**
 * 裁剪单张图片
 */
async function cropImage(config: CropConfig): Promise<boolean> {
  const inputPath = path.join(INPUT_DIR, config.filename);
  const outputPath = path.join(OUTPUT_DIR, config.filename);

  if (!fs.existsSync(inputPath)) {
    console.log(`⚠ 文件不存在: ${config.filename}`);
    return false;
  }

  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      console.log(`⚠ 无法读取图片尺寸: ${config.filename}`);
      return false;
    }

    const width = metadata.width;
    const height = metadata.height;

    // 计算裁剪区域
    const leftCrop = Math.floor(width * config.cropPercent);
    const rightCrop = Math.floor(width * config.cropPercent);
    const topCrop = Math.floor(height * (config.cropPercent + (config.cropTop || 0)));
    const bottomCrop = Math.floor(height * (config.cropPercent + (config.cropBottom || 0)));

    const cropWidth = width - leftCrop - rightCrop;
    const cropHeight = height - topCrop - bottomCrop;

    // 确保裁剪后的尺寸有效
    if (cropWidth <= 0 || cropHeight <= 0) {
      console.log(`⚠ 裁剪参数无效: ${config.filename}`);
      return false;
    }

    await image
      .extract({
        left: leftCrop,
        top: topCrop,
        width: cropWidth,
        height: cropHeight,
      })
      .jpeg({ quality: 92 })
      .toFile(outputPath);

    console.log(`✓ 裁剪完成: ${config.filename} (${width}x${height} -> ${cropWidth}x${cropHeight})`);
    return true;
  } catch (error) {
    console.log(`✗ 裁剪失败: ${config.filename} - ${error}`);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('产品图片批量裁剪工具');
  console.log('========================================\n');

  // 创建输出目录
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`创建输出目录: ${OUTPUT_DIR}\n`);
  }

  let successCount = 0;
  let failCount = 0;

  for (const config of IMAGES_TO_CROP) {
    const success = await cropImage(config);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('\n========================================');
  console.log(`裁剪完成！成功: ${successCount}, 失败: ${failCount}`);
  console.log(`输出目录: ${OUTPUT_DIR}`);
  console.log('========================================');
}

main().catch(console.error);

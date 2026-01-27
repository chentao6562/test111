/**
 * 批量处理现有图片脚本
 * 用途：一次性处理 uploads/products/ 目录下的所有现有图片
 *
 * 使用方法：
 * npx ts-node scripts/batch-process-images.ts
 *
 * 或后台运行：
 * nohup npx ts-node scripts/batch-process-images.ts > batch.log 2>&1 &
 */

import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { processImage } from '../src/services/imageProcessService';

interface ProcessStats {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  totalOriginalSize: number;
  totalOptimizedSize: number;
  errors: Array<{ file: string; error: string }>;
}

/**
 * 格式化文件大小
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * 获取文件大小
 */
async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

/**
 * 检查图片是否已处理
 */
async function isProcessed(dir: string, filename: string): Promise<boolean> {
  const ext = path.extname(filename);
  const nameWithoutExt = path.basename(filename, ext);
  const smallWebpPath = path.join(dir, 'small', `${nameWithoutExt}.webp`);
  return existsSync(smallWebpPath);
}

/**
 * 递归扫描目录获取所有图片文件
 */
async function scanDirectory(dir: string): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // 跳过 small/medium/large 目录（这些是生成的变体目录）
        if (
          entry.name === 'small' ||
          entry.name === 'medium' ||
          entry.name === 'large'
        ) {
          continue;
        }

        // 递归扫描子目录
        const subFiles = await scanDirectory(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        // 只处理图片文件
        const ext = path.extname(entry.name).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (err) {
    console.error(`扫描目录失败: ${dir}`, err);
  }

  return files;
}

/**
 * 批量处理图片
 */
async function batchProcess() {
  console.log('========================================');
  console.log('批量图片处理脚本');
  console.log('========================================\n');

  const uploadsDir = path.join(process.cwd(), 'uploads', 'products');

  if (!existsSync(uploadsDir)) {
    console.error(`目录不存在: ${uploadsDir}`);
    process.exit(1);
  }

  console.log(`扫描目录: ${uploadsDir}\n`);

  // 扫描所有图片文件
  const allFiles = await scanDirectory(uploadsDir);

  if (allFiles.length === 0) {
    console.log('未找到任何图片文件');
    return;
  }

  console.log(`找到 ${allFiles.length} 个图片文件\n`);

  const stats: ProcessStats = {
    total: allFiles.length,
    success: 0,
    failed: 0,
    skipped: 0,
    totalOriginalSize: 0,
    totalOptimizedSize: 0,
    errors: [],
  };

  // 处理每个文件
  for (let i = 0; i < allFiles.length; i++) {
    const filePath = allFiles[i];
    const relativePath = path.relative(uploadsDir, filePath);
    const dir = path.dirname(filePath);
    const filename = path.basename(filePath);

    const progress = `[${i + 1}/${allFiles.length}]`;

    // 检查是否已处理
    if (await isProcessed(dir, filename)) {
      console.log(`${progress} ⏭️  跳过 (已处理): ${relativePath}`);
      stats.skipped++;
      continue;
    }

    // 获取原始文件大小
    const originalSize = await getFileSize(filePath);
    stats.totalOriginalSize += originalSize;

    try {
      // 处理图片
      const result = await processImage(filePath, dir, filename);

      if (result.success && result.stats) {
        const saved =
          originalSize -
          (result.stats.smallSize + result.stats.mediumSize + result.stats.largeSize);
        const savedPercent = ((saved / originalSize) * 100).toFixed(1);

        console.log(
          `${progress} ✅ ${relativePath} - ${formatSize(originalSize)} → ${formatSize(result.stats.smallSize + result.stats.mediumSize + result.stats.largeSize)} (减少 ${savedPercent}%)`
        );

        stats.success++;
        stats.totalOptimizedSize +=
          result.stats.smallSize + result.stats.mediumSize + result.stats.largeSize;
      } else {
        console.error(`${progress} ❌ ${relativePath} - ${result.error}`);
        stats.failed++;
        stats.errors.push({
          file: relativePath,
          error: result.error || '未知错误',
        });
      }
    } catch (err: any) {
      console.error(`${progress} ❌ ${relativePath} - ${err.message}`);
      stats.failed++;
      stats.errors.push({
        file: relativePath,
        error: err.message,
      });
    }

    // 每处理10个文件输出一次进度
    if ((i + 1) % 10 === 0) {
      console.log(`\n进度: ${i + 1}/${allFiles.length} (${((i + 1) / allFiles.length * 100).toFixed(1)}%)\n`);
    }
  }

  // 输出统计结果
  console.log('\n========================================');
  console.log('处理完成！');
  console.log('========================================\n');

  console.log(`总文件数: ${stats.total}`);
  console.log(`✅ 成功: ${stats.success}`);
  console.log(`⏭️  跳过: ${stats.skipped}`);
  console.log(`❌ 失败: ${stats.failed}`);
  console.log(`\n原始总大小: ${formatSize(stats.totalOriginalSize)}`);
  console.log(`优化后大小: ${formatSize(stats.totalOptimizedSize)}`);

  if (stats.totalOriginalSize > 0) {
    const saved = stats.totalOriginalSize - stats.totalOptimizedSize;
    const savedPercent = ((saved / stats.totalOriginalSize) * 100).toFixed(1);
    console.log(`节省空间: ${formatSize(saved)} (${savedPercent}%)`);
  }

  // 输出错误详情
  if (stats.errors.length > 0) {
    console.log('\n========================================');
    console.log('错误详情:');
    console.log('========================================\n');
    stats.errors.forEach(({ file, error }) => {
      console.log(`❌ ${file}`);
      console.log(`   原因: ${error}\n`);
    });
  }

  console.log('\n批量处理结束');
}

// 运行脚本
batchProcess()
  .then(() => {
    console.log('脚本执行完成');
    process.exit(0);
  })
  .catch((err) => {
    console.error('脚本执行失败:', err);
    process.exit(1);
  });

import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

/**
 * 图片处理服务
 * 使用Sharp库自动生成多种尺寸和格式的图片变体
 */

interface ImageVariants {
  original: string;
  smallJpeg: string;
  smallWebp: string;
  mediumJpeg: string;
  mediumWebp: string;
  largeJpeg: string;
  largeWebp: string;
}

interface ProcessResult {
  success: boolean;
  variants?: ImageVariants;
  error?: string;
  stats?: {
    originalSize: number;
    smallSize: number;
    mediumSize: number;
    largeSize: number;
    compressionRatio: string;
  };
}

// 图片尺寸配置
const SIZES = {
  small: 150,
  medium: 375,
  large: 750,
};

// 质量配置
const QUALITY = {
  jpeg: {
    small: 85,
    medium: 85,
    large: 90,
  },
  webp: {
    small: 80,
    medium: 80,
    large: 85,
  },
};

/**
 * 确保目录存在
 */
async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * 获取文件大小（字节）
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
 * 处理单张图片，生成所有变体
 * @param inputPath 原始图片绝对路径
 * @param outputDir 输出目录（如 uploads/products/2026/01）
 * @param filename 文件名（不含路径）
 */
export async function processImage(
  inputPath: string,
  outputDir: string,
  filename: string
): Promise<ProcessResult> {
  try {
    // 检查输入文件是否存在
    if (!existsSync(inputPath)) {
      return {
        success: false,
        error: '原始图片不存在',
      };
    }

    // 获取原始文件大小
    const originalSize = await getFileSize(inputPath);

    // 解析文件名和扩展名
    const ext = path.extname(filename);
    const nameWithoutExt = path.basename(filename, ext);

    // 创建输出目录
    const smallDir = path.join(outputDir, 'small');
    const mediumDir = path.join(outputDir, 'medium');
    const largeDir = path.join(outputDir, 'large');

    await Promise.all([
      ensureDir(smallDir),
      ensureDir(mediumDir),
      ensureDir(largeDir),
    ]);

    // 加载图片
    const image = sharp(inputPath);
    const metadata = await image.metadata();

    // 如果图片尺寸小于目标尺寸，使用原始尺寸
    const smallSize = Math.min(SIZES.small, metadata.width || SIZES.small);
    const mediumSize = Math.min(SIZES.medium, metadata.width || SIZES.medium);
    const largeSize = Math.min(SIZES.large, metadata.width || SIZES.large);

    // 生成所有变体
    const tasks = [
      // Small JPEG
      sharp(inputPath)
        .resize(smallSize, smallSize, { fit: 'cover', position: 'centre' })
        .jpeg({
          quality: QUALITY.jpeg.small,
          progressive: true,
          mozjpeg: true,
        })
        .toFile(path.join(smallDir, `${nameWithoutExt}.jpg`)),

      // Small WebP
      sharp(inputPath)
        .resize(smallSize, smallSize, { fit: 'cover', position: 'centre' })
        .webp({
          quality: QUALITY.webp.small,
          effort: 4,
        })
        .toFile(path.join(smallDir, `${nameWithoutExt}.webp`)),

      // Medium JPEG
      sharp(inputPath)
        .resize(mediumSize, mediumSize, { fit: 'cover', position: 'centre' })
        .jpeg({
          quality: QUALITY.jpeg.medium,
          progressive: true,
          mozjpeg: true,
        })
        .toFile(path.join(mediumDir, `${nameWithoutExt}.jpg`)),

      // Medium WebP
      sharp(inputPath)
        .resize(mediumSize, mediumSize, { fit: 'cover', position: 'centre' })
        .webp({
          quality: QUALITY.webp.medium,
          effort: 4,
        })
        .toFile(path.join(mediumDir, `${nameWithoutExt}.webp`)),

      // Large JPEG
      sharp(inputPath)
        .resize(largeSize, largeSize, { fit: 'cover', position: 'centre' })
        .jpeg({
          quality: QUALITY.jpeg.large,
          progressive: true,
          mozjpeg: true,
        })
        .toFile(path.join(largeDir, `${nameWithoutExt}.jpg`)),

      // Large WebP
      sharp(inputPath)
        .resize(largeSize, largeSize, { fit: 'cover', position: 'centre' })
        .webp({
          quality: QUALITY.webp.large,
          effort: 4,
        })
        .toFile(path.join(largeDir, `${nameWithoutExt}.webp`)),
    ];

    await Promise.all(tasks);

    // 获取生成文件的大小
    const smallJpegSize = await getFileSize(
      path.join(smallDir, `${nameWithoutExt}.jpg`)
    );
    const mediumJpegSize = await getFileSize(
      path.join(mediumDir, `${nameWithoutExt}.jpg`)
    );
    const largeJpegSize = await getFileSize(
      path.join(largeDir, `${nameWithoutExt}.jpg`)
    );

    const totalOptimizedSize = smallJpegSize + mediumJpegSize + largeJpegSize;
    const compressionRatio = (
      ((originalSize - totalOptimizedSize) / originalSize) *
      100
    ).toFixed(1);

    // 构建变体URL路径（相对路径）
    const baseUrl = outputDir.replace(/\\/g, '/').replace(/^.*uploads/, '/uploads');
    const variants: ImageVariants = {
      original: `${baseUrl}/${filename}`,
      smallJpeg: `${baseUrl}/small/${nameWithoutExt}.jpg`,
      smallWebp: `${baseUrl}/small/${nameWithoutExt}.webp`,
      mediumJpeg: `${baseUrl}/medium/${nameWithoutExt}.jpg`,
      mediumWebp: `${baseUrl}/medium/${nameWithoutExt}.webp`,
      largeJpeg: `${baseUrl}/large/${nameWithoutExt}.jpg`,
      largeWebp: `${baseUrl}/large/${nameWithoutExt}.webp`,
    };

    return {
      success: true,
      variants,
      stats: {
        originalSize,
        smallSize: smallJpegSize,
        mediumSize: mediumJpegSize,
        largeSize: largeJpegSize,
        compressionRatio: `${compressionRatio}%`,
      },
    };
  } catch (err: any) {
    console.error('图片处理失败:', err);
    return {
      success: false,
      error: err.message || '图片处理失败',
    };
  }
}

/**
 * 删除图片的所有变体
 * @param outputDir 输出目录
 * @param filename 文件名
 */
export async function deleteImageVariants(
  outputDir: string,
  filename: string
): Promise<void> {
  try {
    const ext = path.extname(filename);
    const nameWithoutExt = path.basename(filename, ext);

    const filesToDelete = [
      path.join(outputDir, 'small', `${nameWithoutExt}.jpg`),
      path.join(outputDir, 'small', `${nameWithoutExt}.webp`),
      path.join(outputDir, 'medium', `${nameWithoutExt}.jpg`),
      path.join(outputDir, 'medium', `${nameWithoutExt}.webp`),
      path.join(outputDir, 'large', `${nameWithoutExt}.jpg`),
      path.join(outputDir, 'large', `${nameWithoutExt}.webp`),
    ];

    // 删除所有变体（忽略不存在的文件）
    await Promise.all(
      filesToDelete.map((file) =>
        fs.unlink(file).catch(() => {
          // 忽略错误（文件可能不存在）
        })
      )
    );

    console.log(`已删除图片变体: ${filename}`);
  } catch (err: any) {
    console.error('删除图片变体失败:', err);
  }
}

/**
 * 批量处理图片
 * @param files 文件信息数组
 */
export async function processMultipleImages(
  files: Array<{ inputPath: string; outputDir: string; filename: string }>
): Promise<ProcessResult[]> {
  const results: ProcessResult[] = [];

  for (const file of files) {
    const result = await processImage(
      file.inputPath,
      file.outputDir,
      file.filename
    );
    results.push(result);
  }

  return results;
}

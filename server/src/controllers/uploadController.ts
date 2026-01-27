import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { success, error, validationError } from '../utils/response';
import { deleteFile, getUploadConfig } from '../services/uploadService';
import { processImage, deleteImageVariants } from '../services/imageProcessService';
import { convertToHls } from '../services/hlsService';

const execAsync = promisify(exec);

/**
 * 压缩优化视频文件
 * - 使用FFmpeg压缩视频码率到1.5Mbps
 * - 移动moov原子到文件开头（支持流式播放）
 */
async function compressVideo(filePath: string): Promise<{ success: boolean; newSize?: number; error?: string }> {
  try {
    // 检查FFmpeg是否可用
    await execAsync('which ffmpeg');

    const tempPath = filePath + '.temp.mp4';

    // FFmpeg压缩命令：
    // -b:v 1500k: 视频码率1.5Mbps（足够清晰且体积小）
    // -c:a aac -b:a 128k: 音频AAC编码，128kbps
    // -movflags +faststart: 将moov原子移到文件开头（关键！）
    const cmd = `ffmpeg -y -i "${filePath}" -b:v 1500k -c:a aac -b:a 128k -movflags +faststart "${tempPath}"`;

    console.log('开始压缩视频:', filePath);
    await execAsync(cmd, { timeout: 300000 }); // 5分钟超时

    // 获取压缩后文件大小
    const stats = await fs.promises.stat(tempPath);

    // 替换原文件
    await fs.promises.unlink(filePath);
    await fs.promises.rename(tempPath, filePath);

    console.log(`视频压缩完成: ${stats.size} bytes`);
    return { success: true, newSize: stats.size };
  } catch (err: any) {
    console.warn('视频压缩跳过:', err.message);
    // 清理临时文件
    try {
      await fs.promises.unlink(filePath + '.temp.mp4');
    } catch {}
    return { success: false, error: err.message };
  }
}

/**
 * 上传单张图片
 * POST /api/upload/image
 */
export async function uploadImage(req: Request, res: Response) {
  try {
    if (!req.file) {
      validationError(res, '请选择要上传的图片');
      return;
    }

    const file = req.file;
    const today = new Date();
    const dateDir = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}`;

    const result: any = {
      url: `/uploads/${dateDir}/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };

    // 如果是图片，自动处理生成变体
    if (file.mimetype.startsWith('image/')) {
      const outputDir = path.join(process.cwd(), 'uploads', dateDir);
      const processResult = await processImage(file.path, outputDir, file.filename);

      if (processResult.success && processResult.variants) {
        result.processed = processResult.variants;
        result.stats = processResult.stats;
        console.log(`图片处理成功: ${file.filename}`, processResult.stats);
      } else {
        console.warn(`图片处理失败: ${file.filename}`, processResult.error);
      }
    }

    success(res, result, '上传成功');
  } catch (err: any) {
    console.error('上传图片失败:', err);
    error(res, err.message || '上传图片失败', 500);
  }
}

/**
 * 上传多张图片
 * POST /api/upload/images
 */
export async function uploadImages(req: Request, res: Response) {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      validationError(res, '请选择要上传的图片');
      return;
    }

    const today = new Date();
    const dateDir = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}`;
    const outputDir = path.join(process.cwd(), 'uploads', dateDir);

    const results = await Promise.all(
      files.map(async (file) => {
        const result: any = {
          url: `/uploads/${dateDir}/${file.filename}`,
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
        };

        // 如果是图片，自动处理生成变体
        if (file.mimetype.startsWith('image/')) {
          const processResult = await processImage(file.path, outputDir, file.filename);

          if (processResult.success && processResult.variants) {
            result.processed = processResult.variants;
            result.stats = processResult.stats;
            console.log(`图片处理成功: ${file.filename}`, processResult.stats);
          } else {
            console.warn(`图片处理失败: ${file.filename}`, processResult.error);
          }
        }

        return result;
      })
    );

    success(res, results, `成功上传 ${results.length} 张图片`);
  } catch (err: any) {
    console.error('上传图片失败:', err);
    error(res, err.message || '上传图片失败', 500);
  }
}

/**
 * 上传视频
 * POST /api/upload/video
 * 自动转换为HLS流媒体格式（如果FFmpeg可用），否则降级为压缩MP4
 */
export async function uploadVideo(req: Request, res: Response) {
  try {
    if (!req.file) {
      validationError(res, '请选择要上传的视频');
      return;
    }

    const file = req.file;
    const today = new Date();
    const dateDir = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}`;
    const outputDir = path.join(process.cwd(), 'uploads', dateDir);
    const baseName = path.basename(file.filename, path.extname(file.filename));

    // 尝试转换为HLS格式（推荐，支持自适应码率）
    if (file.mimetype === 'video/mp4') {
      console.log(`开始HLS转码: ${file.originalname}`);
      const hlsResult = await convertToHls(file.path, outputDir, baseName);

      if (hlsResult.success && hlsResult.playlistUrl) {
        success(res, {
          url: hlsResult.playlistUrl,
          filename: baseName,
          originalName: file.originalname,
          format: 'hls',
          variants: hlsResult.variants,
        }, '视频上传成功（已转换为流媒体格式）');
        return;
      }

      console.warn('HLS转码失败，尝试降级压缩:', hlsResult.error);

      // 降级方案：压缩MP4
      const compressResult = await compressVideo(file.path);
      const result: any = {
        url: `/uploads/${dateDir}/${file.filename}`,
        filename: file.filename,
        originalName: file.originalname,
        size: compressResult.success && compressResult.newSize ? compressResult.newSize : file.size,
        mimetype: file.mimetype,
        format: 'mp4',
      };

      if (compressResult.success && compressResult.newSize) {
        result.compressed = true;
        result.originalSize = file.size;
        result.compressionRatio = Math.round((1 - compressResult.newSize / file.size) * 100);
        console.log(`视频压缩成功: ${file.originalname}, 压缩率 ${result.compressionRatio}%`);
      }

      success(res, result, '视频上传成功');
      return;
    }

    // 非MP4格式，直接返回
    success(res, {
      url: `/uploads/${dateDir}/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      format: 'original',
    }, '视频上传成功');
  } catch (err: any) {
    console.error('上传视频失败:', err);
    error(res, err.message || '上传视频失败', 500);
  }
}

/**
 * 删除图片
 * DELETE /api/upload/image
 */
export async function removeImage(req: Request, res: Response) {
  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      validationError(res, '请提供要删除的图片URL');
      return;
    }

    // 安全检查：确保是uploads目录下的文件
    if (!url.startsWith('/uploads/')) {
      validationError(res, '无效的图片URL');
      return;
    }

    // 防止路径遍历攻击
    const normalizedUrl = path.normalize(url);
    if (normalizedUrl.includes('..')) {
      validationError(res, '无效的图片URL');
      return;
    }

    // 删除原始文件
    const deleted = await deleteFile(url);

    if (deleted) {
      // 如果是商品图片，同时删除所有变体
      if (url.includes('/uploads/products/') || url.includes('/uploads/banners/')) {
        try {
          // 解析路径获取目录和文件名
          const urlPath = url.replace('/uploads/', '');
          const parts = urlPath.split('/');
          const filename = parts[parts.length - 1];
          const dateDir = parts.slice(0, -1).join('/');
          const outputDir = path.join(process.cwd(), 'uploads', dateDir);

          await deleteImageVariants(outputDir, filename);
          console.log(`已删除图片及其变体: ${filename}`);
        } catch (err) {
          console.warn('删除图片变体失败:', err);
          // 即使删除变体失败，也认为删除成功（原始文件已删除）
        }
      }

      success(res, null, '删除成功');
    } else {
      error(res, '图片不存在或已被删除', 404);
    }
  } catch (err: any) {
    console.error('删除图片失败:', err);
    error(res, err.message || '删除图片失败', 500);
  }
}

/**
 * 获取上传配置
 * GET /api/upload/config
 */
export async function getConfig(req: Request, res: Response) {
  try {
    const config = getUploadConfig();
    success(res, config);
  } catch (err: any) {
    console.error('获取上传配置失败:', err);
    error(res, '获取上传配置失败', 500);
  }
}

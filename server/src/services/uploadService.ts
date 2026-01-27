import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

// 确保上传目录存在
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 允许的图片类型
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
// 允许的视频类型
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
// 所有允许的类型
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 图片5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 视频50MB

// 【2026-01-22 安全修复】文件类型与扩展名映射（白名单）
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
};

// 【2026-01-22 安全修复】文件魔数（用于验证文件真实类型）
const FILE_SIGNATURES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header
  'video/mp4': [[0x66, 0x74, 0x79, 0x70]], // ftyp at offset 4
  'video/webm': [[0x1A, 0x45, 0xDF, 0xA3]],
  'video/quicktime': [[0x66, 0x74, 0x79, 0x70, 0x71, 0x74]], // ftypqt
};

// 配置存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 按日期创建子目录
    const today = new Date();
    const dateDir = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}`;
    const targetDir = path.join(uploadDir, dateDir);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    // 【2026-01-22 安全修复】使用白名单扩展名，而非原始文件名的扩展名
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    // 根据mimetype获取安全的扩展名（不信任用户提供的扩展名）
    const ext = MIME_TO_EXT[file.mimetype] || '.bin';
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

// 文件过滤器
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只支持 JPG、PNG、GIF、WebP 格式的图片或 MP4、WebM 格式的视频'));
  }
};

// 创建multer实例（图片上传，5MB限制）
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_IMAGE_SIZE,
    files: 9, // 最多9张图片
  },
});

// 创建multer实例（视频上传，50MB限制）
export const uploadVideo = multer({
  storage,
  fileFilter: (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 MP4、WebM 格式的视频'));
    }
  },
  limits: {
    fileSize: MAX_VIDEO_SIZE,
    files: 1,
  },
});

// 创建通用multer实例（图片和视频，动态判断大小）
export const uploadMedia = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_VIDEO_SIZE, // 使用视频的最大限制
    files: 1,
  },
});

/**
 * 获取文件的访问URL
 */
export function getFileUrl(filename: string, dateDir: string): string {
  // 返回相对路径，前端拼接域名
  return `/uploads/${dateDir}/${filename}`;
}

/**
 * 删除文件
 * 【2026-01-22 安全修复】添加路径遍历保护
 */
export async function deleteFile(filePath: string): Promise<boolean> {
  try {
    // 【安全】规范化路径并验证在uploads目录内
    const normalizedPath = path.normalize(filePath);

    // 检查是否包含路径遍历字符
    if (normalizedPath.includes('..') || normalizedPath.includes('\0')) {
      console.error('[uploadService] 检测到路径遍历尝试:', filePath);
      return false;
    }

    const fullPath = path.join(process.cwd(), normalizedPath);
    const resolvedPath = path.resolve(fullPath);

    // 确保文件在uploads目录内
    if (!resolvedPath.startsWith(uploadDir)) {
      console.error('[uploadService] 尝试删除uploads目录外的文件:', resolvedPath);
      return false;
    }

    if (fs.existsSync(resolvedPath)) {
      fs.unlinkSync(resolvedPath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('删除文件失败:', error);
    return false;
  }
}

/**
 * 获取上传配置信息
 */
export function getUploadConfig() {
  return {
    allowedTypes: ALLOWED_TYPES,
    maxImageSize: MAX_IMAGE_SIZE,
    maxVideoSize: MAX_VIDEO_SIZE,
    maxFiles: 9,
  };
}

/**
 * 【2026-01-22 安全修复】验证文件内容类型（检查魔数）
 * @param filePath 文件路径
 * @param expectedMime 期望的MIME类型
 * @returns 文件是否为期望的类型
 */
export async function validateFileContent(filePath: string, expectedMime: string): Promise<boolean> {
  try {
    const signatures = FILE_SIGNATURES[expectedMime];
    if (!signatures) {
      // 未知类型，跳过验证
      return true;
    }

    // 读取文件头（前12字节足够检测大多数格式）
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(12);
    fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);

    // MP4文件的ftyp在offset 4处
    if (expectedMime === 'video/mp4') {
      const ftypSignature = [0x66, 0x74, 0x79, 0x70];
      const slice = buffer.slice(4, 8);
      return ftypSignature.every((byte, i) => slice[i] === byte);
    }

    // 检查是否匹配任一签名
    for (const signature of signatures) {
      const slice = buffer.slice(0, signature.length);
      if (signature.every((byte, i) => slice[i] === byte)) {
        return true;
      }
    }

    console.warn(`[uploadService] 文件类型不匹配: 期望 ${expectedMime}, 文件头: ${buffer.slice(0, 8).toString('hex')}`);
    return false;
  } catch (error) {
    console.error('[uploadService] 验证文件内容失败:', error);
    return false;
  }
}

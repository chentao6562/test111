import { Router, Request, Response, NextFunction } from 'express';
import { upload, uploadVideo as uploadVideoMiddleware, uploadAudio as uploadAudioMiddleware } from '../services/uploadService';
import {
  uploadImage,
  uploadImages,
  uploadVideo,
  uploadAudio,
  removeImage,
  getConfig,
} from '../controllers/uploadController';
import { authAdmin } from '../middlewares/auth';
import { uploadRateLimiter } from '../middlewares/rateLimit';
import { error } from '../utils/response';

const router = Router();

// 图片上传错误处理中间件
const handleImageError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      error(res, '图片大小不能超过5MB', 400);
      return;
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      error(res, '最多只能上传9张图片', 400);
      return;
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      error(res, '文件字段名错误', 400);
      return;
    }
    if (err.message) {
      error(res, err.message, 400);
      return;
    }
    error(res, '上传失败', 500);
    return;
  }
  next();
};

// 视频上传错误处理中间件
const handleVideoError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      error(res, '视频大小不能超过50MB', 400);
      return;
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      error(res, '只能上传1个视频', 400);
      return;
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      error(res, '文件字段名错误', 400);
      return;
    }
    if (err.message) {
      error(res, err.message, 400);
      return;
    }
    error(res, '视频上传失败', 500);
    return;
  }
  next();
};

// 获取上传配置（公开）
router.get('/config', getConfig);

// 上传单张图片（需要管理员权限，添加上传速率限制）
router.post(
  '/image',
  authAdmin,
  uploadRateLimiter,
  upload.single('image'),
  handleImageError,
  uploadImage
);

// 上传多张图片（需要管理员权限，添加上传速率限制）
router.post(
  '/images',
  authAdmin,
  uploadRateLimiter,
  upload.array('images', 9),
  handleImageError,
  uploadImages
);

// 上传视频（需要管理员权限，50MB限制，添加上传速率限制）
router.post(
  '/video',
  authAdmin,
  uploadRateLimiter,
  uploadVideoMiddleware.single('video'),
  handleVideoError,
  uploadVideo
);

// 音频上传错误处理中间件
const handleAudioError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      error(res, '音频大小不能超过10MB', 400);
      return;
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      error(res, '只能上传1个音频', 400);
      return;
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      error(res, '文件字段名错误', 400);
      return;
    }
    if (err.message) {
      error(res, err.message, 400);
      return;
    }
    error(res, '音频上传失败', 500);
    return;
  }
  next();
};

// 上传音频（需要管理员权限，10MB限制）
router.post(
  '/audio',
  authAdmin,
  uploadRateLimiter,
  uploadAudioMiddleware.single('audio'),
  handleAudioError,
  uploadAudio
);

// 删除图片（需要管理员权限）
router.delete('/image', authAdmin, removeImage);

export default router;

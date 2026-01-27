/**
 * 推荐商品路由（小程序端）
 * 【2026-01-25】移除认证要求，允许首页公开展示推荐商品
 * 【2026-01-26】添加authOptional，支持推销员看到拿货价
 */
import { Router } from 'express';
import * as recommendController from '../controllers/recommendController';
import { authOptional } from '../middlewares/auth';

const router = Router();

// 获取推荐商品列表（公开访问，已登录推销员看到拿货价）
router.get('/', authOptional, recommendController.getRecommends);

export default router;

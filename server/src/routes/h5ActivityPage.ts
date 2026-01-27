/**
 * H5前端活动专题页路由
 * 【2026-01-19 活动系统增强】
 */
import express from 'express';
import activityPageController from '../controllers/activityPageController';

const router = express.Router();

// 无需认证，公开访问
// 获取专题页内容（通过slug）
router.get('/:slug', activityPageController.getPageBySlug);

export default router;

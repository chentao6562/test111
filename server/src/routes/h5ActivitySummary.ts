/**
 * H5端活动汇总路由
 * 【2026-01-23】
 *
 * 提供首页活动中心横幅的动态活动数据
 */

import { Router } from 'express';
import { getActivitySummary } from '../controllers/activitySummaryController';

const router = Router();

// GET /api/h5/activity-summary - 获取活动汇总
router.get('/', getActivitySummary);

export default router;

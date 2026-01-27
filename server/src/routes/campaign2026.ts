/**
 * 2026春节营销活动路由
 * 【2026-01-18】代金券相关路由
 */

import { Router } from 'express';
import { authAgent } from '../middlewares/auth';
import {
  getMyCouponsHandler,
  getMyCouponStatsHandler,
} from '../controllers/campaign2026Controller';

const router = Router();

// ============== 推销员端API（需要agent认证） ==============

// 获取我的代金券列表
router.get('/coupons', authAgent, getMyCouponsHandler);

// 获取我的代金券统计
router.get('/coupons/stats', authAgent, getMyCouponStatsHandler);

export default router;

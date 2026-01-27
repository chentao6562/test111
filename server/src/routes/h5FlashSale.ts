/**
 * H5端秒杀路由
 * 【2026-01-20 秒杀系统】
 *
 * 无需登录即可访问
 */

import { Router } from 'express';
import * as flashSaleController from '../controllers/flashSaleController';

const router = Router();

// 获取当前秒杀活动（含商品列表）
router.get('/current', flashSaleController.getCurrentActivity);

// 检查是否满足加购条件
router.post('/check-eligible', flashSaleController.checkEligible);

export default router;

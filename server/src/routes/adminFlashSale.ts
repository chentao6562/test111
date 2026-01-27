/**
 * 管理后台秒杀路由
 * 【2026-01-20 秒杀系统】
 *
 * 需要管理员权限
 */

import { Router } from 'express';
import * as flashSaleController from '../controllers/flashSaleController';

const router = Router();

// 活动管理
router.get('/activities', flashSaleController.getActivityList);
router.get('/activities/:id', flashSaleController.getActivityDetail);
router.post('/activities', flashSaleController.createActivity);
router.put('/activities/:id', flashSaleController.updateActivity);
router.delete('/activities/:id', flashSaleController.deleteActivity);
router.put('/activities/:id/status', flashSaleController.updateActivityStatus);

// 秒杀商品管理
router.post('/activities/:id/items', flashSaleController.addItems);
router.put('/activities/:id/items/:itemId', flashSaleController.updateItem);
router.delete('/activities/:id/items/:itemId', flashSaleController.removeItem);
// 兼容旧路由（可选）
router.put('/items/:itemId', flashSaleController.updateItem);
router.delete('/items/:itemId', flashSaleController.removeItem);

export default router;

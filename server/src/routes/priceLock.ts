/**
 * 锁价路由
 * @module routes/priceLock
 * @since 2026-01-21
 */

import { Router } from 'express';
import * as priceLockController from '../controllers/priceLockController';

const router = Router();

// 获取锁价配置
router.get('/config', priceLockController.getConfig);

// 创建锁价
router.post('/create', priceLockController.createPriceLock);

// 获取当前有效的锁价
router.get('/active', priceLockController.getActivePriceLock);

// 获取我的锁价列表
router.get('/my', priceLockController.getMyPriceLocks);

// 验证锁价码
router.post('/validate', priceLockController.validatePriceLock);

// 获取锁价详情（放在最后，避免被其他路由匹配）
router.get('/:code', priceLockController.getPriceLockDetail);

export default router;

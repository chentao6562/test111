/**
 * 套餐路由（H5端）
 * 【2026-01-25】新增套餐功能
 */
import { Router } from 'express';
import * as packageController from '../controllers/packageController';
import { authOptional, authAgent } from '../middlewares/auth';

const router = Router();

// H5端套餐接口（支持可选认证，用于获取推销员价格）
router.get('/', authOptional, packageController.getPackages);
router.get('/:id', authOptional, packageController.getPackageDetail);

// 推销员定价接口（需要登录）
router.put('/:id/price', authAgent, packageController.setPackagePrice);

// 套餐预约接口（支持可选认证，访客也可以预约）
// 【2026-01-26】新增
router.post('/:id/reserve', authOptional, packageController.createPackageReservation);

export default router;

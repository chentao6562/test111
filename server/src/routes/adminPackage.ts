/**
 * 套餐管理路由（管理后台）
 * 【2026-01-25】新增套餐功能
 */
import { Router } from 'express';
import * as packageController from '../controllers/packageController';

const router = Router();

// 套餐CRUD
router.get('/', packageController.adminGetPackages);
router.get('/:id', packageController.adminGetPackageDetail);
router.post('/', packageController.createPackage);
router.put('/:id', packageController.updatePackage);
router.delete('/:id', packageController.deletePackage);

// 套餐状态切换
router.put('/:id/toggle', packageController.togglePackageStatus);

// 套餐商品配置
router.put('/:id/items', packageController.setPackageItems);

export default router;

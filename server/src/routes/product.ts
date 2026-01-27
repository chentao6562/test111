import { Router } from 'express';
import * as productController from '../controllers/productController';
import { authOptional } from '../middlewares/auth';

const router = Router();

// 公开接口（可选认证，用于返回对应价格）
router.get('/', authOptional, productController.list);
router.get('/:id', authOptional, productController.detail);

export default router;

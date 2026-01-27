import { Router } from 'express';
import * as categoryController from '../controllers/categoryController';

const router = Router();

// 公开接口
router.get('/', categoryController.list);
router.get('/:id', categoryController.detail);

export default router;

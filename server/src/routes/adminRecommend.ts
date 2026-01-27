/**
 * 推荐商品管理路由（管理后台）
 */
import { Router } from 'express';
import * as recommendController from '../controllers/recommendController';
import { authAdmin } from '../middlewares/auth';

const router = Router();

// 管理后台 - 推荐商品管理（需要管理员权限）
router.get('/', authAdmin, recommendController.getAllRecommends);
router.get('/:id', authAdmin, recommendController.getRecommendById);
router.post('/', authAdmin, recommendController.createRecommend);
router.put('/:id', authAdmin, recommendController.updateRecommend);
router.delete('/:id', authAdmin, recommendController.deleteRecommend);
router.post('/sort', authAdmin, recommendController.updateRecommendSort);

export default router;

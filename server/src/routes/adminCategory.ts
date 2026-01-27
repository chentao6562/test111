import { Router } from 'express';
import * as categoryController from '../controllers/categoryController';
import { authAdmin } from '../middlewares/auth';

const router = Router();

// 所有接口需要管理员认证
router.use(authAdmin);

// 分类管理
router.get('/', categoryController.list);
router.post('/', categoryController.create);
router.put('/sort', categoryController.updateSort);

// 【2026-01-25】场景分类初始化
router.post('/init-scene', categoryController.initSceneCategories);
// 【2026-01-25】批量更新商品分类
router.put('/batch-products', categoryController.batchUpdateProductCategory);

router.get('/:id', categoryController.detail);
router.put('/:id', categoryController.update);
router.put('/:id/toggle', categoryController.toggleStatus);
router.delete('/:id', categoryController.remove);

export default router;

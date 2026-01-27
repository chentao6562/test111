import { Router } from 'express';
import * as productController from '../controllers/productController';
import { authAdmin } from '../middlewares/auth';

const router = Router();

// 所有接口需要管理员认证
router.use(authAdmin);

// 商品管理
router.get('/', productController.adminList);
router.post('/', productController.create);
router.put('/batch-status', productController.batchStatus);
// 【2026-01-11新增】批量设置移库费（注意放在 /:id 之前避免路由冲突）
router.put('/batch-transfer', productController.batchSetTransferSettings);
// 【2026-01-25新增】批量更新排序（注意放在 /:id 之前避免路由冲突）
router.put('/sort', productController.updateSort);
// 【2026-01-18新增】批量生成AI文案
router.post('/batch-ai-copy', productController.batchGenerateAICopy);
router.get('/:id', productController.adminDetail);
router.put('/:id', productController.update);
router.put('/:id/toggle', productController.toggleStatus);
// 【2026-01-11新增】设置商品移库费
router.put('/:id/transfer', productController.setTransferSettings);
// 【2026-01-18新增】单个商品生成AI文案
router.post('/:id/ai-copy', productController.generateAICopy);
router.delete('/:id', productController.remove);

export default router;

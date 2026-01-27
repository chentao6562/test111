// 管理后台Banner路由
import { Router } from 'express';
import * as bannerController from '../controllers/bannerController';
import { authAdmin } from '../middlewares/auth';

const router = Router();

// 管理后台 - Banner管理（需要管理员权限）
router.get('/', authAdmin, bannerController.getAllBanners);
router.get('/:id', authAdmin, bannerController.getBannerById);
router.post('/', authAdmin, bannerController.createBanner);
router.put('/:id', authAdmin, bannerController.updateBanner);
router.delete('/:id', authAdmin, bannerController.deleteBanner);
router.post('/sort', authAdmin, bannerController.updateBannerSort);

export default router;

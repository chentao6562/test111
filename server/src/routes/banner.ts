// Banner路由
import { Router } from 'express';
import * as bannerController from '../controllers/bannerController';
import { authAgent } from '../middlewares/auth';

const router = Router();

// 小程序端 - 获取Banner列表（需要登录）
router.get('/', authAgent, bannerController.getBanners);

export default router;

/**
 * 微信JSSDK路由
 * @since 2026-01-28
 */

import { Router } from 'express';
import { getJssdkConfigHandler } from '../controllers/wechatController';

const router = Router();

// 获取JSSDK配置（公开接口，无需登录）
router.get('/jssdk-config', getJssdkConfigHandler);

export default router;

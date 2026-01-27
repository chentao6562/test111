/**
 * 砍价活动管理后台路由
 * @module routes/adminBargain
 * @since 2026-01-22
 */

import { Router } from 'express';
import { authAdmin } from '../middlewares/auth';
import {
  createConfig,
  getConfigList,
  getConfigDetail,
  updateConfig,
  deleteConfig,
  toggleConfig,
  getStats,
  getBargainList,
  getBargainDetail,
  getBlacklistHandler,
  addBlacklistHandler,
  removeBlacklistHandler,
} from '../controllers/adminBargainController';

const router = Router();

// 所有接口都需要管理员登录
router.use(authAdmin);

// ========== 活动配置管理 ==========

// 创建砍价活动
router.post('/config', createConfig);

// 获取活动列表
router.get('/configs', getConfigList);

// 获取活动详情
router.get('/config/:id', getConfigDetail);

// 更新活动
router.put('/config/:id', updateConfig);

// 删除活动
router.delete('/config/:id', deleteConfig);

// 启用/禁用活动
router.post('/config/:id/toggle', toggleConfig);

// ========== 砍价数据管理 ==========

// 获取砍价统计
router.get('/stats', getStats);

// 获取砍价列表
router.get('/list', getBargainList);

// 获取砍价详情
router.get('/:id', getBargainDetail);

// ========== 黑名单管理 ==========

// 获取黑名单列表
router.get('/blacklist', getBlacklistHandler);

// 添加黑名单
router.post('/blacklist', addBlacklistHandler);

// 移除黑名单
router.delete('/blacklist/:id', removeBlacklistHandler);

export default router;

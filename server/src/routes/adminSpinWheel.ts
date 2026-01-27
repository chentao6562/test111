/**
 * 大转盘活动管理后台路由
 * @module routes/adminSpinWheel
 * @since 2026-01-23
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
  getParticipationList,
  getParticipationDetail,
  getRedeemList,
  getRedeemDetail,
  retryRedeem,
  getBlacklistHandler,
  addBlacklistHandler,
  removeBlacklistHandler,
} from '../controllers/adminSpinWheelController';

const router = Router();

// 所有接口都需要管理员登录
router.use(authAdmin);

// ========== 活动配置管理 ==========

// 创建大转盘活动
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

// ========== 数据统计 ==========

// 获取统计数据
router.get('/stats', getStats);

// ========== 参与数据管理 ==========

// 获取参与列表
router.get('/participations', getParticipationList);

// 获取参与详情
router.get('/participation/:id', getParticipationDetail);

// ========== 兑换管理 ==========

// 获取兑换列表
router.get('/redeems', getRedeemList);

// 获取兑换详情
router.get('/redeem/:id', getRedeemDetail);

// 重试失败的兑换
router.post('/redeem/:id/retry', retryRedeem);

// ========== 黑名单管理 ==========

// 获取黑名单列表
router.get('/blacklist', getBlacklistHandler);

// 添加黑名单
router.post('/blacklist', addBlacklistHandler);

// 移除黑名单
router.delete('/blacklist/:id', removeBlacklistHandler);

export default router;

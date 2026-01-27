/**
 * 砍价活动H5端路由
 * @module routes/bargain
 * @since 2026-01-22
 */

import { Router } from 'express';
import { authAgent } from '../middlewares/auth';
import {
  getConfig,
  getProducts,
  getDetail,
  create,
  getMyList,
  cancel,
  sendCode,
  doHelpCut,
  getReservation,
  getEligibility,
  addToCart,
  removeFromCart,
  getLimits,
} from '../controllers/bargainController';

const router = Router();

// ========== 公开接口 ==========

// 获取砍价活动配置
router.get('/config', getConfig);

// 获取砍价商品列表
router.get('/products', getProducts);

// 获取砍价详情（分享页面用）
router.get('/detail/:code', getDetail);

// 发送帮砍验证码
router.post('/help-cut/send-code', sendCode);

// 帮砍（需要短信验证码）
router.post('/help-cut', doHelpCut);

// ========== 需要登录的接口 ==========

// 【2026-01-23】获取采购单门槛状态
router.get('/eligibility', authAgent, getEligibility);

// 【2026-01-25】获取用户砍价限制状态（防反复机制）
router.get('/limits', authAgent, getLimits);

// 发起砍价
router.post('/create', authAgent, create);

// 获取我的砍价列表
router.get('/my', authAgent, getMyList);

// 取消砍价
router.delete('/:code/cancel', authAgent, cancel);

// 获取砍价关联的预约信息
router.get('/:code/reservation', authAgent, getReservation);

// 【2026-01-23】砍价商品加入采购单
router.post('/:code/add-to-cart', authAgent, addToCart);

// 【2026-01-23】从采购单移除砍价商品
router.delete('/:code/remove-from-cart', authAgent, removeFromCart);

export default router;

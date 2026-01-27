/**
 * 推广体系路由
 * 【2026-01-16 推广体系升级】
 */

import { Router } from 'express';
import promotionController from '../controllers/promotionController';
import { authAgent } from '../middlewares/auth';

const router = Router();

// ==================== 客户端（无需认证） ====================

// 获取商品价格（根据推销员链接）
router.get('/customer/product/:id/price', promotionController.getCustomerPrice);

// ==================== 推销员端（需要代理商认证） ====================

// 获取推销员定价列表
router.get('/agent/prices', authAgent, promotionController.getAgentPrices);

// 保存商品定价
router.post('/agent/prices', authAgent, promotionController.saveAgentPrice);

// 批量设置定价
router.post('/agent/prices/batch', authAgent, promotionController.batchSetAgentPrices);

// 获取推销员拿货价
router.get('/agent/cost-price/:productId', authAgent, promotionController.getAgentCostPrice);

// 获取利润记录
router.get('/agent/profits', authAgent, promotionController.getProfitRecords);

// 获取利润统计
router.get('/agent/profit-stats', authAgent, promotionController.getProfitStats);

// 获取奖励记录
router.get('/agent/rewards', authAgent, promotionController.getRewardRecords);

// 获取奖励统计
router.get('/agent/reward-stats', authAgent, promotionController.getRewardStats);

// 检查升级资格
router.get('/agent/upgrade/check', authAgent, promotionController.checkUpgradeEligibility);

// 申请升级
router.post('/agent/upgrade/apply', authAgent, promotionController.applyUpgrade);

// 获取我的升级申请记录
router.get('/agent/upgrade/records', authAgent, promotionController.getMyUpgradeRecords);

export default router;

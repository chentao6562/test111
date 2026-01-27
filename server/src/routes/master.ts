/**
 * 总代理路由
 * 【2026-01-16 推广体系升级】
 */

import { Router } from 'express';
import masterController from '../controllers/masterController';
import promotionController from '../controllers/promotionController';
import { authAdmin } from '../middlewares/auth';

const router = Router();

// 所有路由需要管理员认证（总代理使用管理后台访问）

// 获取总代理概览数据
router.get('/dashboard', authAdmin, masterController.getDashboard);

// 设置商品价格体系
router.put('/product/:id/price', authAdmin, masterController.setProductPrice);

// 批量设置商品价格
router.put('/products/batch-price', authAdmin, masterController.batchSetProductPrice);

// 获取订单列表
router.get('/orders', authAdmin, masterController.getOrders);

// 确认收款
router.post('/orders/:id/confirm-payment', authAdmin, masterController.confirmPayment);

// 手动结算订单利润
router.post('/orders/:id/settle', authAdmin, masterController.settleOrderProfit);

// 获取团队列表
router.get('/team', authAdmin, masterController.getTeam);

// 获取奖励配置
router.get('/reward-config', authAdmin, masterController.getRewardConfig);

// 更新奖励配置
router.put('/reward-config', authAdmin, masterController.updateRewardConfig);

// 获取商品价格列表
router.get('/product-prices', authAdmin, masterController.getProductPrices);

// 获取升级申请列表
router.get('/upgrade-applications', authAdmin, promotionController.getUpgradeApplications);

// 审核升级申请
router.post('/upgrade-applications/:id/review', authAdmin, promotionController.reviewUpgradeApplication);

// 获取推销员详情
router.get('/agents/:id/detail', authAdmin, promotionController.getAgentDetail);

export default router;

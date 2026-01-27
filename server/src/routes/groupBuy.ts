/**
 * 拼团路由
 * @module routes/groupBuy
 * @since 2026-01-21
 */

import { Router } from 'express';
import * as groupBuyController from '../controllers/groupBuyController';
import { authAgent, authStaff } from '../middlewares/auth';

const router = Router();

// ========== H5端路由 ==========

// 获取拼团配置（公开）
router.get('/config', groupBuyController.getConfig);

// 获取拼团详情（公开）
router.get('/detail/:code', groupBuyController.getGroupBuyDetail);

// 发起拼团（需要登录）
router.post('/create', authAgent, groupBuyController.createGroupBuy);

// 加入拼团（需要登录）
router.post('/join', authAgent, groupBuyController.joinGroupBuy);

// 获取我的拼团列表（需要登录）
router.get('/my', authAgent, groupBuyController.getMyGroupBuys);

// 【2026-01-21 顺路拼团】获取同区域可加入的拼团（需要登录）
router.get('/nearby', authAgent, groupBuyController.getNearbyGroupBuys);

// 退出拼团（需要登录）
router.delete('/:code/quit', authAgent, groupBuyController.quitGroupBuy);

export default router;

// ========== 门店端路由（单独导出）==========

export const storeGroupBuyRouter = Router();

// 门店端需要员工登录
storeGroupBuyRouter.use(authStaff());

// 查询预约关联的拼团
storeGroupBuyRouter.get('/:reservationId', groupBuyController.getGroupBuyByReservation);

// 发放拼团赠品
storeGroupBuyRouter.post('/deliver-bonus', groupBuyController.deliverBonusGift);

// 获取待发放拼团赠品列表
storeGroupBuyRouter.get('/pending-bonus', groupBuyController.getPendingBonusGifts);

/**
 * 门店端路由
 * 【2026-01-16 预约模式升级】门店预约管理、电话确认、核销
 * 【2026-01-17 新增备货环节】提货前一天门店备货 → 生成提货码 → 客户凭码核销
 * 【2026-01-17 代码重构】使用拆分后的store控制器模块
 */

import { Router } from 'express';
import { authStaff } from '../middlewares/auth';
// 【2026-01-22 安全修复】导入速率限制中间件
import { pickupCodeRateLimiter } from '../middlewares/rateLimit';
// 使用拆分后的模块（向后兼容）
import storeController from '../controllers/store';

const router = Router();

// 所有接口需要员工登录
router.use(authStaff());

// ==================== 预约列表 ====================

// 获取待确认预约列表
router.get('/reservations/pending', storeController.getPending);

// 获取预约统计（用于列表页概览）
router.get('/reservations/stats', storeController.getReservationStats);

// 获取待确认统计
router.get('/reservations/pending-stats', storeController.getPendingStatsAction);

// 获取紧急预约
router.get('/reservations/urgent', storeController.getUrgent);

// 获取即将过期的预约
router.get('/reservations/expiring', storeController.getExpiring);

// 获取预约列表
router.get('/reservations', storeController.getReservations);

// 获取预约详情
router.get('/reservations/:id', storeController.getDetail);

// ==================== 电话确认 ====================

// 记录拨打电话
router.post('/reservations/:id/call', storeController.recordCallAction);

// 确认预约
router.post('/reservations/:id/confirm', storeController.confirm);

// 标记确认失败
router.post('/reservations/:id/fail', storeController.markFailed);

// ==================== 备货 ====================

// 获取待备货列表
router.get('/prepare/pending', storeController.getPendingPrepare);

// 获取备货中列表
router.get('/prepare/preparing', storeController.getPreparingListAction);

// 获取备货进度
router.get('/prepare/:id/progress', storeController.getPrepareProgressAction);

// 开始备货
router.post('/prepare/:id/start', storeController.startPrepareAction);

// 更新商品备货状态
router.post('/prepare/:id/item', storeController.updatePrepareItem);

// 批量更新商品备货状态
router.post('/prepare/:id/batch', storeController.batchUpdatePrepareItems);

// 完成备货
router.post('/prepare/:id/complete', storeController.completePrepareAction);

// 上报备货问题
router.post('/prepare/:id/issue', storeController.reportPrepareIssue);

// ==================== 核销 ====================

// 搜索待核销预约（按手机号）
router.get('/pickup/search', storeController.searchForPickup);

// 根据手机号查询预约
router.get('/pickup/query', storeController.queryByPhone);

// 根据预约号查询预约
router.get('/pickup/query-no', storeController.queryByNo);

// 通过提货码验证预约 【2026-01-22 安全修复】添加速率限制防止暴力破解
router.post('/pickup/verify-code', pickupCodeRateLimiter, storeController.verifyPickupCode);

// 完成核销
router.post('/pickup/complete', storeController.complete);

// 获取今日核销统计
router.get('/pickup/today-stats', storeController.getTodayStats);

// 【2026-01-19】获取按周期统计的核销数据
router.get('/pickup/period-stats', storeController.getPeriodStats);

// 获取今日已核销列表
router.get('/pickup/today-completed', storeController.getTodayCompleted);

// 【2026-01-21】获取预约对应推销员的可用代金券
router.get('/pickup/coupons/:reservationId', storeController.getCoupons);

// ==================== 代金券核销 【2026-01-18 春节营销】 ====================
import { verifyCouponHandler, redeemCouponHandler } from '../controllers/campaign2026Controller';

// 验证代金券
router.get('/coupon/verify', verifyCouponHandler);

// 核销代金券
router.post('/coupon/redeem', redeemCouponHandler);

export default router;

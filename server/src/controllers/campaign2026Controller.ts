/**
 * 2026春节营销活动控制器
 * 【2026-01-18】代金券相关API
 */

import { Request, Response } from 'express';
import { success, error, validationError } from '../utils/response';
import {
  getAgentCoupons,
  getCouponStats,
  verifyCoupon,
  redeemCoupon,
  getAdminCouponStats,
} from '../services/campaign2026/couponService';

/**
 * 获取我的代金券列表
 * GET /api/coupons
 */
export async function getMyCouponsHandler(req: Request, res: Response): Promise<void> {
  try {
    const agentId = req.user?.id;
    if (!agentId) {
      error(res, '未登录', 401);
      return;
    }

    const { status, page = '1', pageSize = '20' } = req.query;

    // 【2026-01-23 P1-05修复】添加参数范围检查，防止恶意请求
    const parsedPage = Math.max(1, parseInt(page as string, 10) || 1);
    const parsedPageSize = Math.min(100, Math.max(1, parseInt(pageSize as string, 10) || 20));

    // 验证status参数值
    const validStatuses = ['UNUSED', 'USED', 'EXPIRED'];
    const validatedStatus = status && validStatuses.includes(status as string) ? (status as string) : undefined;

    const result = await getAgentCoupons(agentId, {
      status: validatedStatus,
      page: parsedPage,
      pageSize: parsedPageSize,
    });

    success(res, result);
  } catch (err) {
    console.error('[Campaign2026] getMyCoupons error:', err);
    error(res, '获取代金券列表失败', 500);
  }
}

/**
 * 获取我的代金券统计
 * GET /api/coupons/stats
 */
export async function getMyCouponStatsHandler(req: Request, res: Response): Promise<void> {
  try {
    const agentId = req.user?.id;
    if (!agentId) {
      error(res, '未登录', 401);
      return;
    }

    const stats = await getCouponStats(agentId);
    success(res, stats);
  } catch (err) {
    console.error('[Campaign2026] getMyCouponStats error:', err);
    error(res, '获取代金券统计失败', 500);
  }
}

/**
 * 验证代金券（门店端）
 * GET /api/store/coupon/verify?code=xxx
 */
export async function verifyCouponHandler(req: Request, res: Response): Promise<void> {
  try {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      validationError(res, '请输入代金券码');
      return;
    }

    const result = await verifyCoupon(code.toUpperCase());

    if (result.valid) {
      success(res, result.coupon);
    } else {
      error(res, result.error || '代金券无效');
    }
  } catch (err) {
    console.error('[Campaign2026] verifyCoupon error:', err);
    error(res, '验证代金券失败', 500);
  }
}

/**
 * 核销代金券（门店端）
 * POST /api/store/coupon/redeem
 */
export async function redeemCouponHandler(req: Request, res: Response): Promise<void> {
  try {
    const staffId = req.user?.id;
    if (!staffId) {
      error(res, '未登录', 401);
      return;
    }

    const { code, orderNo } = req.body;

    if (!code || typeof code !== 'string') {
      validationError(res, '请输入代金券码');
      return;
    }

    const result = await redeemCoupon({
      code: code.toUpperCase(),
      orderNo,
      operatorId: staffId,
    });

    if (result.success) {
      success(res, {
        amount: result.amount,
        costBearerId: result.costBearerId,
      }, '代金券核销成功');
    } else {
      error(res, result.error || '核销失败');
    }
  } catch (err) {
    console.error('[Campaign2026] redeemCoupon error:', err);
    error(res, '核销代金券失败', 500);
  }
}

/**
 * 获取管理后台代金券统计
 * GET /api/admin/campaign2026/coupons/stats
 */
export async function getAdminCouponStatsHandler(req: Request, res: Response): Promise<void> {
  try {
    const stats = await getAdminCouponStats();
    success(res, stats);
  } catch (err) {
    console.error('[Campaign2026] getAdminCouponStats error:', err);
    error(res, '获取代金券统计失败', 500);
  }
}

export default {
  getMyCouponsHandler,
  getMyCouponStatsHandler,
  verifyCouponHandler,
  redeemCouponHandler,
  getAdminCouponStatsHandler,
};

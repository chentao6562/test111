/**
 * 门店端 - 核销控制器
 * 【2026-01-17 代码重构】从storeController拆分
 */

import { Request, Response } from 'express';
import { success, error, badRequest } from '../../utils/response';
import {
  findReservationByPhone,
  findReservationByNo,
  completePickup,
  getTodayPickupStats,
  getTodayCompletedList,
  verifyByPickupCode,
  getPickupStatsByPeriod,
  getReservationCoupons,
} from '../../services/reservation';

/**
 * 获取门店ID（从登录用户获取）
 */
function getStoreId(req: Request): number | null {
  const user = (req as any).user;
  return user?.warehouseId || null;
}

/**
 * 获取员工ID
 */
function getStaffId(req: Request): number | null {
  const user = (req as any).user;
  return user?.id || null;
}

/**
 * 搜索待核销预约（用于核销页面）
 * GET /api/store/pickup/search?phone=xxx
 */
export async function searchForPickup(req: Request, res: Response) {
  try {
    const { phone } = req.query;

    if (!phone || typeof phone !== 'string') {
      return badRequest(res, '请提供手机号');
    }

    const storeId = getStoreId(req);
    if (!storeId) {
      return error(res, '未关联门店', 403);
    }

    const result = await findReservationByPhone(phone, storeId);

    if (result.success) {
      return success(res, result.data);
    } else {
      return badRequest(res, result.message);
    }
  } catch (err: any) {
    console.error('[pickupController] searchForPickup error:', err);
    return error(res, '搜索预约失败');
  }
}

/**
 * 根据手机号查询预约
 * GET /api/store/pickup/query?phone=xxx
 */
export async function queryByPhone(req: Request, res: Response) {
  try {
    const { phone } = req.query;

    if (!phone || typeof phone !== 'string') {
      return badRequest(res, '请提供手机号');
    }

    const storeId = getStoreId(req);
    if (!storeId) {
      return error(res, '未关联门店', 403);
    }

    const result = await findReservationByPhone(phone, storeId);

    if (result.success) {
      return success(res, result.data);
    } else {
      return badRequest(res, result.message);
    }
  } catch (err: any) {
    console.error('[pickupController] queryByPhone error:', err);
    return error(res, '查询预约失败');
  }
}

/**
 * 根据预约号查询预约
 * GET /api/store/pickup/query-no?no=xxx
 */
export async function queryByNo(req: Request, res: Response) {
  try {
    const { no } = req.query;

    if (!no || typeof no !== 'string') {
      return badRequest(res, '请提供预约号');
    }

    const storeId = getStoreId(req);
    if (!storeId) {
      return error(res, '未关联门店', 403);
    }

    const result = await findReservationByNo(no, storeId);

    if (result.success) {
      return success(res, result.data);
    } else {
      return badRequest(res, result.message);
    }
  } catch (err: any) {
    console.error('[pickupController] queryByNo error:', err);
    return error(res, '查询预约失败');
  }
}

/**
 * 完成核销
 * POST /api/store/pickup/complete
 * 【2026-01-21】支持代金券抵扣参数
 */
export async function complete(req: Request, res: Response) {
  try {
    const { reservationId, paymentMethod, deliverGift, couponIds } = req.body;

    if (!reservationId) {
      return badRequest(res, '请提供预约ID');
    }

    if (!paymentMethod) {
      return badRequest(res, '请选择支付方式');
    }

    const staffId = getStaffId(req);
    if (!staffId) {
      return error(res, '请先登录', 401);
    }

    // 处理代金券ID参数
    let parsedCouponIds: number[] | undefined;
    if (couponIds && Array.isArray(couponIds)) {
      parsedCouponIds = couponIds.map((id: any) => parseInt(id, 10)).filter((id: number) => !isNaN(id));
    }

    const result = await completePickup(
      parseInt(reservationId, 10),
      staffId,
      paymentMethod,
      deliverGift !== false,
      parsedCouponIds
    );

    if (result.success) {
      return success(res, result.data, result.message);
    } else {
      return badRequest(res, result.message);
    }
  } catch (err: any) {
    console.error('[pickupController] complete error:', err);
    return error(res, '核销失败');
  }
}

/**
 * 【2026-01-21】获取预约对应推销员的可用代金券
 * GET /api/store/pickup/coupons/:reservationId
 */
export async function getCoupons(req: Request, res: Response) {
  try {
    const { reservationId } = req.params;

    if (!reservationId) {
      return badRequest(res, '请提供预约ID');
    }

    const result = await getReservationCoupons(parseInt(reservationId, 10));

    if (result.success) {
      return success(res, result.data);
    } else {
      return badRequest(res, result.message);
    }
  } catch (err: any) {
    console.error('[pickupController] getCoupons error:', err);
    return error(res, '获取代金券失败');
  }
}

/**
 * 获取今日核销统计
 * GET /api/store/pickup/today-stats
 */
export async function getTodayStats(req: Request, res: Response) {
  try {
    const storeId = getStoreId(req);
    if (!storeId) {
      return error(res, '未关联门店', 403);
    }

    const stats = await getTodayPickupStats(storeId);
    return success(res, stats);
  } catch (err: any) {
    console.error('[pickupController] getTodayStats error:', err);
    return error(res, '获取统计失败');
  }
}

/**
 * 获取今日已核销列表
 * GET /api/store/pickup/today-completed
 */
export async function getTodayCompleted(req: Request, res: Response) {
  try {
    const storeId = getStoreId(req);
    if (!storeId) {
      return error(res, '未关联门店', 403);
    }

    const { page, pageSize } = req.query;
    const result = await getTodayCompletedList(storeId, {
      page: page ? parseInt(page as string, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize as string, 10) : 20,
    });

    return success(res, result);
  } catch (err: any) {
    console.error('[pickupController] getTodayCompleted error:', err);
    return error(res, '获取已核销列表失败');
  }
}

/**
 * 通过提货码验证预约
 * POST /api/store/pickup/verify-code
 */
export async function verifyPickupCode(req: Request, res: Response) {
  try {
    const { pickupCode } = req.body;
    if (!pickupCode) {
      return badRequest(res, '请提供提货码');
    }

    const storeId = getStoreId(req);
    if (!storeId) {
      return error(res, '未关联门店', 403);
    }

    const result = await verifyByPickupCode(pickupCode, storeId);

    if (result.success) {
      return success(res, result.data, result.message);
    } else {
      return badRequest(res, result.message);
    }
  } catch (err: any) {
    console.error('[pickupController] verifyPickupCode error:', err);
    return error(res, '验证提货码失败');
  }
}

/**
 * 【2026-01-19】获取按周期统计的核销数据
 * GET /api/store/pickup/period-stats?period=today|week|month|total
 */
export async function getPeriodStats(req: Request, res: Response) {
  try {
    const storeId = getStoreId(req);
    if (!storeId) {
      return error(res, '未关联门店', 403);
    }

    const { period } = req.query;
    const validPeriods = ['today', 'week', 'month', 'total'];
    const periodValue = validPeriods.includes(period as string) ? (period as 'today' | 'week' | 'month' | 'total') : 'today';

    const stats = await getPickupStatsByPeriod(storeId, periodValue);
    return success(res, stats);
  } catch (err: any) {
    console.error('[pickupController] getPeriodStats error:', err);
    return error(res, '获取统计失败');
  }
}

/**
 * 门店端 - 电话确认控制器
 * 【2026-01-17 代码重构】从storeController拆分
 */

import { Request, Response } from 'express';
import { success, error, badRequest } from '../../utils/response';
import {
  recordCall,
  confirmReservation,
  markCallFailed,
  getPendingStats,
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
 * 记录拨打电话
 * POST /api/store/reservations/:id/call
 * 【2026-01-22 安全修复】必须验证门店权限
 */
export async function recordCallAction(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return badRequest(res, '预约ID无效');
    }

    const staffId = getStaffId(req);
    if (!staffId) {
      return error(res, '请先登录', 401);
    }

    // 【2026-01-22 安全修复】获取并验证门店ID
    const storeId = getStoreId(req);
    if (!storeId) {
      return error(res, '未关联门店', 403);
    }

    const result = await recordCall(id, staffId, storeId);

    if (result.success) {
      return success(res, result.data, result.message);
    } else {
      return badRequest(res, result.message);
    }
  } catch (err: any) {
    console.error('[confirmController] recordCall error:', err);
    return error(res, '记录拨打失败');
  }
}

/**
 * 确认预约
 * POST /api/store/reservations/:id/confirm
 * 【2026-01-22 安全修复】必须验证门店权限
 */
export async function confirm(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return badRequest(res, '预约ID无效');
    }

    const staffId = getStaffId(req);
    if (!staffId) {
      return error(res, '请先登录', 401);
    }

    // 【2026-01-22 安全修复】获取并验证门店ID
    const storeId = getStoreId(req);
    if (!storeId) {
      return error(res, '未关联门店', 403);
    }

    const result = await confirmReservation(id, staffId, storeId);

    if (result.success) {
      return success(res, result.data, result.message);
    } else {
      return badRequest(res, result.message);
    }
  } catch (err: any) {
    console.error('[confirmController] confirm error:', err);
    return error(res, '确认预约失败');
  }
}

/**
 * 标记确认失败
 * POST /api/store/reservations/:id/fail
 * 【2026-01-22 安全修复】必须验证门店权限
 */
export async function markFailed(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return badRequest(res, '预约ID无效');
    }

    const staffId = getStaffId(req);
    if (!staffId) {
      return error(res, '请先登录', 401);
    }

    // 【2026-01-22 安全修复】获取并验证门店ID
    const storeId = getStoreId(req);
    if (!storeId) {
      return error(res, '未关联门店', 403);
    }

    const result = await markCallFailed(id, staffId, storeId);

    if (result.success) {
      return success(res, null, result.message);
    } else {
      return badRequest(res, result.message);
    }
  } catch (err: any) {
    console.error('[confirmController] markFailed error:', err);
    return error(res, '标记失败失败');
  }
}

/**
 * 获取待确认统计
 * GET /api/store/reservations/pending-stats
 */
export async function getPendingStatsAction(req: Request, res: Response) {
  try {
    const storeId = getStoreId(req);
    if (!storeId) {
      return error(res, '未关联门店', 403);
    }

    const stats = await getPendingStats(storeId);
    return success(res, stats);
  } catch (err: any) {
    console.error('[confirmController] getPendingStats error:', err);
    return error(res, '获取统计失败');
  }
}

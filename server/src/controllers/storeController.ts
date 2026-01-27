/**
 * 门店端控制器
 * 【2026-01-16 预约模式升级】门店预约管理、电话确认、核销
 * 【2026-01-17 新增备货环节】提货前一天门店备货 → 生成提货码 → 客户凭码核销
 */

import { Request, Response } from 'express';
import { success, error, badRequest } from '../utils/response';
import {
  getPendingReservations,
  getStoreReservations,
  getReservationDetail,
  recordCall,
  confirmReservation,
  markCallFailed,
  getPendingStats,
  getUrgentReservations,
  findReservationByPhone,
  findReservationByNo,
  completePickup,
  getTodayPickupStats,
  getTodayCompletedList,
  getSoonExpiringReservations,
  ReservationStatus,
  // 备货服务
  getPendingPrepareList,
  getPreparingList,
  startPrepare,
  updateItemPrepareStatus,
  batchUpdateItemPrepareStatus,
  completePrepare,
  getPrepareProgress,
  reportIssue,
  verifyByPickupCode,
} from '../services/reservation';

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

// ==================== 预约列表 ====================

/**
 * 获取预约统计（列表页概览）
 * GET /api/store/reservations/stats
 */
export async function getReservationStats(req: Request, res: Response) {
  try {
    const storeId = getStoreId(req);
    if (!storeId) {
      return error(res, '未关联门店', 403);
    }

    // 获取各状态统计
    const pendingStats = await getPendingStats(storeId);
    const todayStats = await getTodayPickupStats(storeId);

    return success(res, {
      pending: pendingStats.total || 0,           // 待确认数量（状态0,1）
      confirmed: todayStats.pendingCount || 0,     // 已确认待提货（从pickupStats获取）
      todayComplete: todayStats.completedCount || 0,       // 今日完成
    });
  } catch (err: any) {
    console.error('[StoreController] getReservationStats error:', err);
    return error(res, '获取统计失败');
  }
}

/**
 * 获取待确认预约列表
 * GET /api/store/reservations/pending
 */
export async function getPending(req: Request, res: Response) {
  try {
    const storeId = getStoreId(req);
    if (!storeId) {
      return error(res, '未关联门店', 403);
    }

    const { page, pageSize } = req.query;
    const result = await getPendingReservations(storeId, {
      page: page ? parseInt(page as string, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize as string, 10) : 20,
    });

    return success(res, result);
  } catch (err: any) {
    console.error('[StoreController] getPending error:', err);
    return error(res, '获取待确认列表失败');
  }
}

/**
 * 获取预约列表
 * GET /api/store/reservations
 */
export async function getReservations(req: Request, res: Response) {
  try {
    const storeId = getStoreId(req);
    if (!storeId) {
      return error(res, '未关联门店', 403);
    }

    const { page, pageSize, status, customerPhone, startDate, endDate } = req.query;

    const result = await getStoreReservations(storeId, {
      page: page ? parseInt(page as string, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize as string, 10) : 20,
      status: status !== undefined ? parseInt(status as string, 10) : undefined,
      customerPhone: customerPhone as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    return success(res, result);
  } catch (err: any) {
    console.error('[StoreController] getReservations error:', err);
    return error(res, '获取预约列表失败');
  }
}

/**
 * 获取预约详情
 * GET /api/store/reservations/:id
 */
export async function getDetail(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return badRequest(res, '预约ID无效');
    }

    const reservation = await getReservationDetail(id);
    if (!reservation) {
      return badRequest(res, '预约不存在');
    }

    // 验证门店归属
    const storeId = getStoreId(req);
    if (storeId && reservation.store.id !== storeId) {
      return error(res, '无权查看此预约', 403);
    }

    return success(res, reservation);
  } catch (err: any) {
    console.error('[StoreController] getDetail error:', err);
    return error(res, '获取预约详情失败');
  }
}

// ==================== 电话确认 ====================

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
    console.error('[StoreController] recordCall error:', err);
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
    console.error('[StoreController] confirm error:', err);
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
    console.error('[StoreController] markFailed error:', err);
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
    console.error('[StoreController] getPendingStats error:', err);
    return error(res, '获取统计失败');
  }
}

/**
 * 获取紧急预约（超过30分钟未处理）
 * GET /api/store/reservations/urgent
 */
export async function getUrgent(req: Request, res: Response) {
  try {
    const storeId = getStoreId(req);
    if (!storeId) {
      return error(res, '未关联门店', 403);
    }

    const list = await getUrgentReservations(storeId);
    return success(res, list);
  } catch (err: any) {
    console.error('[StoreController] getUrgent error:', err);
    return error(res, '获取紧急列表失败');
  }
}

// ==================== 核销 ====================

/**
 * 搜索待核销预约（用于核销页面）
 * GET /api/store/pickup/search?phone=xxx
 * 只返回已确认(status=2)的预约
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

    // 只查找已确认状态的预约（findReservationByPhone 已默认查 CONFIRMED）
    const result = await findReservationByPhone(phone, storeId);

    if (result.success) {
      return success(res, result.data);
    } else {
      return badRequest(res, result.message);
    }
  } catch (err: any) {
    console.error('[StoreController] searchForPickup error:', err);
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
    console.error('[StoreController] queryByPhone error:', err);
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
    console.error('[StoreController] queryByNo error:', err);
    return error(res, '查询预约失败');
  }
}

/**
 * 完成核销
 * POST /api/store/pickup/complete
 */
export async function complete(req: Request, res: Response) {
  try {
    const { reservationId, paymentMethod, deliverGift } = req.body;

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

    const result = await completePickup(
      parseInt(reservationId, 10),
      staffId,
      paymentMethod,
      deliverGift !== false
    );

    if (result.success) {
      return success(res, result.data, result.message);
    } else {
      return badRequest(res, result.message);
    }
  } catch (err: any) {
    console.error('[StoreController] complete error:', err);
    return error(res, '核销失败');
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
    console.error('[StoreController] getTodayStats error:', err);
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
    console.error('[StoreController] getTodayCompleted error:', err);
    return error(res, '获取已核销列表失败');
  }
}

/**
 * 获取即将过期的预约
 * GET /api/store/reservations/expiring
 */
export async function getExpiring(req: Request, res: Response) {
  try {
    const storeId = getStoreId(req);
    if (!storeId) {
      return error(res, '未关联门店', 403);
    }

    const hours = req.query.hours ? parseInt(req.query.hours as string, 10) : 24;
    const list = await getSoonExpiringReservations(storeId, hours);

    return success(res, list);
  } catch (err: any) {
    console.error('[StoreController] getExpiring error:', err);
    return error(res, '获取即将过期列表失败');
  }
}

// ==================== 备货 ====================

/**
 * 获取待备货列表
 * GET /api/store/prepare/pending
 */
export async function getPendingPrepare(req: Request, res: Response) {
  try {
    const storeId = getStoreId(req);
    if (!storeId) {
      return error(res, '未关联门店', 403);
    }

    const list = await getPendingPrepareList(storeId);
    return success(res, list);
  } catch (err: any) {
    console.error('[StoreController] getPendingPrepare error:', err);
    return error(res, '获取待备货列表失败');
  }
}

/**
 * 获取备货中列表
 * GET /api/store/prepare/preparing
 */
export async function getPreparingListAction(req: Request, res: Response) {
  try {
    const storeId = getStoreId(req);
    if (!storeId) {
      return error(res, '未关联门店', 403);
    }

    const list = await getPreparingList(storeId);
    return success(res, list);
  } catch (err: any) {
    console.error('[StoreController] getPreparingList error:', err);
    return error(res, '获取备货中列表失败');
  }
}

/**
 * 开始备货
 * POST /api/store/prepare/:id/start
 */
export async function startPrepareAction(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return badRequest(res, '预约ID无效');
    }

    const staffId = getStaffId(req);
    if (!staffId) {
      return error(res, '请先登录', 401);
    }

    const result = await startPrepare(id, staffId);

    if (result.success) {
      return success(res, null, result.message);
    } else {
      return badRequest(res, result.message);
    }
  } catch (err: any) {
    console.error('[StoreController] startPrepare error:', err);
    return error(res, '开始备货失败');
  }
}

/**
 * 更新商品备货状态
 * POST /api/store/prepare/:id/item
 */
export async function updatePrepareItem(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return badRequest(res, '预约ID无效');
    }

    const { productId, prepared } = req.body;
    if (!productId) {
      return badRequest(res, '请提供商品ID');
    }

    const progress = await updateItemPrepareStatus(
      id,
      parseInt(productId, 10),
      prepared !== false
    );

    return success(res, progress);
  } catch (err: any) {
    console.error('[StoreController] updatePrepareItem error:', err);
    return error(res, '更新备货状态失败');
  }
}

/**
 * 批量更新商品备货状态
 * POST /api/store/prepare/:id/batch
 */
export async function batchUpdatePrepareItems(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return badRequest(res, '预约ID无效');
    }

    const { productIds, prepared } = req.body;
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return badRequest(res, '请提供商品ID列表');
    }

    const progress = await batchUpdateItemPrepareStatus(
      id,
      productIds.map((pid: any) => parseInt(pid, 10)),
      prepared !== false
    );

    return success(res, progress);
  } catch (err: any) {
    console.error('[StoreController] batchUpdatePrepareItems error:', err);
    return error(res, '批量更新备货状态失败');
  }
}

/**
 * 完成备货
 * POST /api/store/prepare/:id/complete
 */
export async function completePrepareAction(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return badRequest(res, '预约ID无效');
    }

    const staffId = getStaffId(req);
    if (!staffId) {
      return error(res, '请先登录', 401);
    }

    const result = await completePrepare(id, staffId);

    if (result.success) {
      return success(res, { pickupCode: result.pickupCode }, result.message);
    } else {
      return badRequest(res, result.message);
    }
  } catch (err: any) {
    console.error('[StoreController] completePrepare error:', err);
    return error(res, '完成备货失败');
  }
}

/**
 * 获取备货进度
 * GET /api/store/prepare/:id/progress
 */
export async function getPrepareProgressAction(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return badRequest(res, '预约ID无效');
    }

    const progress = await getPrepareProgress(id);

    if (progress) {
      return success(res, progress);
    } else {
      return badRequest(res, '未找到备货进度');
    }
  } catch (err: any) {
    console.error('[StoreController] getPrepareProgress error:', err);
    return error(res, '获取备货进度失败');
  }
}

/**
 * 上报备货问题
 * POST /api/store/prepare/:id/issue
 */
export async function reportPrepareIssue(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return badRequest(res, '预约ID无效');
    }

    const staffId = getStaffId(req);
    if (!staffId) {
      return error(res, '请先登录', 401);
    }

    const { issueType, description } = req.body;
    if (!issueType) {
      return badRequest(res, '请选择问题类型');
    }

    const result = await reportIssue(id, issueType, description || '', staffId);

    if (result.success) {
      return success(res, null, result.message);
    } else {
      return badRequest(res, result.message);
    }
  } catch (err: any) {
    console.error('[StoreController] reportPrepareIssue error:', err);
    return error(res, '上报问题失败');
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
    console.error('[StoreController] verifyPickupCode error:', err);
    return error(res, '验证提货码失败');
  }
}

export default {
  // 预约列表
  getReservationStats,
  getPending,
  getReservations,
  getDetail,
  // 电话确认
  recordCallAction,
  confirm,
  markFailed,
  getPendingStatsAction,
  getUrgent,
  // 核销
  searchForPickup,
  queryByPhone,
  queryByNo,
  complete,
  getTodayStats,
  getTodayCompleted,
  getExpiring,
  // 备货
  getPendingPrepare,
  getPreparingListAction,
  startPrepareAction,
  updatePrepareItem,
  batchUpdatePrepareItems,
  completePrepareAction,
  getPrepareProgressAction,
  reportPrepareIssue,
  verifyPickupCode,
};

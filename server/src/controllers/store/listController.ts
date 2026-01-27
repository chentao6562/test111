/**
 * 门店端 - 预约列表控制器
 * 【2026-01-17 代码重构】从storeController拆分
 */

import { Request, Response } from 'express';
import { success, error, badRequest } from '../../utils/response';
import {
  getPendingReservations,
  getStoreReservations,
  getReservationDetail,
  getPendingStats,
  getUrgentReservations,
  getTodayPickupStats,
  getSoonExpiringReservations,
} from '../../services/reservation';
import prisma from '../../utils/prisma';

/**
 * 获取门店ID（从登录用户获取）
 */
function getStoreId(req: Request): number | null {
  const user = (req as any).user;
  return user?.warehouseId || null;
}

/**
 * 获取预约统计（列表页概览）
 * GET /api/store/reservations/stats
 * 【2026-01-19】新增待备货和待核销统计
 */
export async function getReservationStats(req: Request, res: Response) {
  try {
    const storeId = getStoreId(req);
    if (!storeId) {
      return error(res, '未关联门店', 403);
    }

    const pendingStats = await getPendingStats(storeId);
    const todayStats = await getTodayPickupStats(storeId);

    // 【2026-01-20】新增：获取待确认、待备货和待核销数量
    // 待确认：待确认(状态0) + 确认中(状态1)
    // 待备货：已确认的预约(状态2) + 待备货(状态7) + 备货中(状态8)，库管自行安排备货时间
    // 待核销：待提货(状态9)，已完成备货等待客户提货
    const [pendingConfirm, pendingPrepare, pendingPickup] = await Promise.all([
      // 待确认：待确认(0) + 确认中(1)
      prisma.reservation.count({
        where: {
          storeId,
          status: { in: [0, 1] },
        },
      }),
      // 待备货：所有已确认但未完成备货的预约
      prisma.reservation.count({
        where: {
          storeId,
          status: { in: [2, 7, 8] },
        },
      }),
      // 待核销：已完成备货，等待客户提货
      prisma.reservation.count({
        where: {
          storeId,
          status: 9,
        },
      }),
    ]);

    return success(res, {
      pending: pendingStats.total || 0,
      confirmed: todayStats.pendingCount || 0,
      todayComplete: todayStats.completedCount || 0,
      pendingConfirm,
      pendingPrepare,
      pendingPickup,
    });
  } catch (err: any) {
    console.error('[listController] getReservationStats error:', err);
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
    console.error('[listController] getPending error:', err);
    return error(res, '获取待确认列表失败');
  }
}

/**
 * 获取预约列表
 * GET /api/store/reservations
 * 【2026-01-19】支持statuses参数（逗号分隔的多状态，如 "2,7,8"）
 */
export async function getReservations(req: Request, res: Response) {
  try {
    const storeId = getStoreId(req);
    if (!storeId) {
      return error(res, '未关联门店', 403);
    }

    const { page, pageSize, status, statuses, customerPhone, startDate, endDate } = req.query;

    // 解析多状态参数
    let statusesArray: number[] | undefined;
    if (statuses) {
      statusesArray = (statuses as string).split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    }

    const result = await getStoreReservations(storeId, {
      page: page ? parseInt(page as string, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize as string, 10) : 20,
      status: status !== undefined ? parseInt(status as string, 10) : undefined,
      statuses: statusesArray,
      customerPhone: customerPhone as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    return success(res, result);
  } catch (err: any) {
    console.error('[listController] getReservations error:', err);
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

    // 【2026-01-18修复】权限检查：必须关联门店且预约属于该门店
    const storeId = getStoreId(req);
    if (!storeId || reservation.store.id !== storeId) {
      return error(res, '无权查看此预约', 403);
    }

    return success(res, reservation);
  } catch (err: any) {
    console.error('[listController] getDetail error:', err);
    return error(res, '获取预约详情失败');
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
    console.error('[listController] getUrgent error:', err);
    return error(res, '获取紧急列表失败');
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
    console.error('[listController] getExpiring error:', err);
    return error(res, '获取即将过期列表失败');
  }
}

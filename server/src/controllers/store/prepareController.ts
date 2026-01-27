/**
 * 门店端 - 备货控制器
 * 【2026-01-17 代码重构】从storeController拆分
 */

import { Request, Response } from 'express';
import { success, error, badRequest } from '../../utils/response';
import {
  getPendingPrepareList,
  getPreparingList,
  startPrepare,
  updateItemPrepareStatus,
  batchUpdateItemPrepareStatus,
  completePrepare,
  getPrepareProgress,
  reportIssue,
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
    console.error('[prepareController] getPendingPrepare error:', err);
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
    console.error('[prepareController] getPreparingList error:', err);
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
    console.error('[prepareController] startPrepare error:', err);
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
    console.error('[prepareController] updatePrepareItem error:', err);
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
    console.error('[prepareController] batchUpdatePrepareItems error:', err);
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
    console.error('[prepareController] completePrepare error:', err);
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
    console.error('[prepareController] getPrepareProgress error:', err);
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
    console.error('[prepareController] reportPrepareIssue error:', err);
    return error(res, '上报问题失败');
  }
}

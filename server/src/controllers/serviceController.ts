import { Request, Response } from 'express';
import {
  getStatistics,
  getLockStockList,
  getLockStockDetail,
  reviewLockStockRequest,
  getExceptionList,
  getExceptionDetail,
  resolveExceptionOrder,
  EXCEPTION_TYPES,
} from '../services/serviceService';
import { success, error } from '../utils/response';

// 获取客服统计
export async function getServiceStatistics(req: Request, res: Response) {
  try {
    const stats = await getStatistics();
    return success(res, stats);
  } catch (err: any) {
    console.error('获取客服统计失败:', err);
    return error(res, err.message || '获取统计失败');
  }
}

// ========== 锁货申请相关 ==========

// 获取锁货申请列表
export async function getLockStockListHandler(req: Request, res: Response) {
  try {
    const { page, pageSize, status, keyword, startDate, endDate } = req.query;

    // 参数验证
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize as string) || 10));

    // 状态验证
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
    if (status && !validStatuses.includes(status as string)) {
      return error(res, '无效的状态参数', 400);
    }

    const result = await getLockStockList({
      page: pageNum,
      pageSize: pageSizeNum,
      status: status as string,
      keyword: keyword as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    return success(res, result);
  } catch (err: any) {
    console.error('获取锁货申请列表失败:', err);
    return error(res, err.message || '获取列表失败');
  }
}

// 获取锁货申请详情
export async function getLockStockDetailHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const numId = parseInt(id);

    if (isNaN(numId) || numId <= 0) {
      return error(res, '无效的ID', 400);
    }

    const detail = await getLockStockDetail(numId);

    if (!detail) {
      return error(res, '申请不存在', 404);
    }

    return success(res, detail);
  } catch (err: any) {
    console.error('获取锁货申请详情失败:', err);
    return error(res, err.message || '获取详情失败');
  }
}

// 审核锁货申请
export async function reviewLockStockHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { action, rejectReason } = req.body;
    const adminId = (req as any).user?.id;

    const numId = parseInt(id);
    if (isNaN(numId) || numId <= 0) {
      return error(res, '无效的ID', 400);
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return error(res, '无效的操作类型', 400);
    }

    if (action === 'reject' && !rejectReason) {
      return error(res, '驳回时需要填写原因', 400);
    }

    const result = await reviewLockStockRequest(numId, {
      action,
      rejectReason,
      reviewedBy: adminId,
    });

    const message = action === 'approve' ? '审核通过' : '已驳回';
    return success(res, result, message);
  } catch (err: any) {
    console.error('审核锁货申请失败:', err);
    return error(res, err.message || '审核失败');
  }
}

// ========== 异常工单相关 ==========

// 获取异常工单列表
export async function getExceptionListHandler(req: Request, res: Response) {
  try {
    const { page, pageSize, status, type, keyword, startDate, endDate } = req.query;

    // 参数验证
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize as string) || 10));

    // 状态验证
    const validStatuses = ['PENDING', 'RESOLVED'];
    if (status && !validStatuses.includes(status as string)) {
      return error(res, '无效的状态参数', 400);
    }

    // 类型验证
    const validTypes = Object.keys(EXCEPTION_TYPES);
    if (type && !validTypes.includes(type as string)) {
      return error(res, '无效的类型参数', 400);
    }

    const result = await getExceptionList({
      page: pageNum,
      pageSize: pageSizeNum,
      status: status as string,
      type: type as string,
      keyword: keyword as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    return success(res, result);
  } catch (err: any) {
    console.error('获取异常工单列表失败:', err);
    return error(res, err.message || '获取列表失败');
  }
}

// 获取异常工单详情
export async function getExceptionDetailHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const numId = parseInt(id);

    if (isNaN(numId) || numId <= 0) {
      return error(res, '无效的ID', 400);
    }

    const detail = await getExceptionDetail(numId);

    if (!detail) {
      return error(res, '工单不存在', 404);
    }

    return success(res, detail);
  } catch (err: any) {
    console.error('获取异常工单详情失败:', err);
    return error(res, err.message || '获取详情失败');
  }
}

// 处理异常工单
export async function resolveExceptionHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { resolution } = req.body;
    const adminId = (req as any).user?.id;

    const numId = parseInt(id);
    if (isNaN(numId) || numId <= 0) {
      return error(res, '无效的ID', 400);
    }

    if (!resolution || typeof resolution !== 'string' || resolution.trim().length === 0) {
      return error(res, '请填写处理结果', 400);
    }

    const result = await resolveExceptionOrder(numId, {
      resolution: resolution.trim(),
      resolvedBy: adminId,
    });

    return success(res, result, '工单已处理');
  } catch (err: any) {
    console.error('处理异常工单失败:', err);
    return error(res, err.message || '处理失败');
  }
}

// 获取异常类型列表
export async function getExceptionTypes(req: Request, res: Response) {
  try {
    const types = Object.entries(EXCEPTION_TYPES).map(([key, value]) => ({
      value: key,
      label: value,
    }));
    return success(res, types);
  } catch (err: any) {
    console.error('获取异常类型失败:', err);
    return error(res, err.message || '获取失败');
  }
}

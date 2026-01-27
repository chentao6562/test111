import { Request, Response } from 'express';
import {
  getFinanceStatistics,
  getRechargeList,
  reviewRecharge,
  getFundFlowList,
  getRechargeDetail
} from '../services/financeService';
import { success, error } from '../utils/response';
import { sanitize } from '../utils/sanitize';

// 获取财务统计数据
export async function getStatistics(req: Request, res: Response) {
  try {
    const data = await getFinanceStatistics();
    return success(res, data);
  } catch (err: any) {
    console.error('获取财务统计失败:', err);
    return error(res, err.message || '获取财务统计失败');
  }
}

// 获取加款申请列表
export async function getRechargeListHandler(req: Request, res: Response) {
  try {
    const {
      page = '1',
      pageSize = '10',
      status,
      keyword,
      startDate,
      endDate
    } = req.query;

    const data = await getRechargeList({
      page: parseInt(page as string, 10),
      pageSize: Math.min(parseInt(pageSize as string, 10), 100),
      status: status as string,
      keyword: keyword ? sanitize(keyword as string) : undefined,
      startDate: startDate as string,
      endDate: endDate as string
    });

    return success(res, data);
  } catch (err: any) {
    console.error('获取加款申请列表失败:', err);
    return error(res, err.message || '获取加款申请列表失败');
  }
}

// 获取加款申请详情
export async function getRechargeDetailHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = await getRechargeDetail(parseInt(id, 10));
    return success(res, data);
  } catch (err: any) {
    console.error('获取加款申请详情失败:', err);
    return error(res, err.message || '获取加款申请详情失败');
  }
}

// 审核加款申请
export async function reviewRechargeHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { action, rejectReason } = req.body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return error(res, '请选择审核操作', 400);
    }

    if (action === 'reject' && !rejectReason) {
      return error(res, '请填写拒绝原因', 400);
    }

    const adminId = (req as any).user?.id || 1;
    const result = await reviewRecharge(
      parseInt(id, 10),
      action,
      adminId,
      rejectReason ? sanitize(rejectReason) : undefined
    );

    return success(res, result);
  } catch (err: any) {
    console.error('审核加款申请失败:', err);
    return error(res, err.message || '审核加款申请失败');
  }
}

// 获取资金流水列表
export async function getFundFlowListHandler(req: Request, res: Response) {
  try {
    const {
      page = '1',
      pageSize = '10',
      type,
      agentId,
      keyword,
      startDate,
      endDate
    } = req.query;

    const data = await getFundFlowList({
      page: parseInt(page as string, 10),
      pageSize: Math.min(parseInt(pageSize as string, 10), 100),
      type: type as string,
      agentId: agentId ? parseInt(agentId as string, 10) : undefined,
      keyword: keyword ? sanitize(keyword as string) : undefined,
      startDate: startDate as string,
      endDate: endDate as string
    });

    return success(res, data);
  } catch (err: any) {
    console.error('获取资金流水列表失败:', err);
    return error(res, err.message || '获取资金流水列表失败');
  }
}

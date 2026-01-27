/**
 * 员工提现控制器
 */

import { Request, Response } from 'express';
import { success, error } from '../utils/response';
import * as staffWithdrawalService from '../services/staffWithdrawalService';

// ============ 货管端接口 ============

/**
 * 获取收款信息
 * GET /api/staff/payment-info
 */
export async function getPaymentInfo(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const data = await staffWithdrawalService.getPaymentInfo(user.id);
    success(res, data);
  } catch (err: any) {
    console.error('获取收款信息失败:', err);
    error(res, err.message || '获取收款信息失败', 500);
  }
}

/**
 * 更新收款信息
 * PUT /api/staff/payment-info
 */
export async function updatePaymentInfo(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const { bankName, bankAccount, accountName, alipay, wechat } = req.body;

    const data = await staffWithdrawalService.updatePaymentInfo(user.id, {
      bankName,
      bankAccount,
      accountName,
      alipay,
      wechat,
    });

    success(res, data, '收款信息更新成功');
  } catch (err: any) {
    console.error('更新收款信息失败:', err);
    error(res, err.message || '更新收款信息失败', 500);
  }
}

/**
 * 申请提现
 * POST /api/staff/withdrawals
 */
export async function createWithdrawal(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const { amount } = req.body;

    if (!amount || isNaN(Number(amount))) {
      return error(res, '请输入有效的提现金额', 400);
    }

    const data = await staffWithdrawalService.createWithdrawal(
      user.id,
      Number(amount)
    );

    success(res, data, '提现申请已提交');
  } catch (err: any) {
    console.error('申请提现失败:', err);
    error(res, err.message || '申请提现失败', 500);
  }
}

/**
 * 获取我的提现记录
 * GET /api/staff/withdrawals
 */
export async function getMyWithdrawals(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 10));
    const status = req.query.status as string;

    const data = await staffWithdrawalService.getWithdrawalList({
      staffId: user.id,
      status,
      page,
      pageSize,
    });

    success(res, data);
  } catch (err: any) {
    console.error('获取提现记录失败:', err);
    error(res, err.message || '获取提现记录失败', 500);
  }
}

/**
 * 获取我的提现统计
 * GET /api/staff/withdrawals/stats
 */
export async function getMyWithdrawalStats(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const data = await staffWithdrawalService.getMyWithdrawalStats(user.id);
    success(res, data);
  } catch (err: any) {
    console.error('获取提现统计失败:', err);
    error(res, err.message || '获取提现统计失败', 500);
  }
}

// ============ 管理后台接口 ============

/**
 * 获取员工提现列表（管理后台）
 * GET /api/admin/staff-withdrawals
 */
export async function getWithdrawalList(req: Request, res: Response) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 10));
    const status = req.query.status as string;
    const staffId = req.query.staffId ? parseInt(req.query.staffId as string) : undefined;

    const data = await staffWithdrawalService.getWithdrawalList({
      staffId,
      status,
      page,
      pageSize,
    });

    success(res, data);
  } catch (err: any) {
    console.error('获取提现列表失败:', err);
    error(res, err.message || '获取提现列表失败', 500);
  }
}

/**
 * 获取提现详情（管理后台）
 * GET /api/admin/staff-withdrawals/:id
 */
export async function getWithdrawalDetail(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id) || id <= 0) {
      return error(res, '无效的提现ID', 400);
    }

    const data = await staffWithdrawalService.getWithdrawalDetail(id);
    success(res, data);
  } catch (err: any) {
    console.error('获取提现详情失败:', err);
    error(res, err.message || '获取提现详情失败', 500);
  }
}

/**
 * 审核提现申请
 * POST /api/admin/staff-withdrawals/:id/review
 */
export async function reviewWithdrawal(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const user = (req as any).user;
    const { action, reason } = req.body;

    if (isNaN(id) || id <= 0) {
      return error(res, '无效的提现ID', 400);
    }

    if (!['APPROVED', 'REJECTED'].includes(action)) {
      return error(res, '无效的审核操作', 400);
    }

    if (action === 'REJECTED' && !reason) {
      return error(res, '请填写拒绝原因', 400);
    }

    const data = await staffWithdrawalService.reviewWithdrawal(
      id,
      user.id,
      action,
      reason
    );

    success(res, data, action === 'APPROVED' ? '审核通过' : '已拒绝');
  } catch (err: any) {
    console.error('审核提现失败:', err);
    error(res, err.message || '审核提现失败', 500);
  }
}

/**
 * 确认打款完成
 * POST /api/admin/staff-withdrawals/:id/complete
 */
export async function completeWithdrawal(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const user = (req as any).user;
    const { remark } = req.body;

    if (isNaN(id) || id <= 0) {
      return error(res, '无效的提现ID', 400);
    }

    const data = await staffWithdrawalService.completeWithdrawal(
      id,
      user.id,
      remark
    );

    success(res, data, '已确认打款');
  } catch (err: any) {
    console.error('确认打款失败:', err);
    error(res, err.message || '确认打款失败', 500);
  }
}

/**
 * 获取提现统计
 * GET /api/admin/staff-withdrawals/stats
 */
export async function getWithdrawalStats(req: Request, res: Response) {
  try {
    const data = await staffWithdrawalService.getWithdrawalStats();
    success(res, data);
  } catch (err: any) {
    console.error('获取提现统计失败:', err);
    error(res, err.message || '获取提现统计失败', 500);
  }
}

export default {
  getPaymentInfo,
  updatePaymentInfo,
  createWithdrawal,
  getMyWithdrawals,
  getWithdrawalList,
  getWithdrawalDetail,
  reviewWithdrawal,
  completeWithdrawal,
  getWithdrawalStats,
};

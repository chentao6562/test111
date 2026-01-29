import { Request, Response } from 'express';
import { success, error } from '../utils/response';
import commissionService from '../services/commissionService';
import * as upgradeService from '../services/promotion/upgradeService';

// ==================== 代理商端 API ====================

/**
 * 获取分润中心数据
 */
export async function getCommissionCenter(req: Request, res: Response) {
  try {
    const agentId = (req as any).user?.id;
    if (!agentId) {
      return error(res, '请先登录', 401);
    }

    const data = await commissionService.getCommissionCenter(agentId);
    return success(res, data);
  } catch (err: any) {
    console.error('获取分润中心数据失败:', err);
    return error(res, err.message || '获取分润中心数据失败');
  }
}

/**
 * 获取分润记录列表
 */
export async function getCommissionRecords(req: Request, res: Response) {
  try {
    const agentId = (req as any).user?.id;
    if (!agentId) {
      return error(res, '请先登录', 401);
    }

    const { page = '1', pageSize = '20', type, month } = req.query;

    const data = await commissionService.getCommissionRecords({
      agentId,
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
      type: type as string,
      month: month as string,
    });

    return success(res, data);
  } catch (err: any) {
    console.error('获取分润记录失败:', err);
    return error(res, err.message || '获取分润记录失败');
  }
}

/**
 * 提现申请
 */
export async function createWithdrawal(req: Request, res: Response) {
  try {
    const agentId = (req as any).user?.id;
    if (!agentId) {
      return error(res, '请先登录', 401);
    }

    const { amount } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return error(res, '请输入有效的提现金额', 422);
    }

    const withdrawal = await commissionService.createWithdrawal(agentId, amount);
    return success(res, withdrawal, '提现申请已提交');
  } catch (err: any) {
    console.error('提现申请失败:', err);
    return error(res, err.message || '提现申请失败');
  }
}

/**
 * 获取代理商自己的提现记录
 */
export async function getAgentWithdrawals(req: Request, res: Response) {
  try {
    const agentId = (req as any).user?.id;
    if (!agentId) {
      return error(res, '请先登录', 401);
    }

    const { page = '1', pageSize = '20', status } = req.query;

    const data = await commissionService.getAgentWithdrawals({
      agentId,
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
      status: status as string,
    });

    return success(res, data);
  } catch (err: any) {
    console.error('获取提现记录失败:', err);
    return error(res, err.message || '获取提现记录失败');
  }
}

/**
 * 获取团队统计数据
 */
export async function getTeamStats(req: Request, res: Response) {
  try {
    const agentId = (req as any).user?.id;
    if (!agentId) {
      return error(res, '请先登录', 401);
    }

    const data = await commissionService.getTeamStats(agentId);
    return success(res, data);
  } catch (err: any) {
    console.error('获取团队统计失败:', err);
    return error(res, err.message || '获取团队统计失败');
  }
}

/**
 * 获取团队成员列表
 */
export async function getTeamMembers(req: Request, res: Response) {
  try {
    const agentId = (req as any).user?.id;
    if (!agentId) {
      return error(res, '请先登录', 401);
    }

    const { page = '1', pageSize = '20', keyword, level } = req.query;

    const data = await commissionService.getTeamMembers({
      agentId,
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
      keyword: keyword as string,
      level: level as string,
    });

    return success(res, data);
  } catch (err: any) {
    console.error('获取团队成员失败:', err);
    return error(res, err.message || '获取团队成员失败');
  }
}

/**
 * 获取推广中心数据
 */
export async function getPromotionData(req: Request, res: Response) {
  try {
    const agentId = (req as any).user?.id;
    if (!agentId) {
      return error(res, '请先登录', 401);
    }

    const data = await commissionService.getPromotionData(agentId);
    return success(res, data);
  } catch (err: any) {
    console.error('获取推广数据失败:', err);
    return error(res, err.message || '获取推广数据失败');
  }
}

/**
 * 【2026-01-09 Phase 9】获取邀请记录
 */
export async function getInviteRecords(req: Request, res: Response) {
  try {
    const agentId = (req as any).user?.id;
    if (!agentId) {
      return error(res, '请先登录', 401);
    }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;

    const data = await commissionService.getInviteRecords(agentId, page, pageSize);
    return success(res, data);
  } catch (err: any) {
    console.error('获取邀请记录失败:', err);
    return error(res, err.message || '获取邀请记录失败');
  }
}

/**
 * 【2026-01-29】H5端：获取分润记录详情
 * 用于推销员查看单条分润的详细信息，包括订单、商品、利润分配
 */
export async function getCommissionRecordDetailForAgent(req: Request, res: Response) {
  try {
    const agentId = (req as any).user?.id;
    if (!agentId) {
      return error(res, '请先登录', 401);
    }

    const { id } = req.params;
    const recordId = parseInt(id);

    if (isNaN(recordId) || recordId <= 0) {
      return error(res, '无效的记录ID', 422);
    }

    const data = await commissionService.getCommissionRecordDetailForAgent(recordId, agentId);
    if (!data) {
      return error(res, '分润记录不存在或无权查看', 404);
    }

    return success(res, data);
  } catch (err: any) {
    console.error('获取分润记录详情失败:', err);
    return error(res, err.message || '获取分润记录详情失败');
  }
}

// ==================== 管理后台 API ====================

/**
 * 获取分润规则列表
 */
export async function getRules(req: Request, res: Response) {
  try {
    const rules = await commissionService.getRules();
    return success(res, rules);
  } catch (err: any) {
    console.error('获取分润规则失败:', err);
    return error(res, err.message || '获取分润规则失败');
  }
}

/**
 * 创建分润规则
 */
export async function createRule(req: Request, res: Response) {
  try {
    const { minAmount, level1Rate, level2Rate } = req.body;

    if (minAmount === undefined || level1Rate === undefined || level2Rate === undefined) {
      return error(res, '请填写完整信息', 422);
    }

    const rule = await commissionService.createRule({
      minAmount: Number(minAmount),
      level1Rate: Number(level1Rate),
      level2Rate: Number(level2Rate),
    });

    return success(res, rule, '规则创建成功');
  } catch (err: any) {
    console.error('创建分润规则失败:', err);
    return error(res, err.message || '创建分润规则失败');
  }
}

/**
 * 更新分润规则
 */
export async function updateRule(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const ruleId = parseInt(id);

    if (isNaN(ruleId) || ruleId <= 0) {
      return error(res, '无效的规则ID', 422);
    }

    const { minAmount, level1Rate, level2Rate, status } = req.body;

    const rule = await commissionService.updateRule(ruleId, {
      minAmount: minAmount !== undefined ? Number(minAmount) : undefined,
      level1Rate: level1Rate !== undefined ? Number(level1Rate) : undefined,
      level2Rate: level2Rate !== undefined ? Number(level2Rate) : undefined,
      status,
    });

    return success(res, rule, '规则更新成功');
  } catch (err: any) {
    console.error('更新分润规则失败:', err);
    return error(res, err.message || '更新分润规则失败');
  }
}

/**
 * 删除分润规则
 */
export async function deleteRule(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const ruleId = parseInt(id);

    if (isNaN(ruleId) || ruleId <= 0) {
      return error(res, '无效的规则ID', 422);
    }

    await commissionService.deleteRule(ruleId);
    return success(res, null, '规则删除成功');
  } catch (err: any) {
    console.error('删除分润规则失败:', err);
    return error(res, err.message || '删除分润规则失败');
  }
}

/**
 * 管理后台：获取分润记录列表
 */
export async function getAdminCommissionRecords(req: Request, res: Response) {
  try {
    const { page = '1', pageSize = '20', keyword, type, status, startDate, endDate } = req.query;

    const data = await commissionService.getAdminCommissionRecords({
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
      keyword: keyword as string,
      type: type as string,
      status: status as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    return success(res, data);
  } catch (err: any) {
    console.error('获取分润记录失败:', err);
    return error(res, err.message || '获取分润记录失败');
  }
}

/**
 * 【2026-01-20 新增】获取分润记录详情
 */
export async function getCommissionRecordDetail(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const recordId = parseInt(id);

    if (isNaN(recordId) || recordId <= 0) {
      return error(res, '无效的记录ID', 422);
    }

    const data = await commissionService.getCommissionRecordDetail(recordId);
    if (!data) {
      return error(res, '分润记录不存在', 404);
    }

    return success(res, data);
  } catch (err: any) {
    console.error('获取分润记录详情失败:', err);
    return error(res, err.message || '获取分润记录详情失败');
  }
}

/**
 * 获取提现申请列表
 */
export async function getWithdrawals(req: Request, res: Response) {
  try {
    const { page = '1', pageSize = '20', status, keyword } = req.query;

    const data = await commissionService.getWithdrawals({
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
      status: status as string,
      keyword: keyword as string,
    });

    return success(res, data);
  } catch (err: any) {
    console.error('获取提现申请失败:', err);
    return error(res, err.message || '获取提现申请失败');
  }
}

/**
 * 获取提现详情（包含代理商分润统计）
 */
export async function getWithdrawalDetail(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const withdrawalId = parseInt(id);

    if (isNaN(withdrawalId) || withdrawalId <= 0) {
      return error(res, '无效的提现申请ID', 422);
    }

    const data = await commissionService.getWithdrawalDetail(withdrawalId);
    return success(res, data);
  } catch (err: any) {
    console.error('获取提现详情失败:', err);
    return error(res, err.message || '获取提现详情失败');
  }
}

/**
 * 审核提现申请
 */
export async function reviewWithdrawal(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const withdrawalId = parseInt(id);

    if (isNaN(withdrawalId) || withdrawalId <= 0) {
      return error(res, '无效的提现申请ID', 422);
    }

    const { action, reason } = req.body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return error(res, '请指定审核操作', 422);
    }

    if (action === 'reject' && !reason) {
      return error(res, '拒绝时请填写原因', 422);
    }

    const reviewerId = (req as any).user?.id;

    const withdrawal = await commissionService.reviewWithdrawal(withdrawalId, {
      action,
      reviewerId,
      reason,
    });

    return success(res, withdrawal, action === 'approve' ? '已批准' : '已拒绝');
  } catch (err: any) {
    console.error('审核提现失败:', err);
    return error(res, err.message || '审核提现失败');
  }
}

/**
 * 确认提现打款完成
 * 【Task 2.1】支持提现从APPROVED到COMPLETED的状态流转
 */
export async function completeWithdrawal(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const withdrawalId = parseInt(id);

    if (isNaN(withdrawalId) || withdrawalId <= 0) {
      return error(res, '无效的提现申请ID', 422);
    }

    const { remark } = req.body;
    const operatorId = (req as any).user?.id;

    const withdrawal = await commissionService.completeWithdrawal(withdrawalId, {
      operatorId,
      remark,
    });

    return success(res, withdrawal, '已确认打款完成');
  } catch (err: any) {
    console.error('确认打款完成失败:', err);
    return error(res, err.message || '确认打款完成失败');
  }
}

/**
 * 批量结算分润
 */
export async function settleCommissions(req: Request, res: Response) {
  try {
    const { ids } = req.body;

    const result = await commissionService.settleCommissions(ids);
    return success(res, result, `已结算${result.settledCount}条记录`);
  } catch (err: any) {
    console.error('批量结算失败:', err);
    return error(res, err.message || '批量结算失败');
  }
}

/**
 * 分润统计
 */
export async function getCommissionStatistics(req: Request, res: Response) {
  try {
    const data = await commissionService.getCommissionStatistics();
    return success(res, data);
  } catch (err: any) {
    console.error('获取分润统计失败:', err);
    return error(res, err.message || '获取分润统计失败');
  }
}

// ==================== 【2026-01-17】晋升相关 API ====================

/**
 * 获取晋升状态概览（H5端）
 * GET /api/commission/upgrade/status
 */
export async function getUpgradeStatus(req: Request, res: Response) {
  try {
    const agentId = (req as any).user?.id;
    if (!agentId) {
      return error(res, '请先登录', 401);
    }

    const data = await upgradeService.getUpgradeStatusOverview(agentId);
    return success(res, data);
  } catch (err: any) {
    console.error('获取晋升状态失败:', err);
    return error(res, err.message || '获取晋升状态失败');
  }
}

/**
 * 提交晋升申请（H5端）
 * POST /api/commission/upgrade/apply
 */
export async function applyUpgrade(req: Request, res: Response) {
  try {
    const agentId = (req as any).user?.id;
    if (!agentId) {
      return error(res, '请先登录', 401);
    }

    const { reason } = req.body;

    const result = await upgradeService.submitUpgradeApplication(agentId, reason);
    return success(res, result, '晋升申请已提交，请等待审核');
  } catch (err: any) {
    console.error('提交晋升申请失败:', err);
    return error(res, err.message || '提交晋升申请失败');
  }
}

/**
 * 获取晋升申请列表（管理后台）
 * GET /api/admin/upgrade-applications
 */
export async function getUpgradeApplications(req: Request, res: Response) {
  try {
    const { page = '1', pageSize = '20', status } = req.query;

    const data = await upgradeService.getUpgradeApplications({
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
      status: status !== undefined ? parseInt(status as string) : undefined,
    });

    return success(res, data);
  } catch (err: any) {
    console.error('获取晋升申请列表失败:', err);
    return error(res, err.message || '获取晋升申请列表失败');
  }
}

/**
 * 审核晋升申请（管理后台）
 * POST /api/admin/upgrade-applications/:id/review
 */
export async function reviewUpgradeApplication(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const applicationId = parseInt(id);

    if (isNaN(applicationId) || applicationId <= 0) {
      return error(res, '无效的申请ID', 422);
    }

    const { approved, remark } = req.body;

    if (typeof approved !== 'boolean') {
      return error(res, '请指定审核结果', 422);
    }

    const reviewerId = (req as any).user?.id;

    await upgradeService.reviewUpgradeApplication(applicationId, approved, reviewerId, remark);
    return success(res, null, approved ? '已批准晋升申请' : '已拒绝晋升申请');
  } catch (err: any) {
    console.error('审核晋升申请失败:', err);
    return error(res, err.message || '审核晋升申请失败');
  }
}

/**
 * 获取自动晋升配置（管理后台）
 * GET /api/admin/upgrade-config
 */
export async function getUpgradeConfig(req: Request, res: Response) {
  try {
    const config = await upgradeService.getAutoUpgradeConfig();
    return success(res, config);
  } catch (err: any) {
    console.error('获取晋升配置失败:', err);
    return error(res, err.message || '获取晋升配置失败');
  }
}

/**
 * 设置自动晋升配置（管理后台）
 * PUT /api/admin/upgrade-config
 */
export async function setUpgradeConfig(req: Request, res: Response) {
  try {
    const { threshold, enabled } = req.body;

    if (typeof threshold !== 'number' || threshold < 0) {
      return error(res, '请输入有效的晋升门槛', 422);
    }

    const updatedBy = (req as any).user?.id;

    await upgradeService.setAutoUpgradeConfig(threshold, enabled !== false, updatedBy);
    return success(res, null, '晋升配置已更新');
  } catch (err: any) {
    console.error('设置晋升配置失败:', err);
    return error(res, err.message || '设置晋升配置失败');
  }
}

export default {
  // 代理商端
  getCommissionCenter,
  getCommissionRecords,
  getCommissionRecordDetailForAgent, // 【2026-01-29】H5端分润详情
  createWithdrawal,
  getAgentWithdrawals,
  getTeamStats,
  getTeamMembers,
  getPromotionData,
  getInviteRecords,
  // 晋升相关
  getUpgradeStatus,
  applyUpgrade,
  // 管理后台
  getRules,
  createRule,
  updateRule,
  deleteRule,
  getAdminCommissionRecords,
  getWithdrawals,
  getWithdrawalDetail,
  reviewWithdrawal,
  completeWithdrawal,
  settleCommissions,
  getCommissionStatistics,
  // 晋升管理
  getUpgradeApplications,
  reviewUpgradeApplication,
  getUpgradeConfig,
  setUpgradeConfig,
};

/**
 * 推广体系控制器
 * 【2026-01-16 推广体系升级】
 * 处理推销员定价、升级申请、奖励查询等
 */

import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import * as priceService from '../services/promotion/priceService';
import * as profitService from '../services/promotion/profitService';
import * as settlementService from '../services/promotion/settlementService';
import * as rewardService from '../services/promotion/rewardService';
import * as upgradeService from '../services/promotion/upgradeService';
import { asyncHandler } from '../utils/controllerHelper';
// 【2026-01-18 修复】导入统一响应函数
import { success, error, unauthorized, badRequest, notFound } from '../utils/response';

// ==================== 价格相关 ====================

/**
 * 获取客户价格（根据推销员链接）
 * GET /api/customer/product/:id/price?agent=xxx
 */
export const getCustomerPrice = asyncHandler(async (req: Request, res: Response) => {
  const productId = parseInt(req.params.id);
  const agentId = req.query.agent ? parseInt(req.query.agent as string) : undefined;

  if (!productId) {
    return res.status(400).json({ error: '商品ID不能为空' });
  }

  const price = await priceService.getCustomerPrice(productId, agentId);

  res.json({
    productId,
    agentId,
    price,
  });
});

/**
 * 获取推销员定价列表
 * GET /api/agent/prices
 * 【2026-01-18 修复】使用标准响应格式
 */
export const getAgentPrices = asyncHandler(async (req: Request, res: Response) => {
  const agentId = (req as any).user?.id;
  if (!agentId) {
    return unauthorized(res, '请先登录');
  }

  const result = await priceService.getAgentPrices(agentId);

  success(res, result, '获取成功');
});

/**
 * 保存商品定价
 * POST /api/agent/prices
 * 【2026-01-18 修复】使用标准响应格式
 */
export const saveAgentPrice = asyncHandler(async (req: Request, res: Response) => {
  const agentId = (req as any).user?.id;
  if (!agentId) {
    return unauthorized(res, '请先登录');
  }

  const { productId, retailPrice, subPrice } = req.body;

  if (!productId) {
    return badRequest(res, '商品ID不能为空');
  }

  await priceService.saveAgentPrice(agentId, productId, retailPrice, subPrice);

  success(res, null, '保存成功');
});

/**
 * 批量设置定价
 * POST /api/agent/prices/batch
 * 支持两种模式:
 * 1. mode模式: { mode: 'fixed'|'percent'|'suggested', value?: number }
 * 2. 单个价格模式: { prices: Array<{ productId, retailPrice, subPrice }> }
 * 【2026-01-18 修复】使用标准响应格式
 */
export const batchSetAgentPrices = asyncHandler(async (req: Request, res: Response) => {
  const agentId = (req as any).user?.id;
  if (!agentId) {
    return unauthorized(res, '请先登录');
  }

  const { mode, value, prices } = req.body;

  // 模式1: 批量按规则设置
  if (mode) {
    if (!['fixed', 'percent', 'suggested'].includes(mode)) {
      return badRequest(res, '无效的定价模式');
    }

    const result = await priceService.batchSetPrices(agentId, mode, value);
    return success(res, result, '批量设置成功');
  }

  // 模式2: 按商品逐个设置
  if (Array.isArray(prices) && prices.length > 0) {
    let successCount = 0;
    let failedCount = 0;

    for (const p of prices) {
      try {
        await priceService.saveAgentPrice(agentId, p.productId, p.retailPrice, p.subPrice);
        successCount++;
      } catch (err) {
        failedCount++;
      }
    }

    return success(res, { success: successCount, failed: failedCount }, '批量设置完成');
  }

  return badRequest(res, '请提供定价模式或价格列表');
});

/**
 * 获取推销员拿货价
 * GET /api/agent/cost-price/:productId
 * 【2026-01-18 修复】使用标准响应格式
 */
export const getAgentCostPrice = asyncHandler(async (req: Request, res: Response) => {
  const agentId = (req as any).user?.id;
  if (!agentId) {
    return unauthorized(res, '请先登录');
  }

  const productId = parseInt(req.params.productId);
  if (!productId) {
    return badRequest(res, '商品ID不能为空');
  }

  const costPrice = await priceService.getAgentCostPrice(agentId, productId);

  success(res, { productId, costPrice }, '获取成功');
});

// ==================== 利润相关 ====================

/**
 * 获取利润记录
 * GET /api/agent/profits
 * 【2026-01-18 修复】使用标准响应格式
 */
export const getProfitRecords = asyncHandler(async (req: Request, res: Response) => {
  const agentId = (req as any).user?.id;
  if (!agentId) {
    return unauthorized(res, '请先登录');
  }

  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;

  const result = await settlementService.getAgentProfitRecords(agentId, { page, pageSize });

  success(res, result, '获取成功');
});

/**
 * 获取利润统计
 * GET /api/agent/profit-stats
 * 【2026-01-18 修复】使用标准响应格式
 */
export const getProfitStats = asyncHandler(async (req: Request, res: Response) => {
  const agentId = (req as any).user?.id;
  if (!agentId) {
    return unauthorized(res, '请先登录');
  }

  // 获取推销员信息
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      balance: true,
      totalSales: true,
      totalOrderCount: true,
      teamSales: true,
      validInviteCount: true,
      currentRewardTier: true,
    },
  });

  if (!agent) {
    return notFound(res, '推销员不存在');
  }

  // 获取利润记录统计
  const profitRecords = await settlementService.getAgentProfitRecords(agentId, {
    page: 1,
    pageSize: 1,
  });

  // 获取奖励统计
  const rewardStats = await rewardService.getAgentRewardStats(agentId);

  success(res, {
    balance: Number(agent.balance),
    totalSales: Number(agent.totalSales),
    totalOrderCount: agent.totalOrderCount,
    teamSales: Number(agent.teamSales),
    validInviteCount: agent.validInviteCount,
    currentRewardTier: agent.currentRewardTier,
    totalProfit: profitRecords.totalProfit,
    rewards: rewardStats,
  }, '获取成功');
});

// ==================== 奖励相关 ====================

/**
 * 获取奖励记录
 * GET /api/agent/rewards
 * 【2026-01-18 修复】使用标准响应格式
 */
export const getRewardRecords = asyncHandler(async (req: Request, res: Response) => {
  const agentId = (req as any).user?.id;
  if (!agentId) {
    return unauthorized(res, '请先登录');
  }

  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const rewardType = req.query.type ? parseInt(req.query.type as string) : undefined;

  const result = await rewardService.getAgentRewardRecords(agentId, {
    page,
    pageSize,
    rewardType,
  });

  success(res, result, '获取成功');
});

/**
 * 获取奖励统计
 * GET /api/agent/reward-stats
 * 【2026-01-18 修复】使用标准响应格式
 */
export const getRewardStats = asyncHandler(async (req: Request, res: Response) => {
  const agentId = (req as any).user?.id;
  if (!agentId) {
    return unauthorized(res, '请先登录');
  }

  const stats = await rewardService.getAgentRewardStats(agentId);

  success(res, stats, '获取成功');
});

// ==================== 升级相关 ====================

/**
 * 检查升级资格
 * GET /api/agent/upgrade/check
 * 【2026-01-18 修复】使用标准响应格式
 */
export const checkUpgradeEligibility = asyncHandler(async (req: Request, res: Response) => {
  const agentId = (req as any).user?.id;
  if (!agentId) {
    return unauthorized(res, '请先登录');
  }

  const result = await upgradeService.checkUpgradeEligibility(agentId);

  success(res, result, '获取成功');
});

/**
 * 申请升级
 * POST /api/agent/upgrade/apply
 * 【2026-01-18 修复】使用标准响应格式
 */
export const applyUpgrade = asyncHandler(async (req: Request, res: Response) => {
  const agentId = (req as any).user?.id;
  if (!agentId) {
    return unauthorized(res, '请先登录');
  }

  const { reason } = req.body;

  const result = await upgradeService.submitUpgradeApplication(agentId, reason);

  success(res, result, '申请已提交');
});

/**
 * 获取我的升级申请记录
 * GET /api/agent/upgrade/records
 * 【2026-01-18 修复】使用标准响应格式
 */
export const getMyUpgradeRecords = asyncHandler(async (req: Request, res: Response) => {
  const agentId = (req as any).user?.id;
  if (!agentId) {
    return unauthorized(res, '请先登录');
  }

  const records = await upgradeService.getMyUpgradeApplications(agentId);

  success(res, { records }, '获取成功');
});

// ==================== 管理员接口 ====================

/**
 * 获取升级申请列表（管理员）
 * GET /api/admin/upgrade-applications
 * 【2026-01-18 修复】使用标准响应格式
 */
export const getUpgradeApplications = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const status = req.query.status !== undefined ? parseInt(req.query.status as string) : undefined;

  const result = await upgradeService.getUpgradeApplications({ page, pageSize, status });

  success(res, result, '获取成功');
});

/**
 * 审核升级申请（管理员）
 * POST /api/admin/upgrade-applications/:id/review
 * 【2026-01-18 修复】使用标准响应格式
 */
export const reviewUpgradeApplication = asyncHandler(async (req: Request, res: Response) => {
  const applicationId = parseInt(req.params.id);
  const { approved, remark } = req.body;
  const reviewedBy = (req as any).user?.id || 0;

  if (!applicationId) {
    return badRequest(res, '申请ID不能为空');
  }

  if (approved === undefined) {
    return badRequest(res, '请指定审核结果');
  }

  await upgradeService.reviewUpgradeApplication(applicationId, approved, reviewedBy, remark);

  success(res, null, '审核完成');
});

/**
 * 获取推销员详情（管理员）
 * GET /api/admin/agents/:id/detail
 * 【2026-01-18 修复】使用标准响应格式
 */
export const getAgentDetail = asyncHandler(async (req: Request, res: Response) => {
  const agentId = parseInt(req.params.id);

  if (!agentId) {
    return badRequest(res, '推销员ID不能为空');
  }

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      parent: {
        select: { id: true, name: true, phone: true },
      },
      children: {
        select: { id: true, name: true, phone: true, type: true },
      },
      agentPrices: {
        include: {
          product: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  if (!agent) {
    return notFound(res, '推销员不存在');
  }

  // 获取统计数据
  const [profitRecords, rewardStats] = await Promise.all([
    settlementService.getAgentProfitRecords(agentId, { page: 1, pageSize: 1 }),
    rewardService.getAgentRewardStats(agentId),
  ]);

  success(res, {
    id: agent.id,
    name: agent.name,
    phone: agent.phone,
    type: agent.type,
    isMaster: agent.isMaster,
    balance: Number(agent.balance),
    totalSales: Number(agent.totalSales),
    totalOrderCount: agent.totalOrderCount,
    teamSales: Number(agent.teamSales),
    validInviteCount: agent.validInviteCount,
    currentRewardTier: agent.currentRewardTier,
    isActivated: agent.isActivated,
    activatedAt: agent.activatedAt,
    parent: agent.parent,
    children: agent.children,
    priceCount: agent.agentPrices.length,
    totalProfit: profitRecords.totalProfit,
    rewards: rewardStats,
    createdAt: agent.createdAt,
  }, '获取成功');
});

export default {
  // 价格
  getCustomerPrice,
  getAgentPrices,
  saveAgentPrice,
  batchSetAgentPrices,
  getAgentCostPrice,
  // 利润
  getProfitRecords,
  getProfitStats,
  // 奖励
  getRewardRecords,
  getRewardStats,
  // 升级
  checkUpgradeEligibility,
  applyUpgrade,
  getMyUpgradeRecords,
  // 管理员
  getUpgradeApplications,
  reviewUpgradeApplication,
  getAgentDetail,
};

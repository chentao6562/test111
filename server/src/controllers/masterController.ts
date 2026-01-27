/**
 * 总代理控制器
 * 【2026-01-16 推广体系升级】
 */

import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import * as priceService from '../services/promotion/priceService';
import * as settlementService from '../services/promotion/settlementService';
import * as rewardService from '../services/promotion/rewardService';
import { asyncHandler } from '../utils/controllerHelper';

/**
 * 获取总代理概览数据
 */
export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  const masterAgent = await priceService.getMasterAgent();
  if (!masterAgent) {
    return res.status(404).json({ error: '总代理不存在' });
  }

  // 统计数据
  const [
    totalSalesmanCount,
    level1Count,
    level2Count,
    orderStats,
    settlementStats,
  ] = await Promise.all([
    // 总推销员数
    prisma.agent.count({
      where: { isMaster: false, status: 'ACTIVE' },
    }),
    // 一级推销员数
    prisma.agent.count({
      where: { type: 'LEVEL1', isMaster: false, status: 'ACTIVE' },
    }),
    // 二级推销员数
    prisma.agent.count({
      where: { type: 'LEVEL2', status: 'ACTIVE' },
    }),
    // 订单统计
    prisma.order.aggregate({
      where: { status: 'completed' },
      _count: true,
      _sum: { totalAmount: true },
    }),
    // 结算统计
    settlementService.getSettlementStats(),
  ]);

  res.json({
    masterAgent: {
      id: masterAgent.id,
      name: masterAgent.name,
      phone: masterAgent.phone,
      balance: Number(masterAgent.balance),
    },
    team: {
      totalSalesmanCount,
      level1Count,
      level2Count,
    },
    orders: {
      totalCount: orderStats._count,
      totalAmount: Number(orderStats._sum.totalAmount || 0),
    },
    settlement: settlementStats,
  });
});

/**
 * 设置商品价格体系
 * 【2026-01-22 P1修复】添加价格合理性校验
 */
export const setProductPrice = asyncHandler(async (req: Request, res: Response) => {
  const productId = parseInt(req.params.id);
  const { costPrice, supplyPrice, suggestedPrice, minRetailPrice, masterRetailPrice } = req.body;

  // 验证参数
  if (!productId) {
    return res.status(400).json({ error: '商品ID不能为空' });
  }

  // 获取当前商品价格用于校验
  const currentProduct = await prisma.product.findUnique({
    where: { id: productId },
    select: { costPrice: true, supplyPrice: true, masterRetailPrice: true },
  });

  if (!currentProduct) {
    return res.status(404).json({ error: '商品不存在' });
  }

  // 确定最终价格值
  const finalCostPrice = costPrice !== undefined ? Number(costPrice) : Number(currentProduct.costPrice || 0);
  const finalSupplyPrice = supplyPrice !== undefined ? Number(supplyPrice) : Number(currentProduct.supplyPrice || 0);
  const finalRetailPrice = masterRetailPrice !== undefined ? Number(masterRetailPrice) : Number(currentProduct.masterRetailPrice || 0);

  // 【#401 P1修复】成本价为0时记录警告
  if (finalCostPrice === 0) {
    console.warn(`[价格警告] 商品${productId}成本价为0，可能是配置错误，请检查`);
  }

  // 【#402 P1修复】供货价低于成本价时阻断并告警
  if (finalSupplyPrice > 0 && finalSupplyPrice < finalCostPrice) {
    return res.status(400).json({
      error: `供货价(${finalSupplyPrice})不能低于成本价(${finalCostPrice})，这将导致亏损`,
    });
  }

  // 【#403 P1修复】零售价低于供货价时阻断
  if (finalRetailPrice > 0 && finalRetailPrice < finalSupplyPrice) {
    return res.status(400).json({
      error: `零售价(${finalRetailPrice})不能低于供货价(${finalSupplyPrice})，这将导致推销员无利润`,
    });
  }

  // 更新商品价格
  const product = await prisma.product.update({
    where: { id: productId },
    data: {
      costPrice: costPrice !== undefined ? costPrice : undefined,
      supplyPrice: supplyPrice !== undefined ? supplyPrice : undefined,
      suggestedPrice: suggestedPrice !== undefined ? suggestedPrice : undefined,
      minRetailPrice: minRetailPrice !== undefined ? minRetailPrice : undefined,
      masterRetailPrice: masterRetailPrice !== undefined ? masterRetailPrice : undefined,
    },
    select: {
      id: true,
      name: true,
      costPrice: true,
      supplyPrice: true,
      suggestedPrice: true,
      minRetailPrice: true,
      masterRetailPrice: true,
    },
  });

  res.json(product);
});

/**
 * 批量设置商品价格
 * 【2026-01-22 P1修复】添加价格合理性校验，使用事务保护
 */
export const batchSetProductPrice = asyncHandler(async (req: Request, res: Response) => {
  const { products } = req.body;

  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: '商品列表不能为空' });
  }

  // 【2026-01-22 P1修复】批量操作使用事务保护
  const results = await prisma.$transaction(async (tx) => {
    const resultList: Array<{ productId: number; success: boolean; error?: string }> = [];

    for (const item of products) {
      try {
        // 获取当前商品价格
        const current = await tx.product.findUnique({
          where: { id: item.productId },
          select: { costPrice: true, supplyPrice: true, masterRetailPrice: true },
        });

        if (!current) {
          resultList.push({ productId: item.productId, success: false, error: '商品不存在' });
          continue;
        }

        // 确定最终价格值
        const finalCostPrice = item.costPrice !== undefined ? Number(item.costPrice) : Number(current.costPrice || 0);
        const finalSupplyPrice = item.supplyPrice !== undefined ? Number(item.supplyPrice) : Number(current.supplyPrice || 0);
        const finalRetailPrice = item.masterRetailPrice !== undefined ? Number(item.masterRetailPrice) : Number(current.masterRetailPrice || 0);

        // 【#401 P1修复】成本价为0时记录警告
        if (finalCostPrice === 0) {
          console.warn(`[价格警告] 商品${item.productId}成本价为0，可能是配置错误`);
        }

        // 【#402 P1修复】供货价低于成本价时跳过并记录错误
        if (finalSupplyPrice > 0 && finalSupplyPrice < finalCostPrice) {
          resultList.push({
            productId: item.productId,
            success: false,
            error: `供货价(${finalSupplyPrice})低于成本价(${finalCostPrice})`,
          });
          continue;
        }

        // 【#403 P1修复】零售价低于供货价时跳过并记录错误
        if (finalRetailPrice > 0 && finalRetailPrice < finalSupplyPrice) {
          resultList.push({
            productId: item.productId,
            success: false,
            error: `零售价(${finalRetailPrice})低于供货价(${finalSupplyPrice})`,
          });
          continue;
        }

        await tx.product.update({
          where: { id: item.productId },
          data: {
            costPrice: item.costPrice,
            supplyPrice: item.supplyPrice,
            suggestedPrice: item.suggestedPrice,
            minRetailPrice: item.minRetailPrice,
            masterRetailPrice: item.masterRetailPrice,
          },
        });
        resultList.push({ productId: item.productId, success: true });
      } catch (error: any) {
        resultList.push({ productId: item.productId, success: false, error: error.message || '更新失败' });
      }
    }

    return resultList;
  });

  res.json({ results });
});

/**
 * 获取订单列表（总代理视角）
 */
export const getOrders = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const status = req.query.status as string;
  const orderSource = req.query.orderSource ? parseInt(req.query.orderSource as string) : undefined;
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (status) where.status = status;
  if (orderSource !== undefined) where.orderSource = orderSource;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: true,
        agent: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  res.json({
    list: orders.map(order => ({
      ...order,
      totalAmount: Number(order.totalAmount),
      masterProfit: Number(order.masterProfit),
      level1Profit: Number(order.level1Profit),
      level2Profit: Number(order.level2Profit),
    })),
    total,
    page,
    pageSize,
  });
});

/**
 * 确认收款
 */
export const confirmPayment = asyncHandler(async (req: Request, res: Response) => {
  const orderId = parseInt(req.params.id);
  const { paymentMethod } = req.body;
  const operatorId = (req as any).user?.id || 0;

  if (!orderId) {
    return res.status(400).json({ error: '订单ID不能为空' });
  }

  await settlementService.confirmPayment(orderId, paymentMethod || '线下支付', operatorId);

  res.json({ success: true });
});

/**
 * 手动结算订单利润
 */
export const settleOrderProfit = asyncHandler(async (req: Request, res: Response) => {
  const orderId = parseInt(req.params.id);

  if (!orderId) {
    return res.status(400).json({ error: '订单ID不能为空' });
  }

  const result = await settlementService.manualSettleOrder(orderId);

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json(result);
});

/**
 * 获取团队列表
 */
export const getTeam = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const type = req.query.type as string;
  const skip = (page - 1) * pageSize;

  const where: any = {
    isMaster: false,
    status: 'ACTIVE',
  };
  if (type) where.type = type;

  const [agents, total] = await Promise.all([
    prisma.agent.findMany({
      where,
      include: {
        parent: {
          select: { id: true, name: true, phone: true },
        },
        _count: {
          select: { children: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.agent.count({ where }),
  ]);

  res.json({
    list: agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      phone: agent.phone,
      type: agent.type,
      totalSales: Number(agent.totalSales),
      totalOrderCount: agent.totalOrderCount,
      teamSales: Number(agent.teamSales),
      validInviteCount: agent.validInviteCount,
      isActivated: agent.isActivated,
      balance: Number(agent.balance),
      parent: agent.parent,
      childrenCount: agent._count.children,
      createdAt: agent.createdAt,
    })),
    total,
    page,
    pageSize,
  });
});

/**
 * 获取奖励配置
 * 【2026-01-20】修改返回格式，支持前端直接使用
 */
export const getRewardConfig = asyncHandler(async (req: Request, res: Response) => {
  const configs = await rewardService.getAllRewardConfigs();
  const tiers = await rewardService.getTeamRewardTiers();

  // 将团队奖励转换为前端期望的格式
  const result: Record<string, any> = { ...configs };
  if (tiers && tiers.length > 0) {
    tiers.forEach((tier: any, idx: number) => {
      const salesThreshold = tier.salesThreshold || tier.sales || 0;
      const rewardAmount = tier.rewardAmount || tier.reward || 0;
      result[`team_reward_tier_${idx + 1}`] = `${salesThreshold}:${rewardAmount}`;
    });
  }

  res.json({
    code: 0,
    data: result,
  });
});

/**
 * 更新奖励配置
 * 【2026-01-20】修改支持前端直接传递配置对象格式
 */
export const updateRewardConfig = asyncHandler(async (req: Request, res: Response) => {
  const operatorId = (req as any).user?.id || 0;

  let configsToUpdate: Record<string, any>;
  let teamTiers: any[] | undefined;

  // 检测请求格式
  if (req.body.configs) {
    // 旧格式：{ configs: {...}, teamRewardTiers: [...] }
    configsToUpdate = req.body.configs;
    teamTiers = req.body.teamRewardTiers;
  } else {
    // 新格式：直接传配置对象
    const { team_reward_tier_1, team_reward_tier_2, team_reward_tier_3, ...configs } = req.body;
    configsToUpdate = configs;

    // 解析团队奖励（格式：销售额:奖励）
    if (team_reward_tier_1 || team_reward_tier_2 || team_reward_tier_3) {
      teamTiers = [];
      const tierData = [team_reward_tier_1, team_reward_tier_2, team_reward_tier_3];
      tierData.forEach((tier, idx) => {
        if (tier) {
          const [sales, reward] = String(tier).split(':').map(Number);
          if (!isNaN(sales) && !isNaN(reward)) {
            teamTiers!.push({ tierLevel: idx + 1, salesThreshold: sales, rewardAmount: reward });
          }
        }
      });
    }
  }

  // 更新配置
  if (configsToUpdate) {
    for (const [key, value] of Object.entries(configsToUpdate)) {
      await rewardService.setRewardConfig(key, String(value), undefined, operatorId);
    }
  }

  // 更新团队奖励阶梯
  if (teamTiers && teamTiers.length > 0) {
    await rewardService.setTeamRewardTiers(teamTiers);
  }

  res.json({ code: 0, message: '保存成功', data: { success: true } });
});

/**
 * 获取商品价格列表（含推销员定价统计）
 */
export const getProductPrices = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
  const skip = (page - 1) * pageSize;

  const where: any = { status: 'ACTIVE' };
  if (categoryId) where.categoryId = categoryId;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        images: true,
        costPrice: true,
        supplyPrice: true,
        suggestedPrice: true,
        minRetailPrice: true,
        masterRetailPrice: true,
        retailPrice: true,
        agentPrice: true,
        _count: {
          select: { agentPrices: true },
        },
      },
      orderBy: { id: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  res.json({
    list: products.map(p => ({
      id: p.id,
      name: p.name,
      image: p.images ? JSON.parse(p.images)[0] : null,
      costPrice: Number(p.costPrice || p.agentPrice),
      supplyPrice: Number(p.supplyPrice || p.agentPrice),
      suggestedPrice: Number(p.suggestedPrice || p.retailPrice),
      minRetailPrice: Number(p.minRetailPrice || p.agentPrice),
      masterRetailPrice: Number(p.masterRetailPrice || p.retailPrice),
      agentPriceCount: p._count.agentPrices,
    })),
    total,
    page,
    pageSize,
  });
});

export default {
  getDashboard,
  setProductPrice,
  batchSetProductPrice,
  getOrders,
  confirmPayment,
  settleOrderProfit,
  getTeam,
  getRewardConfig,
  updateRewardConfig,
  getProductPrices,
};

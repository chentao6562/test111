/**
 * 砍价门槛检查服务
 * @module services/bargain/bargainThresholdService
 * @since 2026-01-23
 *
 * 功能：检查用户采购单是否满足砍价参与门槛
 */

import prisma from '../../utils/prisma';

export interface ThresholdCheckResult {
  eligible: boolean;           // 是否满足门槛
  currentCartAmount: number;   // 当前采购单金额（不含砍价商品）
  requiredAmount: number;      // 需要的金额
  difference: number;          // 差额（不足时为正数）
  message?: string;            // 提示信息
}

/**
 * 检查用户采购单是否满足砍价门槛
 *
 * @param agentId 推销员ID（用于获取采购单）
 * @param configId 砍价活动配置ID
 * @returns 门槛检查结果
 */
export async function checkCartThreshold(
  agentId: number,
  configId: number
): Promise<ThresholdCheckResult> {
  // 1. 获取活动配置
  const config = await prisma.bargainConfig.findUnique({
    where: { id: configId },
    select: { minCartAmount: true, isActive: true },
  });

  if (!config) {
    return {
      eligible: false,
      currentCartAmount: 0,
      requiredAmount: 0,
      difference: 0,
      message: '砍价活动不存在',
    };
  }

  const requiredAmount = Number(config.minCartAmount) || 0;

  // 2. 如果门槛为0，直接返回可参与
  if (requiredAmount <= 0) {
    return {
      eligible: true,
      currentCartAmount: 0,
      requiredAmount: 0,
      difference: 0,
    };
  }

  // 3. 获取代理商信息，确定价格计算方式
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { type: true, parentId: true },
  });

  if (!agent) {
    return {
      eligible: false,
      currentCartAmount: 0,
      requiredAmount,
      difference: requiredAmount,
      message: '用户不存在',
    };
  }

  // 4. 获取采购单中的非砍价商品
  const cartItems = await prisma.cartItem.findMany({
    where: {
      agentId,
      isBargainItem: false,  // 排除砍价商品
      selected: true,        // 只计算选中的商品
    },
    include: {
      product: {
        select: {
          id: true,
          retailPrice: true,
          supplyPrice: true,
          agentPrice: true,
        },
      },
    },
  });

  // 5. 根据推销员类型计算价格
  // 一级推销员：使用供货价
  // 二级推销员：使用上级设置的subPrice，未设置则用供货价
  // 普通用户(WHOLESALE)：使用零售价

  let parentSubPriceMap: Map<number, number | null> = new Map();
  const productIds = cartItems.map(item => item.productId);

  // 只有二级推销员需要查询上级的subPrice
  if (agent.type === 'LEVEL2' && agent.parentId && productIds.length > 0) {
    const parentPrices = await prisma.agentPrice.findMany({
      where: {
        agentId: agent.parentId,
        productId: { in: productIds },
      },
      select: { productId: true, subPrice: true },
    });
    for (const pp of parentPrices) {
      parentSubPriceMap.set(pp.productId, pp.subPrice ? Number(pp.subPrice) : null);
    }
  }

  // 6. 计算采购单总金额
  let currentCartAmount = 0;

  for (const item of cartItems) {
    let price: number;

    if (agent.type === 'LEVEL1') {
      // 一级推销员：使用供货价
      price = Number(item.product.supplyPrice || item.product.agentPrice || item.product.retailPrice);
    } else if (agent.type === 'LEVEL2') {
      // 二级推销员：使用上级设置的subPrice
      const parentSubPrice = parentSubPriceMap.get(item.productId);
      price = parentSubPrice ?? Number(item.product.supplyPrice || item.product.agentPrice || item.product.retailPrice);
    } else {
      // WHOLESALE用户：使用零售价
      price = Number(item.product.retailPrice);
    }

    currentCartAmount += price * item.quantity;
  }

  // 7. 判断是否满足门槛
  const difference = Math.max(0, requiredAmount - currentCartAmount);
  const eligible = currentCartAmount >= requiredAmount;

  return {
    eligible,
    currentCartAmount: Math.round(currentCartAmount * 100) / 100,  // 保留两位小数
    requiredAmount,
    difference: Math.round(difference * 100) / 100,
    message: eligible
      ? undefined
      : `采购单金额需满${requiredAmount}元，当前${currentCartAmount.toFixed(2)}元，还差${difference.toFixed(2)}元`,
  };
}

/**
 * 获取砍价活动的门槛配置
 *
 * @param configId 砍价活动配置ID
 * @returns 门槛金额
 */
export async function getThresholdAmount(configId: number): Promise<number> {
  const config = await prisma.bargainConfig.findUnique({
    where: { id: configId },
    select: { minCartAmount: true },
  });

  return Number(config?.minCartAmount) || 0;
}

export default {
  checkCartThreshold,
  getThresholdAmount,
};

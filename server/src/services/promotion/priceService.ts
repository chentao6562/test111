/**
 * 价格计算服务
 * 【2026-01-16 推广体系升级】
 *
 * 价格层级:
 * - 成本价(costPrice): 总代理从蒙庆的拿货价，仅总代理可见
 * - 供货价(supplyPrice): 给一级推销员的拿货价
 * - 一级给二级价(subPrice): 一级设置的给二级的价格
 * - 零售价: 推销员设置的卖给客户的价格
 *
 * 价格获取规则:
 * - 无agent参数 → 返回总代理零售价(masterRetailPrice)
 * - 有agent参数 → 返回该推销员设置的零售价，未设置则用建议零售价
 */

import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';

// 价格信息返回类型
export interface PriceInfo {
  price: number;
  priceType: 'master' | 'level1' | 'level2';
  agentId: number | null;
  agentName: string | null;
  originalPrice?: number; // 原价（用于划线价展示）
}

// 推销员拿货价信息
export interface AgentCostInfo {
  costPrice: number;
  level: 'master' | 'level1' | 'level2';
}

// 定价验证结果
export interface PriceValidation {
  valid: boolean;
  error?: string;
}

/**
 * 获取总代理
 */
export async function getMasterAgent() {
  const master = await prisma.agent.findFirst({
    where: { isMaster: true, status: 'ACTIVE' },
    select: { id: true, name: true, phone: true, balance: true },
  });
  return master;
}

/**
 * 获取客户看到的商品价格
 * @param productId 商品ID
 * @param agentId 推销员ID（可选，从URL参数获取）
 */
export async function getCustomerPrice(
  productId: number,
  agentId?: number | null
): Promise<PriceInfo> {
  // 获取商品信息
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      masterRetailPrice: true,
      suggestedPrice: true,
      retailPrice: true,
      minRetailPrice: true,
    },
  });

  if (!product) {
    throw new Error('商品不存在');
  }

  // 获取总代理
  const masterAgent = await getMasterAgent();
  if (!masterAgent) {
    throw new Error('系统配置错误：总代理不存在');
  }

  // 无agent参数 = 默认页面 = 总代理价格
  if (!agentId) {
    // 【2026-01-22 BUG修复】优先使用 masterRetailPrice，否则使用 retailPrice
    // 确保返回有效数字，避免NaN
    const rawPrice = product.masterRetailPrice ?? product.retailPrice ?? 0;
    const price = Number(rawPrice) || 0;
    if (price <= 0) {
      console.warn(`[价格警告] 商品${productId}未设置有效零售价，请检查数据`);
    }
    return {
      price,
      priceType: 'master',
      agentId: masterAgent.id,
      agentName: '蒙庆烟花官方',
      originalPrice: Number(product.suggestedPrice || product.retailPrice) || 0,
    };
  }

  // 有agent参数 = 推销员价格
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      name: true,
      type: true,
      isMaster: true,
      status: true,
    },
  });

  if (!agent || agent.status !== 'ACTIVE') {
    // 【2026-01-22 BUG修复】agent不存在或已禁用，降级为总代理价格
    // 确保返回有效数字，避免NaN
    const rawPrice = product.masterRetailPrice ?? product.retailPrice ?? 0;
    const price = Number(rawPrice) || 0;
    return {
      price,
      priceType: 'master',
      agentId: masterAgent.id,
      agentName: '蒙庆烟花官方',
    };
  }

  // 【2026-01-22 BUG修复】如果是总代理本人，确保返回有效数字
  if (agent.isMaster) {
    const rawPrice = product.masterRetailPrice ?? product.retailPrice ?? 0;
    const price = Number(rawPrice) || 0;
    return {
      price,
      priceType: 'master',
      agentId: agent.id,
      agentName: agent.name,
    };
  }

  // 查询推销员定价
  const agentPrice = await prisma.agentPrice.findUnique({
    where: {
      agentId_productId: {
        agentId: agentId,
        productId: productId,
      },
    },
    select: { retailPrice: true },
  });

  // 确定价格类型
  const priceType = agent.type === 'LEVEL1' ? 'level1' : 'level2';

  // 返回推销员设置的零售价，未设置则用总代理零售价（masterRetailPrice）
  // 【2026-01-19修复】确保未设置价格时使用总代理零售价而非建议零售价
  // 【2026-01-22 BUG修复】确保返回有效数字，避免NaN
  const rawMasterPrice = product.masterRetailPrice ?? product.retailPrice ?? 0;
  const masterRetailPrice = Number(rawMasterPrice) || 0;
  const price = agentPrice?.retailPrice
    ? Number(agentPrice.retailPrice)
    : masterRetailPrice;

  return {
    price,
    priceType,
    agentId: agent.id,
    agentName: agent.name,
    originalPrice: masterRetailPrice,
  };
}

/**
 * 获取推销员的拿货价
 * @param agentId 推销员ID
 * @param productId 商品ID
 */
export async function getAgentCostPrice(
  agentId: number,
  productId: number
): Promise<AgentCostInfo> {
  // 获取推销员信息
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      type: true,
      isMaster: true,
      parentId: true,
    },
  });

  if (!agent) {
    throw new Error('推销员不存在');
  }

  // 获取商品信息
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      costPrice: true,
      supplyPrice: true,
      agentPrice: true, // 兼容旧字段
    },
  });

  if (!product) {
    throw new Error('商品不存在');
  }

  // 总代理：成本价
  if (agent.isMaster) {
    return {
      costPrice: Number(product.costPrice || product.agentPrice),
      level: 'master',
    };
  }

  // 一级推销员：供货价
  if (agent.type === 'LEVEL1') {
    return {
      costPrice: Number(product.supplyPrice || product.agentPrice),
      level: 'level1',
    };
  }

  // 二级推销员：上级设置的subPrice
  if (agent.type === 'LEVEL2' && agent.parentId) {
    // 查询上级的定价
    const parentPrice = await prisma.agentPrice.findUnique({
      where: {
        agentId_productId: {
          agentId: agent.parentId,
          productId: productId,
        },
      },
      select: { subPrice: true },
    });

    // 如果上级设置了给二级的价格，使用它；否则使用供货价
    // 【2026-01-22 BUG修复】价格降级时记录日志，便于排查问题
    if (!parentPrice?.subPrice) {
      console.log(
        `[价格降级警告] 二级推销员${agentId}的上级${agent.parentId}未设置商品${productId}的subPrice，降级使用供货价`
      );
    }
    const costPrice = parentPrice?.subPrice
      ? Number(parentPrice.subPrice)
      : Number(product.supplyPrice || product.agentPrice);

    return {
      costPrice,
      level: 'level2',
    };
  }

  // 默认返回供货价
  return {
    costPrice: Number(product.supplyPrice || product.agentPrice),
    level: 'level2',
  };
}

/**
 * 验证推销员定价是否合规
 * @param agentId 推销员ID
 * @param productId 商品ID
 * @param retailPrice 零售价
 * @param subPrice 给下级的价格（一级专用）
 */
export async function validatePrice(
  agentId: number,
  productId: number,
  retailPrice: number,
  subPrice?: number
): Promise<PriceValidation> {
  // 获取推销员信息
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { type: true, isMaster: true },
  });

  if (!agent) {
    return { valid: false, error: '推销员不存在' };
  }

  // 获取商品信息
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      minRetailPrice: true,
      supplyPrice: true,
      agentPrice: true,
    },
  });

  if (!product) {
    return { valid: false, error: '商品不存在' };
  }

  const minRetailPrice = Number(product.minRetailPrice || 0);
  const supplyPrice = Number(product.supplyPrice || product.agentPrice);

  // 获取推销员的拿货价
  const costInfo = await getAgentCostPrice(agentId, productId);

  // 验证零售价不能低于最低零售价
  if (minRetailPrice > 0 && retailPrice < minRetailPrice) {
    return {
      valid: false,
      error: `零售价不能低于最低零售价 ¥${minRetailPrice.toFixed(2)}`,
    };
  }

  // 验证零售价不能低于拿货价
  if (retailPrice < costInfo.costPrice) {
    return {
      valid: false,
      error: `零售价不能低于您的拿货价 ¥${costInfo.costPrice.toFixed(2)}`,
    };
  }

  // 一级推销员：验证给二级的价格
  if (agent.type === 'LEVEL1' && subPrice !== undefined) {
    // 【2026-01-22 BUG修复】给二级的价格不能低于供货价
    if (subPrice < supplyPrice) {
      return {
        valid: false,
        error: `给二级的价格不能低于供货价 ¥${supplyPrice.toFixed(2)}`,
      };
    }
    // 【2026-01-22 BUG修复】给二级的价格不能高于零售价
    if (subPrice > retailPrice) {
      return {
        valid: false,
        error: `给二级的价格不能高于您的零售价 ¥${retailPrice.toFixed(2)}`,
      };
    }
  }

  return { valid: true };
}

/**
 * 保存推销员定价
 * @param agentId 推销员ID
 * @param productId 商品ID
 * @param retailPrice 零售价
 * @param subPrice 给下级的价格（一级专用）
 * 【2026-01-20修复】一级推销员必须设置subPrice，否则二级无法销售
 */
export async function saveAgentPrice(
  agentId: number,
  productId: number,
  retailPrice: number,
  subPrice?: number
): Promise<void> {
  // 验证定价
  const validation = await validatePrice(agentId, productId, retailPrice, subPrice);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // 获取推销员信息
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { type: true, isMaster: true },
  });

  // 【2026-01-20新增】一级推销员必须设置subPrice
  if ((agent?.type === 'LEVEL1' || agent?.isMaster) && (subPrice === undefined || subPrice === null)) {
    throw new Error('一级推销员必须设置"给下级的价格"，否则您的下级无法销售此商品');
  }

  // 准备数据
  const data: Prisma.AgentPriceUncheckedCreateInput = {
    agentId,
    productId,
    retailPrice: new Prisma.Decimal(retailPrice),
    // 只有一级推销员可以设置给二级的价格
    subPrice: (agent?.type === 'LEVEL1' || agent?.isMaster) && subPrice !== undefined
      ? new Prisma.Decimal(subPrice)
      : null,
  };

  // 使用 upsert 更新或创建
  await prisma.agentPrice.upsert({
    where: {
      agentId_productId: {
        agentId,
        productId,
      },
    },
    update: {
      retailPrice: data.retailPrice,
      subPrice: data.subPrice,
    },
    create: data,
  });
}

/**
 * 获取推销员的定价列表
 * @param agentId 推销员ID
 * 【2026-01-19修复】按用户类型返回不同字段，二级不返回subPrice
 */
export async function getAgentPrices(agentId: number) {
  // 获取推销员信息和拿货价信息
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      type: true,
      isMaster: true,
      parentId: true,
    },
  });

  if (!agent) {
    throw new Error('推销员不存在');
  }

  // 【2026-01-19新增】判断是否是一级推销员
  const isLevel1 = agent.type === 'LEVEL1' || agent.isMaster;

  // 获取所有上架商品
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      images: true,
      costPrice: true,
      supplyPrice: true,
      agentPrice: true,
      suggestedPrice: true,
      minRetailPrice: true,
      retailPrice: true,
    },
    orderBy: { sort: 'asc' },
  });

  // 获取推销员的定价
  const agentPrices = await prisma.agentPrice.findMany({
    where: { agentId },
    select: {
      productId: true,
      retailPrice: true,
      subPrice: true,
    },
  });

  // 如果是二级推销员，获取上级的定价
  let parentPrices: Map<number, number> = new Map();
  if (agent.type === 'LEVEL2' && agent.parentId) {
    const parentAgentPrices = await prisma.agentPrice.findMany({
      where: { agentId: agent.parentId },
      select: { productId: true, subPrice: true },
    });
    parentAgentPrices.forEach((p) => {
      if (p.subPrice) {
        parentPrices.set(p.productId, Number(p.subPrice));
      }
    });
  }

  // 构建定价Map
  const priceMap = new Map(agentPrices.map((p) => [p.productId, p]));

  // 组装结果
  return products.map((product) => {
    const price = priceMap.get(product.id);

    // 计算拿货价
    let myCostPrice: number;
    if (agent.isMaster) {
      myCostPrice = Number(product.costPrice || product.agentPrice);
    } else if (agent.type === 'LEVEL1') {
      myCostPrice = Number(product.supplyPrice || product.agentPrice);
    } else {
      // 二级推销员：使用上级设置的价格或供货价
      myCostPrice = parentPrices.get(product.id) || Number(product.supplyPrice || product.agentPrice);
    }

    // 安全解析商品图片
    let productImage = '';
    try {
      const images = product.images ? JSON.parse(product.images) : [];
      productImage = Array.isArray(images) ? images[0] || '' : product.images;
    } catch {
      // 旧数据可能不是JSON格式，直接使用原值
      productImage = product.images || '';
    }

    return {
      productId: product.id,
      productName: product.name,
      productImage,
      myCostPrice, // 我的拿货价
      retailPrice: price?.retailPrice ? Number(price.retailPrice) : null, // 我的零售价
      // 【2026-01-19修复】只有一级推销员才返回subPrice字段
      subPrice: isLevel1 ? (price?.subPrice ? Number(price.subPrice) : null) : undefined,
      suggestedPrice: Number(product.suggestedPrice || product.retailPrice), // 建议零售价
      minRetailPrice: Number(product.minRetailPrice || 0), // 最低零售价
    };
  });
}

/**
 * 批量设置定价
 * @param agentId 推销员ID
 * @param mode 模式: 'fixed'=固定加价, 'percent'=百分比加价, 'suggested'=使用建议零售价
 * @param value 值（fixed时为加价金额，percent时为加价百分比）
 * 【2026-01-20修复】一级推销员批量设置时自动设置subPrice
 */
export async function batchSetPrices(
  agentId: number,
  mode: 'fixed' | 'percent' | 'suggested',
  value?: number
): Promise<{ success: number; failed: number }> {
  // 获取推销员信息
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { type: true, isMaster: true, parentId: true },
  });

  if (!agent) {
    throw new Error('推销员不存在');
  }

  // 【2026-01-20新增】判断是否是一级推销员
  const isLevel1 = agent.type === 'LEVEL1' || agent.isMaster;

  // 获取所有上架商品
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      costPrice: true,
      supplyPrice: true,
      agentPrice: true,
      suggestedPrice: true,
      minRetailPrice: true,
      retailPrice: true,
    },
  });

  // 如果是二级推销员，获取上级的定价
  let parentPrices: Map<number, number> = new Map();
  if (agent.type === 'LEVEL2' && agent.parentId) {
    const parentAgentPrices = await prisma.agentPrice.findMany({
      where: { agentId: agent.parentId },
      select: { productId: true, subPrice: true },
    });
    parentAgentPrices.forEach((p) => {
      if (p.subPrice) {
        parentPrices.set(p.productId, Number(p.subPrice));
      }
    });
  }

  // 【2026-01-22 BUG修复】使用事务保护批量操作，确保原子性
  const result = await prisma.$transaction(async (tx) => {
    let success = 0;
    let failed = 0;

    for (const product of products) {
      try {
        // 计算拿货价
        let myCostPrice: number;
        if (agent.isMaster) {
          myCostPrice = Number(product.costPrice || product.agentPrice);
        } else if (agent.type === 'LEVEL1') {
          myCostPrice = Number(product.supplyPrice || product.agentPrice);
        } else {
          myCostPrice = parentPrices.get(product.id) || Number(product.supplyPrice || product.agentPrice);
        }

        let retailPrice: number;

        switch (mode) {
          case 'fixed':
            // 固定加价
            retailPrice = myCostPrice + (value || 0);
            break;
          case 'percent':
            // 百分比加价
            retailPrice = myCostPrice * (1 + (value || 0) / 100);
            break;
          case 'suggested':
          default:
            // 使用建议零售价
            retailPrice = Number(product.suggestedPrice || product.retailPrice);
            break;
        }

        // 保留两位小数
        retailPrice = Math.round(retailPrice * 100) / 100;

        // 检查是否满足最低零售价要求
        const minRetailPrice = Number(product.minRetailPrice || 0);
        if (minRetailPrice > 0 && retailPrice < minRetailPrice) {
          retailPrice = minRetailPrice;
        }

        // 检查是否低于拿货价
        if (retailPrice < myCostPrice) {
          retailPrice = myCostPrice;
        }

        // 【2026-01-20新增】一级推销员自动计算subPrice（拿货价和零售价的中间值）
        let subPrice: Prisma.Decimal | null = null;
        if (isLevel1) {
          const calculatedSubPrice = Math.round((myCostPrice + retailPrice) / 2 * 100) / 100;
          subPrice = new Prisma.Decimal(calculatedSubPrice);
        }

        // 保存定价（在事务中）
        await tx.agentPrice.upsert({
          where: {
            agentId_productId: {
              agentId,
              productId: product.id,
            },
          },
          update: {
            retailPrice: new Prisma.Decimal(retailPrice),
            ...(isLevel1 ? { subPrice } : {}),
          },
          create: {
            agentId,
            productId: product.id,
            retailPrice: new Prisma.Decimal(retailPrice),
            subPrice,
          },
        });

        success++;
      } catch (err) {
        failed++;
        console.error(`[batchSetPrices] 商品${product.id}定价失败:`, err);
      }
    }

    return { success, failed };
  });

  return result;
}

export default {
  getMasterAgent,
  getCustomerPrice,
  getAgentCostPrice,
  validatePrice,
  saveAgentPrice,
  getAgentPrices,
  batchSetPrices,
};

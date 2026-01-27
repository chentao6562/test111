/**
 * 秒杀服务
 * 【2026-01-20 秒杀系统】
 *
 * 核心规则：
 * 1. 秒杀是引流款，正价商品达到门槛才能加购
 * 2. 秒杀商品统一价格，不计入推销员分润
 * 3. 秒杀库存独立，不占用主商品库存
 */

import prisma from '../../utils/prisma';
import {
  FlashSaleItemInput,
  FlashSaleValidationResult,
  CurrentFlashSaleResponse,
  CreateActivityInput,
  UpdateActivityInput,
  AddFlashSaleItemInput,
  UpdateFlashSaleItemInput,
} from './types';

/**
 * 解析商品图片
 */
function parseProductImage(images: any): string | null {
  if (!images) return null;
  if (typeof images === 'string') {
    if (images.startsWith('[')) {
      try {
        const parsed = JSON.parse(images);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
      } catch {
        // 解析失败
      }
    }
    if (images.includes(',')) {
      return images.split(',')[0].trim();
    }
    return images;
  }
  if (Array.isArray(images) && images.length > 0) {
    return images[0];
  }
  return null;
}

// ============ H5端接口 ============

/**
 * 获取当前有效的秒杀活动
 */
export async function getCurrentActivity(): Promise<CurrentFlashSaleResponse> {
  const now = new Date();

  const activity = await prisma.flashSaleActivity.findFirst({
    where: {
      status: 'ACTIVE',
      startTime: { lte: now },
      endTime: { gte: now },
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              images: true,
              retailPrice: true,
              suggestedPrice: true,
            },
          },
        },
        orderBy: { sort: 'asc' },
      },
    },
  });

  if (!activity) {
    return {
      hasActivity: false,
      items: [],
    };
  }

  return {
    hasActivity: true,
    activity: {
      id: activity.id,
      name: activity.name,
      minOrderAmount: Number(activity.minOrderAmount),
      startTime: activity.startTime,
      endTime: activity.endTime,
      bannerImage: activity.bannerImage || undefined,
      description: activity.description || undefined,
    },
    items: activity.items.map(item => ({
      id: item.id,
      flashSaleItemId: item.id,
      productId: item.productId,
      productName: item.product.name,
      productImage: parseProductImage(item.product.images),
      flashPrice: Number(item.flashPrice),
      originalPrice: Number(item.product.retailPrice || item.product.suggestedPrice || 0),
      flashStock: item.flashStock,
      soldCount: item.soldCount,
      limitPerUser: item.limitPerUser,
      remainingStock: item.flashStock - item.soldCount,
    })),
  };
}

/**
 * 验证秒杀商品（创建预约时调用）
 *
 * @param flashSaleItems 前端提交的秒杀商品列表
 * @param normalOrderAmount 正价商品总金额（用于验证门槛）
 */
export async function validateFlashSaleItems(
  flashSaleItems: FlashSaleItemInput[],
  normalOrderAmount: number
): Promise<FlashSaleValidationResult> {
  // 获取当前有效活动
  const now = new Date();
  const activity = await prisma.flashSaleActivity.findFirst({
    where: {
      status: 'ACTIVE',
      startTime: { lte: now },
      endTime: { gte: now },
    },
  });

  if (!activity) {
    return {
      success: false,
      message: '秒杀活动已结束',
      validatedItems: [],
    };
  }

  // 检查门槛
  const minOrderAmount = Number(activity.minOrderAmount);
  if (normalOrderAmount < minOrderAmount) {
    return {
      success: false,
      message: `正价商品金额需满¥${minOrderAmount}才能加购秒杀商品，当前¥${normalOrderAmount}`,
      validatedItems: [],
    };
  }

  // 获取秒杀商品详情
  const flashItemIds = flashSaleItems.map(f => f.flashSaleItemId);
  const dbFlashItems = await prisma.flashSaleItem.findMany({
    where: {
      id: { in: flashItemIds },
      activityId: activity.id,
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          images: true,
        },
      },
    },
  });

  const validatedItems: FlashSaleValidationResult['validatedItems'] = [];

  for (const inputItem of flashSaleItems) {
    const dbItem = dbFlashItems.find(d => d.id === inputItem.flashSaleItemId);
    if (!dbItem) {
      return {
        success: false,
        message: `秒杀商品不存在或已下架`,
        validatedItems: [],
      };
    }

    // 检查库存
    const remainingStock = dbItem.flashStock - dbItem.soldCount;
    if (remainingStock < inputItem.quantity) {
      return {
        success: false,
        message: `秒杀商品"${dbItem.product.name}"库存不足，剩余${remainingStock}件`,
        validatedItems: [],
      };
    }

    // 检查限购
    if (dbItem.limitPerUser > 0 && inputItem.quantity > dbItem.limitPerUser) {
      return {
        success: false,
        message: `秒杀商品"${dbItem.product.name}"每人限购${dbItem.limitPerUser}件`,
        validatedItems: [],
      };
    }

    validatedItems.push({
      flashSaleItemId: dbItem.id,
      productId: dbItem.productId,
      productName: dbItem.product.name,
      productImage: parseProductImage(dbItem.product.images),
      quantity: inputItem.quantity,
      price: Number(dbItem.flashPrice),
    });
  }

  return {
    success: true,
    message: '验证通过',
    activityId: activity.id,
    validatedItems,
  };
}

/**
 * 更新秒杀商品已售数量（事务中调用）
 */
export async function updateSoldCount(
  tx: any,
  flashSaleItemId: number,
  quantity: number
): Promise<void> {
  // 使用原子操作更新已售数量
  const result = await tx.$executeRaw`
    UPDATE flash_sale_items
    SET sold_count = sold_count + ${quantity}
    WHERE id = ${flashSaleItemId}
    AND (flash_stock - sold_count) >= ${quantity}
  `;

  if (result === 0) {
    throw new Error('秒杀商品库存不足');
  }
}

// ============ 管理后台接口 ============

/**
 * 获取活动列表
 */
export async function getActivityList(params: {
  page?: number;
  pageSize?: number;
  status?: string;
}) {
  const { page = 1, pageSize = 20, status } = params;

  const where: any = {};
  if (status) {
    where.status = status;
  }

  const [total, list] = await Promise.all([
    prisma.flashSaleActivity.count({ where }),
    prisma.flashSaleActivity.findMany({
      where,
      include: {
        items: {
          select: { id: true },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    total,
    list: list.map(a => ({
      id: a.id,
      name: a.name,
      startTime: a.startTime,
      endTime: a.endTime,
      status: a.status,
      minOrderAmount: Number(a.minOrderAmount),
      bannerImage: a.bannerImage,
      itemCount: a.items.length,
      createdAt: a.createdAt,
    })),
    page,
    pageSize,
  };
}

/**
 * 获取活动详情（含商品列表）
 */
export async function getActivityDetail(id: number) {
  const activity = await prisma.flashSaleActivity.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              images: true,
              retailPrice: true,
              suggestedPrice: true,
              stock: true,
            },
          },
        },
        orderBy: { sort: 'asc' },
      },
    },
  });

  if (!activity) {
    return null;
  }

  return {
    id: activity.id,
    name: activity.name,
    startTime: activity.startTime,
    endTime: activity.endTime,
    status: activity.status,
    minOrderAmount: Number(activity.minOrderAmount),
    bannerImage: activity.bannerImage,
    description: activity.description,
    createdBy: activity.createdBy,
    createdAt: activity.createdAt,
    items: activity.items.map(item => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      productImage: parseProductImage(item.product.images),
      flashPrice: Number(item.flashPrice),
      originalPrice: Number(item.product.retailPrice || item.product.suggestedPrice || 0),
      flashStock: item.flashStock,
      soldCount: item.soldCount,
      limitPerUser: item.limitPerUser,
      sort: item.sort,
      mainStock: item.product.stock,
    })),
  };
}

/**
 * 创建活动
 */
export async function createActivity(input: CreateActivityInput) {
  const activity = await prisma.flashSaleActivity.create({
    data: {
      name: input.name,
      startTime: new Date(input.startTime),
      endTime: new Date(input.endTime),
      minOrderAmount: input.minOrderAmount,
      bannerImage: input.bannerImage,
      description: input.description,
      createdBy: input.createdBy,
      status: 'DRAFT',
    },
  });

  return activity;
}

/**
 * 更新活动
 */
export async function updateActivity(id: number, input: UpdateActivityInput) {
  const data: any = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.startTime !== undefined) data.startTime = new Date(input.startTime);
  if (input.endTime !== undefined) data.endTime = new Date(input.endTime);
  if (input.minOrderAmount !== undefined) data.minOrderAmount = input.minOrderAmount;
  if (input.bannerImage !== undefined) data.bannerImage = input.bannerImage;
  if (input.description !== undefined) data.description = input.description;

  return prisma.flashSaleActivity.update({
    where: { id },
    data,
  });
}

/**
 * 删除活动（只能删除草稿状态）
 */
export async function deleteActivity(id: number) {
  const activity = await prisma.flashSaleActivity.findUnique({
    where: { id },
  });

  if (!activity) {
    throw new Error('活动不存在');
  }

  if (activity.status !== 'DRAFT') {
    throw new Error('只能删除草稿状态的活动');
  }

  await prisma.flashSaleActivity.delete({
    where: { id },
  });
}

/**
 * 更新活动状态
 */
export async function updateActivityStatus(id: number, status: string) {
  const activity = await prisma.flashSaleActivity.findUnique({
    where: { id },
  });

  if (!activity) {
    throw new Error('活动不存在');
  }

  // 状态转换规则
  if (status === 'ACTIVE') {
    // 启用活动时检查是否有商品
    const itemCount = await prisma.flashSaleItem.count({
      where: { activityId: id },
    });
    if (itemCount === 0) {
      throw new Error('请先添加秒杀商品');
    }
  }

  return prisma.flashSaleActivity.update({
    where: { id },
    data: { status },
  });
}

/**
 * 添加秒杀商品
 */
export async function addFlashSaleItem(activityId: number, input: AddFlashSaleItemInput) {
  // 检查商品是否已存在
  const existing = await prisma.flashSaleItem.findFirst({
    where: {
      activityId,
      productId: input.productId,
    },
  });

  if (existing) {
    throw new Error('该商品已添加到此活动');
  }

  // 检查商品是否存在
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { id: true, name: true, isSpecialPrice: true },
  });

  if (!product) {
    throw new Error('商品不存在');
  }

  // 【2026-01-26】特价商品不能参与秒杀活动
  if (product.isSpecialPrice) {
    throw new Error(`特价商品"${product.name}"不能参与秒杀活动`);
  }

  return prisma.flashSaleItem.create({
    data: {
      activityId,
      productId: input.productId,
      flashPrice: input.flashPrice,
      flashStock: input.flashStock,
      limitPerUser: input.limitPerUser || 0,
      sort: input.sort || 0,
    },
  });
}

/**
 * 更新秒杀商品
 */
export async function updateFlashSaleItem(itemId: number, input: UpdateFlashSaleItemInput) {
  const data: any = {};
  if (input.flashPrice !== undefined) data.flashPrice = input.flashPrice;
  if (input.flashStock !== undefined) data.flashStock = input.flashStock;
  if (input.limitPerUser !== undefined) data.limitPerUser = input.limitPerUser;
  if (input.sort !== undefined) data.sort = input.sort;

  return prisma.flashSaleItem.update({
    where: { id: itemId },
    data,
  });
}

/**
 * 删除秒杀商品
 */
export async function removeFlashSaleItem(itemId: number) {
  const item = await prisma.flashSaleItem.findUnique({
    where: { id: itemId },
    include: { activity: true },
  });

  if (!item) {
    throw new Error('商品不存在');
  }

  // 已售出的商品不能删除
  if (item.soldCount > 0) {
    throw new Error('已有销量的商品不能删除');
  }

  await prisma.flashSaleItem.delete({
    where: { id: itemId },
  });
}

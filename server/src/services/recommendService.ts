/**
 * 推荐商品服务
 */
import prisma from '../utils/prisma';

export interface RecommendProductInput {
  productId: number;
  type: string;
  title?: string;
  subtitle?: string;
  badge?: string;
  sort?: number;
  status?: string;
  createdBy?: number;
}

export interface RecommendListParams {
  page?: number;
  pageSize?: number;
  type?: string;
  status?: string;
}

// 将数据库字段 sort 映射为前端字段 sortOrder
function mapSortToSortOrder(item: any) {
  if (!item) return item;
  const { sort, ...rest } = item;
  return { ...rest, sortOrder: sort };
}

/**
 * 获取推荐商品列表（小程序端）
 * 【2026-01-26】支持推销员看到拿货价
 * 【2026-01-27】支持客户通过推销员链接访问时看到推销员定价
 * @param type 推荐类型
 * @param agentType 推销员类型（LEVEL1/LEVEL2）
 * @param agentId 推销员ID（登录用户）
 * @param salespersonId 推销员ID（客户访问的推销员链接）
 */
export async function getActiveRecommends(
  type?: string,
  agentType?: string,
  agentId?: number,
  salespersonId?: number // 【2026-01-27】新增：客户访问推销员链接时的推销员ID
) {
  const where: any = { status: 'ACTIVE' };
  if (type) {
    where.type = type;
  }

  const recommends = await prisma.h5RecommendProduct.findMany({
    where,
    include: {
      product: {
        select: {
          id: true,
          name: true,
          images: true,
          retailPrice: true,
          agentPrice: true,
          wholesalePrice: true,
          supplyPrice: true, // 【2026-01-26】添加供货价
          stock: true,
          lockStock: true,
          salesCount: true,
          status: true,
          unit: true,
        },
      },
    },
    orderBy: [{ sort: 'desc' }, { createdAt: 'desc' }],
  });

  // 【2026-01-27】如果客户通过推销员链接访问，获取推销员的定价
  let salespersonPriceMap = new Map<number, number>();
  if (salespersonId && !agentType) {
    // 客户访问场景：获取推销员的零售价定价
    const salesperson = await prisma.agent.findUnique({
      where: { id: salespersonId },
      select: { id: true, type: true, parentId: true },
    });

    if (salesperson && ['LEVEL1', 'LEVEL2'].includes(salesperson.type)) {
      const productIds = recommends
        .filter((r: any) => r.product.status === 'ACTIVE')
        .map((r: any) => r.product.id);

      // 获取推销员的零售价设置
      const agentPrices = await prisma.agentPrice.findMany({
        where: {
          agentId: salespersonId,
          productId: { in: productIds },
        },
        select: { productId: true, retailPrice: true },
      });

      // 如果是二级推销员，还需要获取一级给的subPrice作为默认价格
      let level1SubPriceMap = new Map<number, number>();
      if (salesperson.type === 'LEVEL2' && salesperson.parentId) {
        const l1Prices = await prisma.agentPrice.findMany({
          where: {
            agentId: salesperson.parentId,
            productId: { in: productIds },
          },
          select: { productId: true, subPrice: true },
        });
        for (const p of l1Prices) {
          if (p.subPrice) {
            level1SubPriceMap.set(p.productId, Number(p.subPrice));
          }
        }
      }

      // 构建价格映射
      for (const productId of productIds) {
        const agentPrice = agentPrices.find(p => p.productId === productId);
        if (agentPrice?.retailPrice) {
          salespersonPriceMap.set(productId, Number(agentPrice.retailPrice));
        } else if (salesperson.type === 'LEVEL2') {
          // 二级推销员未设置价格时，使用上级给的subPrice
          const l1SubPrice = level1SubPriceMap.get(productId);
          if (l1SubPrice) {
            salespersonPriceMap.set(productId, l1SubPrice);
          }
        }
      }
    }
  }

  // 【2026-01-26】处理二级推销员的上级subPrice
  let parentSubPriceMap = new Map<number, number | null>();
  if (agentType === 'LEVEL2' && agentId) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { parentId: true },
    });
    if (agent?.parentId) {
      const productIds = recommends
        .filter((r: any) => r.product.status === 'ACTIVE')
        .map((r: any) => r.product.id);

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
  }

  // 过滤掉商品已下架的推荐，并映射字段
  return recommends
    .filter((r: any) => r.product.status === 'ACTIVE')
    .map((r: any) => {
      const mapped = mapSortToSortOrder(r);

      // 【2026-01-26/27】根据访问场景计算显示价格
      let calcDisplayPrice: number;
      if (salespersonId && !agentType && salespersonPriceMap.has(r.product.id)) {
        // 【2026-01-27】客户通过推销员链接访问：显示推销员设置的零售价
        calcDisplayPrice = salespersonPriceMap.get(r.product.id)!;
      } else if (agentType === 'LEVEL1') {
        // 一级推销员：看到供货价（总代理给的拿货价）
        calcDisplayPrice = Number(r.product.supplyPrice || r.product.agentPrice || r.product.retailPrice);
      } else if (agentType === 'LEVEL2') {
        // 二级推销员：看到上级设置的subPrice（一级给的拿货价），未设置用供货价
        const parentSubPrice = parentSubPriceMap.get(r.product.id);
        calcDisplayPrice = parentSubPrice ?? Number(r.product.supplyPrice || r.product.agentPrice || r.product.retailPrice);
      } else {
        // 普通用户（无推销员链接）：看到零售价
        calcDisplayPrice = Number(r.product.retailPrice);
      }

      // 【2026-01-27修复】同时设置displayPrice和agentPrice，确保前端价格统一
      if (mapped.product) {
        mapped.product.displayPrice = calcDisplayPrice;
        mapped.product.agentPrice = calcDisplayPrice;
      }

      return mapped;
    });
}

/**
 * 获取推荐商品列表（管理后台）
 */
export async function getAllRecommends(params: RecommendListParams) {
  const { page = 1, pageSize = 20, type, status } = params;
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (type) where.type = type;
  if (status) where.status = status;

  const [list, total] = await Promise.all([
    prisma.h5RecommendProduct.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            images: true,
            retailPrice: true,
            agentPrice: true,
            stock: true,
            lockStock: true,
            salesCount: true,
            status: true,
          },
        },
      },
      orderBy: [{ sort: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: pageSize,
    }),
    prisma.h5RecommendProduct.count({ where }),
  ]);

  return {
    list: list.map(mapSortToSortOrder),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 获取单个推荐商品
 */
export async function getRecommendById(id: number) {
  const recommend = await prisma.h5RecommendProduct.findUnique({
    where: { id },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          images: true,
          retailPrice: true,
          agentPrice: true,
          stock: true,
          status: true,
        },
      },
    },
  });
  return mapSortToSortOrder(recommend);
}

/**
 * 创建推荐商品
 */
export async function createRecommend(data: RecommendProductInput) {
  // 检查商品是否存在
  const product = await prisma.product.findUnique({
    where: { id: data.productId },
  });
  if (!product) {
    throw new Error('商品不存在');
  }

  // 检查是否已存在同类型推荐
  const existing = await prisma.h5RecommendProduct.findFirst({
    where: {
      productId: data.productId,
      type: data.type,
    },
  });
  if (existing) {
    throw new Error('该商品已在此推荐类型中');
  }

  const recommend = await prisma.h5RecommendProduct.create({
    data: {
      productId: data.productId,
      type: data.type || 'HOT',
      title: data.title,
      subtitle: data.subtitle,
      badge: data.badge,
      sort: data.sort || 0,
      status: data.status || 'ACTIVE',
      createdBy: data.createdBy || 0,
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
  return mapSortToSortOrder(recommend);
}

/**
 * 更新推荐商品
 */
export async function updateRecommend(id: number, data: Partial<RecommendProductInput>) {
  const existing = await prisma.h5RecommendProduct.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('推荐商品不存在');
  }

  // 如果更改类型，检查是否会冲突
  if (data.type && data.type !== existing.type) {
    const conflict = await prisma.h5RecommendProduct.findFirst({
      where: {
        productId: existing.productId,
        type: data.type,
        id: { not: id },
      },
    });
    if (conflict) {
      throw new Error('该商品已在此推荐类型中');
    }
  }

  const recommend = await prisma.h5RecommendProduct.update({
    where: { id },
    data: {
      type: data.type,
      title: data.title,
      subtitle: data.subtitle,
      badge: data.badge,
      sort: data.sort,
      status: data.status,
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
  return mapSortToSortOrder(recommend);
}

/**
 * 删除推荐商品
 */
export async function deleteRecommend(id: number) {
  const existing = await prisma.h5RecommendProduct.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('推荐商品不存在');
  }

  return prisma.h5RecommendProduct.delete({ where: { id } });
}

/**
 * 批量更新排序
 */
export async function updateRecommendSort(items: { id: number; sort: number }[]) {
  const updates = items.map((item) =>
    prisma.h5RecommendProduct.update({
      where: { id: item.id },
      data: { sort: item.sort },
    })
  );

  return prisma.$transaction(updates);
}

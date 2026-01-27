import { Product, Prisma } from '@prisma/client';
import prisma from '../utils/prisma';

// 商品查询参数
interface ProductQueryParams {
  page?: number;
  pageSize?: number;
  categoryId?: number;
  status?: string;
  keyword?: string;
  sort?: 'default' | 'sales' | 'price_asc' | 'price_desc';
  agentType?: string; // 代理商类型，用于返回对应价格
  agentId?: number;   // 推销员ID，用于查询其设置的零售价
}

// 创建商品DTO
interface CreateProductDto {
  name: string;
  categoryId: number;
  images: string;
  description?: string;
  retailPrice: number;
  agentPrice: number;
  wholesalePrice: number;
  costPrice?: number;
  // 【2026-01-26 修复】新增四级价格体系字段
  supplyPrice?: number;
  suggestedPrice?: number;
  minRetailPrice?: number;
  masterRetailPrice?: number;
  stock?: number;
  unit?: string;
  purchaseUnit?: string;
  unitConversion?: number;
  specs?: string;
  status?: string;
  sort?: number;
  // 【2026-01-23 视频字段】
  videoUrl?: string;
  videoThumbnail?: string;
  videoDuration?: number;
  // 【2026-01-26 特价商品】不参与任何营销活动
  isSpecialPrice?: boolean;
}

// 更新商品DTO
interface UpdateProductDto {
  name?: string;
  categoryId?: number;
  images?: string;
  description?: string | null;
  retailPrice?: number;
  agentPrice?: number;
  wholesalePrice?: number;
  costPrice?: number;
  // 【2026-01-26 修复】新增四级价格体系字段
  supplyPrice?: number;
  suggestedPrice?: number;
  minRetailPrice?: number;
  masterRetailPrice?: number;
  stock?: number;
  unit?: string;
  purchaseUnit?: string;
  unitConversion?: number;
  specs?: string;
  status?: string;
  sort?: number;
  // 【2026-01-23 视频字段】
  videoUrl?: string | null;
  videoThumbnail?: string | null;
  videoDuration?: number | null;
  // 【2026-01-26 特价商品】不参与任何营销活动
  isSpecialPrice?: boolean;
}

/**
 * 根据代理商类型获取价格字段
 * 【2026-01-17】移除LEVEL3
 */
function getPriceField(agentType?: string): string {
  if (!agentType) return 'retailPrice';

  switch (agentType) {
    case 'LEVEL1':
    case 'LEVEL2':
      return 'agentPrice';
    case 'WHOLESALE':
      return 'wholesalePrice';
    default:
      return 'retailPrice';
  }
}

/**
 * 获取商品列表
 * 【2026-01-19修复】修复推销员价格显示 - 推销员看到的是上级给的拿货价：
 * - 一级推销员：看到供货价（总代理给的拿货价）
 * - 二级推销员：看到上级设置的subPrice（一级给的拿货价），未设置用供货价
 */
export async function findAll(params: ProductQueryParams = {}) {
  // 参数校验：page和pageSize必须为正整数
  let page = params.page ?? 1;
  let pageSize = params.pageSize ?? 10;

  // 修复BUG-001: 负数页码导致500错误
  if (typeof page !== 'number' || page < 1 || !Number.isInteger(page)) {
    page = 1;
  }
  if (typeof pageSize !== 'number' || pageSize < 1 || !Number.isInteger(pageSize)) {
    pageSize = 10;
  }
  // 限制最大pageSize防止查询过大
  if (pageSize > 100) {
    pageSize = 100;
  }

  const {
    categoryId,
    status,
    keyword,
    sort = 'default',
    agentType,
  } = params;

  const where: Prisma.ProductWhereInput = {};

  // 筛选条件
  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (status) {
    // 如果指定了状态，直接使用该状态
    where.status = status;
  } else {
    // 否则排除已删除的商品
    where.status = { not: 'DELETED' };
  }

  if (keyword) {
    where.OR = [
      { name: { contains: keyword } },
      { description: { contains: keyword } },
    ];
  }

  // 排序
  let orderBy: Prisma.ProductOrderByWithRelationInput[] = [];
  switch (sort) {
    case 'sales':
      orderBy = [{ salesCount: 'desc' }, { id: 'desc' }];
      break;
    case 'price_asc':
      orderBy = [{ retailPrice: 'asc' }, { id: 'desc' }];
      break;
    case 'price_desc':
      orderBy = [{ retailPrice: 'desc' }, { id: 'desc' }];
      break;
    default:
      orderBy = [{ sort: 'asc' }, { id: 'desc' }];
  }

  // 查询总数
  const total = await prisma.product.count({ where });

  // 查询数据
  const products = await prisma.product.findMany({
    where,
    orderBy,
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // 【2026-01-19修复】查询上级设置的价格（推销员看到的是拿货价，不是自己的零售价）
  let parentSubPriceMap: Map<number, number | null> = new Map(); // 上级设置的subPrice

  if (params.agentId && agentType === 'LEVEL2') {
    const productIds = products.map(p => p.id);
    if (productIds.length > 0) {
      // 二级推销员：查询上级设置的subPrice作为拿货价
      const agent = await prisma.agent.findUnique({
        where: { id: params.agentId },
        select: { parentId: true },
      });
      if (agent?.parentId) {
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
  }

  // 处理价格（根据代理商类型返回对应价格）
  const priceField = getPriceField(agentType);
  const processedProducts = products.map((product) => {
    // 安全解析图片JSON，兼容非JSON格式的旧数据
    let images: string[] = [];
    if (product.images) {
      try {
        const parsed = JSON.parse(product.images);
        images = Array.isArray(parsed) ? parsed : [product.images];
      } catch {
        // 如果不是JSON格式，清理方括号后作为单个图片路径
        const cleaned = product.images.replace(/^\[|\]$/g, '').trim();
        images = cleaned ? [cleaned] : [];
      }
    }
    // 【2026-01-19修复】计算显示价格 - 推销员看到的是上级给的拿货价
    let displayPrice: number;
    if (agentType === 'LEVEL1') {
      // 一级推销员：看到的是供货价（总代理给的拿货价）
      displayPrice = Number(product.supplyPrice || product.agentPrice);
    } else if (agentType === 'LEVEL2') {
      // 二级推销员：看到的是上级设置的subPrice（一级给的拿货价），未设置用供货价
      const parentSubPrice = parentSubPriceMap.get(product.id);
      displayPrice = parentSubPrice ?? Number(product.supplyPrice || product.agentPrice);
    } else {
      // 【2026-01-19修复】普通用户(WHOLESALE)和未登录用户都使用零售价
      // 不再有批发价概念，WHOLESALE改为普通用户角色
      displayPrice = Number(product.retailPrice);
    }

    return {
      ...product,
      images,
      // 添加显示价格字段
      displayPrice,
      // 前端使用agentPrice字段显示价格
      agentPrice: displayPrice,
      // 保留原始零售价用于对比
      retailPrice: Number(product.retailPrice),
      // 非管理员不显示成本价
      costPrice: agentType ? undefined : product.costPrice,
    };
  });

  return {
    list: processedProducts,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 获取商品详情
 * 【2026-01-19修复】修复推销员价格显示 - 推销员看到的是上级给的拿货价：
 * - 一级推销员：看到供货价（总代理给的拿货价）
 * - 二级推销员：看到上级设置的subPrice（一级给的拿货价），未设置用供货价
 */
export async function findById(id: number, agentType?: string, agentId?: number) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!product) {
    return null;
  }

  // 【2026-01-19修复】计算显示价格 - 推销员看到的是上级给的拿货价
  let displayPrice = Number(product.retailPrice);
  if (agentType === 'LEVEL1') {
    // 一级推销员：看到供货价（总代理给的拿货价）
    displayPrice = Number(product.supplyPrice || product.agentPrice);
  } else if (agentId && agentType === 'LEVEL2') {
    // 二级推销员：看到上级设置的subPrice（一级给的拿货价），未设置用供货价
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { parentId: true },
    });
    if (agent?.parentId) {
      const parentPrice = await prisma.agentPrice.findUnique({
        where: { agentId_productId: { agentId: agent.parentId, productId: id } },
      });
      if (parentPrice?.subPrice) {
        displayPrice = Number(parentPrice.subPrice);
      } else {
        displayPrice = Number(product.supplyPrice || product.agentPrice);
      }
    } else {
      displayPrice = Number(product.supplyPrice || product.agentPrice);
    }
  }
  // 【2026-01-19修复】普通用户(WHOLESALE)也使用零售价，不再有批发价概念

  // 安全解析图片JSON，兼容非JSON格式的旧数据
  let images: string[] = [];
  if (product.images) {
    try {
      const parsed = JSON.parse(product.images);
      images = Array.isArray(parsed) ? parsed : [product.images];
    } catch {
      images = [product.images];
    }
  }
  const specs = product.specs ? JSON.parse(product.specs) : null;

  return {
    ...product,
    images,
    specs,
    displayPrice,
    // 前端使用agentPrice字段显示价格
    agentPrice: displayPrice,
    // 保留原始零售价用于对比
    retailPrice: Number(product.retailPrice),
    costPrice: agentType ? undefined : product.costPrice,
  };
}

/**
 * 创建商品
 */
export async function create(data: CreateProductDto) {
  // 验证分类存在
  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
  });

  if (!category) {
    throw new Error('分类不存在');
  }

  return prisma.product.create({
    data: {
      name: data.name,
      categoryId: data.categoryId,
      images: data.images,
      description: data.description || null,
      retailPrice: new Prisma.Decimal(data.retailPrice),
      agentPrice: new Prisma.Decimal(data.agentPrice),
      wholesalePrice: new Prisma.Decimal(data.wholesalePrice),
      costPrice: data.costPrice ? new Prisma.Decimal(data.costPrice) : null,
      // 【2026-01-26 修复】新增四级价格体系字段
      supplyPrice: data.supplyPrice ? new Prisma.Decimal(data.supplyPrice) : null,
      suggestedPrice: data.suggestedPrice ? new Prisma.Decimal(data.suggestedPrice) : null,
      minRetailPrice: data.minRetailPrice ? new Prisma.Decimal(data.minRetailPrice) : null,
      masterRetailPrice: data.masterRetailPrice ? new Prisma.Decimal(data.masterRetailPrice) : null,
      stock: data.stock || 0,
      unit: data.unit || '箱',
      purchaseUnit: data.purchaseUnit || '件',
      unitConversion: data.unitConversion || 1,
      specs: data.specs || null,
      status: data.status || 'ACTIVE',
      sort: data.sort || 0,
      // 【2026-01-23 视频字段】
      videoUrl: data.videoUrl || null,
      videoThumbnail: data.videoThumbnail || null,
      videoDuration: data.videoDuration || null,
      // 【2026-01-26 特价商品】不参与任何营销活动
      isSpecialPrice: data.isSpecialPrice || false,
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

/**
 * 更新商品
 */
export async function update(id: number, data: UpdateProductDto) {
  // 如果更新分类，验证分类存在
  if (data.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      throw new Error('分类不存在');
    }
  }

  const updateData: any = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
  if (data.images !== undefined) updateData.images = data.images;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.retailPrice !== undefined) updateData.retailPrice = new Prisma.Decimal(data.retailPrice);
  if (data.agentPrice !== undefined) updateData.agentPrice = new Prisma.Decimal(data.agentPrice);
  if (data.wholesalePrice !== undefined) updateData.wholesalePrice = new Prisma.Decimal(data.wholesalePrice);
  if (data.costPrice !== undefined) updateData.costPrice = data.costPrice ? new Prisma.Decimal(data.costPrice) : null;
  // 【2026-01-26 修复】新增四级价格体系字段
  if (data.supplyPrice !== undefined) updateData.supplyPrice = data.supplyPrice ? new Prisma.Decimal(data.supplyPrice) : null;
  if (data.suggestedPrice !== undefined) updateData.suggestedPrice = data.suggestedPrice ? new Prisma.Decimal(data.suggestedPrice) : null;
  if (data.minRetailPrice !== undefined) updateData.minRetailPrice = data.minRetailPrice ? new Prisma.Decimal(data.minRetailPrice) : null;
  if (data.masterRetailPrice !== undefined) updateData.masterRetailPrice = data.masterRetailPrice ? new Prisma.Decimal(data.masterRetailPrice) : null;
  if (data.stock !== undefined) updateData.stock = data.stock;
  if (data.unit !== undefined) updateData.unit = data.unit;
  if (data.purchaseUnit !== undefined) updateData.purchaseUnit = data.purchaseUnit;
  if (data.unitConversion !== undefined) updateData.unitConversion = data.unitConversion;
  if (data.specs !== undefined) updateData.specs = data.specs;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.sort !== undefined) updateData.sort = data.sort;
  // 【2026-01-23 视频字段】
  if (data.videoUrl !== undefined) updateData.videoUrl = data.videoUrl;
  if (data.videoThumbnail !== undefined) updateData.videoThumbnail = data.videoThumbnail;
  if (data.videoDuration !== undefined) updateData.videoDuration = data.videoDuration;
  // 【2026-01-26 特价商品】不参与任何营销活动
  if (data.isSpecialPrice !== undefined) updateData.isSpecialPrice = data.isSpecialPrice;

  return prisma.product.update({
    where: { id },
    data: updateData,
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

/**
 * 删除商品
 * 【2026-01-22修复】增加预约项和锁定库存检查
 */
export async function deleteProduct(id: number) {
  // 先检查商品是否存在
  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    throw new Error('商品不存在');
  }

  // 【2026-01-22新增】检查是否有锁定库存
  if (product.lockStock > 0) {
    throw new Error(`该商品有${product.lockStock}件库存被锁定，无法删除`);
  }

  // 检查是否有未完成订单
  const orderItems = await prisma.orderItem.findFirst({
    where: {
      productId: id,
      order: {
        status: {
          notIn: ['completed', 'cancelled'],
        },
      },
    },
  });

  if (orderItems) {
    throw new Error('该商品有未完成的订单，无法删除');
  }

  // 【2026-01-22新增】检查是否有未完成预约
  // 预约终态: 已完成(3)、已取消(4)、已过期(5)、确认失败(6)
  const reservationItems = await prisma.reservationItem.findFirst({
    where: {
      productId: id,
      reservation: {
        status: {
          notIn: [3, 4, 5, 6], // 终态
        },
      },
    },
  });

  if (reservationItems) {
    throw new Error('该商品有未完成的预约，无法删除');
  }

  // 检查是否有任何关联的订单项或预约项（包括已完成的）
  const [anyOrderItems, anyReservationItems] = await Promise.all([
    prisma.orderItem.findFirst({ where: { productId: id } }),
    prisma.reservationItem.findFirst({ where: { productId: id } }),
  ]);

  if (anyOrderItems || anyReservationItems) {
    // 如果有历史关联记录，则软删除（设为下架状态）
    return prisma.product.update({
      where: { id },
      data: { status: 'DELETED' },
    });
  }

  // 没有任何关联记录时才真正删除
  return prisma.product.delete({
    where: { id },
  });
}

/**
 * 批量更新状态
 */
export async function batchUpdateStatus(ids: number[], status: string) {
  return prisma.product.updateMany({
    where: {
      id: { in: ids },
    },
    data: { status },
  });
}

/**
 * 更新库存
 */
export async function updateStock(id: number, delta: number) {
  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    throw new Error('商品不存在');
  }

  const newStock = product.stock + delta;
  if (newStock < 0) {
    throw new Error('库存不足');
  }

  return prisma.product.update({
    where: { id },
    data: { stock: newStock },
  });
}

/**
 * 切换商品状态
 */
export async function toggleStatus(id: number) {
  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    throw new Error('商品不存在');
  }

  const newStatus = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

  return prisma.product.update({
    where: { id },
    data: { status: newStatus },
  });
}

/**
 * 设置商品移库费和移库支持
 * 2026-01-11 新增
 */
export async function setTransferSettings(
  id: number,
  data: { transferFee?: number; allowTransfer?: boolean }
) {
  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    throw new Error('商品不存在');
  }

  const updateData: any = {};
  if (data.transferFee !== undefined) {
    updateData.transferFee = data.transferFee;
  }
  if (data.allowTransfer !== undefined) {
    updateData.allowTransfer = data.allowTransfer;
  }

  return prisma.product.update({
    where: { id },
    data: updateData,
  });
}

/**
 * 批量设置商品移库费和移库支持
 * 2026-01-11 新增
 */
export async function batchSetTransferSettings(
  productIds: number[],
  data: { transferFee?: number; allowTransfer?: boolean }
) {
  const updateData: any = {};
  if (data.transferFee !== undefined) {
    updateData.transferFee = data.transferFee;
  }
  if (data.allowTransfer !== undefined) {
    updateData.allowTransfer = data.allowTransfer;
  }

  return prisma.product.updateMany({
    where: { id: { in: productIds } },
    data: updateData,
  });
}

/**
 * 批量更新商品排序
 * 【2026-01-25新增】支持拖拽排序功能
 * @param ids 商品ID数组，按新的排序顺序排列
 */
export async function updateSort(ids: number[]) {
  const updates = ids.map((id, index) =>
    prisma.product.update({
      where: { id },
      data: { sort: index + 1 },
    })
  );
  return prisma.$transaction(updates);
}

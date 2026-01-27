/**
 * 库存查询服务
 * 负责：库存列表、详情、日志查询
 * Phase 2 Task 2.2
 */

import prisma from '../../utils/prisma';
import { Prisma } from '@prisma/client';
import { getStockStatus, STOCK_STATUS } from './stockConstants';
import { ImageHelper } from '../../utils/imageHelper';

/**
 * 库存列表参数
 */
export interface StockListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  categoryId?: number;
  status?: string;
  sortBy?: string; // stock | lockStock | salesCount
  sortOrder?: 'asc' | 'desc';
}

/**
 * 获取库存列表
 */
export async function getStockList(params: StockListParams) {
  const { page = 1, pageSize = 10, keyword, categoryId, status, sortBy, sortOrder = 'desc' } = params;
  const skip = (page - 1) * pageSize;

  // 构建查询条件
  const where: Prisma.ProductWhereInput = {
    status: 'ACTIVE', // 只查询上架商品
  };

  if (keyword) {
    where.OR = [
      { name: { contains: keyword } },
      { id: isNaN(Number(keyword)) ? undefined : Number(keyword) },
    ];
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  // 构建排序条件
  let orderBy: Prisma.ProductOrderByWithRelationInput = { updatedAt: 'desc' };
  if (sortBy === 'stock') {
    orderBy = { stock: sortOrder };
  } else if (sortBy === 'lockStock') {
    orderBy = { lockStock: sortOrder };
  } else if (sortBy === 'salesCount') {
    orderBy = { salesCount: sortOrder };
  }

  // 获取数据
  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  // 计算库存统计
  const stockStats = await prisma.stockLog.groupBy({
    by: ['productId', 'type'],
    _sum: { quantity: true },
    where: {
      productId: { in: items.map((p) => p.id) },
    },
  });

  // 构建统计映射
  const statsMap = new Map<number, { totalIn: number; totalOut: number }>();
  stockStats.forEach((stat) => {
    if (!statsMap.has(stat.productId)) {
      statsMap.set(stat.productId, { totalIn: 0, totalOut: 0 });
    }
    const s = statsMap.get(stat.productId)!;
    if (stat.type === 'IN') {
      s.totalIn += stat._sum.quantity || 0;
    } else if (stat.type === 'OUT') {
      s.totalOut += Math.abs(stat._sum.quantity || 0);
    }
  });

  // 处理数据，添加状态和统计信息
  const processedItems = items.map((item) => {
    const stockStatus = getStockStatus(item.stock, item.minStock);
    const stats = statsMap.get(item.id) || { totalIn: 0, totalOut: 0 };
    const parsedImages = ImageHelper.parseImages(item.images);
    return {
      id: String(item.id), // 转为字符串以兼容前端
      name: item.name,
      image: parsedImages[0] || '', // H5前端期望单个image字段
      images: parsedImages, // 保留数组格式兼容管理后台
      stock: item.stock,
      lockStock: item.lockStock,
      minStock: item.minStock,
      unit: item.unit,
      barcode: item.barcode || null, // H5前端需要
      sku: item.sku || null, // H5前端需要
      category: item.category,
      status: stockStatus,
      totalIn: stats.totalIn,
      totalOut: stats.totalOut,
      salesCount: item.salesCount,
      updatedAt: item.updatedAt,
    };
  });

  // 根据状态筛选
  let filteredItems = processedItems;
  if (status) {
    filteredItems = processedItems.filter((item) => item.status === status);
  }

  const finalTotal = status ? filteredItems.length : total;
  const hasMore = page * pageSize < finalTotal;

  return {
    list: filteredItems, // H5前端期望list字段
    items: filteredItems, // 保留items兼容管理后台
    total: finalTotal,
    page,
    pageSize,
    totalPages: Math.ceil(finalTotal / pageSize),
    hasMore, // H5前端需要
  };
}

/**
 * 获取库存统计
 */
export async function getStockStatistics() {
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    select: { stock: true, minStock: true },
  });

  let totalStock = 0;
  let warningCount = 0;
  let outOfStockCount = 0;

  products.forEach((p) => {
    totalStock += p.stock;
    const status = getStockStatus(p.stock, p.minStock);
    if (status === STOCK_STATUS.WARNING) warningCount++;
    if (status === STOCK_STATUS.OUT_OF_STOCK) outOfStockCount++;
  });

  // 获取待处理单据数（待入库的订单数）
  const pendingOrderCount = await prisma.order.count({
    where: {
      status: { in: ['pending_accept', 'preparing'] },
    },
  });

  // 获取今日入库数量
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayInResult = await prisma.stockLog.aggregate({
    where: {
      type: 'IN',
      createdAt: { gte: today },
    },
    _sum: { quantity: true },
  });
  const todayIn = todayInResult._sum.quantity || 0;

  return {
    totalStock,
    warningCount,
    outOfStockCount,
    pendingOrderCount,
    productCount: products.length,
    todayIn, // H5前端需要
  };
}

/**
 * 获取商品库存详情
 */
export async function getStockDetail(productId: number) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: {
        select: { id: true, name: true },
      },
    },
  });

  if (!product) {
    throw new Error('商品不存在');
  }

  // 获取库存统计
  const stockStats = await prisma.stockLog.groupBy({
    by: ['type'],
    _sum: { quantity: true },
    where: { productId },
  });

  let totalIn = 0;
  let totalOut = 0;
  stockStats.forEach((stat) => {
    if (stat.type === 'IN') {
      totalIn += stat._sum.quantity || 0;
    } else if (stat.type === 'OUT') {
      totalOut += Math.abs(stat._sum.quantity || 0);
    }
  });

  return {
    id: product.id,
    name: product.name,
    images: ImageHelper.parseImages(product.images),
    stock: product.stock,
    lockStock: product.lockStock,
    minStock: product.minStock,
    unit: product.unit,
    category: product.category,
    status: getStockStatus(product.stock, product.minStock),
    totalIn,
    totalOut,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

/**
 * 获取库存变动记录
 */
export async function getStockLogs(
  productId: number,
  params: { page?: number; pageSize?: number; type?: string }
) {
  const { page = 1, pageSize = 20, type } = params;
  const skip = (page - 1) * pageSize;

  const where: Prisma.StockLogWhereInput = { productId };
  if (type) {
    where.type = type;
  }

  const [items, total] = await Promise.all([
    prisma.stockLog.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: { name: true, unit: true },
        },
      },
    }),
    prisma.stockLog.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 获取所有库存日志（库管端）
 */
export async function getAllStockLogs(params: {
  page?: number;
  pageSize?: number;
  type?: string;
  keyword?: string;
}) {
  const { page = 1, pageSize = 20, type, keyword } = params;
  const skip = (page - 1) * pageSize;

  // 【2026-01-18修复】只查询关联商品存在的日志（过滤已删除商品）
  const where: Prisma.StockLogWhereInput = {
    product: { id: { gt: 0 } },
  };

  if (type) {
    where.type = type;
  }

  if (keyword) {
    where.product = {
      name: { contains: keyword },
    };
  }

  const [items, total] = await Promise.all([
    prisma.stockLog.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: { id: true, name: true, images: true, unit: true },
        },
      },
    }),
    prisma.stockLog.count({ where }),
  ]);

  // 处理商品图片（过滤掉product为null的记录）
  const processedItems = items
    .filter((item) => item.product !== null)
    .map((item) => ({
      ...item,
      product: {
        ...item.product!,
        images: ImageHelper.parseImages(item.product!.images),
      },
    }));

  return {
    items: processedItems,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 通过条形码/SKU/商品ID/名称查询商品
 * 用于库管端扫码功能
 */
export async function findProductByCode(code: string) {
  // 优先按条形码精确匹配（使用 as any 临时绕过类型检查，服务器会运行 prisma generate 更新类型）
  let product = await (prisma.product as any).findFirst({
    where: {
      barcode: code,
      status: 'ACTIVE',
    },
    include: {
      category: { select: { id: true, name: true } },
    },
  });

  // 如果没找到，尝试按SKU匹配
  if (!product) {
    product = await (prisma.product as any).findFirst({
      where: {
        sku: code,
        status: 'ACTIVE',
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });
  }

  // 如果没找到，尝试按商品ID匹配
  if (!product && !isNaN(Number(code))) {
    product = await prisma.product.findFirst({
      where: {
        id: Number(code),
        status: 'ACTIVE',
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });
  }

  // 如果没找到，尝试按名称模糊匹配（返回第一个）
  if (!product) {
    product = await prisma.product.findFirst({
      where: {
        name: { contains: code },
        status: 'ACTIVE',
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });
  }

  if (!product) {
    return null;
  }

  // 返回商品信息及库存状态
  const stockStatus = getStockStatus(product.stock, product.minStock);
  return {
    id: product.id,
    name: product.name,
    barcode: product.barcode || null,
    sku: product.sku || null,
    images: ImageHelper.parseImages(product.images),
    stock: product.stock,
    lockStock: product.lockStock,
    minStock: product.minStock,
    unit: product.unit,
    category: product.category,
    status: stockStatus,
    retailPrice: Number(product.retailPrice),
    agentPrice: Number(product.agentPrice),
  };
}

/**
 * 库存盘点参数
 */
export interface InventoryCheckParams {
  productId: number;
  actualStock: number;
  remark?: string;
  operatorId?: number;
  operatorName: string;
}

/**
 * 库存盘点
 * 对比实际库存与系统库存，自动生成调整记录
 */
export async function inventoryCheck(params: InventoryCheckParams) {
  const { productId, actualStock, remark, operatorId, operatorName } = params;

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new Error('商品不存在');
  }

  const systemStock = product.stock;
  const difference = actualStock - systemStock;

  // 如果库存一致，不需要调整
  if (difference === 0) {
    return {
      productId,
      productName: product.name,
      systemStock,
      actualStock,
      difference: 0,
      adjusted: false,
      message: '库存一致，无需调整',
    };
  }

  // 有差异，创建调整记录
  const logType = difference > 0 ? 'IN' : 'OUT';
  const adjustReason = `盘点调整：系统库存${systemStock}，实际库存${actualStock}，${difference > 0 ? '盘盈' : '盘亏'}${Math.abs(difference)}${product.unit || '件'}`;

  await prisma.$transaction(async (tx) => {
    // 更新库存
    await tx.product.update({
      where: { id: productId },
      data: { stock: actualStock },
    });

    // 创建库存日志
    await tx.stockLog.create({
      data: {
        productId,
        type: logType,
        quantity: Math.abs(difference),
        beforeStock: systemStock,
        afterStock: actualStock,
        remark: remark ? `${adjustReason}（${remark}）` : adjustReason,
        operatorId,
        operatorName,
      },
    });
  });

  return {
    productId,
    productName: product.name,
    systemStock,
    actualStock,
    difference,
    adjusted: true,
    message: `盘点完成，${difference > 0 ? '盘盈' : '盘亏'}${Math.abs(difference)}${product.unit || '件'}`,
  };
}

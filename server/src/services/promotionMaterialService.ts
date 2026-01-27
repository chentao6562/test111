/**
 * 推广资料服务
 * 包含推广文案和品牌素材的CRUD操作
 */

import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';

// ============ 推广文案服务 ============

// 文案类型
export const CopyType = {
  MOMENTS: 'MOMENTS',   // 朋友圈文案
  TALK: 'TALK',         // 客户话术
  PRODUCT: 'PRODUCT',   // 商品卖点
} as const;

// 文案查询参数
interface CopyQueryParams {
  type?: string;
  productId?: number;
  status?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

// 文案创建参数
interface CopyCreateParams {
  type: string;
  productId?: number;
  title: string;
  content: string;
  tags?: string;
  sort?: number;
  status?: string;
  createdBy: number;
}

// 文案更新参数
interface CopyUpdateParams {
  type?: string;
  productId?: number | null;
  title?: string;
  content?: string;
  tags?: string | null;
  sort?: number;
  status?: string;
}

/**
 * 获取推广文案列表（管理后台）
 */
export async function getPromotionCopies(params: CopyQueryParams) {
  const {
    type,
    productId,
    status,
    keyword,
    page = 1,
    pageSize = 10,
  } = params;

  const where: Prisma.PromotionCopyWhereInput = {};

  if (type) {
    where.type = type;
  }

  if (productId) {
    where.productId = productId;
  }

  if (status) {
    where.status = status;
  }

  if (keyword) {
    where.OR = [
      { title: { contains: keyword } },
      { content: { contains: keyword } },
    ];
  }

  const [list, total] = await Promise.all([
    prisma.promotionCopy.findMany({
      where,
      orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.promotionCopy.count({ where }),
  ]);

  return {
    list,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 获取启用的推广文案列表（H5前端）
 */
export async function getActiveCopies(type?: string, productId?: number) {
  const where: Prisma.PromotionCopyWhereInput = {
    status: 'ACTIVE',
  };

  if (type) {
    where.type = type;
  }

  if (productId) {
    where.productId = productId;
  }

  const list = await prisma.promotionCopy.findMany({
    where,
    orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      type: true,
      productId: true,
      title: true,
      content: true,
      tags: true,
    },
  });

  return list;
}

/**
 * 获取单个文案详情
 */
export async function getCopyById(id: number) {
  return prisma.promotionCopy.findUnique({
    where: { id },
  });
}

/**
 * 创建推广文案
 */
export async function createCopy(params: CopyCreateParams) {
  return prisma.promotionCopy.create({
    data: {
      type: params.type,
      productId: params.productId || null,
      title: params.title,
      content: params.content,
      tags: params.tags || null,
      sort: params.sort || 0,
      status: params.status || 'ACTIVE',
      createdBy: params.createdBy,
    },
  });
}

/**
 * 更新推广文案
 */
export async function updateCopy(id: number, params: CopyUpdateParams) {
  return prisma.promotionCopy.update({
    where: { id },
    data: params,
  });
}

/**
 * 删除推广文案
 */
export async function deleteCopy(id: number) {
  return prisma.promotionCopy.delete({
    where: { id },
  });
}

// ============ 品牌素材服务 ============

// 素材类型
export const AssetType = {
  LOGO: 'LOGO',       // 品牌LOGO
  PHOTO: 'PHOTO',     // 产品实拍
  VIDEO: 'VIDEO',     // 产品视频
  POSTER: 'POSTER',   // 海报模板
} as const;

// 素材查询参数
interface AssetQueryParams {
  type?: string;
  status?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

// 素材创建参数
interface AssetCreateParams {
  type: string;
  name: string;
  url: string;
  thumbnail?: string;
  fileSize?: number;
  description?: string;
  sort?: number;
  status?: string;
  createdBy: number;
}

// 素材更新参数
interface AssetUpdateParams {
  type?: string;
  name?: string;
  url?: string;
  thumbnail?: string | null;
  fileSize?: number | null;
  description?: string | null;
  sort?: number;
  status?: string;
}

/**
 * 获取品牌素材列表（管理后台）
 */
export async function getBrandAssets(params: AssetQueryParams) {
  const {
    type,
    status,
    keyword,
    page = 1,
    pageSize = 10,
  } = params;

  const where: Prisma.BrandAssetWhereInput = {};

  if (type) {
    where.type = type;
  }

  if (status) {
    where.status = status;
  }

  if (keyword) {
    where.OR = [
      { name: { contains: keyword } },
      { description: { contains: keyword } },
    ];
  }

  const [list, total] = await Promise.all([
    prisma.brandAsset.findMany({
      where,
      orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.brandAsset.count({ where }),
  ]);

  return {
    list,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 获取启用的品牌素材列表（H5前端）
 */
export async function getActiveAssets(type?: string) {
  const where: Prisma.BrandAssetWhereInput = {
    status: 'ACTIVE',
  };

  if (type) {
    where.type = type;
  }

  const list = await prisma.brandAsset.findMany({
    where,
    orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      type: true,
      name: true,
      url: true,
      thumbnail: true,
      fileSize: true,
      description: true,
    },
  });

  return list;
}

/**
 * 获取单个素材详情
 */
export async function getAssetById(id: number) {
  return prisma.brandAsset.findUnique({
    where: { id },
  });
}

/**
 * 创建品牌素材
 */
export async function createAsset(params: AssetCreateParams) {
  return prisma.brandAsset.create({
    data: {
      type: params.type,
      name: params.name,
      url: params.url,
      thumbnail: params.thumbnail || null,
      fileSize: params.fileSize || null,
      description: params.description || null,
      sort: params.sort || 0,
      status: params.status || 'ACTIVE',
      createdBy: params.createdBy,
    },
  });
}

/**
 * 更新品牌素材
 */
export async function updateAsset(id: number, params: AssetUpdateParams) {
  return prisma.brandAsset.update({
    where: { id },
    data: params,
  });
}

/**
 * 删除品牌素材
 */
export async function deleteAsset(id: number) {
  return prisma.brandAsset.delete({
    where: { id },
  });
}

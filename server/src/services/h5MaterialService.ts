/**
 * H5素材管理服务
 * 管理轮播图、推荐商品、公告通知等H5页面素材
 */

import prisma from '../utils/prisma'
import { Prisma } from '@prisma/client'

// ============ 轮播图管理 ============

/**
 * 获取轮播图列表（管理后台）
 */
export const getBanners = async (params: {
  page?: number
  pageSize?: number
  status?: string
}) => {
  const { page = 1, pageSize = 20, status } = params
  const skip = (page - 1) * pageSize

  const where: Prisma.H5BannerWhereInput = {}
  if (status) where.status = status

  const [list, total] = await Promise.all([
    prisma.h5Banner.findMany({
      where,
      orderBy: [{ sort: 'asc' }, { id: 'desc' }],
      skip,
      take: pageSize
    }),
    prisma.h5Banner.count({ where })
  ])

  return { list, total, page, pageSize }
}

/**
 * 获取有效轮播图（H5前端）
 */
export const getActiveBanners = async () => {
  const now = new Date()

  return prisma.h5Banner.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { startTime: null, endTime: null },
        { startTime: { lte: now }, endTime: null },
        { startTime: null, endTime: { gte: now } },
        { startTime: { lte: now }, endTime: { gte: now } }
      ]
    },
    orderBy: [{ sort: 'asc' }, { id: 'desc' }],
    take: 10
  })
}

/**
 * 创建轮播图
 */
export const createBanner = async (
  data: {
    title: string
    imageUrl: string
    linkType: string
    linkValue?: string
    sort?: number
    status?: string
    startTime?: Date
    endTime?: Date
  },
  createdBy: number
) => {
  return prisma.h5Banner.create({
    data: {
      ...data,
      createdBy
    }
  })
}

/**
 * 更新轮播图
 */
export const updateBanner = async (
  id: number,
  data: {
    title?: string
    imageUrl?: string
    linkType?: string
    linkValue?: string
    sort?: number
    status?: string
    startTime?: Date | null
    endTime?: Date | null
  }
) => {
  return prisma.h5Banner.update({
    where: { id },
    data
  })
}

/**
 * 删除轮播图
 */
export const deleteBanner = async (id: number) => {
  return prisma.h5Banner.delete({
    where: { id }
  })
}

// ============ 推荐商品管理 ============

/**
 * 获取推荐商品列表（管理后台）
 */
export const getRecommendProducts = async (params: {
  page?: number
  pageSize?: number
  type?: string
  status?: string
}) => {
  const { page = 1, pageSize = 20, type, status } = params
  const skip = (page - 1) * pageSize

  const where: Prisma.H5RecommendProductWhereInput = {}
  if (type) where.type = type
  if (status) where.status = status

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
            status: true
          }
        }
      },
      orderBy: [{ sort: 'asc' }, { id: 'desc' }],
      skip,
      take: pageSize
    }),
    prisma.h5RecommendProduct.count({ where })
  ])

  return { list, total, page, pageSize }
}

/**
 * 获取有效推荐商品（H5前端）
 */
export const getActiveRecommendProducts = async (type?: string) => {
  const where: Prisma.H5RecommendProductWhereInput = {
    status: 'ACTIVE',
    product: { status: 'ACTIVE' }
  }
  if (type) where.type = type

  return prisma.h5RecommendProduct.findMany({
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
          stock: true,
          lockStock: true,
          unit: true,
          salesCount: true
        }
      }
    },
    orderBy: [{ sort: 'asc' }, { id: 'desc' }],
    take: type ? 20 : 50
  })
}

/**
 * 创建推荐商品
 */
export const createRecommendProduct = async (
  data: {
    productId: number
    type: string
    title?: string
    subtitle?: string
    badge?: string
    sort?: number
    status?: string
  },
  createdBy: number
) => {
  // 检查商品是否存在
  const product = await prisma.product.findUnique({
    where: { id: data.productId }
  })
  if (!product) {
    throw new Error('商品不存在')
  }

  // 检查是否已推荐
  const existing = await prisma.h5RecommendProduct.findFirst({
    where: {
      productId: data.productId,
      type: data.type
    }
  })
  if (existing) {
    throw new Error('该商品已在此分类推荐')
  }

  return prisma.h5RecommendProduct.create({
    data: {
      ...data,
      createdBy
    }
  })
}

/**
 * 更新推荐商品
 */
export const updateRecommendProduct = async (
  id: number,
  data: {
    title?: string
    subtitle?: string
    badge?: string
    sort?: number
    status?: string
  }
) => {
  return prisma.h5RecommendProduct.update({
    where: { id },
    data
  })
}

/**
 * 删除推荐商品
 */
export const deleteRecommendProduct = async (id: number) => {
  return prisma.h5RecommendProduct.delete({
    where: { id }
  })
}

// ============ 公告通知管理 ============

/**
 * 获取公告列表（管理后台）
 */
export const getNotices = async (params: {
  page?: number
  pageSize?: number
  type?: string
  status?: string
}) => {
  const { page = 1, pageSize = 20, type, status } = params
  const skip = (page - 1) * pageSize

  const where: Prisma.H5NoticeWhereInput = {}
  if (type) where.type = type
  if (status) where.status = status

  const [list, total] = await Promise.all([
    prisma.h5Notice.findMany({
      where,
      orderBy: [{ sort: 'asc' }, { id: 'desc' }],
      skip,
      take: pageSize
    }),
    prisma.h5Notice.count({ where })
  ])

  return { list, total, page, pageSize }
}

/**
 * 获取有效公告（H5前端）
 */
export const getActiveNotices = async () => {
  const now = new Date()

  return prisma.h5Notice.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { startTime: null, endTime: null },
        { startTime: { lte: now }, endTime: null },
        { startTime: null, endTime: { gte: now } },
        { startTime: { lte: now }, endTime: { gte: now } }
      ]
    },
    orderBy: [{ sort: 'asc' }, { id: 'desc' }],
    take: 5
  })
}

/**
 * 创建公告
 */
export const createNotice = async (
  data: {
    title: string
    content: string
    type: string
    sort?: number
    status?: string
    startTime?: Date
    endTime?: Date
  },
  createdBy: number
) => {
  return prisma.h5Notice.create({
    data: {
      ...data,
      createdBy
    }
  })
}

/**
 * 更新公告
 */
export const updateNotice = async (
  id: number,
  data: {
    title?: string
    content?: string
    type?: string
    sort?: number
    status?: string
    startTime?: Date | null
    endTime?: Date | null
  }
) => {
  return prisma.h5Notice.update({
    where: { id },
    data
  })
}

/**
 * 删除公告
 */
export const deleteNotice = async (id: number) => {
  return prisma.h5Notice.delete({
    where: { id }
  })
}

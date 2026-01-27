/**
 * H5素材管理控制器
 */

import { Request, Response } from 'express'
import * as h5MaterialService from '../services/h5MaterialService'
import { success, error } from '../utils/response'
import { parsePagination, parseId } from '../utils/controllerHelper'

// ============ 轮播图管理 ============

export const getBanners = async (req: Request, res: Response) => {
  try {
    const { page, pageSize } = parsePagination(req.query)
    const { status } = req.query

    const result = await h5MaterialService.getBanners({
      page,
      pageSize,
      status: status as string
    })

    success(res, result)
  } catch (err: any) {
    error(res, err.message, 500)
  }
}

export const getActiveBanners = async (_req: Request, res: Response) => {
  try {
    const banners = await h5MaterialService.getActiveBanners()
    success(res, banners)
  } catch (err: any) {
    error(res, err.message, 500)
  }
}

export const createBanner = async (req: Request, res: Response) => {
  try {
    const { title, imageUrl, linkType, linkValue, sort, status, startTime, endTime } = req.body

    if (!title || !imageUrl || !linkType) {
      return error(res, '标题、图片和链接类型不能为空', 400)
    }

    const createdBy = (req.user as any).id

    const banner = await h5MaterialService.createBanner(
      {
        title,
        imageUrl,
        linkType,
        linkValue,
        sort,
        status,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined
      },
      createdBy
    )

    success(res, banner)
  } catch (err: any) {
    error(res, err.message, 500)
  }
}

export const updateBanner = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id, '轮播图ID')
    const { title, imageUrl, linkType, linkValue, sort, status, startTime, endTime } = req.body

    const banner = await h5MaterialService.updateBanner(id, {
      title,
      imageUrl,
      linkType,
      linkValue,
      sort,
      status,
      startTime: startTime === null ? null : startTime ? new Date(startTime) : undefined,
      endTime: endTime === null ? null : endTime ? new Date(endTime) : undefined
    })

    success(res, banner)
  } catch (err: any) {
    error(res, err.message, 500)
  }
}

export const deleteBanner = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id, '轮播图ID')
    await h5MaterialService.deleteBanner(id)
    success(res, null, '删除成功')
  } catch (err: any) {
    error(res, err.message, 500)
  }
}

// ============ 推荐商品管理 ============

export const getRecommendProducts = async (req: Request, res: Response) => {
  try {
    const { page, pageSize } = parsePagination(req.query)
    const { type, status } = req.query

    const result = await h5MaterialService.getRecommendProducts({
      page,
      pageSize,
      type: type as string,
      status: status as string
    })

    success(res, result)
  } catch (err: any) {
    error(res, err.message, 500)
  }
}

export const getActiveRecommendProducts = async (req: Request, res: Response) => {
  try {
    const { type } = req.query
    const products = await h5MaterialService.getActiveRecommendProducts(type as string)
    success(res, products)
  } catch (err: any) {
    error(res, err.message, 500)
  }
}

export const createRecommendProduct = async (req: Request, res: Response) => {
  try {
    const { productId, type, title, subtitle, badge, sort, status } = req.body

    if (!productId || !type) {
      return error(res, '商品ID和类型不能为空', 400)
    }

    const createdBy = (req.user as any).id

    const recommend = await h5MaterialService.createRecommendProduct(
      {
        productId: parseInt(productId),
        type,
        title,
        subtitle,
        badge,
        sort,
        status
      },
      createdBy
    )

    success(res, recommend)
  } catch (err: any) {
    error(res, err.message, 400)
  }
}

export const updateRecommendProduct = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id, '推荐商品ID')
    const { title, subtitle, badge, sort, status } = req.body

    const recommend = await h5MaterialService.updateRecommendProduct(id, {
      title,
      subtitle,
      badge,
      sort,
      status
    })

    success(res, recommend)
  } catch (err: any) {
    error(res, err.message, 500)
  }
}

export const deleteRecommendProduct = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id, '推荐商品ID')
    await h5MaterialService.deleteRecommendProduct(id)
    success(res, null, '删除成功')
  } catch (err: any) {
    error(res, err.message, 500)
  }
}

// ============ 公告通知管理 ============

export const getNotices = async (req: Request, res: Response) => {
  try {
    const { page, pageSize } = parsePagination(req.query)
    const { type, status } = req.query

    const result = await h5MaterialService.getNotices({
      page,
      pageSize,
      type: type as string,
      status: status as string
    })

    success(res, result)
  } catch (err: any) {
    error(res, err.message, 500)
  }
}

export const getActiveNotices = async (_req: Request, res: Response) => {
  try {
    const notices = await h5MaterialService.getActiveNotices()
    success(res, notices)
  } catch (err: any) {
    error(res, err.message, 500)
  }
}

export const createNotice = async (req: Request, res: Response) => {
  try {
    const { title, content, type, sort, status, startTime, endTime } = req.body

    if (!title || !content || !type) {
      return error(res, '标题、内容和类型不能为空', 400)
    }

    const createdBy = (req.user as any).id

    const notice = await h5MaterialService.createNotice(
      {
        title,
        content,
        type,
        sort,
        status,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined
      },
      createdBy
    )

    success(res, notice)
  } catch (err: any) {
    error(res, err.message, 500)
  }
}

export const updateNotice = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id, '公告ID')
    const { title, content, type, sort, status, startTime, endTime } = req.body

    const notice = await h5MaterialService.updateNotice(id, {
      title,
      content,
      type,
      sort,
      status,
      startTime: startTime === null ? null : startTime ? new Date(startTime) : undefined,
      endTime: endTime === null ? null : endTime ? new Date(endTime) : undefined
    })

    success(res, notice)
  } catch (err: any) {
    error(res, err.message, 500)
  }
}

export const deleteNotice = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id, '公告ID')
    await h5MaterialService.deleteNotice(id)
    success(res, null, '删除成功')
  } catch (err: any) {
    error(res, err.message, 500)
  }
}

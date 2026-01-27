/**
 * 代金券活动控制器
 * 【2026-01-19 活动系统增强】
 */
import { Request, Response } from 'express'
import * as couponActivityService from '../services/couponActivityService'

// ============ 管理后台功能 ============

/**
 * 获取代金券活动列表
 */
export const getActivityList = async (req: Request, res: Response) => {
  try {
    const { page, pageSize, status, keyword } = req.query
    const result = await couponActivityService.getActivityList({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      status: status as string,
      keyword: keyword as string
    })

    res.json({
      code: 0,
      message: 'success',
      data: result
    })
  } catch (error: any) {
    res.status(500).json({
      code: 500,
      message: error.message || '获取活动列表失败'
    })
  }
}

/**
 * 获取活动详情
 */
export const getActivityDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const result = await couponActivityService.getActivityDetail(Number(id))

    res.json({
      code: 0,
      message: 'success',
      data: result
    })
  } catch (error: any) {
    res.status(400).json({
      code: 400,
      message: error.message || '获取活动详情失败'
    })
  }
}

/**
 * 创建代金券活动
 */
export const createActivity = async (req: Request, res: Response) => {
  try {
    const { name, couponAmount, totalCount, limitPerUser, startTime, endTime, expiredAt, status } = req.body

    if (!name || !couponAmount || !totalCount || !startTime || !endTime || !expiredAt) {
      res.status(400).json({
        code: 400,
        message: '请填写完整的活动信息'
      })
      return
    }

    const createdBy = (req as any).user?.id || 0

    const result = await couponActivityService.createActivity({
      name,
      couponAmount: Number(couponAmount),
      totalCount: Number(totalCount),
      limitPerUser: limitPerUser ? Number(limitPerUser) : 1,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      expiredAt: new Date(expiredAt),
      status
    }, createdBy)

    res.json({
      code: 0,
      message: '创建成功',
      data: result
    })
  } catch (error: any) {
    res.status(400).json({
      code: 400,
      message: error.message || '创建活动失败'
    })
  }
}

/**
 * 更新代金券活动
 */
export const updateActivity = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, couponAmount, totalCount, limitPerUser, startTime, endTime, expiredAt, status } = req.body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (couponAmount !== undefined) updateData.couponAmount = Number(couponAmount)
    if (totalCount !== undefined) updateData.totalCount = Number(totalCount)
    if (limitPerUser !== undefined) updateData.limitPerUser = Number(limitPerUser)
    if (startTime !== undefined) updateData.startTime = new Date(startTime)
    if (endTime !== undefined) updateData.endTime = new Date(endTime)
    if (expiredAt !== undefined) updateData.expiredAt = new Date(expiredAt)
    if (status !== undefined) updateData.status = status

    const result = await couponActivityService.updateActivity(Number(id), updateData)

    res.json({
      code: 0,
      message: '更新成功',
      data: result
    })
  } catch (error: any) {
    res.status(400).json({
      code: 400,
      message: error.message || '更新活动失败'
    })
  }
}

/**
 * 删除代金券活动
 */
export const deleteActivity = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await couponActivityService.deleteActivity(Number(id))

    res.json({
      code: 0,
      message: '删除成功'
    })
  } catch (error: any) {
    res.status(400).json({
      code: 400,
      message: error.message || '删除活动失败'
    })
  }
}

/**
 * 切换活动状态
 */
export const toggleActivityStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const result = await couponActivityService.toggleActivityStatus(Number(id))

    res.json({
      code: 0,
      message: '状态切换成功',
      data: result
    })
  } catch (error: any) {
    res.status(400).json({
      code: 400,
      message: error.message || '状态切换失败'
    })
  }
}

// ============ H5前端功能 ============

/**
 * 获取可领取的代金券活动列表
 * 【2026-01-21修复】使用 req.user 而非 req.agent（authRequired中间件存储到req.user）
 */
export const getAvailableActivities = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).user?.id
    if (!agentId) {
      res.status(401).json({
        code: 401,
        message: '请先登录'
      })
      return
    }

    const result = await couponActivityService.getAvailableActivities(agentId)

    res.json({
      code: 0,
      message: 'success',
      data: result
    })
  } catch (error: any) {
    res.status(500).json({
      code: 500,
      message: error.message || '获取活动列表失败'
    })
  }
}

/**
 * 领取代金券
 * 【2026-01-21修复】使用 req.user 而非 req.agent（authRequired中间件存储到req.user）
 */
export const claimCoupon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const agentId = (req as any).user?.id

    if (!agentId) {
      res.status(401).json({
        code: 401,
        message: '请先登录'
      })
      return
    }

    const coupon = await couponActivityService.claimCoupon(Number(id), agentId)

    res.json({
      code: 0,
      message: '领取成功',
      data: {
        id: coupon.id,
        code: coupon.code,
        amount: Number(coupon.amount),
        expiredAt: coupon.expiredAt
      }
    })
  } catch (error: any) {
    res.status(400).json({
      code: 400,
      message: error.message || '领取失败'
    })
  }
}

export default {
  getActivityList,
  getActivityDetail,
  createActivity,
  updateActivity,
  deleteActivity,
  toggleActivityStatus,
  getAvailableActivities,
  claimCoupon
}

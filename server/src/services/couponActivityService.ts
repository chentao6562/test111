/**
 * 代金券活动服务
 * 【2026-01-19 活动系统增强】
 */
import prisma from '../utils/prisma'
import { Prisma } from '@prisma/client'

// ============ 管理后台功能 ============

/**
 * 获取代金券活动列表
 */
export const getActivityList = async (params: {
  page?: number
  pageSize?: number
  status?: string
  keyword?: string
}) => {
  const { page = 1, pageSize = 20, status, keyword } = params
  const skip = (page - 1) * pageSize

  const where: Prisma.CouponActivityWhereInput = {}
  if (status) where.status = status
  if (keyword) {
    where.name = { contains: keyword }
  }

  const [list, total] = await Promise.all([
    prisma.couponActivity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize
    }),
    prisma.couponActivity.count({ where })
  ])

  return {
    list: list.map(item => ({
      ...item,
      couponAmount: Number(item.couponAmount)
    })),
    total,
    page,
    pageSize
  }
}

/**
 * 获取活动详情
 */
export const getActivityDetail = async (id: number) => {
  const activity = await prisma.couponActivity.findUnique({
    where: { id }
  })

  if (!activity) {
    throw new Error('活动不存在')
  }

  return {
    ...activity,
    couponAmount: Number(activity.couponAmount)
  }
}

/**
 * 创建代金券活动
 */
export const createActivity = async (
  data: {
    name: string
    couponAmount: number
    totalCount: number
    limitPerUser?: number
    startTime: Date
    endTime: Date
    expiredAt: Date
    status?: string
  },
  createdBy: number
) => {
  return prisma.couponActivity.create({
    data: {
      name: data.name,
      couponAmount: data.couponAmount,
      totalCount: data.totalCount,
      limitPerUser: data.limitPerUser || 1,
      startTime: data.startTime,
      endTime: data.endTime,
      expiredAt: data.expiredAt,
      status: data.status || 'DRAFT',
      createdBy
    }
  })
}

/**
 * 更新代金券活动
 */
export const updateActivity = async (
  id: number,
  data: {
    name?: string
    couponAmount?: number
    totalCount?: number
    limitPerUser?: number
    startTime?: Date
    endTime?: Date
    expiredAt?: Date
    status?: string
  }
) => {
  // 检查活动是否存在
  const activity = await prisma.couponActivity.findUnique({ where: { id } })
  if (!activity) {
    throw new Error('活动不存在')
  }

  // 已发放券的活动不能修改券面额
  if (data.couponAmount !== undefined && activity.issuedCount > 0) {
    throw new Error('已发放代金券的活动不能修改券面额')
  }

  return prisma.couponActivity.update({
    where: { id },
    data
  })
}

/**
 * 删除代金券活动
 */
export const deleteActivity = async (id: number) => {
  const activity = await prisma.couponActivity.findUnique({ where: { id } })
  if (!activity) {
    throw new Error('活动不存在')
  }

  if (activity.issuedCount > 0) {
    throw new Error('已发放代金券的活动不能删除')
  }

  return prisma.couponActivity.delete({ where: { id } })
}

/**
 * 切换活动状态
 */
export const toggleActivityStatus = async (id: number) => {
  const activity = await prisma.couponActivity.findUnique({ where: { id } })
  if (!activity) {
    throw new Error('活动不存在')
  }

  const newStatus = activity.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'

  return prisma.couponActivity.update({
    where: { id },
    data: { status: newStatus }
  })
}

// ============ H5前端功能 ============

/**
 * 获取可领取的代金券活动列表
 */
export const getAvailableActivities = async (agentId: number) => {
  const now = new Date()

  // 查询进行中的活动（有库存的）
  const activities = await prisma.couponActivity.findMany({
    where: {
      status: 'ACTIVE',
      startTime: { lte: now },
      endTime: { gte: now }
    },
    orderBy: { createdAt: 'desc' }
  })

  // 过滤掉已发放完的活动
  const availableActivities = activities.filter(a => a.issuedCount < a.totalCount)

  // 查询用户已领取的活动券
  const claimedCoupons = await prisma.coupon.findMany({
    where: {
      agentId,
      sourceType: 'ACTIVITY',
      activityId: { not: null }
    },
    select: { activityId: true }
  })

  // 按活动ID统计已领取数量
  const claimedCountMap = new Map<number, number>()
  claimedCoupons.forEach(c => {
    if (c.activityId) {
      claimedCountMap.set(c.activityId, (claimedCountMap.get(c.activityId) || 0) + 1)
    }
  })

  // 返回活动列表，附带用户已领取数量和剩余可领取数量
  return availableActivities.map(a => ({
    ...a,
    couponAmount: Number(a.couponAmount),
    claimedCount: claimedCountMap.get(a.id) || 0,
    remainingStock: a.totalCount - a.issuedCount,
    canClaim: (claimedCountMap.get(a.id) || 0) < a.limitPerUser && a.issuedCount < a.totalCount
  }))
}

/**
 * 领取代金券
 */
export const claimCoupon = async (activityId: number, agentId: number) => {
  return prisma.$transaction(async (tx) => {
    // 1. 锁定并检查活动
    const activity = await tx.couponActivity.findUnique({
      where: { id: activityId }
    })

    if (!activity) {
      throw new Error('活动不存在')
    }

    const now = new Date()
    if (activity.status !== 'ACTIVE') {
      throw new Error('活动已下线')
    }
    if (now < activity.startTime) {
      throw new Error('活动尚未开始')
    }
    if (now > activity.endTime) {
      throw new Error('活动已结束')
    }
    if (activity.issuedCount >= activity.totalCount) {
      throw new Error('代金券已领完')
    }

    // 2. 检查用户已领取数量
    const claimedCount = await tx.coupon.count({
      where: {
        agentId,
        activityId
      }
    })

    if (claimedCount >= activity.limitPerUser) {
      throw new Error(`每人限领${activity.limitPerUser}张`)
    }

    // 3. 生成券码
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    const code = `CPN${timestamp}${random}`

    // 4. 创建代金券
    const coupon = await tx.coupon.create({
      data: {
        code,
        agentId,
        amount: activity.couponAmount,
        sourceType: 'ACTIVITY',
        sourceDesc: `领取活动: ${activity.name}`,
        activityId: activity.id,
        status: 'UNUSED',
        expiredAt: activity.expiredAt
      }
    })

    // 5. 更新活动已发放数量
    await tx.couponActivity.update({
      where: { id: activityId },
      data: { issuedCount: { increment: 1 } }
    })

    return coupon
  })
}

/**
 * 自动结束过期活动
 */
export const autoEndExpiredActivities = async () => {
  const now = new Date()

  const result = await prisma.couponActivity.updateMany({
    where: {
      status: 'ACTIVE',
      endTime: { lt: now }
    },
    data: { status: 'ENDED' }
  })

  return result.count
}

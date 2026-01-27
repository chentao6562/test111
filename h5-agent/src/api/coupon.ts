/**
 * 代金券API
 * 【2026-01-18 春节营销】
 */

import { get } from './index'

// 代金券状态
export const CouponStatus = {
  UNUSED: 'UNUSED',
  USED: 'USED',
  EXPIRED: 'EXPIRED',
}

// 代金券状态标签
export const CouponStatusLabel: Record<string, string> = {
  UNUSED: '未使用',
  USED: '已使用',
  EXPIRED: '已过期',
}

// 代金券来源标签
export const CouponSourceLabel: Record<string, string> = {
  REGISTER: '注册奖励',
  FIRST_SHARE: '首次发圈奖励',
  FIRST_RESERVATION: '首次预约奖励',
  FIRST_COMPLETE: '首单成交奖励',
  RECRUIT: '邀请新推销员奖励',
  RECRUIT_ACTIVATE: '下级激活奖励',
  WEEK_SALES_3: '周销售3单奖励',
  WEEK_SALES_5: '周销售5单奖励',
  WEEK_SALES_10: '周销售10单奖励',
  WEEK_SHARE_FULL: '周发圈全勤奖励',
  WEEK_RECRUIT_3: '周拉新3人奖励',
}

export interface Coupon {
  id: number
  code: string
  amount: number
  sourceType: string
  sourceDesc: string | null
  status: string
  usedAt: string | null
  usedOrderNo: string | null
  expiredAt: string
  createdAt: string
}

export interface CouponStats {
  total: number
  unused: number
  used: number
  expired: number
  totalAmount: number
  unusedAmount: number
}

export interface CouponListResponse {
  list: Coupon[]
  total: number
}

/**
 * 获取我的代金券列表
 */
export async function getMyCoupons(params?: {
  status?: string
  page?: number
  pageSize?: number
}): Promise<CouponListResponse> {
  const response = await get<CouponListResponse>('/coupons', params)
  return response.data
}

/**
 * 获取我的代金券统计
 */
export async function getMyCouponStats(): Promise<CouponStats> {
  const response = await get<CouponStats>('/coupons/stats')
  return response.data
}

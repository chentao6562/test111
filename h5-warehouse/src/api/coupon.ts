/**
 * 门店端代金券核销API
 * 【2026-01-18 春节营销】
 */

import { request } from './request'

// 代金券验证结果
export interface CouponVerifyResult {
  id: number
  code: string
  amount: number
  agentId: number
  agentName: string
  agentPhone: string
  sourceDesc: string | null
  expiredAt: string
}

// 核销结果
export interface CouponRedeemResult {
  amount: number
  costBearerId: number | null
}

/**
 * 验证代金券
 */
export async function verifyCoupon(code: string): Promise<CouponVerifyResult> {
  return request.get<CouponVerifyResult>('/store/coupon/verify', { params: { code } })
}

/**
 * 核销代金券
 */
export async function redeemCoupon(code: string, orderNo?: string): Promise<CouponRedeemResult> {
  return request.post<CouponRedeemResult>('/store/coupon/redeem', { code, orderNo })
}

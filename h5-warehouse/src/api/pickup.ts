import { request } from './request'
import type { Order, PickupRecord, PaginatedData, PaginationParams } from '@/types'

export interface PickupVerifyResult {
  order: Order
  verified?: boolean
  phoneLastFour?: string
}

// 验证提货码
export function verifyPickup(pickupCode: string): Promise<PickupVerifyResult> {
  return request.post('/staff/pickup/verify', { pickupCode })
}

// 确认核销（全款）
export function confirmPickup(orderId: string | number): Promise<void> {
  return request.post('/staff/pickup/confirm', { orderId })
}

// 收款+核销（兼容历史订单）
export interface ConfirmWithPaymentParams {
  orderId: string | number
  collectedAmount: number
  remark?: string
}

export function confirmWithPayment(params: ConfirmWithPaymentParams): Promise<void> {
  return request.post('/staff/pickup/confirm-with-payment', params)
}

// 验证移库码
export function verifyTransfer(transferCode: string): Promise<{ order: Order; transferTask?: any }> {
  return request.post('/staff/pickup/verify-transfer', { transferCode })
}

// 确认交接（锁货模式）
export function confirmTransfer(orderId: string | number): Promise<void> {
  return request.post('/staff/pickup/confirm-transfer', { orderId })
}

// 获取核销历史
export function getPickupHistory(params: PaginationParams): Promise<PaginatedData<PickupRecord>> {
  return request.get('/staff/orders/pickups', { params })
}

// 货管信息
export interface LogisticsStaff {
  id: number
  name: string
  phone: string
  isAvailable: boolean
}

// 获取可用货管列表
export function getAvailableLogistics(): Promise<LogisticsStaff[]> {
  return request.get('/staff/logistics/available')
}

import { request } from './request'
import type { Order, OrderStats, TodayStats, PaginatedData, PaginationParams } from '@/types'

// 获取订单统计
export function getOrderStats(): Promise<OrderStats> {
  return request.get('/staff/orders/stats')
}

// 获取今日操作统计
export function getTodayStats(): Promise<TodayStats> {
  return request.get('/staff/stats/today')
}

// 获取统计数据（支持周期参数）
export interface Stats {
  accepted: number
  prepared: number
  pickup: number
  selfPickup?: number
  transferHandover?: number
  stockIn?: number
  inventoryCheck?: number
  todayAccepted?: number
  todayPrepared?: number
  todayPickup?: number
}

export function getStats(period: string = 'today'): Promise<Stats> {
  return request.get('/staff/stats', { params: { period } })
}

// 获取订单列表
export interface GetOrdersParams extends PaginationParams {
  status?: string
  search?: string
}

export function getOrders(params: GetOrdersParams): Promise<PaginatedData<Order>> {
  return request.get('/staff/orders', { params })
}

// 获取订单详情
export function getOrderDetail(orderId: string): Promise<Order> {
  return request.get(`/staff/orders/${orderId}`)
}

// 接单
export function acceptOrder(orderId: string): Promise<void> {
  return request.put(`/staff/orders/${orderId}/accept`)
}

// 标记备货完成
export function markPrepared(orderId: string): Promise<void> {
  return request.put(`/staff/orders/${orderId}/prepared`)
}

// 上报问题
export interface ReportIssueParams {
  orderId: string
  issueType: string
  description?: string
}

export function reportIssue(params: ReportIssueParams): Promise<void> {
  return request.post('/staff/orders/report-issue', params)
}

/**
 * 管理后台预约管理API
 * 【2026-01-16 预约模式升级】规范化API层
 */

import { request } from './request'

// 预约状态枚举（完整支持0-9状态）
export const ReservationStatus = {
  PENDING: 0,           // 待确认
  CALLING: 1,           // 确认中
  CONFIRMED: 2,         // 已确认
  COMPLETED: 3,         // 已完成
  CANCELLED: 4,         // 已取消
  EXPIRED: 5,           // 已过期
  CALL_FAILED: 6,       // 确认失败
  PENDING_PREPARE: 7,   // 待备货【2026-01-17新增】
  PREPARING: 8,         // 备货中【2026-01-17新增】
  PENDING_PICKUP: 9,    // 待提货【2026-01-17新增】
} as const

// 状态配置（用于UI显示）
export const RESERVATION_STATUSES: Record<number, {
  label: string
  color: string
  bgColor: string
  textColor: string
  desc: string
}> = {
  0: { label: '待确认', color: 'warning', bgColor: 'rgba(255, 152, 0, 0.1)', textColor: '#FF9800', desc: '等待门店电话确认' },
  1: { label: '确认中', color: 'primary', bgColor: 'rgba(33, 150, 243, 0.1)', textColor: '#2196F3', desc: '门店正在联系客户' },
  2: { label: '已确认', color: 'success', bgColor: 'rgba(76, 175, 80, 0.1)', textColor: '#4CAF50', desc: '等待客户到店' },
  3: { label: '已完成', color: 'default', bgColor: 'rgba(158, 158, 158, 0.1)', textColor: '#9E9E9E', desc: '预约已完成' },
  4: { label: '已取消', color: 'default', bgColor: 'rgba(158, 158, 158, 0.1)', textColor: '#9E9E9E', desc: '客户已取消' },
  5: { label: '已过期', color: 'danger', bgColor: 'rgba(244, 67, 54, 0.1)', textColor: '#F44336', desc: '预约已过期' },
  6: { label: '确认失败', color: 'danger', bgColor: 'rgba(244, 67, 54, 0.1)', textColor: '#F44336', desc: '多次联系未接通' },
  7: { label: '待备货', color: 'warning', bgColor: 'rgba(121, 85, 72, 0.1)', textColor: '#795548', desc: '等待门店备货' },
  8: { label: '备货中', color: 'primary', bgColor: 'rgba(255, 87, 34, 0.1)', textColor: '#FF5722', desc: '门店正在备货' },
  9: { label: '待提货', color: 'success', bgColor: 'rgba(3, 169, 244, 0.1)', textColor: '#03A9F4', desc: '商品已备好，等待提货' },
}

// 支付方式映射（仅支持现金/微信/支付宝）
export const PAYMENT_METHODS: Record<string, string> = {
  cash: '现金',
  wechat: '微信',
  alipay: '支付宝',
}

// 类型定义
export interface ReservationItem {
  productId: number
  productName: string
  productImage?: string
  quantity: number
  price: number
  subtotal?: number
}

export interface Reservation {
  id: number
  reservationNo: string
  customerName: string
  customerPhone: string
  pickupDate: string
  totalAmount: number
  status: number
  giftName?: string
  giftDelivered?: boolean
  callCount: number
  lastCallAt?: string
  items?: ReservationItem[]
  createdAt: string
  confirmedAt?: string
  completedAt?: string
  paymentMethod?: string
  masterProfit?: number
  level1Profit?: number
  level2Profit?: number
  // 【2026-01-28新增】推销员（开发人员）信息
  salespersonId?: number
  salespersonName?: string
  salespersonPhone?: string
  salespersonLevel?: number
}

export interface ReservationStats {
  pending: number
  calling: number
  confirmed: number
  completed: number
  totalAmount: number
}

export interface ReservationListParams {
  page?: number
  pageSize?: number
  reservationNo?: string
  keyword?: string
  status?: number
  startDate?: string
  endDate?: string
}

export interface ReservationListResult {
  list: Reservation[]
  total: number
  page: number
  pageSize: number
}

/**
 * 获取预约统计
 */
export async function getReservationStats(): Promise<ReservationStats> {
  const res = await request.get<ReservationStats>('/admin/reservations/stats')
  return res.data
}

/**
 * 获取预约列表
 */
export async function getReservationList(params: ReservationListParams): Promise<ReservationListResult> {
  const res = await request.get<ReservationListResult>('/admin/reservations', { params })
  return res.data
}

/**
 * 获取预约详情
 */
export async function getReservationDetail(id: number): Promise<Reservation> {
  const res = await request.get<Reservation>(`/admin/reservations/${id}`)
  return res.data
}

/**
 * 确认预约
 */
export async function confirmReservation(id: number): Promise<void> {
  await request.post(`/admin/reservations/${id}/confirm`)
}

/**
 * 取消预约
 */
export async function cancelReservation(id: number, reason?: string): Promise<void> {
  await request.post(`/admin/reservations/${id}/cancel`, { reason })
}

/**
 * 【2026-01-19新增】记录拨打电话
 * 用于客服电话确认预约流程
 * @param id 预约ID
 * @param connected 是否接通（默认false）
 * @returns 拨打记录结果，包含callCount、canCallAgain等信息
 */
export async function recordCall(id: number, connected: boolean = false): Promise<{
  callCount: number
  maxAttempts: number
  canCallAgain: boolean
  autoFailed?: boolean
}> {
  const res = await request.post(`/admin/reservations/${id}/call`, { connected })
  return res.data
}

/**
 * 【2026-01-19新增】标记确认失败
 * 用于客服电话确认预约流程（3次未接通后可调用）
 * @param id 预约ID
 */
export async function markCallFailed(id: number): Promise<void> {
  await request.post(`/admin/reservations/${id}/fail`)
}

/**
 * 导出预约数据
 */
export async function exportReservations(params: {
  startDate?: string
  endDate?: string
  status?: number
}): Promise<Blob> {
  const res = await request.get('/admin/reservations/export', {
    params,
    responseType: 'blob' as any
  })
  return res as any
}

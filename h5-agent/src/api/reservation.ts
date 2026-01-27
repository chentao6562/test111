/**
 * 预约相关API
 * 【2026-01-16 预约模式升级】
 */

import { get, post, del } from './index'

// 预约状态枚举
export const ReservationStatus = {
  PENDING: 0,         // 待确认
  CALLING: 1,         // 确认中
  CONFIRMED: 2,       // 已确认
  COMPLETED: 3,       // 已完成
  CANCELLED: 4,       // 已取消
  EXPIRED: 5,         // 已过期
  CALL_FAILED: 6,     // 确认失败
  PENDING_PREPARE: 7, // 【2026-01-17】待备货
  PREPARING: 8,       // 【2026-01-17】备货中
  PENDING_PICKUP: 9,  // 【2026-01-17】待提货
} as const

// 状态标签
export const StatusLabels: Record<number, string> = {
  0: '待确认',
  1: '确认中',
  2: '已确认',
  3: '已完成',
  4: '已取消',
  5: '已过期',
  6: '确认失败',
  7: '待备货',      // 【2026-01-17】
  8: '备货中',      // 【2026-01-17】
  9: '待提货',      // 【2026-01-17】
}

// 状态颜色
export const StatusColors: Record<number, string> = {
  0: '#FF9800',    // 橙色
  1: '#2196F3',    // 蓝色
  2: '#4CAF50',    // 绿色
  3: '#9E9E9E',    // 灰色
  4: '#9E9E9E',    // 灰色
  5: '#9E9E9E',    // 灰色
  6: '#F44336',    // 红色
  7: '#795548',    // 棕色 - 待备货
  8: '#FF5722',    // 深橙色 - 备货中
  9: '#03A9F4',    // 浅蓝色 - 待提货
}

// 预约项类型
export interface ReservationItem {
  productId: number
  productName: string
  productImage?: string
  quantity: number
  price: number
  subtotal: number
  isFlashSale?: boolean  // 【2026-01-25新增】是否秒杀商品
  isBargain?: boolean    // 【2026-01-25新增】是否砍价商品
}

// 预约类型
export interface Reservation {
  id: number
  reservationNo: string
  customerName: string
  customerPhone: string
  pickupDate: string
  totalAmount: number
  status: number
  statusLabel: string
  giftName?: string
  giftDelivered?: boolean
  pickupCode?: string      // 【2026-01-19】提货码（备货完成后生成）
  preparedAt?: string      // 【2026-01-19】备货完成时间
  itemCount: number
  storeName?: string
  createdAt: string
  items?: ReservationItem[]
  store?: {
    id: number
    name: string
    address: string
    contactPhone: string
  }
}

// 创建预约参数
export interface CreateReservationParams {
  customerName: string
  customerPhone: string
  pickupDate: string
  storeId: number
  items: Array<{
    productId: number
    productName: string
    productImage?: string
    quantity: number
    price: number
  }>
}

// 创建预约响应
export interface CreateReservationResponse {
  reservationId: number
  reservationNo: string
  totalAmount: number
  giftName?: string
  storeName: string
  storePhone: string
  storeAddress: string
  notice: string
}

/**
 * 创建预约
 */
export const createReservation = (data: CreateReservationParams) => {
  return post<CreateReservationResponse>('/reservations', data)
}

/**
 * 获取我的预约列表
 * 【2026-01-17】支持多状态筛选
 * 【2026-01-17修复】添加phone参数
 */
export const getMyReservations = (params: {
  phone: string
  page?: number
  pageSize?: number
  status?: number | number[]
}) => {
  // 处理多状态参数
  const queryParams: Record<string, unknown> = {
    phone: params.phone,
    page: params.page,
    pageSize: params.pageSize
  }
  if (params.status !== undefined) {
    queryParams.status = Array.isArray(params.status) ? params.status.join(',') : params.status
  }
  return get<{
    list: Reservation[]
    total: number
    page: number
    pageSize: number
  }>('/reservations/my', queryParams)
}

/**
 * 获取预约详情
 */
export const getReservationDetail = (id: number) => {
  return get<Reservation>(`/reservations/${id}`)
}

/**
 * 取消预约（仅限待确认状态）
 * 【2026-01-17】修复：使用DELETE方法，需要传phone验证身份
 */
export const cancelReservation = (id: number, phone: string) => {
  return del<void>(`/reservations/${id}`, { phone })
}

/**
 * 获取赠品档位列表
 */
export interface GiftTier {
  id: number
  minAmount: number
  giftName: string
  giftCost?: number
}

export const getGiftTiers = () => {
  return get<GiftTier[]>('/gift-tiers')
}

/**
 * 根据金额匹配赠品
 */
export const matchGiftTier = (amount: number, giftTiers: GiftTier[]): GiftTier | null => {
  if (!giftTiers || giftTiers.length === 0) return null
  // 按金额降序排列后匹配
  const sorted = [...giftTiers].sort((a, b) => b.minAmount - a.minAmount)
  return sorted.find(tier => amount >= tier.minAmount) || null
}

/**
 * 【2026-01-20新增】获取推销员的客户预约列表
 * 推销员查看通过自己链接提交的所有客户预约
 */
export const getAgentOrders = (params: {
  agentId: number
  page?: number
  pageSize?: number
  status?: number | number[]
}) => {
  const queryParams: Record<string, unknown> = {
    agentId: params.agentId,
    page: params.page,
    pageSize: params.pageSize
  }
  if (params.status !== undefined) {
    queryParams.status = Array.isArray(params.status) ? params.status.join(',') : params.status
  }
  return get<{
    list: Reservation[]
    total: number
    page: number
    pageSize: number
  }>('/reservations/agent-orders', queryParams)
}

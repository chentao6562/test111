/**
 * 锁价相关API
 * @since 2026-01-21
 */

import { get, post } from './index'

// 锁价状态枚举
export const PriceLockStatus = {
  ACTIVE: 'ACTIVE',     // 生效中
  USED: 'USED',         // 已使用
  EXPIRED: 'EXPIRED',   // 已过期
} as const

export type PriceLockStatusType = typeof PriceLockStatus[keyof typeof PriceLockStatus]

// 状态标签
export const PriceLockStatusLabels: Record<string, string> = {
  ACTIVE: '生效中',
  USED: '已使用',
  EXPIRED: '已过期',
}

// 状态颜色
export const PriceLockStatusColors: Record<string, string> = {
  ACTIVE: '#4CAF50',   // 绿色
  USED: '#9E9E9E',     // 灰色
  EXPIRED: '#9E9E9E',  // 灰色
}

// 锁定商品项
export interface LockedItem {
  productId: number
  productName: string
  lockedPrice: number
  originalPrice: number
  quantity: number
  unit: string
}

// 锁价详情
export interface PriceLockDetail {
  id: number
  code: string
  customerPhone: string
  customerName: string | null
  lockedItems: LockedItem[]
  totalAmount: number
  status: PriceLockStatusType
  expireAt: string
  remainingSeconds: number
  createdAt: string
}

// 锁价配置
export interface PriceLockConfig {
  enabled: boolean
  lockHours: number
  minAmount: number | null
  activeConfig: {
    id: number
    name: string
    lockHours: number
    minAmount: number | null
    startTime: string | null
    endTime: string | null
  } | null
}

/**
 * 获取锁价配置
 */
export const getPriceLockConfig = async (): Promise<PriceLockConfig> => {
  const res = await get<PriceLockConfig>('/price-lock/config')
  return res.data
}

/**
 * 创建锁价
 */
export const createPriceLock = async (data: {
  customerPhone: string
  customerName?: string
  salespersonId?: number
  items: LockedItem[]
}): Promise<{ code: string }> => {
  const res = await post<{ code: string }>('/price-lock/create', data)
  return res.data
}

/**
 * 获取锁价详情
 */
export const getPriceLockDetail = async (code: string): Promise<PriceLockDetail | null> => {
  const res = await get<PriceLockDetail>(`/price-lock/${code}`)
  return res.data
}

/**
 * 获取我的锁价列表
 */
export const getMyPriceLocks = async (customerPhone: string): Promise<PriceLockDetail[]> => {
  const res = await get<PriceLockDetail[]>('/price-lock/my', { customerPhone })
  return res.data || []
}

/**
 * 获取当前有效的锁价
 */
export const getActivePriceLock = async (customerPhone: string): Promise<PriceLockDetail | null> => {
  const res = await get<PriceLockDetail | null>('/price-lock/active', { customerPhone })
  return res.data
}

/**
 * 验证锁价码
 */
export const validatePriceLock = async (code: string, customerPhone: string): Promise<{
  id: number
  code: string
  lockedItems: LockedItem[]
  totalAmount: number
  expireAt: string
}> => {
  const res = await post<{
    id: number
    code: string
    lockedItems: LockedItem[]
    totalAmount: number
    expireAt: string
  }>('/price-lock/validate', { code, customerPhone })
  return res.data
}

/**
 * 格式化剩余时间
 */
export const formatRemainingTime = (seconds: number): string => {
  if (seconds <= 0) return '已过期'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}小时${minutes}分${secs}秒`
  } else if (minutes > 0) {
    return `${minutes}分${secs}秒`
  } else {
    return `${secs}秒`
  }
}

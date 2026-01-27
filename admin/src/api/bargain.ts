/**
 * 砍价活动管理API
 * @since 2026-01-22
 */

import request from './request'

// 砍价状态
export const BargainStatus = {
  BARGAINING: 'BARGAINING',
  SUCCESS: 'SUCCESS',
  ORDERED: 'ORDERED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const

export type BargainStatusType = typeof BargainStatus[keyof typeof BargainStatus]

// 状态标签
export const BargainStatusLabels: Record<string, string> = {
  BARGAINING: '砍价中',
  SUCCESS: '砍价成功',
  ORDERED: '已下单',
  EXPIRED: '已过期',
  CANCELLED: '已取消',
}

// 黑名单类型
export const BlacklistType = {
  PHONE: 'PHONE',
  IP: 'IP',
  DEVICE: 'DEVICE',
} as const

// 黑名单类型标签
export const BlacklistTypeLabels: Record<string, string> = {
  PHONE: '手机号',
  IP: 'IP地址',
  DEVICE: '设备ID',
}

// 砍价活动配置
export interface BargainConfig {
  id: number
  name: string
  startTime: string
  endTime: string
  bargainHours: number
  minBargainCount: number
  maxBargainCount: number
  newUserBonus: number
  costBearerType: string
  agentBearRatio: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  items?: BargainConfigItem[]
}

// 砍价商品配置
export interface BargainConfigItem {
  id?: number
  productId: number
  productName?: string
  originalPrice: number
  floorPrice: number
  bargainStock: number
  soldCount?: number
  limitPerUser: number
  sort: number
}

// 砍价活动数据
export interface BargainItem {
  id: number
  code: string
  initiatorPhone: string
  initiatorName: string | null
  productId: number
  productName: string
  originalPrice: number
  floorPrice: number
  currentPrice: number
  totalCut: number
  cutCount: number
  status: BargainStatusType
  reachedFloor: boolean
  salespersonId: number | null
  salespersonName: string | null
  reservationNo: string | null
  expireAt: string
  createdAt: string
}

// 砍价统计
export interface BargainStats {
  totalBargains: number
  bargainingCount: number
  successCount: number
  orderedCount: number
  expiredCount: number
  cancelledCount: number
  totalCutAmount: number
  platformCost: number
  agentCost: number
}

// 黑名单记录
export interface BlacklistItem {
  id: number
  type: string
  value: string
  reason: string | null
  expireAt: string | null
  createdAt: string
}

// ========== 活动配置API ==========

/**
 * 创建活动配置
 */
export const createConfig = (data: {
  name: string
  startTime: string
  endTime: string
  bargainHours?: number
  minBargainCount?: number
  maxBargainCount?: number
  newUserBonus?: number
  costBearerType?: string
  agentBearRatio?: number
  items: Omit<BargainConfigItem, 'id' | 'productName' | 'soldCount'>[]
}) => {
  return request.post('/admin/bargain/config', data)
}

/**
 * 获取活动配置列表
 */
export const getConfigList = (params?: { page?: number; pageSize?: number; status?: string }) => {
  return request.get<{ list: BargainConfig[]; total: number }>('/admin/bargain/configs', { params })
}

/**
 * 获取活动配置详情
 */
export const getConfigDetail = (id: number) => {
  return request.get<BargainConfig>(`/admin/bargain/config/${id}`)
}

/**
 * 更新活动配置
 */
export const updateConfig = (
  id: number,
  data: {
    name?: string
    startTime?: string
    endTime?: string
    bargainHours?: number
    minBargainCount?: number
    maxBargainCount?: number
    newUserBonus?: number
    costBearerType?: string
    agentBearRatio?: number
    isActive?: boolean
    items?: Omit<BargainConfigItem, 'productName' | 'soldCount'>[]
  }
) => {
  return request.put(`/admin/bargain/config/${id}`, data)
}

/**
 * 删除活动配置
 */
export const deleteConfig = (id: number) => {
  return request.delete(`/admin/bargain/config/${id}`)
}

/**
 * 启用/禁用活动
 */
export const toggleConfig = (id: number) => {
  return request.post(`/admin/bargain/config/${id}/toggle`)
}

// ========== 砍价数据API ==========

/**
 * 获取砍价统计
 */
export const getStats = (params?: { configId?: number; startDate?: string; endDate?: string }) => {
  return request.get<BargainStats>('/admin/bargain/stats', { params })
}

/**
 * 获取砍价列表
 */
export const getBargainList = (params?: {
  page?: number
  pageSize?: number
  status?: string
  configId?: number
  phone?: string
  code?: string
}) => {
  return request.get<{ list: BargainItem[]; total: number }>('/admin/bargain/list', { params })
}

/**
 * 获取砍价详情
 */
export const getBargainDetail = (id: number) => {
  return request.get<any>(`/admin/bargain/${id}`)
}

// ========== 黑名单API ==========

/**
 * 获取黑名单列表
 */
export const getBlacklist = (params?: { page?: number; pageSize?: number; type?: string }) => {
  return request.get<{ list: BlacklistItem[]; total: number }>('/admin/bargain/blacklist', { params })
}

/**
 * 添加黑名单
 */
export const addBlacklist = (data: { type: string; value: string; reason?: string; expireHours?: number }) => {
  return request.post('/admin/bargain/blacklist', data)
}

/**
 * 移除黑名单
 */
export const removeBlacklist = (id: number) => {
  return request.delete(`/admin/bargain/blacklist/${id}`)
}

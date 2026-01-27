/**
 * 大转盘活动管理API
 * @since 2026-01-23
 */

import request from './request'

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

// 兑换状态
export const RedeemStatus = {
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  PENDING: 'PENDING',
} as const

// 兑换状态标签
export const RedeemStatusLabels: Record<string, string> = {
  SUCCESS: '成功',
  FAILED: '失败',
  PENDING: '处理中',
}

// 大转盘配置
export interface SpinWheelConfig {
  id: number
  name: string
  description: string | null
  startTime: string
  endTime: string
  redeemThreshold: number
  maxDailyHelp: number
  fragmentExpireDays: number
  newUserHelpMin: number
  newUserHelpMax: number
  oldUserHelpMin: number
  oldUserHelpMax: number
  prizes: any[]
  isActive: boolean
  createdAt: string
  updatedAt: string
  // 统计数据
  participantCount?: number
  totalAmount?: number
}

// 参与记录
export interface Participation {
  id: number
  code: string
  phone: string
  agentId: number | null
  configId: number
  totalAmount: number
  remainingSpins: number
  status: string
  createdAt: string
  config?: { name: string }
  agent?: { name: string; phone: string }
}

// 兑换记录
export interface RedeemRecord {
  id: number
  participationId: number
  configId: number
  redeemAmount: number
  couponId: number | null
  status: string
  createdAt: string
  participation?: { phone: string; code: string; totalAmount: number }
  config?: { name: string }
  coupon?: { id: number; couponNo: string; amount: number; status: string }
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

// 统计数据
export interface SpinWheelStats {
  overview: {
    totalParticipants: number
    totalSpins: number
    totalHelps: number
    totalRedeems: number
    totalRedeemedAmount: number
  }
  today: {
    participants: number
    spins: number
    helps: number
  }
  dailyTrend: Array<{ date: string; participantCount: number }>
}

// ========== 活动配置API ==========

/**
 * 创建活动配置
 */
export const createConfig = (data: {
  name: string
  description?: string
  startTime: string
  endTime: string
  redeemThreshold?: number
  maxDailyHelp?: number
  fragmentExpireDays?: number
  newUserHelpMin?: number
  newUserHelpMax?: number
  oldUserHelpMin?: number
  oldUserHelpMax?: number
  prizes?: any[]
  isActive?: boolean
}) => {
  return request.post('/admin/spin-wheel/config', data)
}

/**
 * 获取活动配置列表
 */
export const getConfigList = (params?: { page?: number; pageSize?: number; isActive?: string; keyword?: string }) => {
  return request.get<{ list: SpinWheelConfig[]; total: number }>('/admin/spin-wheel/configs', { params })
}

/**
 * 获取活动配置详情
 */
export const getConfigDetail = (id: number) => {
  return request.get<SpinWheelConfig>(`/admin/spin-wheel/config/${id}`)
}

/**
 * 更新活动配置
 */
export const updateConfig = (
  id: number,
  data: {
    name?: string
    description?: string
    startTime?: string
    endTime?: string
    redeemThreshold?: number
    maxDailyHelp?: number
    fragmentExpireDays?: number
    newUserHelpMin?: number
    newUserHelpMax?: number
    oldUserHelpMin?: number
    oldUserHelpMax?: number
    prizes?: any[]
    isActive?: boolean
  }
) => {
  return request.put(`/admin/spin-wheel/config/${id}`, data)
}

/**
 * 删除活动配置
 */
export const deleteConfig = (id: number) => {
  return request.delete(`/admin/spin-wheel/config/${id}`)
}

/**
 * 启用/禁用活动
 */
export const toggleConfig = (id: number) => {
  return request.post(`/admin/spin-wheel/config/${id}/toggle`)
}

// ========== 统计数据API ==========

/**
 * 获取统计数据
 */
export const getStats = (params?: { configId?: number; startDate?: string; endDate?: string }) => {
  return request.get<SpinWheelStats>('/admin/spin-wheel/stats', { params })
}

// ========== 参与数据API ==========

/**
 * 获取参与列表
 */
export const getParticipationList = (params?: {
  page?: number
  pageSize?: number
  configId?: number
  phone?: string
  status?: string
}) => {
  return request.get<{ list: Participation[]; total: number }>('/admin/spin-wheel/participations', { params })
}

/**
 * 获取参与详情
 */
export const getParticipationDetail = (id: number) => {
  return request.get<any>(`/admin/spin-wheel/participation/${id}`)
}

// ========== 兑换管理API ==========

/**
 * 获取兑换列表
 */
export const getRedeemList = (params?: {
  page?: number
  pageSize?: number
  configId?: number
  status?: string
  phone?: string
}) => {
  return request.get<{ list: RedeemRecord[]; total: number }>('/admin/spin-wheel/redeems', { params })
}

/**
 * 获取兑换详情
 */
export const getRedeemDetail = (id: number) => {
  return request.get<any>(`/admin/spin-wheel/redeem/${id}`)
}

/**
 * 重试兑换
 */
export const retryRedeem = (id: number) => {
  return request.post(`/admin/spin-wheel/redeem/${id}/retry`)
}

// ========== 黑名单API ==========

/**
 * 获取黑名单列表
 */
export const getBlacklist = (params?: { page?: number; pageSize?: number; type?: string; keyword?: string }) => {
  return request.get<{ list: BlacklistItem[]; total: number }>('/admin/spin-wheel/blacklist', { params })
}

/**
 * 添加黑名单
 */
export const addBlacklist = (data: { type: string; value: string; reason?: string; expireAt?: string }) => {
  return request.post('/admin/spin-wheel/blacklist', data)
}

/**
 * 移除黑名单
 */
export const removeBlacklist = (id: number) => {
  return request.delete(`/admin/spin-wheel/blacklist/${id}`)
}

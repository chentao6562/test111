/**
 * 管理后台客户风控API
 * 【2026-01-16 预约模式升级】规范化API层
 */

import { request } from './request'

// 风险等级（与后端 CustomerRiskLevel 一致）
export const RiskLevel = {
  NORMAL: 0,      // 正常
  HAS_RECORD: 1,  // 有记录（曾爽约1次）
  HIGH_RISK: 2,   // 高风险（曾爽约2次）
  BLACKLIST: 3,   // 黑名单（曾爽约3次或手动拉黑）
} as const

// 风险等级配置【2026-01-17修复】与后端定义一致
export const RISK_LEVELS: Record<number, { label: string; color: string }> = {
  0: { label: '正常', color: 'success' },
  1: { label: '有记录', color: 'primary' },
  2: { label: '高风险', color: 'warning' },
  3: { label: '黑名单', color: 'danger' },
}

// 客户记录类型
export interface CustomerRecord {
  id: number
  phone: string
  totalReservations: number
  completedCount: number
  noShowCount: number
  cancelCount: number
  riskLevel: number
  isBlocked: boolean
  blockedReason?: string
  blockedAt?: string
  lastReservationAt?: string
  createdAt: string
  updatedAt: string
}

// 客户列表参数
export interface CustomerListParams {
  page?: number
  pageSize?: number
  phone?: string
  riskLevel?: number
  isBlocked?: boolean
}

// 客户列表结果
export interface CustomerListResult {
  list: CustomerRecord[]
  total: number
  page: number
  pageSize: number
}

// 客户统计
export interface CustomerStats {
  total: number
  normal: number
  lowRisk: number
  mediumRisk: number
  highRisk: number
  blocked: number
}

/**
 * 获取客户统计
 */
export async function getCustomerStats(): Promise<CustomerStats> {
  const res = await request.get<CustomerStats>('/admin/customers/stats')
  return res.data
}

/**
 * 获取客户列表
 */
export async function getCustomerList(params: CustomerListParams): Promise<CustomerListResult> {
  const res = await request.get<CustomerListResult>('/admin/customers', { params })
  return res.data
}

/**
 * 获取客户详情
 */
export async function getCustomerDetail(id: number): Promise<CustomerRecord> {
  const res = await request.get<CustomerRecord>(`/admin/customers/${id}`)
  return res.data
}

/**
 * 拉黑客户
 */
export async function blockCustomer(id: number, reason?: string): Promise<void> {
  await request.post(`/admin/customers/${id}/block`, { reason })
}

/**
 * 解除黑名单
 */
export async function unblockCustomer(id: number): Promise<void> {
  await request.post(`/admin/customers/${id}/unblock`)
}

/**
 * 重置客户风险等级
 */
export async function resetCustomerRisk(id: number): Promise<void> {
  await request.post(`/admin/customers/${id}/reset-risk`)
}

/**
 * 获取客户预约历史
 */
export async function getCustomerReservations(phone: string, params?: {
  page?: number
  pageSize?: number
}): Promise<{
  list: any[]
  total: number
}> {
  const res = await request.get('/admin/customers/reservations', {
    params: { phone, ...params }
  })
  return res.data
}

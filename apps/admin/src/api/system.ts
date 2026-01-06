import { get, put, post } from '@/utils/request'
import type { PageResult } from '@/utils/request'

// 配置接口
export interface Config {
  id: number
  key: string
  value: string
  name?: string
  group: string
  description?: string
  type: string
}

// 管理员接口
export interface Admin {
  id: number
  username: string
  name?: string
  phone?: string
  avatar?: string
  role: number
  status: number
  lastLoginAt?: string
  createdAt: string
}

// 员工接口
export interface Employee {
  id: number
  phone: string
  name: string
  avatar?: string
  role: 'warehouse' | 'porter'
  balance: number
  totalIncome: number
  status: number
  createdAt: string
}

// 获取系统配置
export function getSystemConfig() {
  return get<Config[]>('/admin/system/config')
}

// 获取分组配置
export function getConfigByGroup(group: string) {
  return get<Config[]>(`/admin/system/config/${group}`)
}

// 更新配置
export function updateConfig(data: { items: { key: string; value: string }[] }) {
  return put('/admin/system/config', data)
}

// 获取管理员列表
export function getAdminList(params?: {
  page?: number
  pageSize?: number
}) {
  return get<PageResult<Admin>>('/admin/system/admin/list', params)
}

// 获取员工列表
export function getEmployeeList(params?: {
  page?: number
  pageSize?: number
  role?: string
}) {
  return get<PageResult<Employee>>('/admin/system/employee/list', params)
}

// 获取员工统计
export function getEmployeeStats() {
  return get('/admin/system/employee/stats')
}

// 创建员工
export function createEmployee(data: Partial<Employee>) {
  return post('/admin/system/employee', data)
}

// 更新员工
export function updateEmployee(id: number, data: Partial<Employee>) {
  return put(`/admin/system/employee/${id}`, data)
}

// 更新系统配置
export function updateSystemConfig(data: Record<string, any>) {
  return put('/admin/system/config', data)
}

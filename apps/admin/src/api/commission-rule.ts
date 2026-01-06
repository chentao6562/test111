import { get, post, put, del } from '@/utils/request'
import type { PageResult } from '@/utils/request'

// 分润规则接口
export interface CommissionRule {
  id: number
  name: string
  minAmount: string
  maxAmount: string | null
  level1Rate: string
  level2Rate: string
  sort: number
  status: number
  createdAt: string
  updatedAt: string
}

// 创建分润规则DTO
export interface CreateCommissionRuleDto {
  name: string
  minAmount: number
  maxAmount?: number | null
  level1Rate: number
  level2Rate: number
  sort?: number
  status?: number
}

// 更新分润规则DTO
export interface UpdateCommissionRuleDto {
  name?: string
  minAmount?: number
  maxAmount?: number | null
  level1Rate?: number
  level2Rate?: number
  sort?: number
  status?: number
}

// 查询参数
export interface QueryCommissionRuleDto {
  page?: number
  pageSize?: number
  status?: number
}

// 获取分润规则列表
export function getCommissionRuleList(params?: QueryCommissionRuleDto) {
  return get<PageResult<CommissionRule>>('/admin/commission-rule/list', params)
}

// 获取分润规则详情
export function getCommissionRuleDetail(id: number) {
  return get<CommissionRule>(`/admin/commission-rule/${id}`)
}

// 创建分润规则
export function createCommissionRule(data: CreateCommissionRuleDto) {
  return post<CommissionRule>('/admin/commission-rule', data)
}

// 更新分润规则
export function updateCommissionRule(id: number, data: UpdateCommissionRuleDto) {
  return put<void>(`/admin/commission-rule/${id}`, data)
}

// 删除分润规则
export function deleteCommissionRule(id: number) {
  return del<void>(`/admin/commission-rule/${id}`)
}

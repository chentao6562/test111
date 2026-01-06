import { get, put } from '@/utils/request'
import type { PageResult } from '@/utils/request'

// 代理商接口
export interface Agent {
  id: number
  phone: string
  nickname?: string
  avatar?: string
  realName?: string
  idCard?: string
  agentLevel: number
  agentStatus: number
  parentId?: number
  inviteCode?: string
  balance: number
  totalIncome: number
  frozenAmount: number
  status: number
  agentAt?: string
  createdAt: string
  parent?: {
    id: number
    nickname: string
    phone: string
  }
}

// 获取代理商列表
export function getAgentList(params?: {
  page?: number
  pageSize?: number
  agentLevel?: number
  agentStatus?: number
  keyword?: string
}) {
  return get<PageResult<Agent>>('/admin/agent/list', params)
}

// 获取代理商详情
export function getAgentDetail(id: number) {
  return get<Agent>(`/admin/agent/${id}`)
}

// 审核代理商
export function auditAgent(id: number, data: { status: number; reason?: string }) {
  return put(`/admin/agent/${id}/audit`, data)
}

// 更新代理商状态
export function updateAgentStatus(id: number, status: number) {
  return put(`/admin/agent/${id}/status`, { status })
}

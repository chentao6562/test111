import request from './request'

// 代理商类型
export interface Agent {
  id: number
  phone: string
  name: string
  avatar: string | null
  type: string
  status: string
  inviteCode: string
  balance: string
  totalCommission: string
  commissionMethod: string // 分润方式: RATE(按比例), PRICE_DIFF(进货差价)
  createdAt: string
  updatedAt: string
  parent?: {
    id: number
    name: string
    phone: string
  } | null
  _count?: {
    children: number
    orders: number
  }
  orderStats?: {
    totalAmount: number
    totalCount: number
    monthAmount: number
    monthCount: number
  }
}

// 代理商列表响应
export interface AgentListResponse {
  list: Agent[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 代理商统计
export interface AgentStatistics {
  total: number
  active: number
  pending: number
  disabled: number
  byType: Record<string, number>
}

// 查询参数
export interface AgentQueryParams {
  page?: number
  pageSize?: number
  keyword?: string
  type?: string
  status?: string
  parentId?: number
}

// 创建/更新代理商参数
export interface AgentFormData {
  phone?: string
  password?: string
  name?: string
  type?: string
  status?: string
  parentId?: number | null
  avatar?: string
  commissionMethod?: string // 分润方式: RATE(按比例), PRICE_DIFF(进货差价)
}

// 获取代理商列表
export function getAgentList(params: AgentQueryParams) {
  return request.get<AgentListResponse>('/admin/agents', { params })
}

// 获取代理商详情
export function getAgentDetail(id: number) {
  return request.get<Agent>(`/admin/agents/${id}`)
}

// 获取代理商统计
export function getAgentStatistics() {
  return request.get<AgentStatistics>('/admin/agents/statistics')
}

// 创建代理商
export function createAgent(data: AgentFormData) {
  return request.post<Agent>('/admin/agents', data)
}

// 更新代理商
export function updateAgent(id: number, data: AgentFormData) {
  return request.put<Agent>(`/admin/agents/${id}`, data)
}

// 更新代理商状态
export function updateAgentStatus(id: number, status: string) {
  return request.put<Agent>(`/admin/agents/${id}/status`, { status })
}

// 重置代理商密码
export function resetAgentPassword(id: number, password: string) {
  return request.put<null>(`/admin/agents/${id}/password`, { password })
}

// 获取代理商下级团队
export function getAgentTeam(id: number, params?: AgentQueryParams) {
  return request.get<AgentListResponse>(`/admin/agents/${id}/team`, { params })
}

// 删除代理商
export function deleteAgent(id: number) {
  return request.delete<null>(`/admin/agents/${id}`)
}

// 推销员类型映射
export const AGENT_TYPES: Record<string, { label: string; color: string }> = {
  LEVEL1: { label: '一级推销员', color: 'warning' },
  LEVEL2: { label: '二级推销员', color: 'primary' },
  WHOLESALE: { label: '普通用户', color: 'default' },
}

// 代理商状态映射
export const AGENT_STATUSES: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: '正常运营', color: 'success' },
  PENDING: { label: '待审核', color: 'warning' },
  DISABLED: { label: '已禁用', color: 'error' },
}

// 分润方式映射
export const COMMISSION_METHODS: Record<string, { label: string; description: string }> = {
  RATE: { label: '按比例', description: '分润金额 = 订单金额 × 分润比例' },
  PRICE_DIFF: { label: '进货差价', description: '分润金额 = Σ(零售价 - 代理价) × 数量' },
}

// 推销员定价类型（后端返回扁平化结构）
export interface AgentPrice {
  id: number
  agentId: number
  agentName: string
  agentPhone: string
  agentType: string
  productId: number
  productName: string
  productImage: string | string[]
  supplyPrice: number
  suggestedPrice: number | null
  retailPrice: number | null
  subPrice: number | null
  updatedAt: string
  // 为模板兼容保留嵌套结构
  agent?: {
    id?: number
    name?: string
    phone?: string
    type?: string
  }
  product?: {
    id?: number
    name?: string
    images?: string | string[]
    supplyPrice?: string | number
    suggestedPrice?: string | number | null
  }
}

// 推销员定价列表响应
export interface AgentPriceListResponse {
  list: AgentPrice[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 推销员定价查询参数
export interface AgentPriceQueryParams {
  page?: number
  pageSize?: number
  agentId?: number
  productId?: number
  keyword?: string
}

// 获取推销员定价列表
export function getAgentPrices(params: AgentPriceQueryParams) {
  return request.get<AgentPriceListResponse>('/admin/agent-prices', { params })
}

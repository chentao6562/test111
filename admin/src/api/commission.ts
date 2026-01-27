import request from './request'

// 分润规则
export function getRules() {
  return request.get('/admin/commission/rules')
}

export function createRule(data: {
  minAmount: number
  level1Rate: number
  level2Rate: number
}) {
  return request.post('/admin/commission/rules', data)
}

export function updateRule(id: number, data: {
  minAmount?: number
  level1Rate?: number
  level2Rate?: number
  status?: string
}) {
  return request.put(`/admin/commission/rules/${id}`, data)
}

export function deleteRule(id: number) {
  return request.delete(`/admin/commission/rules/${id}`)
}

// 分润统计
export function getStatistics() {
  return request.get('/admin/commission/statistics')
}

// 分润记录
export function getRecords(params: {
  page?: number
  pageSize?: number
  keyword?: string
  type?: string
  status?: string
  startDate?: string
  endDate?: string
}) {
  return request.get('/admin/commission/records', { params })
}

// 【2026-01-20 新增】分润记录详情
export function getRecordDetail(id: number) {
  return request.get(`/admin/commission/records/${id}`)
}

// 批量结算
export function settleCommissions(ids?: number[]) {
  return request.post('/admin/commission/settle', { ids })
}

// 提现申请
export function getWithdrawals(params: {
  page?: number
  pageSize?: number
  status?: string
  keyword?: string
}) {
  return request.get('/admin/commission/withdrawals', { params })
}

export function reviewWithdrawal(id: number, data: {
  action: 'approve' | 'reject'
  reason?: string
}) {
  return request.post(`/admin/commission/withdrawals/${id}/review`, data)
}

// 【Task 2.1】确认提现打款完成
export function completeWithdrawal(id: number, data?: {
  remark?: string
}) {
  return request.post(`/admin/commission/withdrawals/${id}/complete`, data || {})
}

// 提现详情（包含代理商分润统计）
export function getWithdrawalDetail(id: number) {
  return request.get(`/admin/commission/withdrawals/${id}`)
}

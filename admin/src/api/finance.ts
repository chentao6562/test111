import request from './request'

// 获取财务统计
export function getFinanceStatistics() {
  return request.get('/admin/finance/statistics')
}

// 获取加款申请列表
export function getRechargeList(params: {
  page?: number
  pageSize?: number
  status?: string
  keyword?: string
  startDate?: string
  endDate?: string
}) {
  return request.get('/admin/finance/recharges', { params })
}

// 获取加款申请详情
export function getRechargeDetail(id: number) {
  return request.get(`/admin/finance/recharges/${id}`)
}

// 审核加款申请
export function reviewRecharge(id: number, data: { action: 'approve' | 'reject', rejectReason?: string }) {
  return request.post(`/admin/finance/recharges/${id}/review`, data)
}

// 获取资金流水列表
export function getFundFlowList(params: {
  page?: number
  pageSize?: number
  type?: string
  agentId?: number
  keyword?: string
  startDate?: string
  endDate?: string
}) {
  return request.get('/admin/finance/flows', { params })
}

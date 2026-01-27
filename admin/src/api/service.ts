import request from './request'

// 获取客服统计
export function getServiceStatistics() {
  return request.get('/admin/service/statistics')
}

// 获取异常类型列表
export function getExceptionTypes() {
  return request.get('/admin/service/exception-types')
}

// ========== 锁货申请 ==========

// 获取锁货申请列表
export function getLockStockList(params: {
  page?: number
  pageSize?: number
  status?: string
  keyword?: string
  startDate?: string
  endDate?: string
}) {
  return request.get('/admin/service/lockstock', { params })
}

// 获取锁货申请详情
export function getLockStockDetail(id: number) {
  return request.get(`/admin/service/lockstock/${id}`)
}

// 审核锁货申请
export function reviewLockStock(id: number, data: { action: 'approve' | 'reject', rejectReason?: string }) {
  return request.post(`/admin/service/lockstock/${id}/review`, data)
}

// ========== 异常工单 ==========

// 获取异常工单列表
export function getExceptionList(params: {
  page?: number
  pageSize?: number
  status?: string
  type?: string
  keyword?: string
  startDate?: string
  endDate?: string
}) {
  return request.get('/admin/service/exceptions', { params })
}

// 获取异常工单详情
export function getExceptionDetail(id: number) {
  return request.get(`/admin/service/exceptions/${id}`)
}

// 处理异常工单
export function resolveException(id: number, data: { resolution: string }) {
  return request.post(`/admin/service/exceptions/${id}/resolve`, data)
}

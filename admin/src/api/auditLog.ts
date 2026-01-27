import request from './request'

/**
 * 操作日志 API
 */

// 获取操作日志列表
export const getAuditLogs = (params?: {
  page?: number
  pageSize?: number
  userId?: number
  userType?: string
  action?: string
  module?: string
  startDate?: string
  endDate?: string
}) => {
  return request.get('/admin/audit-logs', { params })
}

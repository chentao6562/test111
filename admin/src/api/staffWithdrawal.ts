/**
 * 员工提现管理API
 */

import request from './request'

// 获取员工提现列表
export function getStaffWithdrawals(params: {
  page?: number
  pageSize?: number
  status?: string
  staffId?: number
}) {
  return request.get('/admin/staff-withdrawals', { params })
}

// 获取员工提现详情
export function getStaffWithdrawalDetail(id: number) {
  return request.get(`/admin/staff-withdrawals/${id}`)
}

// 获取员工提现统计
export function getStaffWithdrawalStats() {
  return request.get('/admin/staff-withdrawals/stats')
}

// 审核员工提现
export function reviewStaffWithdrawal(id: number, data: {
  action: 'APPROVED' | 'REJECTED'
  reason?: string
}) {
  return request.post(`/admin/staff-withdrawals/${id}/review`, data)
}

// 确认员工打款
export function completeStaffWithdrawal(id: number, data?: {
  remark?: string
}) {
  return request.post(`/admin/staff-withdrawals/${id}/complete`, data || {})
}

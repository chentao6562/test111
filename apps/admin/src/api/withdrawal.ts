import { get, put } from '@/utils/request'
import type { PageResult } from '@/utils/request'

// 提现记录接口
export interface Withdrawal {
  id: number
  withdrawNo: string
  userType: 'user' | 'porter'
  userId: number
  amount: number
  fee: number
  actualAmount: number
  bankName?: string
  bankAccount?: string
  bankHolder?: string
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  auditorId?: number
  auditAt?: string
  auditRemark?: string
  completedAt?: string
  createdAt: string
  user?: {
    id: number
    nickname: string
    phone: string
  }
}

// 获取提现列表
export function getWithdrawalList(params?: {
  page?: number
  pageSize?: number
  status?: string
  userType?: string
}) {
  return get<PageResult<Withdrawal>>('/admin/withdrawal/list', params)
}

// 审核提现
export function auditWithdrawal(id: number, data: { status: string; remark?: string }) {
  return put(`/admin/withdrawal/${id}/audit`, data)
}

// 获取提现统计
export function getWithdrawalStats() {
  return get('/admin/withdrawal/stats')
}

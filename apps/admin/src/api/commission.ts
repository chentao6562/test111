import { get } from '@/utils/request'
import type { PageResult } from '@/utils/request'

// 分润记录接口
export interface Commission {
  id: number
  userId: number
  orderId: number
  orderNo: string
  fromUserId: number
  orderAmount: number
  commissionRate: number
  commissionAmount: number
  level: number
  status: number
  settledAt?: string
  createdAt: string
  user?: {
    id: number
    nickname: string
    phone: string
  }
  fromUser?: {
    id: number
    nickname: string
    phone: string
  }
}

// 获取分润列表
export function getCommissionList(params?: {
  page?: number
  pageSize?: number
  status?: number
  userId?: number
}) {
  return get<PageResult<Commission>>('/admin/commission/list', params)
}

// 获取分润统计
export function getCommissionStats() {
  return get('/admin/commission/stats')
}

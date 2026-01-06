import { get, put } from '@/utils/request'
import type { PageResult } from '@/utils/request'

// 订单接口
export interface Order {
  id: number
  orderNo: string
  userId: number
  goodsAmount: number
  lockFee: number
  discountAmount: number
  payAmount: number
  paidAmount: number
  pickupType: 'store' | 'lock'
  contactName?: string
  contactPhone?: string
  contactAddress?: string
  pickupCode?: string
  status: string
  payStatus: number
  payType?: string
  remark?: string
  adminRemark?: string
  paidAt?: string
  preparedAt?: string
  completedAt?: string
  cancelledAt?: string
  createdAt: string
  items?: OrderItem[]
  user?: {
    id: number
    nickname: string
    phone: string
  }
}

export interface OrderItem {
  id: number
  productId: number
  productName: string
  productCover?: string
  productSpec?: string
  price: number
  quantity: number
  amount: number
}

// 获取订单列表
export function getOrderList(params?: {
  page?: number
  pageSize?: number
  status?: string
  orderNo?: string
  phone?: string
}) {
  return get<PageResult<Order>>('/order/list', params)
}

// 获取订单详情
export function getOrderDetail(id: number) {
  return get<Order>(`/order/detail/${id}`)
}

// 更新订单备注
export function updateOrderRemark(id: number, remark: string) {
  return put(`/admin/order/${id}/remark`, { remark })
}

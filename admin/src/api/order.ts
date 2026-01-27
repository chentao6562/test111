import request from './request'

// 订单商品项
export interface OrderItem {
  id: number
  productId: number
  productName: string
  productImage: string | null
  price: string
  quantity: number
  specs: string | null
  product?: {
    id: number
    name: string
    images: string
    unit: string
  }
}

// 移库任务
export interface TransferTask {
  id: number
  orderId: number
  logisticsId: number | null
  logistics?: {
    id: number
    name: string
    phone: string
  }
  status: string
  fee: string
  acceptedAt: string | null
  completedAt: string | null
}

// 订单类型
export interface Order {
  id: number
  orderNo: string
  agentId: number
  totalAmount: string
  paidAmount: string
  lockFee: string
  status: string
  contactName: string
  contactPhone: string
  pickupCode: string | null
  pickupTime: string | null
  pickedAt: string | null
  needTransfer: boolean
  transferFee: string
  transferFeeConfirmed?: boolean  // 移库费是否已确认
  transferFeeSetAt?: string | null  // 移库费设置时间
  remark: string | null
  adminRemark: string | null
  // 【财务流程调整】添加支付状态字段
  depositPaid?: boolean  // 是否已付定金
  fullPaid?: boolean     // 是否已付全款
  depositAmount?: string | null  // 定金金额
  createdAt: string
  updatedAt: string
  items: OrderItem[]
  agent?: {
    id: number
    name: string
    phone: string
    type: string
  }
  // 移库任务信息
  transferTask?: TransferTask
  // 【2026-01-13 多仓库支持】提货仓库
  warehouse?: {
    id: number
    name: string
    code: string
  }
}

// 订单列表响应
export interface OrderListResponse {
  list: Order[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 订单统计
export interface OrderStatistics {
  total: number
  pending: number
  processing: number
  completed: number
  cancelled: number
  today: {
    count: number
    amount: number
  }
  month: {
    count: number
    amount: number
  }
  byStatus: Record<string, number>
}

// 查询参数
export interface OrderQueryParams {
  page?: number
  pageSize?: number
  orderNo?: string
  keyword?: string
  status?: string
  agentId?: number
  startDate?: string
  endDate?: string
}

// 获取订单列表
export function getOrderList(params: OrderQueryParams) {
  return request.get<OrderListResponse>('/admin/orders', { params })
}

// 获取订单详情
export function getOrderDetail(id: number) {
  return request.get<Order>(`/admin/orders/${id}`)
}

// 获取订单统计
export function getOrderStatistics() {
  return request.get<OrderStatistics>('/admin/orders/statistics')
}

// 更新订单信息
export function updateOrder(id: number, data: {
  contactName?: string
  contactPhone?: string
  remark?: string
  adminRemark?: string
  needTransfer?: boolean
  transferFee?: number
  lockFee?: number
  pickupTime?: string
}) {
  return request.put<Order>(`/admin/orders/${id}`, data)
}

// 接单
export function acceptOrder(id: number, adminRemark?: string) {
  return request.put<Order>(`/admin/orders/${id}/accept`, { adminRemark })
}

// 更新订单状态
export function updateOrderStatus(id: number, status: string, adminRemark?: string) {
  return request.put<Order>(`/admin/orders/${id}/status`, { status, adminRemark })
}

// 取消订单
export function cancelOrder(id: number, reason?: string) {
  return request.put<Order>(`/admin/orders/${id}/cancel`, { reason })
}

// 完成备货
export function markPrepared(id: number) {
  return request.put<Order>(`/admin/orders/${id}/prepared`)
}

// 确认提货
export function confirmPickup(id: number, pickupCode: string) {
  return request.put<Order>(`/admin/orders/${id}/pickup`, { pickupCode })
}

// 确认收款（线下转账后客服确认）
export function confirmPayment(id: number, amount: number, remark?: string) {
  return request.post<Order>(`/admin/orders/${id}/confirm-payment`, { amount, remark })
}

// 设置移库费（客服与代理商协商后设置）
export function setTransferFee(id: number, transferFee: number, remark?: string) {
  return request.put<Order>(`/admin/orders/${id}/transfer-fee`, { transferFee, remark })
}

// 【2026-01-13 多仓库支持】指定订单提货仓库
export function assignWarehouse(id: number, warehouseId: number) {
  return request.put<Order>(`/admin/orders/${id}/warehouse`, { warehouseId })
}

// 订单状态映射
export const ORDER_STATUSES: Record<string, { label: string; color: string }> = {
  pending_payment: { label: '待付款', color: 'default' },
  pending_accept: { label: '待接单', color: 'warning' },
  preparing: { label: '备货中', color: 'primary' },
  pending_lock_fee: { label: '待付锁货费', color: 'warning' },
  pending_transfer: { label: '待移库', color: 'primary' },
  transferring: { label: '移库中', color: 'primary' },
  pending_pickup: { label: '待提货', color: 'success' },
  completed: { label: '已完成', color: 'success' },
  cancelled: { label: '已取消', color: 'default' },
}

// 支付状态判断
// 【2026-01-11简化】取消定金，只有已付款/未付款两种状态
export function getPaymentStatus(order: Order): { label: string; color: string } {
  if (order.status === 'cancelled') {
    return { label: '已取消', color: 'default' }
  }

  // 使用数据库中的 fullPaid 字段判断
  if (order.fullPaid) {
    return { label: '已付款', color: 'success' }
  }

  // 如果数据库字段不存在，使用金额判断（兼容旧数据）
  const paidAmount = Number(order.paidAmount)
  const totalAmount = Number(order.totalAmount)

  if (paidAmount >= totalAmount && totalAmount > 0) {
    return { label: '已付款', color: 'success' }
  }
  return { label: '未付款', color: 'default' }
}

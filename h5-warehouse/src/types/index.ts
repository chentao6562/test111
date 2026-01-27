// 订单状态类型
export type OrderStatus =
  | 'pending_payment'
  | 'pending_accept'
  | 'preparing'
  | 'pending_transfer'
  | 'transferring'
  | 'pending_pickup'
  | 'completed'
  | 'cancelled'

// 仓库信息【2026-01-13 多仓库支持】
export interface Warehouse {
  id: number
  name: string
  code: string
  address?: string
  contactPhone?: string
}

// 订单类型
export interface Order {
  id: string
  orderNo: string
  agentId: string
  agentName: string
  agentPhone: string
  status: OrderStatus
  fullPaid: boolean
  paidAmount: number
  totalAmount: number
  productAmount: number
  transferFee: number
  needTransfer: boolean
  pickupCode?: string
  transferCode?: string
  warehouseStaffId?: string
  logisticsStaffId?: string
  createdAt: string
  items: OrderItem[]
  warehouseId?: number  // 【2026-01-13 多仓库支持】
  warehouse?: Warehouse // 【2026-01-13 多仓库支持】
  agent?: { name?: string; phone?: string } // 【兼容旧格式】
}

// 订单商品
export interface OrderItem {
  id: string
  productId: string
  productName: string
  image: string
  quantity: number
  price: number
  subtotal: number
}

// 统计数据
export interface OrderStats {
  pendingAccept: number
  preparing: number
  pendingTransfer: number
  pendingPickup: number
}

// 今日操作统计
export interface TodayStats {
  todayAccepted: number
  todayPrepared: number
  todayPickup: number
}

// 库存商品
export interface StockProduct {
  id: string
  name: string
  image: string
  stock: number
  lockStock: number
  minStock: number
  barcode?: string
  sku?: string
}

// 核销记录
export interface PickupRecord {
  id: string
  orderNo: string
  agentName: string
  amount: number
  verifiedAt: string
  staffName: string
}

// 员工信息
export interface StaffInfo {
  id: string | number
  username: string
  name: string
  role: string
  phone?: string
  warehouseId?: number
  warehouse?: Warehouse
}

// 登录响应 - 兼容两种格式
export interface LoginResponse {
  token: string
  staff?: StaffInfo   // 旧格式
  userInfo?: StaffInfo  // 新格式
}

// API响应
export interface ApiResponse<T = any> {
  success: boolean
  data: T
  message?: string
}

// 分页参数
export interface PaginationParams {
  page: number
  pageSize: number
}

// 分页数据
export interface PaginatedData<T> {
  list?: T[]
  items?: T[]  // 后端有时返回items而不是list
  total: number
  page: number
  pageSize: number
  hasMore?: boolean
}

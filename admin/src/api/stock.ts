import request from './request'

// 库存项类型
export interface StockItem {
  id: number
  name: string
  images: string[]
  stock: number
  lockStock: number
  minStock: number
  unit: string
  category: {
    id: number
    name: string
  }
  status: string // NORMAL | WARNING | OUT_OF_STOCK
  totalIn: number
  totalOut: number
  salesCount?: number
  updatedAt: string
}

// 库存列表响应
export interface StockListResponse {
  items: StockItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 库存统计
export interface StockStatistics {
  totalStock: number
  warningCount: number
  outOfStockCount: number
  pendingOrderCount: number
  productCount: number
}

// 库存详情
export interface StockDetail extends StockItem {
  createdAt: string
}

// 库存日志
export interface StockLog {
  id: number
  productId: number
  type: string // IN | OUT | ADJUST
  quantity: number
  beforeStock: number
  afterStock: number
  orderId: number | null
  operatorId: number | null
  operatorName: string | null
  remark: string | null
  createdAt: string
  product?: {
    name: string
    unit: string
  }
}

// 库存日志列表响应
export interface StockLogResponse {
  items: StockLog[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 查询参数
export interface StockQueryParams {
  page?: number
  pageSize?: number
  keyword?: string
  categoryId?: number
  status?: string // NORMAL | WARNING | OUT_OF_STOCK
  sortBy?: string // stock | lockStock | salesCount
  sortOrder?: 'asc' | 'desc'
}

// 入库结果
export interface StockInResult {
  product: {
    id: number
    name: string
    stock: number
  }
  stockLog: StockLog
}

// 获取库存列表
export function getStockList(params: StockQueryParams) {
  return request.get<StockListResponse>('/admin/stock', { params })
}

// 获取库存统计
export function getStockStatistics() {
  return request.get<StockStatistics>('/admin/stock/statistics')
}

// 获取商品库存详情
export function getStockDetail(productId: number) {
  return request.get<StockDetail>(`/admin/stock/${productId}`)
}

// 获取库存变动记录
export function getStockLogs(productId: number, params?: { page?: number; pageSize?: number; type?: string }) {
  return request.get<StockLogResponse>(`/admin/stock/${productId}/logs`, { params })
}

// 入库操作
export function stockIn(data: { productId: number; quantity: number; remark?: string }) {
  return request.post<StockInResult>('/admin/stock/in', data)
}

// 库存调整
export function stockAdjust(data: { productId: number; adjustQuantity: number; reason: string }) {
  return request.post<StockInResult>('/admin/stock/adjust', data)
}

// 设置预警值
export function setStockWarning(productId: number, minStock: number) {
  return request.put<{ id: number; name: string; minStock: number; status: string }>(`/admin/stock/${productId}/warning`, { minStock })
}

// 库存状态映射
export const STOCK_STATUSES: Record<string, { label: string; color: string }> = {
  NORMAL: { label: '正常', color: 'success' },
  WARNING: { label: '预警', color: 'warning' },
  OUT_OF_STOCK: { label: '缺货', color: 'error' },
}

// 库存变动类型映射
export const STOCK_LOG_TYPES: Record<string, { label: string; color: string }> = {
  IN: { label: '入库', color: 'success' },
  OUT: { label: '出库', color: 'error' },
  ADJUST: { label: '调整', color: 'warning' },
}

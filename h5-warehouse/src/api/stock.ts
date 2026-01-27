import { request } from './request'
import type { StockProduct, PaginatedData, PaginationParams } from '@/types'

// 获取库存列表
export interface GetStockParams extends PaginationParams {
  search?: string
}

export function getStock(params: GetStockParams): Promise<PaginatedData<StockProduct>> {
  return request.get('/staff/stock', { params })
}

// 快速入库
export interface StockInParams {
  productId: string
  quantity: number
  remark?: string
}

export function stockIn(params: StockInParams): Promise<void> {
  return request.post('/staff/stock/in', params)
}

// 库存调整
export interface AdjustStockParams {
  productId: string
  adjustQuantity: number  // 正数增加，负数减少
  reason: string
}

export function adjustStock(params: AdjustStockParams): Promise<void> {
  return request.post('/staff/stock/adjust', params)
}

// 库存盘点
export interface InventoryCheckParams {
  productId: string
  actualStock: number  // 后端期望字段名是 actualStock
  remark?: string
}

export function inventoryCheck(params: InventoryCheckParams): Promise<void> {
  return request.post('/staff/stock/inventory-check', params)
}

// 按条码/SKU查询商品
export function getProduct(code: string): Promise<StockProduct> {
  return request.get('/staff/stock/product', { params: { code } })
}

// 获取库存统计
export interface StockStatistics {
  totalStock: number
  warningCount: number
  outOfStockCount: number
  pendingOrderCount: number
  productCount: number
  todayIn: number
}

export function getStockStatistics(): Promise<StockStatistics> {
  return request.get('/staff/stock/statistics')
}

// 库存日志类型
export interface StockLog {
  id: string
  productId: string
  productName?: string
  type: 'in' | 'out' | 'adjust_increase' | 'adjust_decrease' | 'inventory'
  quantity: number
  remark?: string
  operatorId?: string
  operatorName?: string
  createdAt: string
}

// 获取库存日志
export interface GetStockLogsParams extends PaginationParams {
  productId?: string
}

export function getStockLogs(params: GetStockLogsParams): Promise<PaginatedData<StockLog>> {
  return request.get('/staff/stock/logs', { params })
}

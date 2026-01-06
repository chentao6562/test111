import { get, post } from '@/utils/request'
import type { PageResult } from '@/utils/request'

// 库存接口
export interface Stock {
  id: number
  productId: number
  productName: string
  productCover?: string
  stock: number
  lockStock: number
  warningStock: number
  availableStock: number
}

// 获取库存总览
export function getInventoryOverview() {
  return get('/admin/inventory/overview')
}

// 获取库存列表
export function getInventoryList(params?: {
  page?: number
  pageSize?: number
  keyword?: string
  warning?: boolean
}) {
  return get<PageResult<Stock>>('/admin/inventory/list', params)
}

// 获取库存流水
export function getStockLogs(params?: {
  page?: number
  pageSize?: number
  productId?: number
  type?: string
}) {
  return get('/admin/inventory/logs', params)
}

// 调整库存
export function adjustStock(data: { productId: number; quantity: number; type: string; remark?: string }) {
  return post('/admin/inventory/adjust', data)
}

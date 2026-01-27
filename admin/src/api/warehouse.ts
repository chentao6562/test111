import request from './request'

/**
 * 仓库管理 API
 * 【2026-01-13 多仓库支持】
 */

// 仓库接口类型
export interface Warehouse {
  id: number
  name: string
  code: string
  province: string
  city: string
  district?: string
  address: string
  latitude?: number
  longitude?: number
  contactName?: string
  contactPhone: string
  businessHours?: string
  isDefault: boolean
  status: string
  sort: number
  createdAt: string
  updatedAt: string
  _count?: {
    staff: number
    orders: number
  }
}

// 获取仓库列表
export const getWarehouseList = (params?: {
  page?: number
  pageSize?: number
  keyword?: string
  status?: string
}) => {
  return request.get('/admin/warehouses', { params })
}

// 获取仓库详情
export const getWarehouseDetail = (id: number) => {
  return request.get(`/admin/warehouses/${id}`)
}

// 创建仓库
export const createWarehouse = (data: {
  name: string
  code: string
  province: string
  city: string
  district?: string
  address: string
  latitude?: number
  longitude?: number
  contactName?: string
  contactPhone: string
  businessHours?: string
  isDefault?: boolean
  sort?: number
}) => {
  return request.post('/admin/warehouses', data)
}

// 更新仓库
export const updateWarehouse = (id: number, data: {
  name?: string
  code?: string
  province?: string
  city?: string
  district?: string
  address?: string
  latitude?: number
  longitude?: number
  contactName?: string
  contactPhone?: string
  businessHours?: string
  isDefault?: boolean
  sort?: number
  status?: string
}) => {
  return request.put(`/admin/warehouses/${id}`, data)
}

// 删除仓库（软删除，改为停用）
export const deleteWarehouse = (id: number) => {
  return request.delete(`/admin/warehouses/${id}`)
}

// 设置默认仓库
export const setDefaultWarehouse = (id: number) => {
  return request.post(`/admin/warehouses/${id}/default`)
}

// 获取仓库统计
export const getWarehouseStats = () => {
  return request.get('/admin/warehouses/stats')
}

// 获取所有活跃仓库（下拉选择用）
export const getActiveWarehouses = () => {
  return request.get('/warehouses', { params: { status: 'ACTIVE' } })
}

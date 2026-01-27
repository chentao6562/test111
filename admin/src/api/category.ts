import request, { ApiResponse } from './request'

// 分类类型
export interface Category {
  id: number
  name: string
  icon: string | null
  sort: number
  status: 'ACTIVE' | 'INACTIVE'
  productCount?: number
  createdAt: string
  updatedAt: string
}

// 创建分类参数
export interface CreateCategoryParams {
  name: string
  icon?: string
  sort?: number
}

// 更新分类参数
export interface UpdateCategoryParams {
  name?: string
  icon?: string | null
  sort?: number
  status?: 'ACTIVE' | 'INACTIVE'
}

// 获取分类列表
export function getCategoryList(status?: string): Promise<ApiResponse<Category[]>> {
  return request.get('/admin/categories', { params: { status } })
}

// 获取分类详情
export function getCategoryDetail(id: number): Promise<ApiResponse<Category>> {
  return request.get(`/admin/categories/${id}`)
}

// 创建分类
export function createCategory(data: CreateCategoryParams): Promise<ApiResponse<Category>> {
  return request.post('/admin/categories', data)
}

// 更新分类
export function updateCategory(id: number, data: UpdateCategoryParams): Promise<ApiResponse<Category>> {
  return request.put(`/admin/categories/${id}`, data)
}

// 删除分类
export function deleteCategory(id: number): Promise<ApiResponse<null>> {
  return request.delete(`/admin/categories/${id}`)
}

// 切换分类状态
export function toggleCategoryStatus(id: number): Promise<ApiResponse<Category>> {
  return request.put(`/admin/categories/${id}/toggle`)
}

// 更新分类排序
export function updateCategorySort(ids: number[]): Promise<ApiResponse<null>> {
  return request.put('/admin/categories/sort', { ids })
}

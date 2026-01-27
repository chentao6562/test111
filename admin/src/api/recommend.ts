/**
 * 推荐商品管理API
 */

import request from './request'

export interface RecommendProduct {
  id: number
  productId: number
  product: {
    id: number
    name: string
    images: string
    retailPrice: number
    agentPrice: number
    stock: number
    lockStock: number
    salesCount: number
    status: string
  }
  type: 'HOT' | 'NEW' | 'FEATURED'
  title?: string
  subtitle?: string
  badge?: string
  sortOrder: number
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
  updatedAt: string
}

export interface RecommendListResponse {
  list: RecommendProduct[]
  total: number
  page: number
  pageSize: number
}

export interface CreateRecommendRequest {
  productId: number
  type: string
  title?: string
  subtitle?: string
  badge?: string
  sortOrder?: number
  status?: string
}

export interface UpdateRecommendRequest {
  type?: string
  title?: string
  subtitle?: string
  badge?: string
  sortOrder?: number
  status?: string
}

/**
 * 获取推荐商品列表
 */
export const getRecommendList = (params: {
  page?: number
  pageSize?: number
  type?: string
  status?: string
}) => {
  return request.get<RecommendListResponse>('/admin/recommends', { params })
}

/**
 * 获取单个推荐商品
 */
export const getRecommendById = (id: number) => {
  return request.get<RecommendProduct>(`/admin/recommends/${id}`)
}

/**
 * 创建推荐商品
 */
export const createRecommend = (data: CreateRecommendRequest) => {
  return request.post<RecommendProduct>('/admin/recommends', data)
}

/**
 * 更新推荐商品
 */
export const updateRecommend = (id: number, data: UpdateRecommendRequest) => {
  return request.put<RecommendProduct>(`/admin/recommends/${id}`, data)
}

/**
 * 删除推荐商品
 */
export const deleteRecommend = (id: number) => {
  return request.delete(`/admin/recommends/${id}`)
}

/**
 * 批量更新排序
 */
export const updateRecommendSort = (items: { id: number; sortOrder: number }[]) => {
  return request.post('/admin/recommends/sort', { items })
}

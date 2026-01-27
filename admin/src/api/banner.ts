/**
 * 代理商端Banner轮播图管理API
 */

import request from './request'

export interface Banner {
  id: number
  title: string
  subtitle?: string
  imageUrl: string
  linkType: 'PRODUCT' | 'CATEGORY' | 'URL' | 'NONE'
  linkValue?: string
  sortOrder: number
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
  updatedAt: string
}

export interface BannerListResponse {
  list: Banner[]
  total: number
  page: number
  pageSize: number
}

export interface CreateBannerRequest {
  title: string
  subtitle?: string
  imageUrl: string
  linkType: string
  linkValue?: string
  sortOrder?: number
  status?: string
}

export interface UpdateBannerRequest {
  title?: string
  subtitle?: string
  imageUrl?: string
  linkType?: string
  linkValue?: string
  sortOrder?: number
  status?: string
}

/**
 * 获取Banner列表（管理后台）
 */
export const getBannerList = (params: {
  page?: number
  pageSize?: number
  status?: string
}) => {
  return request.get<BannerListResponse>('/admin/banners', { params })
}

/**
 * 获取单个Banner
 */
export const getBannerById = (id: number) => {
  return request.get<Banner>(`/admin/banners/${id}`)
}

/**
 * 创建Banner
 */
export const createBanner = (data: CreateBannerRequest) => {
  return request.post<Banner>('/admin/banners', data)
}

/**
 * 更新Banner
 */
export const updateBanner = (id: number, data: UpdateBannerRequest) => {
  return request.put<Banner>(`/admin/banners/${id}`, data)
}

/**
 * 删除Banner
 */
export const deleteBanner = (id: number) => {
  return request.delete(`/admin/banners/${id}`)
}

/**
 * 批量更新排序
 */
export const updateBannerSort = (items: { id: number; sortOrder: number }[]) => {
  return request.post('/admin/banners/sort', { items })
}

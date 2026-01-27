/**
 * H5素材管理API
 */

import request from './request'

// ============ 轮播图管理 ============

export interface Banner {
  id: number
  title: string
  imageUrl: string
  linkType: 'PRODUCT' | 'CATEGORY' | 'URL' | 'NONE'
  linkValue?: string
  sort: number
  status: 'ACTIVE' | 'INACTIVE'
  startTime?: string
  endTime?: string
  createdBy: number
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
  imageUrl: string
  linkType: string
  linkValue?: string
  sort?: number
  status?: string
  startTime?: string
  endTime?: string
}

export interface UpdateBannerRequest {
  title?: string
  imageUrl?: string
  linkType?: string
  linkValue?: string
  sort?: number
  status?: string
  startTime?: string | null
  endTime?: string | null
}

/**
 * 获取轮播图列表
 */
export const getBanners = (params: {
  page?: number
  pageSize?: number
  status?: string
}) => {
  return request.get<BannerListResponse>('/h5/admin/banners', { params })
}

/**
 * 创建轮播图
 */
export const createBanner = (data: CreateBannerRequest) => {
  return request.post<Banner>('/h5/admin/banners', data)
}

/**
 * 更新轮播图
 */
export const updateBanner = (id: number, data: UpdateBannerRequest) => {
  return request.put<Banner>(`/h5/admin/banners/${id}`, data)
}

/**
 * 删除轮播图
 */
export const deleteBanner = (id: number) => {
  return request.delete(`/h5/admin/banners/${id}`)
}

// ============ 推荐商品管理 ============

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
    status: string
  }
  type: 'HOT' | 'NEW' | 'FEATURED'
  title?: string
  subtitle?: string
  badge?: string
  sort: number
  status: 'ACTIVE' | 'INACTIVE'
  createdBy: number
  createdAt: string
  updatedAt: string
}

export interface RecommendProductListResponse {
  list: RecommendProduct[]
  total: number
  page: number
  pageSize: number
}

export interface CreateRecommendProductRequest {
  productId: number
  type: string
  title?: string
  subtitle?: string
  badge?: string
  sort?: number
  status?: string
}

export interface UpdateRecommendProductRequest {
  title?: string
  subtitle?: string
  badge?: string
  sort?: number
  status?: string
}

/**
 * 获取推荐商品列表
 */
export const getRecommendProducts = (params: {
  page?: number
  pageSize?: number
  type?: string
  status?: string
}) => {
  return request.get<RecommendProductListResponse>('/h5/admin/recommend-products', { params })
}

/**
 * 创建推荐商品
 */
export const createRecommendProduct = (data: CreateRecommendProductRequest) => {
  return request.post<RecommendProduct>('/h5/admin/recommend-products', data)
}

/**
 * 更新推荐商品
 */
export const updateRecommendProduct = (id: number, data: UpdateRecommendProductRequest) => {
  return request.put<RecommendProduct>(`/h5/admin/recommend-products/${id}`, data)
}

/**
 * 删除推荐商品
 */
export const deleteRecommendProduct = (id: number) => {
  return request.delete(`/h5/admin/recommend-products/${id}`)
}

// ============ 公告通知管理 ============

export interface Notice {
  id: number
  title: string
  content: string
  type: 'SYSTEM' | 'ACTIVITY' | 'IMPORTANT'
  sort: number
  status: 'ACTIVE' | 'INACTIVE'
  startTime?: string
  endTime?: string
  createdBy: number
  createdAt: string
  updatedAt: string
}

export interface NoticeListResponse {
  list: Notice[]
  total: number
  page: number
  pageSize: number
}

export interface CreateNoticeRequest {
  title: string
  content: string
  type: string
  sort?: number
  status?: string
  startTime?: string
  endTime?: string
}

export interface UpdateNoticeRequest {
  title?: string
  content?: string
  type?: string
  sort?: number
  status?: string
  startTime?: string | null
  endTime?: string | null
}

/**
 * 获取公告列表
 */
export const getNotices = (params: {
  page?: number
  pageSize?: number
  type?: string
  status?: string
}) => {
  return request.get<NoticeListResponse>('/h5/admin/notices', { params })
}

/**
 * 创建公告
 */
export const createNotice = (data: CreateNoticeRequest) => {
  return request.post<Notice>('/h5/admin/notices', data)
}

/**
 * 更新公告
 */
export const updateNotice = (id: number, data: UpdateNoticeRequest) => {
  return request.put<Notice>(`/h5/admin/notices/${id}`, data)
}

/**
 * 删除公告
 */
export const deleteNotice = (id: number) => {
  return request.delete(`/h5/admin/notices/${id}`)
}

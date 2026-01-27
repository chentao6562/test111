/**
 * 推广资料管理API
 */

import request from './request'

// ============ 推广文案管理 ============

export interface PromotionCopy {
  id: number
  type: 'MOMENTS' | 'TALK' | 'PRODUCT'
  productId?: number
  title: string
  content: string
  tags?: string
  sort: number
  status: 'ACTIVE' | 'INACTIVE'
  createdBy: number
  createdAt: string
  updatedAt: string
}

export interface CopyListResponse {
  list: PromotionCopy[]
  total: number
  page: number
  pageSize: number
}

export interface CreateCopyRequest {
  type: string
  productId?: number
  title: string
  content: string
  tags?: string
  sort?: number
  status?: string
}

export interface UpdateCopyRequest {
  type?: string
  productId?: number | null
  title?: string
  content?: string
  tags?: string | null
  sort?: number
  status?: string
}

/**
 * 获取推广文案列表
 */
export const getPromotionCopies = (params: {
  page?: number
  pageSize?: number
  type?: string
  productId?: number
  status?: string
  keyword?: string
}) => {
  return request.get<CopyListResponse>('/h5/admin/promotion-copies', { params })
}

/**
 * 获取单个文案详情
 */
export const getCopyById = (id: number) => {
  return request.get<PromotionCopy>(`/h5/admin/promotion-copies/${id}`)
}

/**
 * 创建推广文案
 */
export const createCopy = (data: CreateCopyRequest) => {
  return request.post<PromotionCopy>('/h5/admin/promotion-copies', data)
}

/**
 * 更新推广文案
 */
export const updateCopy = (id: number, data: UpdateCopyRequest) => {
  return request.put<PromotionCopy>(`/h5/admin/promotion-copies/${id}`, data)
}

/**
 * 删除推广文案
 */
export const deleteCopy = (id: number) => {
  return request.delete(`/h5/admin/promotion-copies/${id}`)
}

// ============ 品牌素材管理 ============

export interface BrandAsset {
  id: number
  type: 'LOGO' | 'PHOTO' | 'VIDEO' | 'POSTER'
  name: string
  url: string
  thumbnail?: string
  fileSize?: number
  description?: string
  sort: number
  status: 'ACTIVE' | 'INACTIVE'
  createdBy: number
  createdAt: string
  updatedAt: string
}

export interface AssetListResponse {
  list: BrandAsset[]
  total: number
  page: number
  pageSize: number
}

export interface CreateAssetRequest {
  type: string
  name: string
  url: string
  thumbnail?: string
  fileSize?: number
  description?: string
  sort?: number
  status?: string
}

export interface UpdateAssetRequest {
  type?: string
  name?: string
  url?: string
  thumbnail?: string | null
  fileSize?: number | null
  description?: string | null
  sort?: number
  status?: string
}

/**
 * 获取品牌素材列表
 */
export const getBrandAssets = (params: {
  page?: number
  pageSize?: number
  type?: string
  status?: string
  keyword?: string
}) => {
  return request.get<AssetListResponse>('/h5/admin/brand-assets', { params })
}

/**
 * 获取单个素材详情
 */
export const getAssetById = (id: number) => {
  return request.get<BrandAsset>(`/h5/admin/brand-assets/${id}`)
}

/**
 * 创建品牌素材
 */
export const createAsset = (data: CreateAssetRequest) => {
  return request.post<BrandAsset>('/h5/admin/brand-assets', data)
}

/**
 * 更新品牌素材
 */
export const updateAsset = (id: number, data: UpdateAssetRequest) => {
  return request.put<BrandAsset>(`/h5/admin/brand-assets/${id}`, data)
}

/**
 * 删除品牌素材
 */
export const deleteAsset = (id: number) => {
  return request.delete(`/h5/admin/brand-assets/${id}`)
}

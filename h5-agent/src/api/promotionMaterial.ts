/**
 * H5推广资料API
 */

import { get } from './index'

// 推广文案类型
export interface PromotionCopy {
  id: number
  type: 'MOMENTS' | 'TALK' | 'PRODUCT'
  productId?: number
  title: string
  content: string
  tags?: string
}

// 品牌素材类型
export interface BrandAsset {
  id: number
  type: 'LOGO' | 'PHOTO' | 'VIDEO' | 'POSTER'
  name: string
  url: string
  thumbnail?: string
  fileSize?: number
  description?: string
}

/**
 * 获取推广文案列表
 */
export function getPromotionCopies(type?: string, productId?: number) {
  const params: Record<string, any> = {}
  if (type) params.type = type
  if (productId) params.productId = productId
  return get<PromotionCopy[]>('/h5/promotion-copies', params)
}

/**
 * 获取品牌素材列表
 */
export function getBrandAssets(type?: string) {
  const params: Record<string, any> = {}
  if (type) params.type = type
  return get<BrandAsset[]>('/h5/brand-assets', params)
}

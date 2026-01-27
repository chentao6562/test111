/**
 * 管理后台赠品档位API
 * 【2026-01-16 预约模式升级】规范化API层
 */

import { request } from './request'

// 赠品档位类型
export interface GiftTier {
  id: number
  minAmount: number
  giftName: string
  giftCost: number
  sortOrder: number
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

// 创建/更新赠品档位参数
export interface GiftTierParams {
  minAmount: number
  giftName: string
  giftCost?: number
  sortOrder?: number
  isActive?: boolean
}

/**
 * 获取赠品档位列表
 */
export async function getGiftTiers(): Promise<GiftTier[]> {
  const res = await request.get<GiftTier[]>('/admin/gift-tiers')
  return res.data
}

/**
 * 获取赠品档位详情
 */
export async function getGiftTierDetail(id: number): Promise<GiftTier> {
  const res = await request.get<GiftTier>(`/admin/gift-tiers/${id}`)
  return res.data
}

/**
 * 创建赠品档位
 */
export async function createGiftTier(data: GiftTierParams): Promise<GiftTier> {
  const res = await request.post<GiftTier>('/admin/gift-tiers', data)
  return res.data
}

/**
 * 更新赠品档位
 */
export async function updateGiftTier(id: number, data: Partial<GiftTierParams>): Promise<GiftTier> {
  const res = await request.put<GiftTier>(`/admin/gift-tiers/${id}`, data)
  return res.data
}

/**
 * 删除赠品档位
 */
export async function deleteGiftTier(id: number): Promise<void> {
  await request.delete(`/admin/gift-tiers/${id}`)
}

/**
 * 切换赠品档位启用状态
 */
export async function toggleGiftTierStatus(id: number, isActive: boolean): Promise<void> {
  await request.put(`/admin/gift-tiers/${id}`, { isActive })
}

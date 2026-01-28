/**
 * 拼团相关API
 * @since 2026-01-21
 */

import { get, post, del } from './index'

// 拼团状态枚举
export const GroupBuyStatus = {
  FORMING: 'FORMING',     // 组队中
  FULL: 'FULL',           // 已满员
  COMPLETED: 'COMPLETED', // 已完成
  EXPIRED: 'EXPIRED',     // 已过期
  CANCELLED: 'CANCELLED', // 已取消
} as const

export type GroupBuyStatusType = typeof GroupBuyStatus[keyof typeof GroupBuyStatus]

// 状态标签
export const GroupBuyStatusLabels: Record<string, string> = {
  FORMING: '组队中',
  FULL: '已满员',
  COMPLETED: '已完成',
  EXPIRED: '已过期',
  CANCELLED: '已取消',
}

// 状态颜色
export const GroupBuyStatusColors: Record<string, string> = {
  FORMING: '#FF9800',    // 橙色
  FULL: '#4CAF50',       // 绿色
  COMPLETED: '#9E9E9E',  // 灰色
  EXPIRED: '#9E9E9E',    // 灰色
  CANCELLED: '#F44336',  // 红色
}

// 【2026-01-25】多档位赠品配置
export interface TierGiftConfig {
  count: number            // 成团人数档位 3/5/10
  memberGifts: string[]    // 团员赠品列表
  memberGiftCost: number   // 团员赠品成本
  leaderGift: string       // 团长奖励
  leaderCount: number      // 团长奖励数量
  leaderGiftCost: number   // 团长奖励成本
}

// 拼团成员信息
export interface GroupBuyMember {
  id: number
  customerName: string
  customerPhone: string
  status: string
  joinedAt: string
  pickedUpAt: string | null
  bonusGiftDelivered: boolean
}

// 拼团详情
export interface GroupBuyDetail {
  id: number
  code: string
  initiatorName: string
  initiatorPhone: string
  requiredCount: number
  currentCount: number
  bonusGiftName: string | null
  pickupDate: string
  storeName: string
  storeAddress: string
  regionName: string | null  // 【2026-01-21】区域名称
  status: GroupBuyStatusType
  expireAt: string
  members: GroupBuyMember[]
  giftTiers?: TierGiftConfig[]  // 【2026-01-25】多档位赠品阶梯
}

// 我的拼团列表项
export interface MyGroupBuyItem {
  id: number
  code: string
  requiredCount: number
  currentCount: number
  bonusGiftName: string | null
  pickupDate: string
  status: GroupBuyStatusType
  isInitiator: boolean
  expireAt: string
  regionName?: string | null // 【2026-01-26】区域名称
  giftTiers?: TierGiftConfig[] // 【2026-01-28】多档位赠品阶梯
}

// 拼团配置
export interface GroupBuyConfig {
  enabled: boolean
  requiredCount: number
  minAmount: number
  formingHours: number
  bonusGiftName: string | null
  activeConfig: {
    id: number
    name: string
    requiredCount: number
    minAmount: number
    bonusGiftName: string | null
    startTime: string | null
    endTime: string | null
  } | null
  tiers?: TierGiftConfig[]  // 【2026-01-25】可选的人数档位列表
}

/**
 * 获取拼团配置
 */
export const getGroupBuyConfig = async (): Promise<GroupBuyConfig> => {
  const res = await get<GroupBuyConfig>('/group-buy/config')
  return res.data
}

/**
 * 获取拼团详情
 */
export const getGroupBuyDetail = async (code: string): Promise<GroupBuyDetail | null> => {
  const res = await get<GroupBuyDetail>(`/group-buy/detail/${code}`)
  return res.data
}

/**
 * 发起拼团
 * @param reservationId 预约ID
 * @param requiredCount 【2026-01-25】用户选择的成团人数（可选）
 */
export const createGroupBuy = async (
  reservationId: number,
  requiredCount?: number
): Promise<{ code: string }> => {
  const res = await post<{ code: string }>('/group-buy/create', {
    reservationId,
    requiredCount
  })
  return res.data
}

/**
 * 加入拼团
 */
export const joinGroupBuy = async (reservationId: number, groupCode: string): Promise<void> => {
  await post<void>('/group-buy/join', { reservationId, groupCode })
}

/**
 * 获取我的拼团列表
 */
export const getMyGroupBuys = async (): Promise<MyGroupBuyItem[]> => {
  const res = await get<MyGroupBuyItem[]>('/group-buy/my')
  return res.data || []
}

/**
 * 退出拼团
 */
export const quitGroupBuy = async (code: string, reservationId: number): Promise<void> => {
  await del<void>(`/group-buy/${code}/quit`, { reservationId })
}

// 【2026-01-21 顺路拼团】附近拼团列表项
export interface NearbyGroupBuyItem {
  id: number
  code: string
  initiatorName: string
  initiatorPhone: string
  requiredCount: number
  currentCount: number
  bonusGiftName: string | null
  pickupDate: string
  storeName: string
  regionName: string | null
  status: GroupBuyStatusType
  expireAt: string
}

/**
 * 【2026-01-21 顺路拼团】获取同区域的可加入拼团
 */
export const getNearbyGroupBuys = async (
  regionId: number,
  pickupDate?: string,
  storeId?: number
): Promise<NearbyGroupBuyItem[]> => {
  const params: { regionId: number; pickupDate?: string; storeId?: number } = { regionId }
  if (pickupDate) params.pickupDate = pickupDate
  if (storeId) params.storeId = storeId
  const res = await get<NearbyGroupBuyItem[]>('/group-buy/nearby', params)
  return res.data || []
}

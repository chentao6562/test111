/**
 * 砍价活动相关API
 * @since 2026-01-22
 */

import { get, post, del } from './index'

// 砍价状态枚举
export const BargainStatus = {
  BARGAINING: 'BARGAINING',   // 砍价中
  SUCCESS: 'SUCCESS',         // 砍价成功（达到底价）
  ORDERED: 'ORDERED',         // 已下单
  EXPIRED: 'EXPIRED',         // 已过期
  CANCELLED: 'CANCELLED',     // 已取消
} as const

export type BargainStatusType = typeof BargainStatus[keyof typeof BargainStatus]

// 状态标签
export const BargainStatusLabels: Record<string, string> = {
  BARGAINING: '砍价中',
  SUCCESS: '砍价成功',
  ORDERED: '已下单',
  EXPIRED: '已过期',
  CANCELLED: '已取消',
}

// 状态颜色
export const BargainStatusColors: Record<string, string> = {
  BARGAINING: '#FF9800',    // 橙色
  SUCCESS: '#4CAF50',       // 绿色
  ORDERED: '#2196F3',       // 蓝色
  EXPIRED: '#9E9E9E',       // 灰色
  CANCELLED: '#F44336',     // 红色
}

// 砍价活动配置
export interface BargainConfig {
  enabled: boolean
  activeConfig: {
    id: number
    name: string
    startTime: string | null
    endTime: string | null
    bargainHours: number
    minBargainCount: number
    maxBargainCount: number
    newUserBonus: number
    costBearerType: string
  } | null
}

// 砍价商品信息
export interface BargainProductItem {
  id: number
  configId?: number        // 【2026-01-27】活动配置ID
  configName?: string      // 【2026-01-27】活动名称
  productId: number
  productName: string
  productImage: string
  originalPrice: number
  floorPrice: number
  maxDiscount: number
  bargainStock: number
  soldCount: number
  limitPerUser: number
  videoUrl?: string | null  // 【2026-01-23】视频字段
  available: boolean
}

// 帮砍记录
export interface BargainCutInfo {
  id: number
  helperPhone: string
  helperName: string | null
  cutAmount: number
  isNewUser: boolean
  createdAt: string
}

// 砍价详情
export interface BargainDetail {
  id: number
  code: string
  initiatorPhone: string
  initiatorName: string | null
  productId: number
  productName: string
  productImage: string
  originalPrice: number
  floorPrice: number
  currentPrice: number
  totalCut: number
  cutCount: number
  quantity: number
  status: BargainStatusType
  reachedFloor: boolean
  storeId: number
  storeName: string
  storeAddress: string
  expireAt: string
  createdAt: string
  remainingCut: number
  progressPercent: number
  cuts: BargainCutInfo[]
  pickupDate?: string  // 提货日期（YYYY-MM-DD）
}

// 我的砍价列表项
export interface MyBargainItem {
  id: number
  code: string
  productName: string
  productImage: string
  originalPrice: number
  currentPrice: number
  floorPrice: number
  cutCount: number
  status: BargainStatusType
  reachedFloor: boolean
  expireAt: string
  createdAt: string
  progressPercent: number
}

// 帮砍结果
export interface HelpCutResult {
  success: boolean
  cutAmount?: number
  currentPrice?: number
  isNewUser?: boolean
  reachedFloor?: boolean
  message?: string
  helperBargainCode?: string  // 【2026-01-23】帮砍者获得的砍价码（拉新机制）
}

// 【2026-01-23】已有砍价的错误类型
export class ExistingBargainError extends Error {
  existingCode: string
  constructor(message: string, existingCode: string) {
    super(message)
    this.name = 'ExistingBargainError'
    this.existingCode = existingCode
  }
}

/**
 * 获取砍价活动配置
 */
export const getBargainConfig = async (): Promise<BargainConfig> => {
  const res = await get<BargainConfig>('/bargain/config')
  return res.data
}

/**
 * 获取砍价商品列表
 */
export const getBargainProducts = async (configId?: number): Promise<BargainProductItem[]> => {
  const params = configId ? { configId } : {}
  const res = await get<BargainProductItem[]>('/bargain/products', params)
  return res.data || []
}

/**
 * 获取砍价详情（通过code）
 */
export const getBargainDetail = async (code: string): Promise<BargainDetail | null> => {
  const res = await get<BargainDetail>(`/bargain/detail/${code}`)
  return res.data
}

/**
 * 发起砍价
 */
export const createBargain = async (params: {
  productId: number
  configId: number
  storeId: number
  pickupDate?: string    // 提货日期 YYYY-MM-DD
  quantity?: number
}): Promise<{ code: string; bargainId: number; firstCutAmount?: number }> => {
  const res = await post<{ code: string; bargainId: number; firstCutAmount?: number }>('/bargain/create', params)
  return res.data
}

/**
 * 获取我的砍价列表
 */
export const getMyBargains = async (params?: {
  page?: number
  pageSize?: number
  status?: BargainStatusType
}): Promise<{ list: MyBargainItem[]; total: number }> => {
  const res = await get<{ list: MyBargainItem[]; total: number }>('/bargain/my', params)
  return res.data || { list: [], total: 0 }
}

/**
 * 取消砍价
 */
export const cancelBargain = async (code: string): Promise<void> => {
  await del<void>(`/bargain/${code}/cancel`)
}

/**
 * 发送帮砍验证码
 */
export const sendHelpCutCode = async (phone: string): Promise<{ message: string }> => {
  const res = await post<{ message: string }>('/bargain/help-cut/send-code', { phone })
  return res.data
}

/**
 * 帮砍
 */
export const doHelpCut = async (params: {
  bargainCode: string
  helperPhone: string
  helperName?: string
  verifyCode: string
}): Promise<HelpCutResult> => {
  const res = await post<HelpCutResult>('/bargain/help-cut', params)
  return res.data
}

/**
 * 获取砍价关联的预约信息
 */
export const getBargainReservation = async (code: string): Promise<any> => {
  const res = await get<any>(`/bargain/${code}/reservation`)
  return res.data
}

/**
 * 格式化倒计时
 */
export const formatCountdown = (expireAt: string): string => {
  const now = Date.now()
  const expire = new Date(expireAt).getTime()
  const diff = expire - now

  if (diff <= 0) return '已过期'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  if (hours > 0) {
    return `${hours}小时${minutes}分${seconds}秒`
  }
  if (minutes > 0) {
    return `${minutes}分${seconds}秒`
  }
  return `${seconds}秒`
}

/**
 * 计算倒计时剩余毫秒数
 */
export const getCountdownMs = (expireAt: string): number => {
  const now = Date.now()
  const expire = new Date(expireAt).getTime()
  return Math.max(expire - now, 0)
}

// 【2026-01-23】采购单门槛检查结果
export interface ThresholdCheckResult {
  eligible: boolean           // 是否满足门槛
  currentCartAmount: number   // 当前采购单金额（不含砍价商品）
  requiredAmount: number      // 需要的门槛金额
  difference: number          // 还差多少
  message?: string            // 提示信息
}

/**
 * 【2026-01-23】获取采购单门槛状态
 */
export const getEligibility = async (configId: number): Promise<ThresholdCheckResult> => {
  const res = await get<ThresholdCheckResult>('/bargain/eligibility', { configId })
  return res.data
}

/**
 * 【2026-01-23】将砍价商品加入采购单
 */
export const addBargainToCart = async (code: string): Promise<{ cartItemId: number }> => {
  const res = await post<{ cartItemId: number }>(`/bargain/${code}/add-to-cart`, {})
  return res.data
}

/**
 * 【2026-01-23】从采购单移除砍价商品
 */
export const removeBargainFromCart = async (code: string): Promise<void> => {
  await del<void>(`/bargain/${code}/remove-from-cart`)
}

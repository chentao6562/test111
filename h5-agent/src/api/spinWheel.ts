/**
 * 现金大转盘API
 * @since 2026-01-23
 */

import { get, post } from './index'

// ============ 类型定义 ============

// 奖池配置
export interface PrizePoolItem {
  name: string
  amount: number
  color?: string
}

// 活动配置
export interface SpinWheelConfig {
  id: number
  name: string
  startTime: string
  endTime: string
  prizePool: PrizePoolItem[]
  redeemThreshold: number
  freeSpinCount: number
  shareSpinCount: number
  maxDailyHelp: number
  newUserHelpMin: number
  newUserHelpMax: number
  oldUserHelpMin: number
  oldUserHelpMax: number
}

// 参与信息
export interface ParticipationInfo {
  id: number
  code: string
  phone: string
  name: string | null
  totalAmount: number
  redeemedAmount: number
  availableAmount: number
  todaySpinCount: number
  todayHelpCount: number
  remainingSpins: number
  canRedeem: boolean
  redeemThreshold: number
  progressPercent: number
  shareBonus: boolean
  configId: number
  createdAt: string
}

// 抽奖结果
export interface SpinResult {
  success: boolean
  prizeName?: string
  prizeAmount?: number
  totalAmount?: number
  remainingSpins?: number
  prizeIndex?: number
  message?: string
}

// 助力结果
export interface HelpResult {
  success: boolean
  helpAmount?: number
  isNewUser?: boolean
  message?: string
}

// 兑换结果
export interface RedeemResult {
  success: boolean
  redeemAmount?: number
  couponCode?: string
  message?: string
}

// 抽奖记录
export interface SpinRecord {
  id: number
  prizeName: string
  prizeAmount: number
  spinType: 'FREE' | 'SHARE' | 'HELP'
  isExpired: boolean
  createdAt: string
}

// 助力记录
export interface HelpRecord {
  id: number
  helperPhone: string
  helperName: string | null
  helpAmount: number
  isNewUser: boolean
  createdAt: string
}

// 分享详情
export interface ShareDetail {
  participation: {
    code: string
    phone: string
    name: string | null
    totalAmount: number
    progressPercent: number
  }
  config: {
    name: string
    endTime: string
  }
  helpRecords: HelpRecord[]
}

// 滚动播报
export interface DynamicNotice {
  phone: string
  action: 'spin' | 'redeem'
  amount: number
  timestamp: number
}

// ============ API函数 ============

/**
 * 获取活动配置
 */
export const getSpinWheelConfig = async (): Promise<{
  enabled: boolean
  config: SpinWheelConfig | null
}> => {
  const res = await get<{ enabled: boolean; config: SpinWheelConfig | null }>('/spin-wheel/config')
  return res.data
}

/**
 * 加入活动
 */
export const joinSpinWheel = async (params: {
  phone: string
  name?: string
  configId: number
  salespersonId?: number
}): Promise<ParticipationInfo> => {
  const res = await post<ParticipationInfo>('/spin-wheel/join', params)
  return res.data
}

/**
 * 获取我的参与信息
 */
export const getMyParticipation = async (configId: number): Promise<ParticipationInfo | null> => {
  try {
    const res = await get<ParticipationInfo>('/spin-wheel/my', { configId })
    return res.data
  } catch {
    return null
  }
}

/**
 * 抽奖
 */
export const doSpin = async (configId: number): Promise<SpinResult> => {
  const res = await post<SpinResult>('/spin-wheel/spin', { configId })
  return res.data
}

/**
 * 分享获得次数
 */
export const shareForSpins = async (configId: number): Promise<{ spinsAdded: number }> => {
  const res = await post<{ spinsAdded: number }>('/spin-wheel/share', { configId })
  return res.data
}

/**
 * 获取抽奖记录
 */
export const getSpinRecords = async (configId: number, params?: {
  page?: number
  pageSize?: number
}): Promise<{ list: SpinRecord[]; total: number }> => {
  const res = await get<{ list: SpinRecord[]; total: number }>('/spin-wheel/records', {
    configId,
    ...params,
  })
  return res.data
}

/**
 * 获取分享页详情（公开接口）
 */
export const getShareDetail = async (code: string): Promise<ShareDetail | null> => {
  try {
    const res = await get<ShareDetail>(`/spin-wheel/detail/${code}`)
    return res.data
  } catch {
    return null
  }
}

/**
 * 发送助力验证码（公开接口）
 */
export const sendHelpCode = async (phone: string): Promise<{ message: string }> => {
  const res = await post<{ message: string }>('/spin-wheel/help/send-code', { phone })
  return res.data
}

/**
 * 助力（公开接口）
 */
export const doHelp = async (params: {
  participationCode: string
  helperPhone: string
  helperName?: string
  verifyCode: string
}): Promise<HelpResult> => {
  const res = await post<HelpResult>('/spin-wheel/help', params)
  return res.data
}

/**
 * 兑换代金券
 */
export const redeemCoupon = async (params: {
  configId: number
  amount: number
}): Promise<RedeemResult> => {
  const res = await post<RedeemResult>('/spin-wheel/redeem', params)
  return res.data
}

/**
 * 检查兑换资格
 */
export const checkRedeemEligibility = async (configId: number): Promise<{
  eligible: boolean
  availableAmount: number
  redeemThreshold: number
  message?: string
}> => {
  const res = await get<{
    eligible: boolean
    availableAmount: number
    redeemThreshold: number
    message?: string
  }>('/spin-wheel/redeem/check', { configId })
  return res.data
}

/**
 * 获取滚动播报（公开接口）
 */
export const getNotices = async (): Promise<DynamicNotice[]> => {
  const res = await get<DynamicNotice[]>('/spin-wheel/notices')
  return res.data || []
}

/**
 * 格式化时间
 */
export const formatTime = (timestamp: number): string => {
  const now = Date.now()
  const diff = now - timestamp

  if (diff < 60000) {
    return '刚刚'
  }
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`
  }
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`
  }
  return `${Math.floor(diff / 86400000)}天前`
}

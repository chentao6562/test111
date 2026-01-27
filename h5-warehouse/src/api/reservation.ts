/**
 * 门店端预约管理API
 * 【2026-01-16 预约模式升级】
 */

import { request } from './request'

// 预约状态枚举
export const ReservationStatus = {
  PENDING: 0,         // 待确认
  CALLING: 1,         // 确认中
  CONFIRMED: 2,       // 已确认
  COMPLETED: 3,       // 已完成
  CANCELLED: 4,       // 已取消
  EXPIRED: 5,         // 已过期
  CALL_FAILED: 6,     // 确认失败
  PENDING_PREPARE: 7, // 待备货
  PREPARING: 8,       // 备货中
  PENDING_PICKUP: 9,  // 待提货
} as const

// 状态标签
export const StatusLabels: Record<number, string> = {
  0: '待确认',
  1: '确认中',
  2: '已确认',
  3: '已完成',
  4: '已取消',
  5: '已过期',
  6: '确认失败',
  7: '待备货',
  8: '备货中',
  9: '待提货'
}

// 状态颜色
export const StatusColors: Record<number, string> = {
  0: '#FF9800',    // 橙色
  1: '#2196F3',    // 蓝色
  2: '#4CAF50',    // 绿色
  3: '#9E9E9E',    // 灰色
  4: '#9E9E9E',    // 灰色
  5: '#9E9E9E',    // 灰色
  6: '#F44336',    // 红色
  7: '#FF9800',    // 橙色 - 待备货
  8: '#2196F3',    // 蓝色 - 备货中
  9: '#4CAF50',    // 绿色 - 待提货
}

// 预约商品类型
export interface ReservationItem {
  productId: number
  productName: string
  productImage?: string
  quantity: number
  price: number
  subtotal?: number
  prepared?: boolean  // 【2026-01-17】是否已备货
  unit?: string       // 单位
}

// 预约类型
export interface Reservation {
  id: number
  reservationNo: string
  customerName: string
  customerPhone: string
  pickupDate: string
  totalAmount: number
  status: number
  statusLabel?: string
  giftName?: string
  giftDelivered?: boolean
  callCount: number
  lastCallAt?: string
  itemCount?: number
  items?: ReservationItem[]
  createdAt: string
  confirmedAt?: string
  completedAt?: string
  expireAt?: string        // 过期时间
  paymentMethod?: string   // 支付方式
  isUrgent?: boolean       // 是否紧急
  // 【2026-01-17 备货环节】
  pickupCode?: string      // 提货码
  preparedAt?: string      // 备货完成时间
  totalQuantity?: number   // 商品总数量
  progress?: {             // 备货进度
    prepared: number
    total: number
    percent: number
  }
}

// 预约统计
export interface ReservationStats {
  pending: number        // 待确认
  calling?: number       // 确认中
  confirmed: number      // 已确认
  todayComplete: number  // 今日已完成（后端返回字段名）
  todayAmount?: number   // 今日金额
  // 【2026-01-19】新增字段
  pendingPrepare: number // 待备货（状态2,7,8）
  pendingPickup: number  // 待核销（状态9）
}

/**
 * 获取预约统计
 */
export function getReservationStats(): Promise<ReservationStats> {
  return request.get('/store/reservations/stats')
}

/**
 * 获取预约列表
 * 【2026-01-19】支持statuses参数（多状态查询）
 */
export function getReservationList(params: {
  status?: number
  statuses?: string  // 逗号分隔的多状态，如 "2,7,8"
  page?: number
  pageSize?: number
  customerPhone?: string
}): Promise<{
  list: Reservation[]
  total: number
  page: number
  pageSize: number
}> {
  return request.get('/store/reservations', { params })
}

/**
 * 获取待确认预约列表（包含紧急标记）
 */
export function getPendingReservations(params?: {
  page?: number
  pageSize?: number
}): Promise<{
  list: Reservation[]
  total: number
  page: number
  pageSize: number
}> {
  return request.get('/store/reservations/pending', { params })
}

/**
 * 获取预约详情
 */
export function getReservationDetail(id: number): Promise<Reservation> {
  return request.get(`/store/reservations/${id}`)
}

/**
 * 记录拨打电话
 */
export function recordCall(id: number): Promise<{
  callCount: number
  maxAttempts: number
  canCallAgain: boolean
  autoFailed?: boolean  // 第3次未接通时自动标记为失败
}> {
  return request.post(`/store/reservations/${id}/call`)
}

/**
 * 确认预约成功
 */
export function confirmReservation(id: number): Promise<{
  expireAt: string
  pickupDate: string
}> {
  return request.post(`/store/reservations/${id}/confirm`)
}

/**
 * 标记确认失败
 */
export function markCallFailed(id: number, reason?: string): Promise<void> {
  return request.post(`/store/reservations/${id}/fail`, { reason })
}

// ============ 核销相关 ============

/**
 * 搜索待核销预约（手机号）
 * 注意：request拦截器在成功时直接返回data.data，所以返回类型是预约对象
 */
export function searchByPhone(phone: string): Promise<Reservation & { pendingCount?: number }> {
  return request.get('/store/pickup/search', { params: { phone } })
}

/**
 * 搜索待核销预约（预约号）
 * 注意：request拦截器在成功时直接返回data.data，所以返回类型是预约对象
 */
export function searchByReservationNo(reservationNo: string): Promise<Reservation> {
  // 使用后端的 /store/pickup/query-no 接口，参数名为 no
  return request.get('/store/pickup/query-no', { params: { no: reservationNo } })
}

/**
 * 完成核销
 */
export interface CompletePickupParams {
  reservationId: number
  paymentMethod: 'cash' | 'wechat' | 'alipay'
  deliverGift?: boolean
  couponIds?: number[]  // 【2026-01-21】代金券ID列表
}

export interface CompletePickupResult {
  reservationNo: string
  totalAmount: number
  paymentMethod: string
  giftDelivered: boolean
  giftName?: string
  profitSettled: boolean
  masterProfit: number
  level1Profit: number
  level2Profit: number
  // 【2026-01-21】代金券抵扣信息
  couponDeduction?: number
  actualPayment?: number
  redeemedCoupons?: Array<{ id: number; code: string; amount: number }>
}

export function completePickup(params: CompletePickupParams): Promise<CompletePickupResult> {
  return request.post('/store/pickup/complete', params)
}

// 【2026-01-21】代金券信息类型
export interface CouponInfo {
  id: number
  code: string
  amount: number
  sourceDesc: string | null
  expiredAt: string
  createdAt: string
}

/**
 * 【2026-01-21】获取预约对应推销员的可用代金券
 */
export function getReservationCoupons(reservationId: number): Promise<CouponInfo[]> {
  return request.get(`/store/pickup/coupons/${reservationId}`)
}

/**
 * 今日核销统计
 */
export function getTodayPickupStats(): Promise<{
  completedCount: number
  completedAmount: number
  pendingCount: number
}> {
  return request.get('/store/pickup/today-stats')
}

/**
 * 【2026-01-19】按周期统计核销数据
 */
export function getPickupStatsByPeriod(period: 'today' | 'week' | 'month' | 'total'): Promise<{
  completedCount: number
  period: string
}> {
  return request.get('/store/pickup/period-stats', { params: { period } })
}

/**
 * 今日已核销列表
 */
export function getTodayCompletedList(params?: {
  page?: number
  pageSize?: number
}): Promise<{
  list: Reservation[]
  total: number
  page: number
  pageSize: number
}> {
  return request.get('/store/pickup/today-completed', { params })
}

// ============ 【2026-01-17】备货相关 ============

// 备货进度类型
export interface PrepareProgress {
  reservationId: number
  totalItems: number
  preparedItems: number
  progressPercent: number
  isComplete: boolean
}

/**
 * 获取待备货列表
 */
export function getPendingPrepareList(): Promise<Reservation[]> {
  return request.get('/store/prepare/pending')
}

/**
 * 获取备货中列表
 */
export function getPreparingList(): Promise<Reservation[]> {
  return request.get('/store/prepare/preparing')
}

/**
 * 开始备货
 * 注意：request拦截器成功时直接返回data.data（此处为null）
 */
export function startPrepare(id: number): Promise<void> {
  return request.post(`/store/prepare/${id}/start`)
}

/**
 * 更新单个商品备货状态
 */
export function updatePrepareItem(
  id: number,
  productId: number,
  prepared: boolean
): Promise<PrepareProgress> {
  return request.post(`/store/prepare/${id}/item`, { productId, prepared })
}

/**
 * 批量更新商品备货状态
 */
export function batchUpdatePrepareItems(
  id: number,
  productIds: number[],
  prepared: boolean
): Promise<PrepareProgress> {
  return request.post(`/store/prepare/${id}/batch`, { productIds, prepared })
}

/**
 * 完成备货（生成提货码）
 * 注意：request拦截器成功时直接返回data.data
 */
export function completePrepare(id: number): Promise<{ pickupCode: string }> {
  return request.post(`/store/prepare/${id}/complete`)
}

/**
 * 获取备货进度
 */
export function getPrepareProgress(id: number): Promise<PrepareProgress> {
  return request.get(`/store/prepare/${id}/progress`)
}

/**
 * 上报备货问题
 * 注意：request拦截器成功时直接返回data.data（此处为null）
 */
export function reportPrepareIssue(
  id: number,
  issueType: 'SHORTAGE' | 'DAMAGE' | 'NOT_FOUND' | 'OTHER',
  description: string
): Promise<void> {
  return request.post(`/store/prepare/${id}/issue`, { issueType, description })
}

/**
 * 通过提货码验证预约
 * 注意：request拦截器在成功时直接返回data.data，所以返回类型是预约对象
 */
export function verifyByPickupCode(pickupCode: string): Promise<Reservation> {
  return request.post('/store/pickup/verify-code', { pickupCode })
}

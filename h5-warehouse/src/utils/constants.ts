import type { OrderStatus } from '@/types'

// 订单状态映射
export const ORDER_STATUS_MAP: Record<OrderStatus, { text: string; color: string }> = {
  pending_payment: { text: '待付款', color: '#F2711C' },
  pending_accept: { text: '待接单', color: '#2185D0' },
  preparing: { text: '备货中', color: '#FBBD08' },
  pending_transfer: { text: '待移库', color: '#B5CC18' },
  transferring: { text: '移库中', color: '#6435C9' },
  pending_pickup: { text: '待提货', color: '#00B5AD' },
  completed: { text: '已完成', color: '#21BA45' },
  cancelled: { text: '已取消', color: '#DB2828' }
}

// 支付状态
export const PAYMENT_STATUS = {
  UNPAID: { text: '未付款', color: '#999' },
  PAID: { text: '已付款', color: '#21BA45' }
}

// 每页数量
export const PAGE_SIZE = 20

// 搜索防抖延迟（毫秒）
export const SEARCH_DEBOUNCE_DELAY = 300

// 统计数据缓存时间（毫秒）【2026-01-19 优化】从30秒缩短到10秒
export const STATS_CACHE_TIME = 10000

// API base URL
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

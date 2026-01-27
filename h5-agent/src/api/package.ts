/**
 * 套餐API
 * 【2026-01-25】新增套餐功能
 * 【2026-01-26】新增套餐预约API
 */
import { get, put, post } from './index'

// 套餐商品项
export interface PackageItem {
  id: number
  productId: number
  productName?: string
  productImage?: string
  quantity: number
  retailPrice?: number // 单买价格
  // 实际API返回的product对象
  product?: {
    id: number
    name: string
    images: string[]
    retailPrice?: string | number
    stock?: number
    unit?: string
  }
}

// 套餐详情
export interface Package {
  id: number
  code: string
  name: string
  positioning: 'ENTRY' | 'HOT' | 'PROFIT'
  description?: string
  images: string[]

  // 价格信息
  costPrice: number
  supplyPrice: number
  suggestedPrice?: number
  masterRetailPrice: number
  grossMargin?: number

  // 对推销员展示的价格
  myCostPrice?: number    // 我的拿货价
  myRetailPrice?: number  // 我设置的零售价
  mySubPrice?: number     // 我设置的给下级的价

  // 展示计算
  displayPrice?: number   // 展示价格
  originalPrice?: number  // 原价（单买总价）
  savedAmount?: number    // 节省金额

  // 其他信息
  sceneTags?: string[]
  targetAudience?: string
  stockStrategy: 'COMPONENT' | 'INDEPENDENT'
  availableStock?: number // 可售数量
  status: 'ACTIVE' | 'INACTIVE'

  // 套餐商品
  items: PackageItem[]
}

// 套餐列表响应
export interface PackageListResponse {
  list: Package[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * 获取套餐列表
 */
export const getPackageList = (params?: {
  page?: number
  pageSize?: number
  positioning?: string
  keyword?: string
}) => {
  return get<PackageListResponse>('/packages', params)
}

/**
 * 获取套餐详情
 */
export const getPackageDetail = (id: number) => {
  return get<Package>(`/packages/${id}`)
}

/**
 * 设置套餐定价（推销员专用）
 */
export const setPackagePrice = (id: number, data: {
  retailPrice: number
  subPrice?: number
}) => {
  return put<Package>(`/packages/${id}/price`, data)
}

/**
 * 获取定位标签文案
 */
export const getPositioningLabel = (positioning: string): string => {
  const labels: Record<string, string> = {
    'ENTRY': '引流款',
    'HOT': '爆款',
    'PROFIT': '利润款'
  }
  return labels[positioning] || positioning
}

/**
 * 获取定位标签颜色
 */
export const getPositioningColor = (positioning: string): string => {
  const colors: Record<string, string> = {
    'ENTRY': '#00B578',   // 绿色
    'HOT': '#FA5151',     // 红色
    'PROFIT': '#FF8F1F'   // 橙色
  }
  return colors[positioning] || '#666666'
}

/**
 * 套餐预约响应
 */
export interface PackageReservationResponse {
  reservationId: number
  reservationNo: string
}

/**
 * 套餐预约请求参数
 */
export interface ReservePackageParams {
  customerName: string
  customerPhone: string
  pickupDate: string
  storeId?: number
  remark?: string
}

/**
 * 创建套餐预约
 * 【2026-01-26】新增
 */
export const reservePackage = (packageId: number, params: ReservePackageParams) => {
  return post<PackageReservationResponse>(`/packages/${packageId}/reserve`, params)
}

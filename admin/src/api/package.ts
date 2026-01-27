import request, { ApiResponse } from './request'

// 套餐类型
export interface Package {
  id: number
  code: string
  name: string
  positioning: 'ENTRY' | 'HOT' | 'PROFIT'
  description: string | null
  images: string | string[]
  costPrice: string | number
  supplyPrice: string | number
  suggestedPrice: string | number | null
  masterRetailPrice: string | number
  grossMargin: string | number | null
  sceneTags: string | string[] | null
  targetAudience: string | null
  stockStrategy: 'COMPONENT' | 'INDEPENDENT'
  independentStock: number
  sort: number
  status: 'ACTIVE' | 'INACTIVE' | 'DELETED'
  items: PackageItem[]
  availableStock?: number
  singleBuyTotal?: number
  savings?: number
  createdAt: string
  updatedAt: string
}

// 套餐商品项
export interface PackageItem {
  id: number
  packageId: number
  productId: number
  quantity: number
  snapshotCostPrice: string | number | null
  snapshotSupplyPrice: string | number | null
  snapshotRetailPrice: string | number | null
  sort: number
  product: {
    id: number
    name: string
    images: string | string[]
    retailPrice: string | number
    supplyPrice: string | number | null
    costPrice: string | number | null
    stock: number
    lockStock: number
    status: string
    unit: string
  }
}

// 套餐列表响应
export interface PackageListResponse {
  list: Package[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 套餐查询参数
export interface PackageQueryParams {
  page?: number
  pageSize?: number
  positioning?: string
  status?: string
  keyword?: string
}

// 创建套餐参数
export interface CreatePackageParams {
  code: string
  name: string
  positioning: string
  description?: string
  images: string
  costPrice: number
  supplyPrice: number
  suggestedPrice?: number
  masterRetailPrice: number
  grossMargin?: number
  sceneTags?: string
  targetAudience?: string
  stockStrategy?: string
  sort?: number
  status?: string
}

// 更新套餐参数
export interface UpdatePackageParams {
  name?: string
  positioning?: string
  description?: string | null
  images?: string
  costPrice?: number
  supplyPrice?: number
  suggestedPrice?: number | null
  masterRetailPrice?: number
  grossMargin?: number | null
  sceneTags?: string | null
  targetAudience?: string | null
  stockStrategy?: string
  sort?: number
  status?: string
}

// 套餐商品配置参数
export interface PackageItemParams {
  productId: number
  quantity: number
}

// 获取套餐列表
export function getPackageList(params?: PackageQueryParams): Promise<ApiResponse<PackageListResponse>> {
  return request.get('/admin/packages', { params })
}

// 获取套餐详情
export function getPackageDetail(id: number): Promise<ApiResponse<Package>> {
  return request.get(`/admin/packages/${id}`)
}

// 创建套餐
export function createPackage(data: CreatePackageParams): Promise<ApiResponse<Package>> {
  return request.post('/admin/packages', data)
}

// 更新套餐
export function updatePackage(id: number, data: UpdatePackageParams): Promise<ApiResponse<Package>> {
  return request.put(`/admin/packages/${id}`, data)
}

// 删除套餐
export function deletePackage(id: number): Promise<ApiResponse<null>> {
  return request.delete(`/admin/packages/${id}`)
}

// 切换套餐状态
export function togglePackageStatus(id: number): Promise<ApiResponse<Package>> {
  return request.put(`/admin/packages/${id}/toggle`)
}

// 配置套餐商品
export function setPackageItems(id: number, items: PackageItemParams[]): Promise<ApiResponse<{ success: boolean; itemCount: number }>> {
  return request.put(`/admin/packages/${id}/items`, { items })
}

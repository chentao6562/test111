import request, { ApiResponse } from './request'

// 商品类型
export interface Product {
  id: number
  name: string
  description: string | null
  images: string | string[]
  retailPrice: string | number
  agentPrice: string | number
  wholesalePrice: string | number
  costPrice: string | number | null
  supplyPrice: string | number | null
  suggestedPrice: string | number | null
  minRetailPrice: string | number | null
  masterRetailPrice: string | number | null
  stock: number
  lockStock: number
  unit: string
  purchaseUnit: string
  unitConversion: number
  categoryId: number
  category: {
    id: number
    name: string
  }
  specs: string | null
  salesCount: number
  status: 'ACTIVE' | 'INACTIVE'
  sort: number
  displayPrice?: string | number
  // 【2026-01-23 视频字段】
  videoUrl?: string | null
  videoThumbnail?: string | null
  videoDuration?: number | null
  createdAt: string
  updatedAt: string
}

// 商品列表响应
export interface ProductListResponse {
  list: Product[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 商品查询参数
export interface ProductQueryParams {
  page?: number
  pageSize?: number
  categoryId?: number
  status?: string
  keyword?: string
  sort?: 'default' | 'sales' | 'price_asc' | 'price_desc'
}

// 创建商品参数
export interface CreateProductParams {
  name: string
  categoryId: number
  images: string
  description?: string
  costPrice: number
  supplyPrice: number
  suggestedPrice?: number
  minRetailPrice?: number
  masterRetailPrice?: number
  stock?: number
  unit?: string
  purchaseUnit?: string
  unitConversion?: number
  specs?: string
  status?: string
  sort?: number
  // 【2026-01-23 视频字段】
  videoUrl?: string
  videoThumbnail?: string
  videoDuration?: number
}

// 更新商品参数
export interface UpdateProductParams {
  name?: string
  categoryId?: number
  images?: string
  description?: string | null
  costPrice?: number
  supplyPrice?: number
  suggestedPrice?: number
  minRetailPrice?: number
  masterRetailPrice?: number
  stock?: number
  unit?: string
  purchaseUnit?: string
  unitConversion?: number
  specs?: string
  status?: string
  sort?: number
  // 【2026-01-23 视频字段】
  videoUrl?: string | null
  videoThumbnail?: string | null
  videoDuration?: number | null
}

// 获取商品列表（管理员）
export function getProductList(params?: ProductQueryParams): Promise<ApiResponse<ProductListResponse>> {
  return request.get('/admin/products', { params })
}

// 获取商品详情（管理员）
export function getProductDetail(id: number): Promise<ApiResponse<Product>> {
  return request.get(`/admin/products/${id}`)
}

// 创建商品
export function createProduct(data: CreateProductParams): Promise<ApiResponse<Product>> {
  return request.post('/admin/products', data)
}

// 更新商品
export function updateProduct(id: number, data: UpdateProductParams): Promise<ApiResponse<Product>> {
  return request.put(`/admin/products/${id}`, data)
}

// 删除商品
export function deleteProduct(id: number): Promise<ApiResponse<null>> {
  return request.delete(`/admin/products/${id}`)
}

// 切换商品状态
export function toggleProductStatus(id: number): Promise<ApiResponse<Product>> {
  return request.put(`/admin/products/${id}/toggle`)
}

// 批量更新状态
export function batchUpdateStatus(ids: number[], status: string): Promise<ApiResponse<{ count: number }>> {
  return request.put('/admin/products/batch-status', { ids, status })
}

// AI文案生成响应
export interface AICopyResponse {
  slogan: string
  sellingPoints: Array<{
    icon: string
    title: string
    desc: string
  }>
  usageScenes: Array<{
    icon: string
    name: string
  }>
}

// 生成单个商品AI文案
export function generateProductAICopy(id: number): Promise<ApiResponse<AICopyResponse>> {
  return request.post(`/admin/products/${id}/ai-copy`)
}

// 批量生成AI文案
export function batchGenerateAICopy(productIds?: number[]): Promise<ApiResponse<{
  success: number
  failed: number
  errors: Array<{ productId: number; error: string }>
}>> {
  return request.post('/admin/products/batch-ai-copy', { productIds })
}

// 【2026-01-25新增】批量更新排序
export function updateProductSort(ids: number[]): Promise<ApiResponse<null>> {
  return request.put('/admin/products/sort', { ids })
}

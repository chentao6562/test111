import { get, post, put, del } from '@/utils/request'
import type { PageResult } from '@/utils/request'

// 商品接口
export interface Product {
  id: number
  categoryId: number
  name: string
  subtitle?: string
  cover?: string
  images?: string[]
  price: number
  marketPrice?: number
  costPrice?: number
  unit: string
  stock: number
  lockStock: number
  warningStock: number
  sales: number
  minBuy: number
  maxBuy: number
  sort: number
  isHot: number
  isNew: number
  isRecommend: number
  status: number
  createdAt: string
}

// 分类接口
export interface Category {
  id: number
  name: string
  icon?: string
  image?: string
  sort: number
  status: number
}

// 获取商品列表
export function getProductList(params?: {
  page?: number
  pageSize?: number
  categoryId?: number
  status?: number
  keyword?: string
}) {
  return get<PageResult<Product>>('/product/list', params)
}

// 获取商品详情
export function getProductDetail(id: number) {
  return get<Product>(`/product/detail/${id}`)
}

// 获取分类列表
export function getCategoryList() {
  return get<Category[]>('/product/category')
}

// 创建分类
export function createCategory(data: Partial<Category>) {
  return post('/admin/category', data)
}

// 更新分类
export function updateCategory(id: number, data: Partial<Category>) {
  return put(`/admin/category/${id}`, data)
}

// 删除分类
export function deleteCategory(id: number) {
  return del(`/admin/category/${id}`)
}

// 创建商品
export function createProduct(data: Partial<Product>) {
  return post('/admin/product', data)
}

// 更新商品
export function updateProduct(id: number, data: Partial<Product>) {
  return put(`/admin/product/${id}`, data)
}

// 删除商品
export function deleteProduct(id: number) {
  return del(`/admin/product/${id}`)
}

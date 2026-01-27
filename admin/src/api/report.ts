import request from './request'

// 获取控制台首页数据
export function getDashboardData() {
  return request.get('/admin/dashboard')
}

// 获取热销商品
export function getHotProducts(limit = 5) {
  return request.get('/admin/dashboard/hot-products', { params: { limit } })
}

// 获取最新订单
export function getRecentOrders(limit = 5) {
  return request.get('/admin/dashboard/recent-orders', { params: { limit } })
}

// 获取销售报表统计
export function getSalesStatistics(params?: { startDate?: string; endDate?: string }) {
  return request.get('/admin/reports/sales/statistics', { params })
}

// 获取销售趋势
export function getSalesTrend(days = 30) {
  return request.get('/admin/reports/sales/trend', { params: { days } })
}

// 获取品类销售占比
export function getCategorySales(params?: { startDate?: string; endDate?: string }) {
  return request.get('/admin/reports/sales/categories', { params })
}

// 获取销售明细列表
export function getSalesDetail(params: {
  page?: number
  pageSize?: number
  keyword?: string
  categoryId?: number
  status?: string
  startDate?: string
  endDate?: string
}) {
  return request.get('/admin/reports/sales/detail', { params })
}

// 获取库存报表统计
export function getStockStatistics() {
  return request.get('/admin/reports/stock')
}

// 获取财务报表统计
export function getFinanceReport(params?: { startDate?: string; endDate?: string }) {
  return request.get('/admin/reports/finance', { params })
}

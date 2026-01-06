import { get } from '@/utils/request'

// 获取仪表盘统计数据
export function getDashboardStats() {
  return get('/admin/dashboard/stats')
}

// 获取图表数据
export function getDashboardChart(days?: number) {
  return get('/admin/dashboard/chart', { days })
}

// 获取待办事项
export function getDashboardTodos() {
  return get('/admin/dashboard/todos')
}

// 获取销售报表
export function getSalesReport(params: { startDate: string; endDate: string }) {
  return get('/admin/report/sales', params)
}

// 获取代理业绩报表
export function getAgentReport(params: { startDate: string; endDate: string }) {
  return get('/admin/report/agent', params)
}

// 获取商品分析报表
export function getProductReport(params: { startDate: string; endDate: string }) {
  return get('/admin/report/product', params)
}

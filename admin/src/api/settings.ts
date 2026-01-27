import request from './request'

// 获取公开配置（无需认证）- 用于登录页面等
export function getPublicConfig() {
  return request.get('/config')
}

// 获取系统设置（需要管理员认证）
export function getSettings() {
  return request.get('/admin/settings')
}

// 更新系统设置
export function updateSettings(data: {
  companyName?: string
  companyLogo?: string
  contactPhone?: string
  companyAddress?: string
  maintenanceMode?: boolean
  defaultLanguage?: string
  autoBackup?: boolean
}) {
  return request.put('/admin/settings', data)
}

// 执行数据备份
export function executeBackup() {
  return request.post('/admin/settings/backup')
}

// 获取操作日志列表
export function getAuditLogs(params: {
  page?: number
  pageSize?: number
  action?: string
  module?: string
  userId?: number
  startDate?: string
  endDate?: string
}) {
  return request.get('/admin/audit-logs', { params })
}

// 获取管理员列表
export function getAdminList(params?: {
  page?: number
  pageSize?: number
  keyword?: string
}) {
  return request.get('/admin/system/admins', { params })
}

// 获取员工列表
export function getStaffList(params?: {
  page?: number
  pageSize?: number
  keyword?: string
  role?: string
}) {
  return request.get('/admin/system/staff', { params })
}

// 获取打印配置
export function getPrintConfig() {
  return request.get('/admin/settings/print')
}

// 更新打印配置
export function updatePrintConfig(data: {
  enablePrint?: boolean
  storeName?: string
  storePhone?: string
  storeAddress?: string
  footerText?: string
  showQRCode?: boolean
  paperWidth?: number
}) {
  return request.put('/admin/settings/print', data)
}

// 测试打印配置
export function testPrintConfig() {
  return request.post('/admin/settings/print/test')
}

import request from './request'

/**
 * 员工管理 API
 */

// 获取员工列表
export const getStaffList = (params?: {
  page?: number
  pageSize?: number
  keyword?: string
  role?: string
  status?: string
}) => {
  return request.get('/admin/system/staff', { params })
}

// 获取员工详情
export const getStaffDetail = (id: number) => {
  return request.get(`/admin/system/staff/${id}`)
}

// 创建员工账号
export const createStaff = (data: {
  username: string
  password: string
  name: string
  phone?: string
  role: string
  warehouseId?: number  // 【2026-01-13 多仓库支持】
}) => {
  return request.post('/admin/system/staff', data)
}

// 更新员工信息
export const updateStaff = (id: number, data: {
  name?: string
  phone?: string
  status?: string
  warehouseId?: number | null  // 【2026-01-13 多仓库支持】
}) => {
  return request.put(`/admin/system/staff/${id}`, data)
}

// 重置员工密码
export const resetPassword = (id: number, data: {
  newPassword: string
}) => {
  return request.post(`/admin/system/staff/${id}/reset-password`, data)
}

// 删除员工账号（禁用）
export const deleteStaff = (id: number) => {
  return request.delete(`/admin/system/staff/${id}`)
}

import { Request, Response } from 'express'
import { success, error } from '../utils/response'
import * as settingService from '../services/settingService'

/**
 * 员工账号管理控制器
 */

/**
 * 创建员工账号
 * POST /api/admin/system/staff
 */
export async function createStaff(req: Request, res: Response) {
  try {
    const { username, password, name, phone, role, warehouseId } = req.body  // 【2026-01-13】增加warehouseId

    // 验证必填字段
    if (!username || !password || !name || !role) {
      return error(res, '用户名、密码、姓名和角色为必填项', 400)
    }

    // 验证用户名格式
    if (!/^[a-zA-Z0-9_]{4,20}$/.test(username)) {
      return error(res, '用户名必须是4-20位字母、数字或下划线', 400)
    }

    // 验证密码长度
    if (password.length < 6) {
      return error(res, '密码长度不能少于6位', 400)
    }

    // 验证角色
    if (!['WAREHOUSE', 'LOGISTICS'].includes(role)) {
      return error(res, '角色只能是WAREHOUSE（库管）或LOGISTICS（货管）', 400)
    }

    const staff = await settingService.createSystemUser({
      username,
      password,
      name,
      phone,
      role,
      warehouseId: warehouseId ? parseInt(warehouseId) : undefined  // 【2026-01-13 多仓库支持】
    })

    // 记录操作日志
    const user = (req as any).user
    await settingService.createAuditLog({
      userId: user.id,
      userType: 'admin',
      userName: user.username,
      action: 'create',
      module: 'staff',
      detail: `创建${role === 'WAREHOUSE' ? '库管' : '货管'}账号: ${username}`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    })

    return success(res, staff, '员工账号创建成功')
  } catch (err: any) {
    console.error('创建员工账号失败:', err)
    if (err.message.includes('已存在')) {
      return error(res, err.message, 400)
    }
    return error(res, '创建员工账号失败')
  }
}

/**
 * 更新员工信息
 * PUT /api/admin/system/staff/:id
 */
export async function updateStaff(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { name, phone, status, warehouseId } = req.body  // 【2026-01-13】增加warehouseId

    if (!id || isNaN(parseInt(id))) {
      return error(res, '无效的员工ID', 400)
    }

    const staff = await settingService.updateSystemUser(parseInt(id), {
      name,
      phone,
      status,
      warehouseId: warehouseId !== undefined ? (warehouseId ? parseInt(warehouseId) : null) : undefined  // 【2026-01-13 多仓库支持】
    })

    // 记录操作日志
    const user = (req as any).user
    await settingService.createAuditLog({
      userId: user.id,
      userType: 'admin',
      userName: user.username,
      action: 'update',
      module: 'staff',
      detail: `更新员工信息: ${staff.username}`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    })

    return success(res, staff, '员工信息更新成功')
  } catch (err: any) {
    console.error('更新员工信息失败:', err)
    if (err.message.includes('不存在')) {
      return error(res, err.message, 404)
    }
    return error(res, '更新员工信息失败')
  }
}

/**
 * 重置员工密码
 * POST /api/admin/system/staff/:id/reset-password
 */
export async function resetStaffPassword(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { newPassword } = req.body

    if (!id || isNaN(parseInt(id))) {
      return error(res, '无效的员工ID', 400)
    }

    if (!newPassword || newPassword.length < 6) {
      return error(res, '新密码长度不能少于6位', 400)
    }

    const staff = await settingService.resetSystemUserPassword(parseInt(id), newPassword)

    // 记录操作日志
    const user = (req as any).user
    await settingService.createAuditLog({
      userId: user.id,
      userType: 'admin',
      userName: user.username,
      action: 'reset_password',
      module: 'staff',
      detail: `重置员工密码: ${staff.username}`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    })

    return success(res, { id: staff.id, username: staff.username }, '密码重置成功')
  } catch (err: any) {
    console.error('重置员工密码失败:', err)
    if (err.message.includes('不存在')) {
      return error(res, err.message, 404)
    }
    return error(res, '重置员工密码失败')
  }
}

/**
 * 删除员工账号（禁用）
 * DELETE /api/admin/system/staff/:id
 */
export async function deleteStaff(req: Request, res: Response) {
  try {
    const { id } = req.params

    if (!id || isNaN(parseInt(id))) {
      return error(res, '无效的员工ID', 400)
    }

    const staff = await settingService.deleteSystemUser(parseInt(id))

    // 记录操作日志
    const user = (req as any).user
    await settingService.createAuditLog({
      userId: user.id,
      userType: 'admin',
      userName: user.username,
      action: 'delete',
      module: 'staff',
      detail: `禁用员工账号: ${staff.username}`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    })

    return success(res, staff, '员工账号已禁用')
  } catch (err: any) {
    console.error('删除员工账号失败:', err)
    if (err.message.includes('不存在')) {
      return error(res, err.message, 404)
    }
    return error(res, '删除员工账号失败')
  }
}

/**
 * 获取员工详情
 * GET /api/admin/system/staff/:id
 */
export async function getStaffDetail(req: Request, res: Response) {
  try {
    const { id } = req.params

    if (!id || isNaN(parseInt(id))) {
      return error(res, '无效的员工ID', 400)
    }

    const staff = await settingService.getSystemUserDetail(parseInt(id))

    return success(res, staff)
  } catch (err: any) {
    console.error('获取员工详情失败:', err)
    if (err.message.includes('不存在')) {
      return error(res, err.message, 404)
    }
    return error(res, '获取员工详情失败')
  }
}

export default {
  createStaff,
  updateStaff,
  resetStaffPassword,
  deleteStaff,
  getStaffDetail
}

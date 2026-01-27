import { Request, Response } from 'express'
import { success, error } from '../utils/response'
import * as settingService from '../services/settingService'

// 获取公开的基本配置（无需认证）- 用于登录页面等
export async function getPublicConfig(req: Request, res: Response) {
  try {
    const settings = await settingService.getSettings()
    // 只返回公开信息
    return success(res, {
      companyName: settings?.companyName || '',
      companyLogo: settings?.companyLogo || '',
    })
  } catch (err: any) {
    console.error('获取公开配置失败:', err)
    return error(res, '获取配置失败')
  }
}

// 获取系统设置
export async function getSettings(req: Request, res: Response) {
  try {
    const settings = await settingService.getSettings()
    return success(res, settings)
  } catch (err: any) {
    console.error('获取系统设置失败:', err)
    return error(res, '获取系统设置失败')
  }
}

// 更新系统设置
export async function updateSettings(req: Request, res: Response) {
  try {
    const data = req.body

    // 字段长度验证
    if (data.companyName && data.companyName.length > 50) {
      return error(res, '公司名称不能超过50个字符', 400)
    }
    if (data.companyAddress && data.companyAddress.length > 200) {
      return error(res, '公司地址不能超过200个字符', 400)
    }
    if (data.contactPhone && String(data.contactPhone).length > 20) {
      return error(res, '联系电话格式不正确', 400)
    }

    // 记录操作日志
    const user = (req as any).user
    await settingService.createAuditLog({
      userId: user.id,
      userType: 'admin',
      userName: user.username,
      action: 'update',
      module: 'settings',
      detail: JSON.stringify(data),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    })

    const settings = await settingService.updateSettings(data)
    return success(res, settings, '设置保存成功')
  } catch (err: any) {
    console.error('更新系统设置失败:', err)
    return error(res, '更新系统设置失败')
  }
}

// 执行数据备份
export async function executeBackup(req: Request, res: Response) {
  try {
    // 记录操作日志
    const user = (req as any).user
    await settingService.createAuditLog({
      userId: user.id,
      userType: 'admin',
      userName: user.username,
      action: 'backup',
      module: 'system',
      detail: '执行数据备份',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    })

    const result = await settingService.executeBackup()
    return success(res, result, result.message)
  } catch (err: any) {
    console.error('执行数据备份失败:', err)
    return error(res, '执行数据备份失败')
  }
}

// 获取操作日志列表
export async function getAuditLogs(req: Request, res: Response) {
  try {
    const {
      page = '1',
      pageSize = '20',
      userId,
      userType,
      action,
      module,
      startDate,
      endDate
    } = req.query

    // 验证分页参数
    const pageNum = Math.max(1, parseInt(page as string) || 1)
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize as string) || 20))

    const result = await settingService.getAuditLogs({
      page: pageNum,
      pageSize: pageSizeNum,
      userId: userId ? parseInt(userId as string) : undefined,
      userType: userType as string,
      action: action as string,
      module: module as string,
      startDate: startDate as string,
      endDate: endDate as string
    })

    return success(res, result)
  } catch (err: any) {
    console.error('获取操作日志失败:', err)
    return error(res, '获取操作日志失败')
  }
}

// 获取管理员列表
export async function getAdminList(req: Request, res: Response) {
  try {
    const {
      page = '1',
      pageSize = '20',
      keyword,
      status
    } = req.query

    const pageNum = Math.max(1, parseInt(page as string) || 1)
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize as string) || 20))

    const result = await settingService.getAdminList({
      page: pageNum,
      pageSize: pageSizeNum,
      keyword: keyword as string,
      status: status as string
    })

    return success(res, result)
  } catch (err: any) {
    console.error('获取管理员列表失败:', err)
    return error(res, '获取管理员列表失败')
  }
}

// 获取员工列表
export async function getStaffList(req: Request, res: Response) {
  try {
    const {
      page = '1',
      pageSize = '20',
      keyword,
      role,
      status
    } = req.query

    const pageNum = Math.max(1, parseInt(page as string) || 1)
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize as string) || 20))

    const result = await settingService.getStaffList({
      page: pageNum,
      pageSize: pageSizeNum,
      keyword: keyword as string,
      role: role as string,
      status: status as string
    })

    return success(res, result)
  } catch (err: any) {
    console.error('获取员工列表失败:', err)
    return error(res, '获取员工列表失败')
  }
}

// ============ 打印配置管理 ============

// 获取打印配置
export async function getPrintConfig(req: Request, res: Response) {
  try {
    const config = await settingService.getPrintConfig()
    return success(res, config)
  } catch (err: any) {
    console.error('获取打印配置失败:', err)
    return error(res, '获取打印配置失败')
  }
}

// 更新打印配置
export async function updatePrintConfig(req: Request, res: Response) {
  try {
    const data = req.body

    // 字段长度验证
    if (data.storeName && data.storeName.length > 30) {
      return error(res, '店铺名称不能超过30个字符', 400)
    }
    if (data.storePhone && data.storePhone.length > 20) {
      return error(res, '联系电话不能超过20个字符', 400)
    }
    if (data.storeAddress && data.storeAddress.length > 100) {
      return error(res, '店铺地址不能超过100个字符', 400)
    }
    if (data.footerText && data.footerText.length > 50) {
      return error(res, '底部提示语不能超过50个字符', 400)
    }
    if (data.paperWidth && ![58, 80].includes(data.paperWidth)) {
      return error(res, '纸张宽度只支持58mm或80mm', 400)
    }

    // 记录操作日志
    const user = (req as any).user
    await settingService.createAuditLog({
      userId: user.id,
      userType: 'admin',
      userName: user.username,
      action: 'update',
      module: 'settings',
      detail: `更新打印配置: ${JSON.stringify(data)}`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    })

    const config = await settingService.updatePrintConfig(data)
    return success(res, config, '打印配置保存成功')
  } catch (err: any) {
    console.error('更新打印配置失败:', err)
    return error(res, '更新打印配置失败')
  }
}

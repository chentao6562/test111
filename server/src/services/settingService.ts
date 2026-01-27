import prisma from '../utils/prisma'

// 获取系统设置
export async function getSettings() {
  const configs = await prisma.config.findMany()

  // 转换为对象格式
  const settings: Record<string, any> = {}
  configs.forEach(config => {
    try {
      settings[config.key] = JSON.parse(config.value)
    } catch {
      settings[config.key] = config.value
    }
  })

  // 返回默认设置（如果数据库中没有）
  return {
    companyName: settings.companyName || '蒙庆烟花有限公司',
    companyLogo: settings.companyLogo || '',
    contactPhone: settings.contactPhone || '400-888-9999',
    companyAddress: settings.companyAddress || '湖南省浏阳市花炮大道88号',
    maintenanceMode: settings.maintenanceMode || false,
    defaultLanguage: settings.defaultLanguage || 'zh-CN',
    autoBackup: settings.autoBackup || false,
    lastBackupTime: settings.lastBackupTime || null,
  }
}

// 更新系统设置
export async function updateSettings(data: Record<string, any>) {
  const updates = Object.entries(data).map(async ([key, value]) => {
    const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value)

    return prisma.config.upsert({
      where: { key },
      update: { value: valueStr },
      create: { key, value: valueStr }
    })
  })

  await Promise.all(updates)
  return getSettings()
}

// 执行数据备份（模拟）
export async function executeBackup() {
  // 这里只是模拟备份，实际应该调用数据库备份命令
  const backupTime = new Date().toISOString()

  await prisma.config.upsert({
    where: { key: 'lastBackupTime' },
    update: { value: backupTime },
    create: { key: 'lastBackupTime', value: backupTime }
  })

  return {
    success: true,
    backupTime,
    message: '数据备份成功'
  }
}

// 获取操作日志列表
export async function getAuditLogs(params: {
  page?: number
  pageSize?: number
  userId?: number
  userType?: string
  action?: string
  module?: string
  startDate?: string
  endDate?: string
}) {
  const {
    page = 1,
    pageSize = 20,
    userId,
    userType,
    action,
    module,
    startDate,
    endDate
  } = params

  const where: any = {}

  if (userId) {
    where.userId = userId
  }
  if (userType) {
    where.userType = userType
  }
  if (action) {
    where.action = action
  }
  if (module) {
    where.module = module
  }
  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) {
      where.createdAt.gte = new Date(startDate)
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate + ' 23:59:59')
    }
  }

  const [total, list] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })
  ])

  return {
    list,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  }
}

// 记录操作日志
export async function createAuditLog(data: {
  userId: number
  userType: string
  userName?: string
  action: string
  module: string
  detail?: string
  ip?: string
  userAgent?: string
}) {
  return prisma.auditLog.create({
    data: {
      userId: data.userId,
      userType: data.userType,
      userName: data.userName,
      action: data.action,
      module: data.module,
      detail: data.detail,
      ip: data.ip,
      userAgent: data.userAgent
    }
  })
}

// 获取管理员列表
export async function getAdminList(params: {
  page?: number
  pageSize?: number
  keyword?: string
  status?: string
}) {
  const { page = 1, pageSize = 20, keyword, status } = params

  const where: any = {
    role: 'ADMIN'
  }

  if (keyword) {
    where.OR = [
      { username: { contains: keyword } },
      { name: { contains: keyword } },
      { phone: { contains: keyword } }
    ]
  }

  if (status) {
    where.status = status
  }

  const [total, list] = await Promise.all([
    prisma.systemUser.count({ where }),
    prisma.systemUser.findMany({
      where,
      select: {
        id: true,
        username: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    })
  ])

  return {
    list,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  }
}

// 获取员工列表
export async function getStaffList(params: {
  page?: number
  pageSize?: number
  keyword?: string
  role?: string
  status?: string
}) {
  const { page = 1, pageSize = 20, keyword, role, status } = params

  const where: any = {
    role: { in: ['WAREHOUSE', 'LOGISTICS'] }
  }

  if (keyword) {
    where.OR = [
      { username: { contains: keyword } },
      { name: { contains: keyword } },
      { phone: { contains: keyword } }
    ]
  }

  if (role && role !== 'ADMIN') {
    where.role = role
  }

  if (status) {
    where.status = status
  }

  const [total, list] = await Promise.all([
    prisma.systemUser.count({ where }),
    prisma.systemUser.findMany({
      where,
      select: {
        id: true,
        username: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        warehouseId: true,  // 【2026-01-13 多仓库支持】
        warehouse: {        // 【2026-01-13】关联仓库信息
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    })
  ])

  return {
    list,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  }
}

// ============ 员工账号管理 ============

/**
 * 创建员工账号
 */
export async function createSystemUser(data: {
  username: string
  password: string
  name: string
  phone?: string
  role: string
  warehouseId?: number  // 【2026-01-13 多仓库支持】
}) {
  const bcrypt = await import('bcryptjs')

  // 检查用户名是否已存在
  const existing = await prisma.systemUser.findUnique({
    where: { username: data.username }
  })

  if (existing) {
    throw new Error('用户名已存在')
  }

  // 验证角色
  const validRoles = ['ADMIN', 'WAREHOUSE', 'LOGISTICS']
  if (!validRoles.includes(data.role)) {
    throw new Error('无效的角色类型')
  }

  // 【2026-01-13】如果是库管，验证仓库是否存在
  if (data.role === 'WAREHOUSE' && data.warehouseId) {
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: data.warehouseId }
    })
    if (!warehouse) {
      throw new Error('指定的仓库不存在')
    }
  }

  // 加密密码
  const hashedPassword = await bcrypt.hash(data.password, 10)

  return prisma.systemUser.create({
    data: {
      username: data.username,
      password: hashedPassword,
      name: data.name,
      phone: data.phone,
      role: data.role,
      status: 'ACTIVE',
      warehouseId: data.role === 'WAREHOUSE' ? data.warehouseId : null  // 【2026-01-13】
    },
    select: {
      id: true,
      username: true,
      name: true,
      phone: true,
      role: true,
      status: true,
      warehouseId: true,
      warehouse: {
        select: {
          id: true,
          name: true,
          code: true
        }
      },
      createdAt: true,
      updatedAt: true
    }
  })
}

/**
 * 更新员工信息
 */
export async function updateSystemUser(id: number, data: {
  name?: string
  phone?: string
  status?: string
  warehouseId?: number | null  // 【2026-01-13 多仓库支持】
}) {
  const user = await prisma.systemUser.findUnique({
    where: { id }
  })

  if (!user) {
    throw new Error('用户不存在')
  }

  // 验证状态
  if (data.status && !['ACTIVE', 'DISABLED'].includes(data.status)) {
    throw new Error('无效的状态')
  }

  // 【2026-01-13】如果更新仓库，验证仓库是否存在
  if (data.warehouseId !== undefined && data.warehouseId !== null) {
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: data.warehouseId }
    })
    if (!warehouse) {
      throw new Error('指定的仓库不存在')
    }
  }

  const updateData: any = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.phone !== undefined) updateData.phone = data.phone
  if (data.status !== undefined) updateData.status = data.status
  // 【2026-01-13】只有库管才能设置仓库
  if (data.warehouseId !== undefined && user.role === 'WAREHOUSE') {
    updateData.warehouseId = data.warehouseId
  }

  return prisma.systemUser.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      username: true,
      name: true,
      phone: true,
      role: true,
      status: true,
      warehouseId: true,
      warehouse: {
        select: {
          id: true,
          name: true,
          code: true
        }
      },
      createdAt: true,
      updatedAt: true
    }
  })
}

/**
 * 重置员工密码
 */
export async function resetSystemUserPassword(id: number, newPassword: string) {
  const bcrypt = await import('bcryptjs')

  const user = await prisma.systemUser.findUnique({
    where: { id }
  })

  if (!user) {
    throw new Error('用户不存在')
  }

  // 加密新密码
  const hashedPassword = await bcrypt.hash(newPassword, 10)

  return prisma.systemUser.update({
    where: { id },
    data: {
      password: hashedPassword,
      loginFailCount: 0,  // 重置失败次数
      lockedUntil: null   // 解除锁定
    },
    select: {
      id: true,
      username: true,
      name: true
    }
  })
}

/**
 * 删除员工账号（软删除，改为禁用）
 */
export async function deleteSystemUser(id: number) {
  const user = await prisma.systemUser.findUnique({
    where: { id }
  })

  if (!user) {
    throw new Error('用户不存在')
  }

  // 软删除：禁用账号
  return prisma.systemUser.update({
    where: { id },
    data: {
      status: 'DISABLED'
    },
    select: {
      id: true,
      username: true,
      name: true,
      status: true
    }
  })
}

/**
 * 获取员工详情
 */
export async function getSystemUserDetail(id: number) {
  const user = await prisma.systemUser.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      name: true,
      phone: true,
      role: true,
      status: true,
      loginFailCount: true,
      lockedUntil: true,
      createdAt: true,
      updatedAt: true
    }
  })

  if (!user) {
    throw new Error('用户不存在')
  }

  return user
}

// ============ 打印配置管理 ============

/**
 * 获取打印配置
 */
export async function getPrintConfig() {
  const configs = await prisma.config.findMany({
    where: {
      key: {
        startsWith: 'print_'
      }
    }
  })

  // 转换为对象格式
  const settings: Record<string, any> = {}
  configs.forEach(config => {
    const key = config.key.replace('print_', '')
    try {
      settings[key] = JSON.parse(config.value)
    } catch {
      settings[key] = config.value
    }
  })

  // 返回默认打印配置
  return {
    enablePrint: settings.enablePrint !== undefined ? settings.enablePrint : true,
    storeName: settings.storeName || '蒙庆烟花',
    storePhone: settings.storePhone || '13190531439',
    storeAddress: settings.storeAddress || '呼和浩特市和林格尔县盛乐镇姑子板村华门世家1号门面房',
    footerText: settings.footerText || '请核对商品后签收',
    showQRCode: settings.showQRCode !== undefined ? settings.showQRCode : false,
    paperWidth: settings.paperWidth || 58,
  }
}

/**
 * 更新打印配置
 */
export async function updatePrintConfig(data: {
  enablePrint?: boolean
  storeName?: string
  storePhone?: string
  storeAddress?: string
  footerText?: string
  showQRCode?: boolean
  paperWidth?: number
}) {
  const updates = Object.entries(data).map(async ([key, value]) => {
    const configKey = `print_${key}`
    const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value)

    return prisma.config.upsert({
      where: { key: configKey },
      update: { value: valueStr },
      create: { key: configKey, value: valueStr }
    })
  })

  await Promise.all(updates)
  return getPrintConfig()
}

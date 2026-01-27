/**
 * 锁价管理后台控制器
 * @module controllers/adminPriceLockController
 * @since 2026-01-21
 */

import { Request, Response } from 'express';
import prisma from '../utils/prisma';

/**
 * 获取系统配置
 * GET /api/admin/price-lock/system-config
 */
export async function getSystemConfig(req: Request, res: Response) {
  try {
    const [enabledConfig, lockHoursConfig, minAmountConfig] = await Promise.all([
      prisma.config.findUnique({ where: { key: 'price_lock_enabled' } }),
      prisma.config.findUnique({ where: { key: 'price_lock_hours' } }),
      prisma.config.findUnique({ where: { key: 'price_lock_min_amount' } }),
    ]);

    res.json({
      code: 0,
      message: 'success',
      data: {
        enabled: enabledConfig?.value === 'true',
        lockHours: parseInt(lockHoursConfig?.value || '24', 10),
        minAmount: parseFloat(minAmountConfig?.value || '100'),
      },
    });
  } catch (error: any) {
    console.error('获取系统配置失败:', error);
    res.status(500).json({ code: 500, message: error.message || '获取配置失败' });
  }
}

/**
 * 保存系统配置
 * POST /api/admin/price-lock/system-config
 */
export async function saveSystemConfig(req: Request, res: Response) {
  try {
    const { enabled, lockHours, minAmount } = req.body;

    const updates = [
      { key: 'price_lock_enabled', value: String(enabled) },
      { key: 'price_lock_hours', value: String(lockHours) },
      { key: 'price_lock_min_amount', value: String(minAmount) },
    ];

    await Promise.all(
      updates.map((item) =>
        prisma.config.upsert({
          where: { key: item.key },
          update: { value: item.value },
          create: { key: item.key, value: item.value },
        })
      )
    );

    res.json({ code: 0, message: 'success', data: null });
  } catch (error: any) {
    console.error('保存系统配置失败:', error);
    res.status(500).json({ code: 500, message: error.message || '保存配置失败' });
  }
}

/**
 * 获取活动配置列表
 * GET /api/admin/price-lock/configs
 */
export async function getConfigList(req: Request, res: Response) {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const [list, total] = await Promise.all([
      prisma.priceLockConfig.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.priceLockConfig.count(),
    ]);

    res.json({
      code: 0,
      message: 'success',
      data: {
        list: list.map((item) => ({
          ...item,
          minAmount: item.minAmount ? Number(item.minAmount) : 0,
        })),
        total,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
      },
    });
  } catch (error: any) {
    console.error('获取配置列表失败:', error);
    res.status(500).json({ code: 500, message: error.message || '获取列表失败' });
  }
}

/**
 * 创建活动配置
 * POST /api/admin/price-lock/configs
 */
export async function createConfig(req: Request, res: Response) {
  try {
    const { name, lockHours, minAmount, startTime, endTime, isActive } = req.body;

    if (!name) {
      return res.status(400).json({ code: 400, message: '请输入活动名称' });
    }

    // 从认证信息获取管理员ID
    const adminId = (req as any).user?.id || 1;

    const config = await prisma.priceLockConfig.create({
      data: {
        name,
        lockHours: lockHours || 24,
        minAmount: minAmount || 100,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        isActive: isActive !== false,
        createdBy: adminId,
      },
    });

    res.json({ code: 0, message: 'success', data: config });
  } catch (error: any) {
    console.error('创建配置失败:', error);
    res.status(500).json({ code: 500, message: error.message || '创建失败' });
  }
}

/**
 * 更新活动配置
 * PUT /api/admin/price-lock/configs/:id
 */
export async function updateConfig(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ code: 400, message: '无效的配置ID' });
    }

    const { name, lockHours, minAmount, startTime, endTime, isActive } = req.body;

    const config = await prisma.priceLockConfig.update({
      where: { id },
      data: {
        name,
        lockHours,
        minAmount,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        isActive,
      },
    });

    res.json({ code: 0, message: 'success', data: config });
  } catch (error: any) {
    console.error('更新配置失败:', error);
    res.status(500).json({ code: 500, message: error.message || '更新失败' });
  }
}

/**
 * 删除活动配置
 * DELETE /api/admin/price-lock/configs/:id
 */
export async function deleteConfig(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ code: 400, message: '无效的配置ID' });
    }

    await prisma.priceLockConfig.delete({ where: { id } });

    res.json({ code: 0, message: 'success', data: null });
  } catch (error: any) {
    console.error('删除配置失败:', error);
    res.status(500).json({ code: 500, message: error.message || '删除失败' });
  }
}

/**
 * 获取锁价统计数据
 * GET /api/admin/price-lock/stats
 */
export async function getStats(req: Request, res: Response) {
  try {
    const [total, active, used, expired] = await Promise.all([
      prisma.priceLock.count(),
      prisma.priceLock.count({ where: { status: 'ACTIVE' } }),
      prisma.priceLock.count({ where: { status: 'USED' } }),
      prisma.priceLock.count({ where: { status: 'EXPIRED' } }),
    ]);

    res.json({
      code: 0,
      message: 'success',
      data: { total, active, used, expired },
    });
  } catch (error: any) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ code: 500, message: error.message || '获取统计失败' });
  }
}

/**
 * 获取锁价列表
 * GET /api/admin/price-lock/list
 */
export async function getPriceLockList(req: Request, res: Response) {
  try {
    const { page = 1, pageSize = 20, status, phone, startDate, endDate } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const where: any = {};

    if (status) where.status = status;
    if (phone) {
      where.customerPhone = { contains: phone as string };
    }
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string + 'T23:59:59'),
      };
    }

    const [list, total] = await Promise.all([
      prisma.priceLock.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.priceLock.count({ where }),
    ]);

    res.json({
      code: 0,
      message: 'success',
      data: {
        list: list.map((item) => ({
          id: item.id,
          code: item.code,
          customerPhone: item.customerPhone,
          customerName: item.customerName,
          totalAmount: Number(item.totalAmount),
          status: item.status,
          expireAt: item.expireAt.toISOString(),
          createdAt: item.createdAt.toISOString(),
          usedAt: item.usedAt?.toISOString() || null,
        })),
        total,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
      },
    });
  } catch (error: any) {
    console.error('获取锁价列表失败:', error);
    res.status(500).json({ code: 500, message: error.message || '获取列表失败' });
  }
}

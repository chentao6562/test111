/**
 * 拼团管理后台控制器
 * @module controllers/adminGroupBuyController
 * @since 2026-01-21
 */

import { Request, Response } from 'express';
import prisma from '../utils/prisma';

/**
 * 获取系统配置
 * GET /api/admin/group-buy/system-config
 */
export async function getSystemConfig(req: Request, res: Response) {
  try {
    const [enabledConfig, requiredCountConfig, minAmountConfig, formingHoursConfig] = await Promise.all([
      prisma.config.findUnique({ where: { key: 'group_buy_enabled' } }),
      prisma.config.findUnique({ where: { key: 'group_buy_required_count' } }),
      prisma.config.findUnique({ where: { key: 'group_buy_min_amount' } }),
      prisma.config.findUnique({ where: { key: 'group_buy_forming_hours' } }),
    ]);

    res.json({
      code: 0,
      message: 'success',
      data: {
        enabled: enabledConfig?.value === 'true',
        requiredCount: parseInt(requiredCountConfig?.value || '3', 10),
        minAmount: parseFloat(minAmountConfig?.value || '200'),
        formingHours: parseInt(formingHoursConfig?.value || '24', 10),
      },
    });
  } catch (error: any) {
    console.error('获取系统配置失败:', error);
    res.status(500).json({ code: 500, message: error.message || '获取配置失败' });
  }
}

/**
 * 保存系统配置
 * POST /api/admin/group-buy/system-config
 */
export async function saveSystemConfig(req: Request, res: Response) {
  try {
    const { enabled, requiredCount, minAmount, formingHours } = req.body;

    const updates = [
      { key: 'group_buy_enabled', value: String(enabled) },
      { key: 'group_buy_required_count', value: String(requiredCount) },
      { key: 'group_buy_min_amount', value: String(minAmount) },
      { key: 'group_buy_forming_hours', value: String(formingHours) },
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
 * 获取拼团活动配置列表
 * GET /api/admin/group-buy/configs
 */
export async function getConfigList(req: Request, res: Response) {
  try {
    const { page = 1, pageSize = 20, status } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const where: any = {};
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;

    const [list, total] = await Promise.all([
      prisma.groupBuyConfig.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.groupBuyConfig.count({ where }),
    ]);

    res.json({
      code: 0,
      message: 'success',
      data: {
        list: list.map((item) => ({
          ...item,
          minAmount: Number(item.minAmount),
          bonusGiftCost: item.bonusGiftCost ? Number(item.bonusGiftCost) : 0,
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
 * 创建拼团活动配置
 * POST /api/admin/group-buy/configs
 */
export async function createConfig(req: Request, res: Response) {
  try {
    const {
      name,
      requiredCount,
      minAmount,
      formingHours,
      bonusGiftName,
      bonusGiftCost,
      startTime,
      endTime,
      isActive,
      memberGiftsJson,  // 【2026-01-29】多档位赠品配置
    } = req.body;

    if (!name) {
      return res.status(400).json({ code: 400, message: '请输入活动名称' });
    }

    // 从认证信息获取管理员ID
    const adminId = (req as any).user?.id || 1;

    const config = await prisma.groupBuyConfig.create({
      data: {
        name,
        requiredCount: requiredCount || 3,
        minAmount: minAmount || 200,
        formingHours: formingHours || 24,
        bonusGiftName: bonusGiftName || null,
        bonusGiftCost: bonusGiftCost || 0,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        isActive: isActive !== false,
        createdBy: adminId,
        memberGiftsJson: memberGiftsJson || null,  // 【2026-01-29】多档位赠品配置
      },
    });

    res.json({ code: 0, message: 'success', data: config });
  } catch (error: any) {
    console.error('创建配置失败:', error);
    res.status(500).json({ code: 500, message: error.message || '创建失败' });
  }
}

/**
 * 更新拼团活动配置
 * PUT /api/admin/group-buy/configs/:id
 */
export async function updateConfig(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ code: 400, message: '无效的配置ID' });
    }

    const {
      name,
      requiredCount,
      minAmount,
      formingHours,
      bonusGiftName,
      bonusGiftCost,
      startTime,
      endTime,
      isActive,
      memberGiftsJson,  // 【2026-01-29】多档位赠品配置
    } = req.body;

    const config = await prisma.groupBuyConfig.update({
      where: { id },
      data: {
        name,
        requiredCount,
        minAmount,
        formingHours,
        bonusGiftName: bonusGiftName || null,
        bonusGiftCost: bonusGiftCost || 0,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        isActive,
        memberGiftsJson: memberGiftsJson !== undefined ? memberGiftsJson : undefined,  // 【2026-01-29】多档位赠品配置
      },
    });

    res.json({ code: 0, message: 'success', data: config });
  } catch (error: any) {
    console.error('更新配置失败:', error);
    res.status(500).json({ code: 500, message: error.message || '更新失败' });
  }
}

/**
 * 删除拼团活动配置
 * DELETE /api/admin/group-buy/configs/:id
 */
export async function deleteConfig(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ code: 400, message: '无效的配置ID' });
    }

    // 检查是否有关联的拼团
    const groupBuyCount = await prisma.groupBuy.count({
      where: { configId: id },
    });

    if (groupBuyCount > 0) {
      return res.status(400).json({
        code: 400,
        message: `该配置已关联${groupBuyCount}个拼团，无法删除`,
      });
    }

    await prisma.groupBuyConfig.delete({ where: { id } });

    res.json({ code: 0, message: 'success', data: null });
  } catch (error: any) {
    console.error('删除配置失败:', error);
    res.status(500).json({ code: 500, message: error.message || '删除失败' });
  }
}

/**
 * 获取拼团统计数据
 * GET /api/admin/group-buy/stats
 */
export async function getStats(req: Request, res: Response) {
  try {
    const [total, forming, full, completed, expired] = await Promise.all([
      prisma.groupBuy.count(),
      prisma.groupBuy.count({ where: { status: 'FORMING' } }),
      prisma.groupBuy.count({ where: { status: 'FULL' } }),
      prisma.groupBuy.count({ where: { status: 'COMPLETED' } }),
      prisma.groupBuy.count({ where: { status: 'EXPIRED' } }),
    ]);

    res.json({
      code: 0,
      message: 'success',
      data: { total, forming, full, completed, expired },
    });
  } catch (error: any) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ code: 500, message: error.message || '获取统计失败' });
  }
}

/**
 * 获取拼团列表
 * GET /api/admin/group-buy/list
 */
export async function getGroupBuyList(req: Request, res: Response) {
  try {
    const { page = 1, pageSize = 20, status, code, phone, startDate, endDate } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const where: any = {};

    if (status) where.status = status;
    if (code) where.code = { contains: code as string };
    if (phone) {
      where.OR = [
        { initiatorPhone: { contains: phone as string } },
        { members: { some: { customerPhone: { contains: phone as string } } } },
      ];
    }
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string + 'T23:59:59'),
      };
    }

    const [list, total] = await Promise.all([
      prisma.groupBuy.findMany({
        where,
        skip,
        take,
        include: {
          store: { select: { id: true, name: true } },
          members: {
            orderBy: { joinedAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.groupBuy.count({ where }),
    ]);

    res.json({
      code: 0,
      message: 'success',
      data: {
        list: list.map((item) => ({
          id: item.id,
          code: item.code,
          initiatorName: item.initiatorName,
          initiatorPhone: item.initiatorPhone,
          requiredCount: item.requiredCount,
          currentCount: item.currentCount,
          bonusGiftName: item.bonusGiftName,
          storeId: item.storeId,
          storeName: item.store?.name,
          pickupDate: item.pickupDate.toISOString().split('T')[0],
          status: item.status,
          expireAt: item.expireAt.toISOString(),
          createdAt: item.createdAt.toISOString(),
          completedAt: item.completedAt?.toISOString() || null,
          members: item.members.map((m) => ({
            id: m.id,
            customerName: m.customerName,
            customerPhone: m.customerPhone,
            reservationId: m.reservationId,
            status: m.status,
            joinedAt: m.joinedAt.toISOString(),
            pickedUpAt: m.pickedUpAt?.toISOString() || null,
            bonusGiftDelivered: m.bonusGiftDelivered,
          })),
        })),
        total,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
      },
    });
  } catch (error: any) {
    console.error('获取拼团列表失败:', error);
    res.status(500).json({ code: 500, message: error.message || '获取列表失败' });
  }
}

/**
 * 获取拼团详情
 * GET /api/admin/group-buy/:code
 */
export async function getGroupBuyDetail(req: Request, res: Response) {
  try {
    const { code } = req.params;

    const groupBuy = await prisma.groupBuy.findUnique({
      where: { code },
      include: {
        store: { select: { id: true, name: true, address: true } },
        members: {
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!groupBuy) {
      return res.status(404).json({ code: 404, message: '拼团不存在' });
    }

    res.json({
      code: 0,
      message: 'success',
      data: {
        id: groupBuy.id,
        code: groupBuy.code,
        initiatorName: groupBuy.initiatorName,
        initiatorPhone: groupBuy.initiatorPhone,
        requiredCount: groupBuy.requiredCount,
        currentCount: groupBuy.currentCount,
        bonusGiftName: groupBuy.bonusGiftName,
        storeId: groupBuy.storeId,
        storeName: groupBuy.store?.name,
        storeAddress: groupBuy.store?.address,
        regionName: groupBuy.regionName,  // 顺路拼团区域
        pickupDate: groupBuy.pickupDate.toISOString().split('T')[0],
        status: groupBuy.status,
        expireAt: groupBuy.expireAt.toISOString(),
        createdAt: groupBuy.createdAt.toISOString(),
        completedAt: groupBuy.completedAt?.toISOString() || null,
        members: groupBuy.members.map((m) => ({
          id: m.id,
          customerName: m.customerName,
          customerPhone: m.customerPhone,
          reservationId: m.reservationId,
          status: m.status,
          joinedAt: m.joinedAt.toISOString(),
          pickedUpAt: m.pickedUpAt?.toISOString() || null,
          bonusGiftDelivered: m.bonusGiftDelivered,
        })),
      },
    });
  } catch (error: any) {
    console.error('获取拼团详情失败:', error);
    res.status(500).json({ code: 500, message: error.message || '获取详情失败' });
  }
}

/**
 * 取消拼团（管理员操作）
 * POST /api/admin/group-buy/:code/cancel
 */
export async function cancelGroupBuy(req: Request, res: Response) {
  try {
    const { code } = req.params;

    const groupBuy = await prisma.groupBuy.findUnique({
      where: { code },
      include: { members: true },
    });

    if (!groupBuy) {
      return res.status(404).json({ code: 404, message: '拼团不存在' });
    }

    // 只有组队中或已满员状态可以取消
    if (groupBuy.status !== 'FORMING' && groupBuy.status !== 'FULL') {
      return res.status(400).json({ code: 400, message: '当前状态不允许取消' });
    }

    // 执行取消操作
    await prisma.$transaction([
      // 更新所有成员状态为已退出
      prisma.groupBuyMember.updateMany({
        where: { groupBuyId: groupBuy.id },
        data: { status: 'QUIT' },
      }),
      // 更新拼团状态为已取消
      prisma.groupBuy.update({
        where: { id: groupBuy.id },
        data: { status: 'CANCELLED' },
      }),
    ]);

    res.json({ code: 0, message: '取消成功' });
  } catch (error: any) {
    console.error('取消拼团失败:', error);
    res.status(500).json({ code: 500, message: error.message || '取消失败' });
  }
}

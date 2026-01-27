/**
 * 砍价活动管理后台控制器
 * @module controllers/adminBargainController
 * @since 2026-01-22
 */

import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import {
  BargainStatus,
  CreateBargainConfigRequest,
  BargainStats,
  addToBlacklist,
  removeFromBlacklist,
  getBlacklist,
} from '../services/bargain';

// ========== 活动配置管理 ==========

/**
 * 创建砍价活动
 * POST /api/admin/bargain/config
 */
export async function createConfig(req: Request, res: Response) {
  try {
    const data: CreateBargainConfigRequest = req.body;
    const admin = (req as any).user;

    if (!data.name || !data.startTime || !data.endTime || !data.items?.length) {
      return res.json({ code: 400, message: '缺少必要参数' });
    }

    // 【2026-01-26】检查是否包含特价商品
    const productIds = data.items.map((item: any) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, isSpecialPrice: true },
    });
    const specialPriceProducts = products.filter(p => p.isSpecialPrice);
    if (specialPriceProducts.length > 0) {
      const names = specialPriceProducts.map(p => p.name).join('、');
      return res.json({ code: 400, message: `特价商品（${names}）不能参与砍价活动` });
    }

    const config = await prisma.bargainConfig.create({
      data: {
        name: data.name,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        bargainHours: data.bargainHours || 24,
        minBargainCount: data.minBargainCount || 3,
        maxBargainCount: data.maxBargainCount || 20,
        newUserBonus: data.newUserBonus || 2,
        costBearerType: data.costBearerType || 'PLATFORM',
        agentBearRatio: data.agentBearRatio || 0,
        minCartAmount: data.minCartAmount || 0, // 【2026-01-23】采购单门槛
        isActive: true,
        createdBy: admin.id,
        items: {
          create: data.items.map((item, index) => ({
            productId: item.productId,
            originalPrice: item.originalPrice,
            floorPrice: item.floorPrice,
            bargainStock: item.bargainStock || 0,
            limitPerUser: item.limitPerUser || 1,
            sort: item.sort ?? index,
          })),
        },
      },
      include: { items: true },
    });

    res.json({
      code: 0,
      message: '创建成功',
      data: config,
    });
  } catch (error: any) {
    console.error('[砍价管理] 创建活动失败:', error);
    res.json({
      code: 500,
      message: error.message || '创建失败',
    });
  }
}

/**
 * 获取活动配置列表
 * GET /api/admin/bargain/configs
 */
export async function getConfigList(req: Request, res: Response) {
  try {
    const { page = 1, pageSize = 10, status } = req.query;
    const skip = (Number(page) - 1) * Number(pageSize);

    const where: any = {};
    if (status === 'active') {
      where.isActive = true;
      where.endTime = { gte: new Date() };
    } else if (status === 'inactive') {
      where.isActive = false;
    } else if (status === 'ended') {
      where.endTime = { lt: new Date() };
    }

    const [list, total] = await Promise.all([
      prisma.bargainConfig.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                select: { name: true, images: true },
              },
            },
          },
          _count: { select: { bargains: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(pageSize),
      }),
      prisma.bargainConfig.count({ where }),
    ]);

    res.json({
      code: 0,
      message: 'success',
      data: { list, total },
    });
  } catch (error: any) {
    console.error('[砍价管理] 获取活动列表失败:', error);
    res.json({
      code: 500,
      message: error.message || '获取列表失败',
    });
  }
}

/**
 * 获取活动配置详情
 * GET /api/admin/bargain/config/:id
 */
export async function getConfigDetail(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const config = await prisma.bargainConfig.findUnique({
      where: { id: Number(id) },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, images: true, retailPrice: true },
            },
          },
        },
      },
    });

    if (!config) {
      return res.json({ code: 404, message: '活动不存在' });
    }

    res.json({
      code: 0,
      message: 'success',
      data: config,
    });
  } catch (error: any) {
    console.error('[砍价管理] 获取活动详情失败:', error);
    res.json({
      code: 500,
      message: error.message || '获取详情失败',
    });
  }
}

/**
 * 更新活动配置
 * PUT /api/admin/bargain/config/:id
 */
export async function updateConfig(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = req.body;

    const config = await prisma.bargainConfig.findUnique({
      where: { id: Number(id) },
    });

    if (!config) {
      return res.json({ code: 404, message: '活动不存在' });
    }

    // 更新配置
    const updated = await prisma.bargainConfig.update({
      where: { id: Number(id) },
      data: {
        name: data.name,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
        bargainHours: data.bargainHours,
        minBargainCount: data.minBargainCount,
        maxBargainCount: data.maxBargainCount,
        newUserBonus: data.newUserBonus,
        costBearerType: data.costBearerType,
        agentBearRatio: data.agentBearRatio,
        minCartAmount: data.minCartAmount, // 【2026-01-23】采购单门槛
        isActive: data.isActive,
      },
    });

    // 如果有商品配置更新，删除旧的重新创建
    if (data.items?.length) {
      // 【2026-01-26】检查是否包含特价商品
      const productIds = data.items.map((item: any) => item.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, isSpecialPrice: true },
      });
      const specialPriceProducts = products.filter(p => p.isSpecialPrice);
      if (specialPriceProducts.length > 0) {
        const names = specialPriceProducts.map(p => p.name).join('、');
        return res.json({ code: 400, message: `特价商品（${names}）不能参与砍价活动` });
      }

      await prisma.bargainConfigItem.deleteMany({
        where: { configId: Number(id) },
      });
      await prisma.bargainConfigItem.createMany({
        data: data.items.map((item: any, index: number) => ({
          configId: Number(id),
          productId: item.productId,
          originalPrice: item.originalPrice,
          floorPrice: item.floorPrice,
          bargainStock: item.bargainStock || 0,
          soldCount: item.soldCount || 0,
          limitPerUser: item.limitPerUser || 1,
          sort: item.sort ?? index,
        })),
      });
    }

    res.json({
      code: 0,
      message: '更新成功',
      data: updated,
    });
  } catch (error: any) {
    console.error('[砍价管理] 更新活动失败:', error);
    res.json({
      code: 500,
      message: error.message || '更新失败',
    });
  }
}

/**
 * 删除活动配置
 * DELETE /api/admin/bargain/config/:id
 */
export async function deleteConfig(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // 检查是否有关联的砍价
    const bargainCount = await prisma.bargain.count({
      where: { configId: Number(id) },
    });

    if (bargainCount > 0) {
      return res.json({ code: 400, message: '该活动已有砍价记录，无法删除' });
    }

    await prisma.bargainConfig.delete({
      where: { id: Number(id) },
    });

    res.json({
      code: 0,
      message: '删除成功',
    });
  } catch (error: any) {
    console.error('[砍价管理] 删除活动失败:', error);
    res.json({
      code: 500,
      message: error.message || '删除失败',
    });
  }
}

/**
 * 启用/禁用活动
 * POST /api/admin/bargain/config/:id/toggle
 */
export async function toggleConfig(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const config = await prisma.bargainConfig.findUnique({
      where: { id: Number(id) },
    });

    if (!config) {
      return res.json({ code: 404, message: '活动不存在' });
    }

    await prisma.bargainConfig.update({
      where: { id: Number(id) },
      data: { isActive: !config.isActive },
    });

    res.json({
      code: 0,
      message: config.isActive ? '已禁用' : '已启用',
    });
  } catch (error: any) {
    console.error('[砍价管理] 切换活动状态失败:', error);
    res.json({
      code: 500,
      message: error.message || '操作失败',
    });
  }
}

// ========== 砍价数据管理 ==========

/**
 * 获取砍价统计
 * GET /api/admin/bargain/stats
 */
export async function getStats(req: Request, res: Response) {
  try {
    const [
      totalBargains,
      bargainingCount,
      successCount,
      orderedCount,
      expiredCount,
      cancelledCount,
      aggregates,
    ] = await Promise.all([
      prisma.bargain.count(),
      prisma.bargain.count({ where: { status: BargainStatus.BARGAINING } }),
      prisma.bargain.count({ where: { status: BargainStatus.SUCCESS } }),
      prisma.bargain.count({ where: { status: BargainStatus.ORDERED } }),
      prisma.bargain.count({ where: { status: BargainStatus.EXPIRED } }),
      prisma.bargain.count({ where: { status: BargainStatus.CANCELLED } }),
      prisma.bargain.aggregate({
        _sum: {
          totalCut: true,
          platformCost: true,
          agentCost: true,
        },
      }),
    ]);

    const stats: BargainStats = {
      totalBargains,
      bargainingCount,
      successCount,
      orderedCount,
      expiredCount,
      cancelledCount,
      totalCutAmount: Number(aggregates._sum.totalCut) || 0,
      platformCost: Number(aggregates._sum.platformCost) || 0,
      agentCost: Number(aggregates._sum.agentCost) || 0,
    };

    res.json({
      code: 0,
      message: 'success',
      data: stats,
    });
  } catch (error: any) {
    console.error('[砍价管理] 获取统计失败:', error);
    res.json({
      code: 500,
      message: error.message || '获取统计失败',
    });
  }
}

/**
 * 获取砍价列表
 * GET /api/admin/bargain/list
 */
export async function getBargainList(req: Request, res: Response) {
  try {
    const {
      page = 1,
      pageSize = 20,
      status,
      configId,
      phone,
      startDate,
      endDate,
    } = req.query;
    const skip = (Number(page) - 1) * Number(pageSize);

    const where: any = {};
    if (status) where.status = status;
    if (configId) where.configId = Number(configId);
    if (phone) where.initiatorPhone = { contains: phone as string };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [list, total] = await Promise.all([
      prisma.bargain.findMany({
        where,
        include: {
          product: {
            select: { name: true, images: true },
          },
          config: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(pageSize),
      }),
      prisma.bargain.count({ where }),
    ]);

    // 获取关联的推销员信息和预约信息
    const result = await Promise.all(
      list.map(async (bargain) => {
        let salespersonName = null;
        let reservationNo = null;

        if (bargain.salespersonId) {
          const agent = await prisma.agent.findUnique({
            where: { id: bargain.salespersonId },
            select: { name: true },
          });
          salespersonName = agent?.name;
        }

        if (bargain.reservationId) {
          const reservation = await prisma.reservation.findUnique({
            where: { id: bargain.reservationId },
            select: { reservationNo: true },
          });
          reservationNo = reservation?.reservationNo;
        }

        const images = JSON.parse(bargain.product.images || '[]');
        return {
          id: bargain.id,
          code: bargain.code,
          initiatorPhone: bargain.initiatorPhone,
          initiatorName: bargain.initiatorName,
          productId: bargain.productId,
          productName: bargain.product.name,
          productImage: images[0] || '',
          configName: bargain.config.name,
          originalPrice: Number(bargain.originalPrice),
          floorPrice: Number(bargain.floorPrice),
          currentPrice: Number(bargain.currentPrice),
          totalCut: Number(bargain.totalCut),
          cutCount: bargain.cutCount,
          status: bargain.status,
          reachedFloor: bargain.reachedFloor,
          salespersonId: bargain.salespersonId,
          salespersonName,
          reservationNo,
          platformCost: Number(bargain.platformCost),
          agentCost: Number(bargain.agentCost),
          expireAt: bargain.expireAt.toISOString(),
          createdAt: bargain.createdAt.toISOString(),
        };
      })
    );

    res.json({
      code: 0,
      message: 'success',
      data: { list: result, total },
    });
  } catch (error: any) {
    console.error('[砍价管理] 获取砍价列表失败:', error);
    res.json({
      code: 500,
      message: error.message || '获取列表失败',
    });
  }
}

/**
 * 获取砍价详情
 * GET /api/admin/bargain/:id
 */
export async function getBargainDetail(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const bargain = await prisma.bargain.findUnique({
      where: { id: Number(id) },
      include: {
        product: true,
        store: true,
        config: true,
        cuts: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!bargain) {
      return res.json({ code: 404, message: '砍价不存在' });
    }

    res.json({
      code: 0,
      message: 'success',
      data: bargain,
    });
  } catch (error: any) {
    console.error('[砍价管理] 获取砍价详情失败:', error);
    res.json({
      code: 500,
      message: error.message || '获取详情失败',
    });
  }
}

// ========== 黑名单管理 ==========

/**
 * 获取黑名单列表
 * GET /api/admin/bargain/blacklist
 */
export async function getBlacklistHandler(req: Request, res: Response) {
  try {
    const { page, pageSize, type } = req.query;

    const result = await getBlacklist({
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
      type: type as string,
    });

    res.json({
      code: 0,
      message: 'success',
      data: result,
    });
  } catch (error: any) {
    console.error('[砍价管理] 获取黑名单失败:', error);
    res.json({
      code: 500,
      message: error.message || '获取黑名单失败',
    });
  }
}

/**
 * 添加黑名单
 * POST /api/admin/bargain/blacklist
 */
export async function addBlacklistHandler(req: Request, res: Response) {
  try {
    const { type, value, reason, expireHours } = req.body;
    const admin = (req as any).user;

    if (!type || !value) {
      return res.json({ code: 400, message: '缺少必要参数' });
    }

    await addToBlacklist({
      type,
      value,
      reason,
      expireHours,
      operatorId: admin.id,
    });

    res.json({
      code: 0,
      message: '添加成功',
    });
  } catch (error: any) {
    console.error('[砍价管理] 添加黑名单失败:', error);
    res.json({
      code: 500,
      message: error.message || '添加失败',
    });
  }
}

/**
 * 移除黑名单
 * DELETE /api/admin/bargain/blacklist/:id
 */
export async function removeBlacklistHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const success = await removeFromBlacklist(Number(id));
    if (!success) {
      return res.json({ code: 404, message: '记录不存在' });
    }

    res.json({
      code: 0,
      message: '删除成功',
    });
  } catch (error: any) {
    console.error('[砍价管理] 移除黑名单失败:', error);
    res.json({
      code: 500,
      message: error.message || '删除失败',
    });
  }
}

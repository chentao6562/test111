/**
 * 大转盘管理后台控制器
 * @module controllers/adminSpinWheelController
 * @since 2026-01-23
 */

import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import {
  addToBlacklist,
  removeFromBlacklist,
  getBlacklist,
} from '../services/spinWheel/spinWheelRiskService';

/**
 * 创建大转盘活动配置
 */
export async function createConfig(req: Request, res: Response) {
  try {
    const {
      name,
      startTime,
      endTime,
      redeemThreshold,
      freeSpinCount,
      shareSpinCount,
      maxDailyHelp,
      fragmentExpireDays,
      newUserHelpMin,
      newUserHelpMax,
      oldUserHelpMin,
      oldUserHelpMax,
      prizePool,
      isActive,
    } = req.body;

    const adminId = (req as any).admin?.id || 0;

    if (!name || !startTime || !endTime) {
      return res.status(400).json({ code: -1, message: '活动名称、开始时间、结束时间不能为空' });
    }

    if (new Date(endTime) <= new Date(startTime)) {
      return res.status(400).json({ code: -1, message: '结束时间必须大于开始时间' });
    }

    if (newUserHelpMin !== undefined && newUserHelpMax !== undefined) {
      if (Number(newUserHelpMin) > Number(newUserHelpMax)) {
        return res.status(400).json({ code: -1, message: '新用户助力金额最小值不能大于最大值' });
      }
    }
    if (oldUserHelpMin !== undefined && oldUserHelpMax !== undefined) {
      if (Number(oldUserHelpMin) > Number(oldUserHelpMax)) {
        return res.status(400).json({ code: -1, message: '老用户助力金额最小值不能大于最大值' });
      }
    }

    const config = await prisma.spinWheelConfig.create({
      data: {
        name,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        redeemThreshold: redeemThreshold || 100,
        freeSpinCount: freeSpinCount || 3,
        shareSpinCount: shareSpinCount || 2,
        maxDailyHelp: maxDailyHelp || 10,
        fragmentExpireDays: fragmentExpireDays || 7,
        newUserHelpMin: newUserHelpMin || 1,
        newUserHelpMax: newUserHelpMax || 5,
        oldUserHelpMin: oldUserHelpMin || 0.1,
        oldUserHelpMax: oldUserHelpMax || 1,
        prizePool: prizePool ? JSON.stringify(prizePool) : '[]',
        isActive: isActive ?? true,
        createdBy: adminId,
      },
    });

    res.json({ code: 0, data: config, message: '创建成功' });
  } catch (error: any) {
    console.error('[创建大转盘配置失败]', error);
    res.status(500).json({ code: -1, message: error.message || '创建失败' });
  }
}

/**
 * 获取大转盘活动配置列表
 */
export async function getConfigList(req: Request, res: Response) {
  try {
    const { page = 1, pageSize = 20, isActive, keyword } = req.query;

    const where: any = {};
    if (isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true';
    }
    if (keyword) {
      where.name = { contains: keyword as string };
    }

    const [total, list] = await Promise.all([
      prisma.spinWheelConfig.count({ where }),
      prisma.spinWheelConfig.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
      }),
    ]);

    const configIds = list.map((c) => c.id);
    const stats = await prisma.spinWheelParticipation.groupBy({
      by: ['configId'],
      where: { configId: { in: configIds } },
      _count: { id: true },
      _sum: { totalAmount: true },
    });

    const statsMap = new Map(stats.map((s) => [s.configId, s]));

    const listWithStats = list.map((config) => {
      const stat = statsMap.get(config.id);
      return {
        ...config,
        prizePoolParsed: config.prizePool ? JSON.parse(config.prizePool as string) : [],
        participantCount: stat?._count?.id || 0,
        totalAmount: Number(stat?._sum?.totalAmount || 0),
      };
    });

    res.json({
      code: 0,
      data: {
        list: listWithStats,
        total,
        page: Number(page),
        pageSize: Number(pageSize),
      },
    });
  } catch (error: any) {
    console.error('[获取大转盘配置列表失败]', error);
    res.status(500).json({ code: -1, message: error.message || '获取失败' });
  }
}

/**
 * 获取大转盘活动配置详情
 */
export async function getConfigDetail(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const config = await prisma.spinWheelConfig.findUnique({
      where: { id: Number(id) },
    });

    if (!config) {
      return res.status(404).json({ code: -1, message: '配置不存在' });
    }

    const [participantCount, totalSpins, totalHelps, redeemCount] = await Promise.all([
      prisma.spinWheelParticipation.count({ where: { configId: config.id } }),
      prisma.spinWheelRecord.count({ where: { configId: config.id } }),
      prisma.spinWheelHelp.count({ where: { configId: config.id } }),
      prisma.spinWheelRedeem.count({ where: { configId: config.id, status: 'SUCCESS' } }),
    ]);

    res.json({
      code: 0,
      data: {
        ...config,
        prizePoolParsed: config.prizePool ? JSON.parse(config.prizePool as string) : [],
        stats: { participantCount, totalSpins, totalHelps, redeemCount },
      },
    });
  } catch (error: any) {
    console.error('[获取大转盘配置详情失败]', error);
    res.status(500).json({ code: -1, message: error.message || '获取失败' });
  }
}

/**
 * 更新大转盘活动配置
 */
export async function updateConfig(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      name, startTime, endTime, redeemThreshold, freeSpinCount, shareSpinCount, maxDailyHelp,
      fragmentExpireDays, newUserHelpMin, newUserHelpMax, oldUserHelpMin,
      oldUserHelpMax, prizePool, isActive,
    } = req.body;

    const existing = await prisma.spinWheelConfig.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ code: -1, message: '配置不存在' });
    }

    const newStartTime = startTime ? new Date(startTime) : existing.startTime;
    const newEndTime = endTime ? new Date(endTime) : existing.endTime;
    if (newEndTime <= newStartTime) {
      return res.status(400).json({ code: -1, message: '结束时间必须大于开始时间' });
    }

    const finalNewUserHelpMin = newUserHelpMin ?? existing.newUserHelpMin;
    const finalNewUserHelpMax = newUserHelpMax ?? existing.newUserHelpMax;
    const finalOldUserHelpMin = oldUserHelpMin ?? existing.oldUserHelpMin;
    const finalOldUserHelpMax = oldUserHelpMax ?? existing.oldUserHelpMax;

    if (Number(finalNewUserHelpMin) > Number(finalNewUserHelpMax)) {
      return res.status(400).json({ code: -1, message: '新用户助力金额最小值不能大于最大值' });
    }
    if (Number(finalOldUserHelpMin) > Number(finalOldUserHelpMax)) {
      return res.status(400).json({ code: -1, message: '老用户助力金额最小值不能大于最大值' });
    }

    const config = await prisma.spinWheelConfig.update({
      where: { id: Number(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endTime && { endTime: new Date(endTime) }),
        ...(redeemThreshold !== undefined && { redeemThreshold }),
        ...(freeSpinCount !== undefined && { freeSpinCount }),
        ...(shareSpinCount !== undefined && { shareSpinCount }),
        ...(maxDailyHelp !== undefined && { maxDailyHelp }),
        ...(fragmentExpireDays !== undefined && { fragmentExpireDays }),
        ...(newUserHelpMin !== undefined && { newUserHelpMin }),
        ...(newUserHelpMax !== undefined && { newUserHelpMax }),
        ...(oldUserHelpMin !== undefined && { oldUserHelpMin }),
        ...(oldUserHelpMax !== undefined && { oldUserHelpMax }),
        ...(prizePool !== undefined && { prizePool: JSON.stringify(prizePool) }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({ code: 0, data: config, message: '更新成功' });
  } catch (error: any) {
    console.error('[更新大转盘配置失败]', error);
    res.status(500).json({ code: -1, message: error.message || '更新失败' });
  }
}

/**
 * 删除大转盘活动配置
 */
export async function deleteConfig(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const existing = await prisma.spinWheelConfig.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ code: -1, message: '配置不存在' });
    }

    const participationCount = await prisma.spinWheelParticipation.count({
      where: { configId: Number(id) },
    });

    if (participationCount > 0) {
      return res.status(400).json({
        code: -1,
        message: `该活动已有${participationCount}人参与，无法删除。请先禁用活动。`,
      });
    }

    await prisma.spinWheelConfig.delete({ where: { id: Number(id) } });
    res.json({ code: 0, message: '删除成功' });
  } catch (error: any) {
    console.error('[删除大转盘配置失败]', error);
    res.status(500).json({ code: -1, message: error.message || '删除失败' });
  }
}

/**
 * 切换大转盘活动配置状态
 */
export async function toggleConfig(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const existing = await prisma.spinWheelConfig.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ code: -1, message: '配置不存在' });
    }

    const config = await prisma.spinWheelConfig.update({
      where: { id: Number(id) },
      data: { isActive: !existing.isActive },
    });

    res.json({ code: 0, data: config, message: config.isActive ? '已启用' : '已禁用' });
  } catch (error: any) {
    console.error('[切换大转盘配置状态失败]', error);
    res.status(500).json({ code: -1, message: error.message || '操作失败' });
  }
}

/**
 * 获取大转盘统计数据
 */
export async function getStats(req: Request, res: Response) {
  try {
    const { configId, startDate, endDate } = req.query;

    const where: any = {};
    if (configId) where.configId = Number(configId);

    const dateWhere: any = {};
    if (startDate) dateWhere.createdAt = { gte: new Date(startDate as string) };
    if (endDate) dateWhere.createdAt = { ...dateWhere.createdAt, lte: new Date(endDate as string) };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalParticipants, totalSpins, totalHelps, totalRedeems, todayParticipants, todaySpins, todayHelps, redeemSum] = await Promise.all([
      prisma.spinWheelParticipation.count({ where: { ...where, ...dateWhere } }),
      prisma.spinWheelRecord.count({ where: { ...where, ...dateWhere } }),
      prisma.spinWheelHelp.count({ where: { ...where, ...dateWhere } }),
      prisma.spinWheelRedeem.count({ where: { ...where, ...dateWhere, status: 'SUCCESS' } }),
      prisma.spinWheelParticipation.count({ where: { ...where, createdAt: { gte: today } } }),
      prisma.spinWheelRecord.count({ where: { ...where, createdAt: { gte: today } } }),
      prisma.spinWheelHelp.count({ where: { ...where, createdAt: { gte: today } } }),
      prisma.spinWheelRedeem.aggregate({ where: { ...where, ...dateWhere, status: 'SUCCESS' }, _sum: { redeemAmount: true } }),
    ]);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // 【2026-01-24 安全修复】使用参数化查询替代$queryRawUnsafe，防止SQL注入
    let dailyStats: any[];
    if (configId) {
      const safeConfigId = Number(configId);
      dailyStats = await prisma.$queryRaw<any[]>`
        SELECT DATE(created_at) as date, COUNT(DISTINCT id) as participantCount
        FROM spin_wheel_participations
        WHERE created_at >= ${sevenDaysAgo}
        AND config_id = ${safeConfigId}
        GROUP BY DATE(created_at) ORDER BY date ASC
      `;
    } else {
      dailyStats = await prisma.$queryRaw<any[]>`
        SELECT DATE(created_at) as date, COUNT(DISTINCT id) as participantCount
        FROM spin_wheel_participations
        WHERE created_at >= ${sevenDaysAgo}
        GROUP BY DATE(created_at) ORDER BY date ASC
      `;
    }

    res.json({
      code: 0,
      data: {
        overview: { totalParticipants, totalSpins, totalHelps, totalRedeems, totalRedeemedAmount: Number(redeemSum._sum?.redeemAmount || 0) },
        today: { participants: todayParticipants, spins: todaySpins, helps: todayHelps },
        dailyTrend: dailyStats,
      },
    });
  } catch (error: any) {
    console.error('[获取大转盘统计失败]', error);
    res.status(500).json({ code: -1, message: error.message || '获取失败' });
  }
}

/**
 * 获取参与列表
 */
export async function getParticipationList(req: Request, res: Response) {
  try {
    const { page = 1, pageSize = 20, configId, phone } = req.query;

    const where: any = {};
    if (configId) where.configId = Number(configId);
    if (phone) where.phone = { contains: phone as string };

    const [total, list] = await Promise.all([
      prisma.spinWheelParticipation.count({ where }),
      prisma.spinWheelParticipation.findMany({
        where,
        include: { config: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
      }),
    ]);

    const salespersonIds = list.filter(p => p.salespersonId).map(p => p.salespersonId as number);
    const agents = salespersonIds.length > 0
      ? await prisma.agent.findMany({ where: { id: { in: salespersonIds } }, select: { id: true, name: true, phone: true } })
      : [];
    const agentMap = new Map(agents.map(a => [a.id, a]));

    const listWithAgent = list.map(p => ({
      ...p,
      agent: p.salespersonId ? agentMap.get(p.salespersonId) || null : null,
    }));

    res.json({ code: 0, data: { list: listWithAgent, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (error: any) {
    console.error('[获取参与列表失败]', error);
    res.status(500).json({ code: -1, message: error.message || '获取失败' });
  }
}

/**
 * 获取参与详情
 */
export async function getParticipationDetail(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const participation = await prisma.spinWheelParticipation.findUnique({
      where: { id: Number(id) },
      include: {
        config: true,
        records: { orderBy: { createdAt: 'desc' }, take: 50 },
        helpsReceived: { orderBy: { createdAt: 'desc' }, take: 50 },
        redeems: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!participation) {
      return res.status(404).json({ code: -1, message: '参与记录不存在' });
    }

    let agent = null;
    if (participation.salespersonId) {
      agent = await prisma.agent.findUnique({
        where: { id: participation.salespersonId },
        select: { id: true, name: true, phone: true },
      });
    }

    res.json({ code: 0, data: { ...participation, agent } });
  } catch (error: any) {
    console.error('[获取参与详情失败]', error);
    res.status(500).json({ code: -1, message: error.message || '获取失败' });
  }
}

/**
 * 获取兑换列表
 */
export async function getRedeemList(req: Request, res: Response) {
  try {
    const { page = 1, pageSize = 20, configId, status, phone } = req.query;

    const where: any = {};
    if (configId) where.configId = Number(configId);
    if (status) where.status = status as string;
    if (phone) where.participation = { phone: { contains: phone as string } };

    const [total, list] = await Promise.all([
      prisma.spinWheelRedeem.count({ where }),
      prisma.spinWheelRedeem.findMany({
        where,
        include: {
          participation: { select: { phone: true, code: true, totalAmount: true } },
          config: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
      }),
    ]);

    const couponIds = list.filter(r => r.couponId).map(r => r.couponId as number);
    const coupons = couponIds.length > 0
      ? await prisma.coupon.findMany({ where: { id: { in: couponIds } }, select: { id: true, code: true, amount: true, status: true } })
      : [];
    const couponMap = new Map(coupons.map(c => [c.id, c]));

    const listWithCoupon = list.map(r => ({
      ...r,
      coupon: r.couponId ? couponMap.get(r.couponId) || null : null,
    }));

    res.json({ code: 0, data: { list: listWithCoupon, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (error: any) {
    console.error('[获取兑换列表失败]', error);
    res.status(500).json({ code: -1, message: error.message || '获取失败' });
  }
}

/**
 * 获取兑换详情
 */
export async function getRedeemDetail(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const redeem = await prisma.spinWheelRedeem.findUnique({
      where: { id: Number(id) },
      include: { participation: true, config: true },
    });

    if (!redeem) {
      return res.status(404).json({ code: -1, message: '兑换记录不存在' });
    }

    let coupon = null;
    if (redeem.couponId) {
      coupon = await prisma.coupon.findUnique({ where: { id: redeem.couponId } });
    }

    let agent = null;
    if (redeem.participation.salespersonId) {
      agent = await prisma.agent.findUnique({
        where: { id: redeem.participation.salespersonId },
        select: { id: true, name: true, phone: true },
      });
    }

    res.json({ code: 0, data: { ...redeem, coupon, agent } });
  } catch (error: any) {
    console.error('[获取兑换详情失败]', error);
    res.status(500).json({ code: -1, message: error.message || '获取失败' });
  }
}

/**
 * 重试兑换
 */
export async function retryRedeem(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const redeem = await prisma.spinWheelRedeem.findUnique({
      where: { id: Number(id) },
      include: { participation: true },
    });

    if (!redeem) {
      return res.status(404).json({ code: -1, message: '兑换记录不存在' });
    }

    if (redeem.status === 'SUCCESS') {
      return res.status(400).json({ code: -1, message: '该兑换已成功，无需重试' });
    }

    const { redeemCoupon } = await import('../services/spinWheel/spinWheelRedeemService');
    const result = await redeemCoupon({
      phone: redeem.participation.phone,
      configId: redeem.configId,
      amount: Number(redeem.redeemAmount),
    });

    if (result.success) {
      res.json({ code: 0, message: '重试成功', data: result });
    } else {
      res.status(400).json({ code: -1, message: result.message || '重试失败' });
    }
  } catch (error: any) {
    console.error('[重试兑换失败]', error);
    res.status(500).json({ code: -1, message: error.message || '重试失败' });
  }
}

/**
 * 获取黑名单列表
 */
export async function getBlacklistHandler(req: Request, res: Response) {
  try {
    const { page = 1, pageSize = 20, type, keyword } = req.query;
    const result = await getBlacklist({ page: Number(page), pageSize: Number(pageSize), type: type as string, keyword: keyword as string });
    res.json({ code: 0, data: result });
  } catch (error: any) {
    console.error('[获取黑名单失败]', error);
    res.status(500).json({ code: -1, message: error.message || '获取失败' });
  }
}

/**
 * 添加黑名单
 */
export async function addBlacklistHandler(req: Request, res: Response) {
  try {
    const { type, value, reason, expireAt } = req.body;
    const adminId = (req as any).admin?.id || 0;

    if (!type || !value) {
      return res.status(400).json({ code: -1, message: '类型和值不能为空' });
    }

    const validTypes = ['PHONE', 'IP', 'DEVICE'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ code: -1, message: '无效的黑名单类型' });
    }

    const result = await addToBlacklist({
      type,
      value,
      reason: reason || '管理员手动添加',
      expireAt: expireAt ? new Date(expireAt) : undefined,
      createdBy: adminId,
    });
    res.json({ code: 0, data: result, message: '添加成功' });
  } catch (error: any) {
    console.error('[添加黑名单失败]', error);
    res.status(500).json({ code: -1, message: error.message || '添加失败' });
  }
}

/**
 * 移除黑名单
 */
export async function removeBlacklistHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await removeFromBlacklist(Number(id));
    if (result) {
      res.json({ code: 0, message: '移除成功' });
    } else {
      res.status(404).json({ code: -1, message: '黑名单记录不存在' });
    }
  } catch (error: any) {
    console.error('[移除黑名单失败]', error);
    res.status(500).json({ code: -1, message: error.message || '移除失败' });
  }
}

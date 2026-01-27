/**
 * 客户风控管理控制器
 * 【2026-01-16】管理后台客户风控管理API
 */

import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

/**
 * 获取客户列表
 */
export async function getCustomerList(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const {
      page = '1',
      pageSize = '20',
      riskLevel,
      isBlocked,
      keyword,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const pageSizeNum = parseInt(pageSize as string, 10);
    const skip = (pageNum - 1) * pageSizeNum;

    // 构建查询条件
    const where: any = {};

    if (riskLevel !== undefined && riskLevel !== '') {
      where.riskLevel = parseInt(riskLevel as string, 10);
    }

    if (isBlocked === 'true') {
      where.isBlocked = true;
    } else if (isBlocked === 'false') {
      where.isBlocked = false;
    }

    if (keyword) {
      where.OR = [
        { phone: { contains: keyword as string } },
        { name: { contains: keyword as string } },
      ];
    }

    const [list, total] = await Promise.all([
      prisma.customerRecord.findMany({
        where,
        orderBy: [
          { riskLevel: 'desc' },
          { noShowCount: 'desc' },
          { updatedAt: 'desc' },
        ],
        skip,
        take: pageSizeNum,
      }),
      prisma.customerRecord.count({ where }),
    ]);

    res.json({
      code: 0,
      message: 'success',
      data: {
        list,
        total,
        page: pageNum,
        pageSize: pageSizeNum,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 获取客户详情
 */
export async function getCustomerDetail(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;

    const customer = await prisma.customerRecord.findUnique({
      where: { id: parseInt(id, 10) },
    });

    if (!customer) {
      return res.status(404).json({
        code: 404,
        message: '客户不存在',
        data: null,
      });
    }

    // 获取该客户的预约历史
    const reservations = await prisma.reservation.findMany({
      where: { customerPhone: customer.phone },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        reservationNo: true,
        totalAmount: true,
        status: true,
        createdAt: true,
        completedAt: true,
      },
    });

    res.json({
      code: 0,
      message: 'success',
      data: {
        ...customer,
        reservations,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 拉黑客户
 */
export async function blockCustomer(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const customer = await prisma.customerRecord.findUnique({
      where: { id: parseInt(id, 10) },
    });

    if (!customer) {
      return res.status(404).json({
        code: 404,
        message: '客户不存在',
        data: null,
      });
    }

    if (customer.isBlocked) {
      return res.status(400).json({
        code: 400,
        message: '该客户已在黑名单中',
        data: null,
      });
    }

    await prisma.customerRecord.update({
      where: { id: parseInt(id, 10) },
      data: {
        isBlocked: true,
        riskLevel: 3, // 黑名单等级
        blockedReason: reason || '管理员手动拉黑',
      },
    });

    res.json({
      code: 0,
      message: '已加入黑名单',
      data: null,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 解除黑名单
 */
export async function unblockCustomer(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;

    const customer = await prisma.customerRecord.findUnique({
      where: { id: parseInt(id, 10) },
    });

    if (!customer) {
      return res.status(404).json({
        code: 404,
        message: '客户不存在',
        data: null,
      });
    }

    if (!customer.isBlocked) {
      return res.status(400).json({
        code: 400,
        message: '该客户不在黑名单中',
        data: null,
      });
    }

    // 根据爽约次数重新计算风险等级
    let newRiskLevel = 0;
    if (customer.noShowCount >= 3) {
      newRiskLevel = 2; // 高风险
    } else if (customer.noShowCount >= 1) {
      newRiskLevel = 1; // 有记录
    }

    await prisma.customerRecord.update({
      where: { id: parseInt(id, 10) },
      data: {
        isBlocked: false,
        riskLevel: newRiskLevel,
        blockedReason: null,
      },
    });

    res.json({
      code: 0,
      message: '已解除黑名单',
      data: null,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 获取客户统计
 * 【2026-01-17修复】返回字段与前端期望一致
 */
export async function getCustomerStats(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const [total, normal, lowRisk, mediumRisk, highRisk, blocked] = await Promise.all([
      prisma.customerRecord.count(),
      prisma.customerRecord.count({ where: { riskLevel: 0, isBlocked: false } }),  // 正常
      prisma.customerRecord.count({ where: { riskLevel: 1, isBlocked: false } }),  // 低风险（有记录）
      prisma.customerRecord.count({ where: { riskLevel: 2, isBlocked: false } }),  // 中风险（高风险）
      prisma.customerRecord.count({ where: { riskLevel: 3, isBlocked: false } }),  // 高风险
      prisma.customerRecord.count({ where: { isBlocked: true } }),                  // 黑名单
    ]);

    res.json({
      code: 0,
      message: 'success',
      data: {
        total,
        normal,
        lowRisk,
        mediumRisk,
        highRisk,
        blocked,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 重置客户风险等级
 * 【2026-01-17新增】管理员手动重置风险等级为正常
 */
export async function resetCustomerRisk(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;

    const customer = await prisma.customerRecord.findUnique({
      where: { id: parseInt(id, 10) },
    });

    if (!customer) {
      return res.status(404).json({
        code: 404,
        message: '客户不存在',
        data: null,
      });
    }

    if (customer.isBlocked) {
      return res.status(400).json({
        code: 400,
        message: '请先解除黑名单再重置风险等级',
        data: null,
      });
    }

    await prisma.customerRecord.update({
      where: { id: parseInt(id, 10) },
      data: {
        riskLevel: 0,
      },
    });

    res.json({
      code: 0,
      message: '已重置风险等级',
      data: null,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 获取客户预约历史
 * 【2026-01-17新增】根据手机号查询预约历史
 */
export async function getCustomerReservations(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { phone, page = '1', pageSize = '20' } = req.query;

    if (!phone) {
      return res.status(400).json({
        code: 400,
        message: '手机号不能为空',
        data: null,
      });
    }

    const pageNum = parseInt(page as string, 10);
    const pageSizeNum = parseInt(pageSize as string, 10);
    const skip = (pageNum - 1) * pageSizeNum;

    const [list, total] = await Promise.all([
      prisma.reservation.findMany({
        where: { customerPhone: phone as string },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSizeNum,
        select: {
          id: true,
          reservationNo: true,
          customerName: true,
          totalAmount: true,
          status: true,
          createdAt: true,
          completedAt: true,
          giftName: true,
        },
      }),
      prisma.reservation.count({ where: { customerPhone: phone as string } }),
    ]);

    res.json({
      code: 0,
      message: 'success',
      data: {
        list,
        total,
        page: pageNum,
        pageSize: pageSizeNum,
      },
    });
  } catch (error) {
    next(error);
  }
}

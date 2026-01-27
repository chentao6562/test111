/**
 * 备货问题管理控制器
 * 【2026-01-17 新增】
 */

import { Request, Response } from 'express';
import prisma from '../utils/prisma';

// 问题类型标签映射
const issueTypeLabels: Record<string, string> = {
  STOCK_SHORTAGE: '库存不足',
  PRODUCT_DAMAGED: '商品损坏',
  PRODUCT_NOT_FOUND: '找不到商品',
  OTHER: '其他',
};

// 问题状态标签映射
const issueStatusLabels: Record<string, string> = {
  PENDING: '待处理',
  PROCESSING: '处理中',
  RESOLVED: '已解决',
  CLOSED: '已关闭',
};

/**
 * 获取备货问题列表
 */
export async function getPrepareIssueList(req: Request, res: Response) {
  try {
    const {
      page = '1',
      pageSize = '20',
      status,
      issueType,
      keyword,
      startDate,
      endDate,
    } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const pageSizeNum = parseInt(pageSize as string, 10) || 20;
    const skip = (pageNum - 1) * pageSizeNum;

    // 构建查询条件
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (issueType) {
      where.issueType = issueType;
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string + 'T23:59:59'),
      };
    }

    // 关键词搜索（预约号）
    if (keyword) {
      where.reservation = {
        reservationNo: {
          contains: keyword as string,
        },
      };
    }

    // 查询总数
    const total = await prisma.prepareIssue.count({ where });

    // 查询列表
    const issues = await prisma.prepareIssue.findMany({
      where,
      include: {
        reservation: {
          select: {
            id: true,
            reservationNo: true,
            customerName: true,
            customerPhone: true,
            pickupDate: true,
            totalAmount: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSizeNum,
    });

    // 格式化数据
    const formattedIssues = issues.map(issue => ({
      id: issue.id,
      reservationId: issue.reservationId,
      reservationNo: issue.reservation.reservationNo,
      customerName: issue.reservation.customerName,
      customerPhone: issue.reservation.customerPhone,
      issueType: issue.issueType,
      issueTypeLabel: issueTypeLabels[issue.issueType] || issue.issueType,
      description: issue.description,
      status: issue.status,
      statusLabel: issueStatusLabels[issue.status] || issue.status,
      reportedBy: issue.reportedBy,
      reportedName: issue.reportedName,
      resolvedBy: issue.resolvedBy,
      resolvedName: issue.resolvedName,
      resolvedAt: issue.resolvedAt,
      resolution: issue.resolution,
      createdAt: issue.createdAt,
    }));

    res.json({
      success: true,
      data: {
        list: formattedIssues,
        pagination: {
          page: pageNum,
          pageSize: pageSizeNum,
          total,
          totalPages: Math.ceil(total / pageSizeNum),
        },
      },
    });
  } catch (error) {
    console.error('[PrepareIssueController] getPrepareIssueList error:', error);
    res.status(500).json({
      success: false,
      message: '获取问题列表失败',
    });
  }
}

/**
 * 获取备货问题详情
 */
export async function getPrepareIssueDetail(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const issue = await prisma.prepareIssue.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        reservation: {
          include: {
            items: true,
            store: {
              select: {
                id: true,
                name: true,
                address: true,
                contactPhone: true,
              },
            },
          },
        },
      },
    });

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: '问题记录不存在',
      });
    }

    res.json({
      success: true,
      data: {
        id: issue.id,
        reservationId: issue.reservationId,
        reservationNo: issue.reservation.reservationNo,
        customerName: issue.reservation.customerName,
        customerPhone: issue.reservation.customerPhone,
        pickupDate: issue.reservation.pickupDate,
        totalAmount: Number(issue.reservation.totalAmount),
        issueType: issue.issueType,
        issueTypeLabel: issueTypeLabels[issue.issueType] || issue.issueType,
        description: issue.description,
        itemId: issue.itemId,
        status: issue.status,
        statusLabel: issueStatusLabels[issue.status] || issue.status,
        reportedBy: issue.reportedBy,
        reportedName: issue.reportedName,
        resolvedBy: issue.resolvedBy,
        resolvedName: issue.resolvedName,
        resolvedAt: issue.resolvedAt,
        resolution: issue.resolution,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        reservation: {
          id: issue.reservation.id,
          status: issue.reservation.status,
          items: issue.reservation.items.map(item => ({
            productId: item.productId,
            productName: item.productName,
            productImage: item.productImage,
            quantity: item.quantity,
            price: Number(item.price),
            prepared: item.prepared,
          })),
          store: issue.reservation.store,
        },
      },
    });
  } catch (error) {
    console.error('[PrepareIssueController] getPrepareIssueDetail error:', error);
    res.status(500).json({
      success: false,
      message: '获取问题详情失败',
    });
  }
}

/**
 * 处理备货问题
 */
export async function resolvePrepareIssue(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { resolution, status = 'RESOLVED' } = req.body;
    const adminId = (req as any).user?.id || 0;
    const adminName = (req as any).user?.name || '管理员';

    const issue = await prisma.prepareIssue.findUnique({
      where: { id: parseInt(id, 10) },
    });

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: '问题记录不存在',
      });
    }

    if (issue.status === 'RESOLVED' || issue.status === 'CLOSED') {
      return res.status(400).json({
        success: false,
        message: '该问题已处理',
      });
    }

    // 更新问题状态
    await prisma.prepareIssue.update({
      where: { id: parseInt(id, 10) },
      data: {
        status: status as string,
        resolution,
        resolvedBy: adminId,
        resolvedName: adminName,
        resolvedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: '问题已处理',
    });
  } catch (error) {
    console.error('[PrepareIssueController] resolvePrepareIssue error:', error);
    res.status(500).json({
      success: false,
      message: '处理问题失败',
    });
  }
}

/**
 * 获取备货问题统计
 */
export async function getPrepareIssueStats(req: Request, res: Response) {
  try {
    // 统计各状态数量
    const statusCounts = await prisma.prepareIssue.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    // 统计各类型数量
    const typeCounts = await prisma.prepareIssue.groupBy({
      by: ['issueType'],
      _count: {
        id: true,
      },
    });

    // 今日新增
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await prisma.prepareIssue.count({
      where: {
        createdAt: { gte: today },
      },
    });

    // 待处理数量
    const pendingCount = await prisma.prepareIssue.count({
      where: { status: 'PENDING' },
    });

    res.json({
      success: true,
      data: {
        pendingCount,
        todayCount,
        byStatus: statusCounts.reduce((acc, item) => {
          acc[item.status] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
        byType: typeCounts.reduce((acc, item) => {
          acc[item.issueType] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    console.error('[PrepareIssueController] getPrepareIssueStats error:', error);
    res.status(500).json({
      success: false,
      message: '获取统计数据失败',
    });
  }
}

/**
 * 管理后台预约管理控制器
 * 【2026-01-16 预约模式升级】
 */

import { Request, Response } from 'express';
import { success, error, badRequest } from '../utils/response';
import prisma from '../utils/prisma';
import {
  ReservationStatus,
  getReservationDetail,
  confirmReservation,
  recordCall,
  markCallFailed,
} from '../services/reservation';

// 【2026-01-22新增】有效的预约状态值（0-9）
const VALID_STATUSES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * 【2026-01-22新增】解析日期字符串为本地日期
 * @param dateStr 日期字符串，格式：YYYY-MM-DD
 * @param isEndOfDay 是否设置为当天结束时间（23:59:59.999）
 */
function parseLocalDate(dateStr: string, isEndOfDay = false): Date {
  // 解析YYYY-MM-DD格式的日期
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JavaScript月份从0开始
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    if (isEndOfDay) {
      date.setHours(23, 59, 59, 999);
    } else {
      date.setHours(0, 0, 0, 0);
    }
    return date;
  }
  // 回退到默认解析
  const date = new Date(dateStr);
  if (isEndOfDay) {
    date.setHours(23, 59, 59, 999);
  }
  return date;
}

/**
 * 验证状态值是否有效
 */
function validateStatuses(statusStr: string): { valid: boolean; values: number[]; error?: string } {
  const values = statusStr.includes(',')
    ? statusStr.split(',').map(s => parseInt(s.trim(), 10))
    : [parseInt(statusStr, 10)];

  for (const v of values) {
    if (isNaN(v) || !VALID_STATUSES.includes(v)) {
      return { valid: false, values: [], error: `无效的状态值: ${v}` };
    }
  }
  return { valid: true, values };
}

/**
 * 获取预约统计
 * GET /api/admin/reservations/stats
 * 【2026-01-22优化】使用groupBy替代多个count查询，提升效率
 */
export async function getReservationStats(req: Request, res: Response) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 使用groupBy一次性获取所有状态的统计，减少数据库查询次数
    const [statusCounts, todayAmount] = await Promise.all([
      prisma.reservation.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      // 今日金额仍需单独查询（有时间条件）
      prisma.reservation.aggregate({
        where: {
          status: ReservationStatus.COMPLETED,
          completedAt: { gte: today },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    // 将groupBy结果转换为Map便于查询
    const countMap = new Map(statusCounts.map(item => [item.status, item._count.status]));

    // 计算各状态数量
    const pending = (countMap.get(ReservationStatus.PENDING) || 0) + (countMap.get(ReservationStatus.CALLING) || 0);
    const confirmed = countMap.get(ReservationStatus.CONFIRMED) || 0;
    const completed = countMap.get(ReservationStatus.COMPLETED) || 0;
    const pendingPrepare = countMap.get(ReservationStatus.PENDING_PREPARE) || 0;
    const preparing = countMap.get(ReservationStatus.PREPARING) || 0;
    const pendingPickup = countMap.get(ReservationStatus.PENDING_PICKUP) || 0;

    return success(res, {
      pending,
      confirmed,
      completed,
      totalAmount: todayAmount._sum.totalAmount ? Number(todayAmount._sum.totalAmount) : 0,
      // 备货相关统计
      pendingPrepare,
      preparing,
      pendingPickup,
    });
  } catch (err: any) {
    console.error('[AdminReservation] getStats error:', err);
    return error(res, '获取统计失败');
  }
}

/**
 * 获取预约列表
 * GET /api/admin/reservations
 */
export async function getReservationList(req: Request, res: Response) {
  try {
    const {
      page = '1',
      pageSize = '10',
      status,
      reservationNo,
      keyword,
      startDate,
      endDate,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const pageSizeNum = parseInt(pageSize as string, 10);

    // 构建查询条件
    const where: any = {};

    if (status !== undefined && status !== '') {
      // 【2026-01-22修复】添加状态值验证
      const statusStr = status as string;
      const validation = validateStatuses(statusStr);
      if (!validation.valid) {
        return badRequest(res, validation.error || '无效的状态值');
      }
      where.status = validation.values.length > 1 ? { in: validation.values } : validation.values[0];
    }

    if (reservationNo) {
      where.reservationNo = { contains: reservationNo as string };
    }

    if (keyword) {
      where.OR = [
        { customerName: { contains: keyword as string } },
        { customerPhone: { contains: keyword as string } },
      ];
    }

    if (startDate || endDate) {
      where.pickupDate = {};
      if (startDate) {
        // 【2026-01-22修复】使用本地日期解析避免时区问题
        where.pickupDate.gte = parseLocalDate(startDate as string);
      }
      if (endDate) {
        // 【2026-01-22修复】使用本地日期解析避免时区问题
        where.pickupDate.lte = parseLocalDate(endDate as string, true);
      }
    }

    const [total, list] = await Promise.all([
      prisma.reservation.count({ where }),
      prisma.reservation.findMany({
        where,
        include: {
          items: true,
          store: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * pageSizeNum,
        take: pageSizeNum,
      }),
    ]);

    // 【2026-01-28修复】批量获取推销员信息
    const salespersonIds = [...new Set(list.map(r => r.salespersonId).filter(Boolean))] as number[];
    const salespersons = salespersonIds.length > 0
      ? await prisma.agent.findMany({
          where: { id: { in: salespersonIds } },
          select: { id: true, name: true, phone: true },
        })
      : [];
    const salespersonMap = new Map(salespersons.map(s => [s.id, s]));

    // 处理数据
    const formattedList = list.map(r => {
      const salesperson = r.salespersonId ? salespersonMap.get(r.salespersonId) : null;
      return {
        id: r.id,
        reservationNo: r.reservationNo,
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        pickupDate: r.pickupDate,
        totalAmount: Number(r.totalAmount),
        giftName: r.giftName,
        giftDelivered: r.giftDelivered,
        status: r.status,
        callCount: r.callCount,
        createdAt: r.createdAt,
        confirmedAt: r.confirmedAt,
        completedAt: r.completedAt,
        store: r.store,
        // 【2026-01-28修复】添加推销员（开发人员）信息
        salespersonId: r.salespersonId,
        salespersonName: salesperson?.name || null,
        salespersonPhone: salesperson?.phone || null,
        salespersonLevel: r.salespersonLevel,
        items: r.items.map(item => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          productImage: item.productImage,
          quantity: item.quantity,
          price: Number(item.price),
        })),
      };
    });

    return success(res, {
      list: formattedList,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
    });
  } catch (err: any) {
    console.error('[AdminReservation] getList error:', err);
    return error(res, '获取预约列表失败');
  }
}

/**
 * 获取预约详情
 * GET /api/admin/reservations/:id
 */
export async function getReservationDetailHandler(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return badRequest(res, '预约ID无效');
    }

    const reservation = await getReservationDetail(id);
    if (!reservation) {
      return badRequest(res, '预约不存在');
    }

    return success(res, reservation);
  } catch (err: any) {
    console.error('[AdminReservation] getDetail error:', err);
    return error(res, '获取预约详情失败');
  }
}

/**
 * 管理员确认预约
 * POST /api/admin/reservations/:id/confirm
 * 【2026-01-22 安全修复】管理员需要先获取预约的门店ID
 */
export async function adminConfirmReservation(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return badRequest(res, '预约ID无效');
    }

    const staffId = (req as any).user?.id || 0;

    // 【2026-01-22 安全修复】管理员需要获取预约的门店ID
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      select: { storeId: true },
    });
    if (!reservation) {
      return badRequest(res, '预约不存在');
    }

    const result = await confirmReservation(id, staffId, reservation.storeId);

    if (result.success) {
      return success(res, result.data, result.message);
    } else {
      return badRequest(res, result.message);
    }
  } catch (err: any) {
    console.error('[AdminReservation] confirm error:', err);
    return error(res, '确认预约失败');
  }
}

/**
 * 管理员取消预约
 * POST /api/admin/reservations/:id/cancel
 * 【2026-01-22修复】增加并发控制，使用乐观锁防止重复取消
 */
export async function adminCancelReservation(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return badRequest(res, '预约ID无效');
    }

    // 【2026-01-17修复】只有终态（已完成、已取消、已过期、确认失败）不能取消
    // 状态7-9（待备货、备货中、待提货）应该可以取消
    const finalStatuses = [
      ReservationStatus.COMPLETED,
      ReservationStatus.CANCELLED,
      ReservationStatus.EXPIRED,
      ReservationStatus.CALL_FAILED,
    ];

    // 【2026-01-22修复】使用事务+乐观锁确保并发安全
    const result = await prisma.$transaction(async (tx) => {
      // 先获取预约信息（用于释放库存）
      const reservation = await tx.reservation.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!reservation) {
        throw new Error('预约不存在');
      }

      if (finalStatuses.includes(reservation.status)) {
        throw new Error('已完成或已取消的预约不能再取消');
      }

      // 使用条件更新实现乐观锁，确保状态未被其他并发请求修改
      const updated = await tx.reservation.updateMany({
        where: {
          id,
          status: { notIn: finalStatuses }, // 乐观锁条件
        },
        data: { status: ReservationStatus.CANCELLED },
      });

      if (updated.count === 0) {
        throw new Error('预约状态已变更，请刷新后重试');
      }

      // 释放锁定的库存（防止负值）
      // 【2026-01-22 P1修复】使用Math.max防止lockStock变负
      for (const item of reservation.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { lockStock: true },
        });
        if (product) {
          const newLockStock = Math.max(0, product.lockStock - item.quantity);
          await tx.product.update({
            where: { id: item.productId },
            data: { lockStock: newLockStock },
          });
        }
      }

      return reservation;
    });

    return success(res, null, '已取消预约');
  } catch (err: any) {
    console.error('[AdminReservation] cancel error:', err);
    // 返回更明确的错误信息
    if (err.message.includes('预约')) {
      return badRequest(res, err.message);
    }
    return error(res, '取消预约失败');
  }
}

/**
 * 【2026-01-19新增】管理员记录拨打电话
 * POST /api/admin/reservations/:id/call
 * 用于客服电话确认预约流程
 * 【2026-01-22 安全修复】管理员需要先获取预约的门店ID
 */
export async function adminRecordCall(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return badRequest(res, '预约ID无效');
    }

    const adminId = (req as any).user?.id || 0;
    const { connected } = req.body; // 是否接通，默认false

    // 【2026-01-22 安全修复】管理员需要获取预约的门店ID
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      select: { storeId: true },
    });
    if (!reservation) {
      return badRequest(res, '预约不存在');
    }

    const result = await recordCall(id, adminId, reservation.storeId, connected === true);

    if (result.success) {
      return success(res, result.data, result.message);
    } else {
      return badRequest(res, result.message);
    }
  } catch (err: any) {
    console.error('[AdminReservation] recordCall error:', err);
    return error(res, '记录拨打失败');
  }
}

/**
 * 【2026-01-19新增】管理员标记确认失败
 * POST /api/admin/reservations/:id/fail
 * 用于客服电话确认预约流程（3次未接通后可调用）
 * 【2026-01-22 安全修复】管理员需要先获取预约的门店ID
 */
export async function adminMarkCallFailed(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return badRequest(res, '预约ID无效');
    }

    const adminId = (req as any).user?.id || 0;

    // 【2026-01-22 安全修复】管理员需要获取预约的门店ID
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      select: { storeId: true },
    });
    if (!reservation) {
      return badRequest(res, '预约不存在');
    }

    const result = await markCallFailed(id, adminId, reservation.storeId);

    if (result.success) {
      return success(res, result.data, result.message);
    } else {
      return badRequest(res, result.message);
    }
  } catch (err: any) {
    console.error('[AdminReservation] markCallFailed error:', err);
    return error(res, '标记失败操作失败');
  }
}

/**
 * 获取赠品档位列表
 * GET /api/admin/gift-tiers
 */
export async function getGiftTierList(req: Request, res: Response) {
  try {
    const list = await prisma.giftTier.findMany({
      orderBy: [{ sortOrder: 'asc' }, { minAmount: 'asc' }],
    });

    return success(res, list.map(item => ({
      ...item,
      minAmount: Number(item.minAmount),
      giftCost: item.giftCost ? Number(item.giftCost) : null,
    })));
  } catch (err: any) {
    console.error('[AdminReservation] getGiftTiers error:', err);
    return error(res, '获取赠品档位失败');
  }
}

/**
 * 创建赠品档位
 * POST /api/admin/gift-tiers
 * 【2026-01-19】支持新增字段：giftImage, giftStock, startTime, endTime, description
 */
export async function createGiftTier(req: Request, res: Response) {
  try {
    const {
      minAmount,
      giftName,
      giftItems,
      giftCost,
      sortOrder,
      giftImage,
      giftStock,
      startTime,
      endTime,
      description
    } = req.body;

    if (!giftName) {
      return badRequest(res, '请填写赠品名称');
    }

    // 验证时间范围
    if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
      return badRequest(res, '结束时间必须晚于开始时间');
    }

    const tier = await prisma.giftTier.create({
      data: {
        minAmount: minAmount || 0,
        giftName,
        giftItems: giftItems ? JSON.stringify(giftItems) : null,
        giftCost: giftCost || null,
        sortOrder: sortOrder || 0,
        isActive: true,
        giftImage: giftImage || null,
        giftStock: giftStock || 0,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        description: description || null,
      },
    });

    return success(res, tier, '创建成功');
  } catch (err: any) {
    console.error('[AdminReservation] createGiftTier error:', err);
    return error(res, '创建赠品档位失败');
  }
}

/**
 * 更新赠品档位
 * PUT /api/admin/gift-tiers/:id
 * 【2026-01-19】支持新增字段：giftImage, giftStock, startTime, endTime, description
 */
export async function updateGiftTier(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return badRequest(res, '档位ID无效');
    }

    const {
      minAmount,
      giftName,
      giftItems,
      giftCost,
      sortOrder,
      isActive,
      giftImage,
      giftStock,
      startTime,
      endTime,
      description
    } = req.body;

    // 验证时间范围
    if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
      return badRequest(res, '结束时间必须晚于开始时间');
    }

    const data: any = {};
    if (minAmount !== undefined) data.minAmount = minAmount;
    if (giftName !== undefined) data.giftName = giftName;
    if (giftItems !== undefined) data.giftItems = JSON.stringify(giftItems);
    if (giftCost !== undefined) data.giftCost = giftCost;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;
    if (isActive !== undefined) data.isActive = isActive;
    // 【2026-01-22修复】添加遗漏的字段处理
    if (giftImage !== undefined) data.giftImage = giftImage || null;
    if (giftStock !== undefined) data.giftStock = giftStock;
    if (startTime !== undefined) data.startTime = startTime ? new Date(startTime) : null;
    if (endTime !== undefined) data.endTime = endTime ? new Date(endTime) : null;
    if (description !== undefined) data.description = description || null;

    const tier = await prisma.giftTier.update({
      where: { id },
      data,
    });

    return success(res, tier, '更新成功');
  } catch (err: any) {
    console.error('[AdminReservation] updateGiftTier error:', err);
    return error(res, '更新赠品档位失败');
  }
}

/**
 * 删除赠品档位
 * DELETE /api/admin/gift-tiers/:id
 */
export async function deleteGiftTier(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return badRequest(res, '档位ID无效');
    }

    await prisma.giftTier.delete({
      where: { id },
    });

    return success(res, null, '删除成功');
  } catch (err: any) {
    console.error('[AdminReservation] deleteGiftTier error:', err);
    return error(res, '删除赠品档位失败');
  }
}

// 状态映射（完整支持0-9状态）
const STATUS_LABELS: Record<number, string> = {
  0: '待确认',
  1: '确认中',
  2: '已确认',
  3: '已完成',
  4: '已取消',
  5: '已过期',
  6: '确认失败',
  7: '待备货',
  8: '备货中',
  9: '待提货',
};

/**
 * 【2026-01-16】导出预约数据（CSV格式）
 * GET /api/admin/reservations/export
 */
export async function exportReservations(req: Request, res: Response) {
  try {
    const {
      status,
      startDate,
      endDate,
      keyword,
    } = req.query;

    // 构建查询条件
    const where: any = {};

    if (status !== undefined && status !== '') {
      // 【2026-01-22修复】添加状态值验证
      const statusStr = status as string;
      const validation = validateStatuses(statusStr);
      if (!validation.valid) {
        return badRequest(res, validation.error || '无效的状态值');
      }
      where.status = validation.values.length > 1 ? { in: validation.values } : validation.values[0];
    }

    if (keyword) {
      where.OR = [
        { customerName: { contains: keyword as string } },
        { customerPhone: { contains: keyword as string } },
        { reservationNo: { contains: keyword as string } },
      ];
    }

    if (startDate || endDate) {
      where.pickupDate = {};
      if (startDate) {
        // 【2026-01-22修复】使用本地日期解析避免时区问题
        where.pickupDate.gte = parseLocalDate(startDate as string);
      }
      if (endDate) {
        // 【2026-01-22修复】使用本地日期解析避免时区问题
        where.pickupDate.lte = parseLocalDate(endDate as string, true);
      }
    }

    // 获取数据（最多导出5000条）
    const list = await prisma.reservation.findMany({
      where,
      include: {
        items: true,
        store: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    // 获取推销员信息
    const salespersonIds = [...new Set(list.map(r => r.salespersonId).filter(Boolean))] as number[];
    const salespersons = salespersonIds.length > 0
      ? await prisma.agent.findMany({
          where: { id: { in: salespersonIds } },
          select: { id: true, name: true, phone: true },
        })
      : [];
    const salespersonMap = new Map(salespersons.map(s => [s.id, s]));

    // 构建CSV内容
    const headers = [
      '预约号',
      '客户姓名',
      '客户电话',
      '预约金额',
      '赠品名称',
      '赠品已发放',
      '状态',
      '提货日期',
      '创建时间',
      '确认时间',
      '完成时间',
      '门店',
      '推销员',
      '商品明细',
      '总代利润',
      '一级利润',
      '二级利润',
    ];

    const rows = list.map(r => {
      // 格式化商品明细
      const itemsStr = r.items.map((item: any) =>
        `${item.productName}×${item.quantity}`
      ).join('; ');

      const salesperson = r.salespersonId ? salespersonMap.get(r.salespersonId) : null;

      return [
        r.reservationNo,
        r.customerName,
        r.customerPhone,
        Number(r.totalAmount).toFixed(2),
        r.giftName || '',
        r.giftDelivered ? '是' : '否',
        STATUS_LABELS[r.status] || '未知',
        formatDate(r.pickupDate),
        formatDateTime(r.createdAt),
        r.confirmedAt ? formatDateTime(r.confirmedAt) : '',
        r.completedAt ? formatDateTime(r.completedAt) : '',
        r.store?.name || '',
        salesperson ? `${salesperson.name}(${salesperson.phone})` : '直接预约',
        itemsStr,
        r.masterProfit ? Number(r.masterProfit).toFixed(2) : '0.00',
        r.level1Profit ? Number(r.level1Profit).toFixed(2) : '0.00',
        r.level2Profit ? Number(r.level2Profit).toFixed(2) : '0.00',
      ];
    });

    // 生成CSV
    const BOM = '\uFEFF'; // UTF-8 BOM，确保Excel正确识别中文
    const csvContent = BOM + [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\r\n');

    // 设置响应头
    const filename = `reservations_${formatDate(new Date())}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    return res.send(csvContent);
  } catch (err: any) {
    console.error('[AdminReservation] export error:', err);
    return error(res, '导出失败');
  }
}

// 辅助函数：格式化日期
function formatDate(date: Date | null): string {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 辅助函数：格式化日期时间
function formatDateTime(date: Date | null): string {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  const second = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

/**
 * 【2026-01-16】预约报表统计
 * GET /api/admin/reservations/report
 */
export async function getReservationReport(req: Request, res: Response) {
  try {
    const { startDate, endDate, period = 'day' } = req.query;

    // 默认最近30天
    const end = endDate ? new Date(endDate as string) : new Date();
    end.setHours(23, 59, 59, 999);
    const start = startDate
      ? new Date(startDate as string)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);

    // 获取时间范围内的预约数据
    const reservations = await prisma.reservation.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        masterProfit: true,
        level1Profit: true,
        level2Profit: true,
        createdAt: true,
        completedAt: true,
        salespersonId: true,
      },
    });

    // 获取推销员信息
    const salespersonIds = [...new Set(reservations.map(r => r.salespersonId).filter(Boolean))] as number[];
    const salespersons = salespersonIds.length > 0
      ? await prisma.agent.findMany({
          where: { id: { in: salespersonIds } },
          select: { id: true, name: true, phone: true },
        })
      : [];
    const salespersonMap = new Map(salespersons.map(s => [s.id, s]));

    // 计算统计数据
    const totalReservations = reservations.length;
    const completedReservations = reservations.filter(r => r.status === ReservationStatus.COMPLETED);
    const cancelledReservations = reservations.filter(r => r.status === ReservationStatus.CANCELLED || r.status === ReservationStatus.CALL_FAILED);

    const totalAmount = reservations.reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);
    const completedAmount = completedReservations.reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);

    const totalProfit = completedReservations.reduce((sum, r) =>
      sum + Number(r.masterProfit || 0) + Number(r.level1Profit || 0) + Number(r.level2Profit || 0), 0);

    // 状态分布
    const statusDistribution = {
      pending: reservations.filter(r => r.status === ReservationStatus.PENDING || r.status === ReservationStatus.CALLING).length,
      confirmed: reservations.filter(r => r.status === ReservationStatus.CONFIRMED).length,
      completed: completedReservations.length,
      cancelled: cancelledReservations.length,
      expired: reservations.filter(r => r.status === ReservationStatus.EXPIRED).length,
    };

    // 按日期聚合趋势数据
    const trendMap = new Map<string, { count: number; amount: number; completed: number }>();

    reservations.forEach(r => {
      const dateKey = formatDate(r.createdAt);
      if (!trendMap.has(dateKey)) {
        trendMap.set(dateKey, { count: 0, amount: 0, completed: 0 });
      }
      const data = trendMap.get(dateKey)!;
      data.count++;
      data.amount += Number(r.totalAmount || 0);
      if (r.status === ReservationStatus.COMPLETED) {
        data.completed++;
      }
    });

    // 转换为数组并排序
    const trend = Array.from(trendMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 推销员排行榜
    const salespersonStats = new Map<number, {
      id: number;
      name: string;
      phone: string;
      count: number;
      amount: number;
      profit: number;
    }>();

    reservations.forEach(r => {
      const salesperson = r.salespersonId ? salespersonMap.get(r.salespersonId) : null;
      if (r.salespersonId && salesperson) {
        if (!salespersonStats.has(r.salespersonId)) {
          salespersonStats.set(r.salespersonId, {
            id: r.salespersonId,
            name: salesperson.name,
            phone: salesperson.phone,
            count: 0,
            amount: 0,
            profit: 0,
          });
        }
        const stats = salespersonStats.get(r.salespersonId)!;
        stats.count++;
        stats.amount += Number(r.totalAmount || 0);
        if (r.status === ReservationStatus.COMPLETED) {
          stats.profit += Number(r.level1Profit || 0) + Number(r.level2Profit || 0);
        }
      }
    });

    const salespersonRanking = Array.from(salespersonStats.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    // 计算环比（与上一个周期对比）
    const periodDays = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    const prevStart = new Date(start.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const prevEnd = new Date(start.getTime() - 1);

    const prevReservations = await prisma.reservation.count({
      where: {
        createdAt: {
          gte: prevStart,
          lte: prevEnd,
        },
      },
    });

    const prevCompleted = await prisma.reservation.count({
      where: {
        createdAt: {
          gte: prevStart,
          lte: prevEnd,
        },
        status: ReservationStatus.COMPLETED,
      },
    });

    const countChange = prevReservations > 0
      ? ((totalReservations - prevReservations) / prevReservations * 100).toFixed(1)
      : '0';

    const completedChange = prevCompleted > 0
      ? ((completedReservations.length - prevCompleted) / prevCompleted * 100).toFixed(1)
      : '0';

    return success(res, {
      summary: {
        totalReservations,
        completedReservations: completedReservations.length,
        cancelledReservations: cancelledReservations.length,
        totalAmount: totalAmount.toFixed(2),
        completedAmount: completedAmount.toFixed(2),
        totalProfit: totalProfit.toFixed(2),
        conversionRate: totalReservations > 0
          ? (completedReservations.length / totalReservations * 100).toFixed(1)
          : '0',
        countChange,
        completedChange,
      },
      statusDistribution,
      trend,
      salespersonRanking,
      period: { start: formatDate(start), end: formatDate(end) },
    });
  } catch (err: any) {
    console.error('[AdminReservation] getReport error:', err);
    return error(res, '获取报表失败');
  }
}

export default {
  getReservationStats,
  getReservationList,
  getReservationDetailHandler,
  adminConfirmReservation,
  adminCancelReservation,
  getGiftTierList,
  createGiftTier,
  updateGiftTier,
  deleteGiftTier,
  exportReservations,
  getReservationReport,
};

/**
 * 预约控制器
 * 【2026-01-16 预约模式升级】客户端预约API
 */

import { Request, Response } from 'express';
import { success, error, badRequest } from '../utils/response';
import {
  createReservation,
  getReservationDetail,
  getCustomerReservations,
  cancelReservation,
  getAllGiftTiers,
  checkCustomerCanReserve,
  COMPLIANCE_NOTICE,
} from '../services/reservation';
import prisma from '../utils/prisma';

/**
 * 获取合规提示文案
 * GET /api/reservations/compliance-notice
 * 前端页面必须展示这些提示
 */
export async function getComplianceNotice(req: Request, res: Response) {
  return success(res, COMPLIANCE_NOTICE);
}

/**
 * 获取赠品档位列表（到店礼品）
 * GET /api/reservations/gift-tiers
 */
export async function getGiftTiers(req: Request, res: Response) {
  try {
    const tiers = await getAllGiftTiers();
    return success(res, tiers);
  } catch (err: any) {
    console.error('[ReservationController] getGiftTiers error:', err);
    return error(res, '获取赠品档位失败');
  }
}

/**
 * 检查客户是否可以预约
 * GET /api/reservations/check-customer?phone=xxx
 */
export async function checkCustomer(req: Request, res: Response) {
  try {
    const { phone } = req.query;

    if (!phone || typeof phone !== 'string') {
      return badRequest(res, '请提供手机号');
    }

    const result = await checkCustomerCanReserve(phone);
    return success(res, result);
  } catch (err: any) {
    console.error('[ReservationController] checkCustomer error:', err);
    return error(res, '检查客户状态失败');
  }
}

/**
 * 创建预约
 * POST /api/reservations
 * 【2026-01-19修复】支持前端传递扫码绑定的推销员ID
 */
export async function create(req: Request, res: Response) {
  try {
    const { customerName, customerPhone, pickupDate, items, flashSaleItems, bargainItems, storeId, remark, salespersonId: frontendSalespersonId, regionId, regionName } = req.body;

    // 【调试日志】记录请求参数
    console.log('[预约创建] 请求参数:', JSON.stringify({
      customerName,
      customerPhone: customerPhone ? customerPhone.slice(0, 3) + '****' + customerPhone.slice(-4) : null,
      pickupDate,
      items,
      bargainItems,  // 【2026-01-29修复】添加砍价商品日志
      storeId,
      salespersonId: frontendSalespersonId
    }));

    // 基本验证
    // 【2026-01-29修复】items 改为可选（允许只有砍价商品的预约）
    if (!customerName || !customerPhone || !pickupDate || !storeId) {
      console.log('[预约创建] 验证失败: 缺少必填字段', { customerName: !!customerName, customerPhone: !!customerPhone, pickupDate: !!pickupDate, storeId: !!storeId });
      return badRequest(res, '请填写完整预约信息');
    }

    // 【2026-01-29修复】至少需要一种商品（普通商品、秒杀商品或砍价商品）
    const hasItems = Array.isArray(items) && items.length > 0;
    const hasFlashSaleItems = Array.isArray(flashSaleItems) && flashSaleItems.length > 0;
    const hasBargainItems = Array.isArray(bargainItems) && bargainItems.length > 0;

    if (!hasItems && !hasFlashSaleItems && !hasBargainItems) {
      return badRequest(res, '请选择预约商品');
    }

    // 【2026-01-23 安全修复】验证普通商品数据的基本格式（如果有的话）
    if (hasItems) {
      for (const item of items) {
        if (!item.productId || typeof item.productId !== 'number' || item.productId <= 0) {
          return badRequest(res, '商品ID无效');
        }
        if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
          return badRequest(res, '商品数量必须是正整数');
        }
        if (item.quantity > 9999) {
          return badRequest(res, '单个商品数量不能超过9999');
        }
      }
    }

    // 【2026-01-29修复】验证砍价商品数据格式
    if (hasBargainItems) {
      for (const item of bargainItems) {
        if (!item.bargainCode || typeof item.bargainCode !== 'string') {
          return badRequest(res, '砍价码无效');
        }
      }
    }

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(customerPhone)) {
      return badRequest(res, '手机号格式不正确');
    }

    // 验证预约日期
    const pickupDateObj = new Date(pickupDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (pickupDateObj < today) {
      return badRequest(res, '预约日期不能是过去的日期');
    }

    // 【2026-01-19修复】确定推销员ID（优先级）
    const user = (req as any).user;
    let salespersonId: number | undefined = undefined;

    // 1. 优先使用前端传递的有效推销员ID（扫码场景）
    if (frontendSalespersonId && typeof frontendSalespersonId === 'number') {
      const salesperson = await prisma.agent.findUnique({
        where: { id: frontendSalespersonId },
        select: { id: true, type: true, status: true }
      });
      if (salesperson && salesperson.status === 'ACTIVE' && ['LEVEL1', 'LEVEL2'].includes(salesperson.type)) {
        salespersonId = frontendSalespersonId;
        console.log(`[预约] 使用前端传递的推销员ID: ${salespersonId}`);
      }
    }

    // 2. 回退：登录用户是推销员则用自己的ID
    if (!salespersonId && user) {
      if (['LEVEL1', 'LEVEL2'].includes(user.agentType)) {
        salespersonId = user.id;
        console.log(`[预约] 使用登录用户(推销员)ID: ${salespersonId}`);
      }
      // WHOLESALE用户如果没绑定推销员，salespersonId为null（允许无归属预约）
    }

    // 【2026-01-20 秒杀系统】支持秒杀商品
    // 【2026-01-21 顺路拼团】支持区域信息
    // 【2026-01-29修复】支持砍价商品
    const result = await createReservation({
      customerName,
      customerPhone,
      pickupDate,
      items: items || undefined,  // 【2026-01-29修复】items改为可选
      flashSaleItems: flashSaleItems || undefined,  // 传递秒杀商品
      bargainItems: bargainItems || undefined,      // 【2026-01-29修复】传递砍价商品
      salespersonId,
      storeId,
      remark,
      regionId: regionId || undefined,      // 【2026-01-21 顺路拼团】区域ID
      regionName: regionName || undefined,  // 区域名称
    });

    if (result.success) {
      return success(res, result.data, result.message);
    } else {
      return badRequest(res, result.message);
    }
  } catch (err: any) {
    console.error('[ReservationController] create error:', err);
    return error(res, '创建预约失败');
  }
}

/**
 * 获取预约详情
 * GET /api/reservations/:id
 */
export async function getDetail(req: Request, res: Response) {
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
    console.error('[ReservationController] getDetail error:', err);
    return error(res, '获取预约详情失败');
  }
}

/**
 * 获取我的预约列表
 * GET /api/reservations/my?phone=xxx
 */
export async function getMyReservations(req: Request, res: Response) {
  try {
    const { phone, page, pageSize, status } = req.query;

    if (!phone || typeof phone !== 'string') {
      return badRequest(res, '请提供手机号');
    }

    const result = await getCustomerReservations(phone, {
      page: page ? parseInt(page as string, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize as string, 10) : 10,
      status: status !== undefined ? parseInt(status as string, 10) : undefined,
    });

    return success(res, result);
  } catch (err: any) {
    console.error('[ReservationController] getMyReservations error:', err);
    return error(res, '获取预约列表失败');
  }
}

/**
 * 获取我的预约统计
 * GET /api/reservations/counts?phone=xxx
 * 【2026-01-17新增】供个人中心页面展示预约状态数量
 */
export async function getCounts(req: Request, res: Response) {
  try {
    const { phone } = req.query;

    if (!phone || typeof phone !== 'string') {
      return badRequest(res, '请提供手机号');
    }

    const { getReservationCounts } = await import('../services/reservation');
    const counts = await getReservationCounts(phone);

    return success(res, counts);
  } catch (err: any) {
    console.error('[ReservationController] getCounts error:', err);
    return error(res, '获取预约统计失败');
  }
}

/**
 * 获取推销员的客户预约列表
 * GET /api/reservations/agent-orders?agentId=xxx
 * 【2026-01-20新增】推销员查看通过自己链接提交的所有客户预约
 */
export async function getAgentOrders(req: Request, res: Response) {
  try {
    const { agentId, page, pageSize, status } = req.query;

    if (!agentId || typeof agentId !== 'string') {
      return badRequest(res, '请提供推销员ID');
    }

    const agentIdNum = parseInt(agentId, 10);
    if (isNaN(agentIdNum)) {
      return badRequest(res, '推销员ID无效');
    }

    // 构建查询条件
    const where: any = {
      salespersonId: agentIdNum,
    };

    // 状态筛选（支持多状态，用逗号分隔）
    if (status !== undefined && status !== '') {
      const statusStr = status as string;
      if (statusStr.includes(',')) {
        const statusArr = statusStr.split(',').map(s => parseInt(s, 10)).filter(n => !isNaN(n));
        where.status = { in: statusArr };
      } else {
        const statusNum = parseInt(statusStr, 10);
        if (!isNaN(statusNum)) {
          where.status = statusNum;
        }
      }
    }

    const pageNum = page ? parseInt(page as string, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize as string, 10) : 10;

    const [list, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        include: {
          store: {
            select: { id: true, name: true }
          },
          items: {
            select: { id: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * pageSizeNum,
        take: pageSizeNum,
      }),
      prisma.reservation.count({ where }),
    ]);

    // 状态标签映射
    const statusLabels: Record<number, string> = {
      0: '待确认', 1: '确认中', 2: '已确认', 3: '已完成',
      4: '已取消', 5: '已过期', 6: '确认失败',
      7: '待备货', 8: '备货中', 9: '待提货',
    };

    const result = list.map(r => ({
      id: r.id,
      reservationNo: r.reservationNo,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      pickupDate: r.pickupDate,
      totalAmount: Number(r.totalAmount),
      status: r.status,
      statusLabel: statusLabels[r.status] || '未知',
      giftName: r.giftName,
      itemCount: r.items.length,
      storeName: r.store?.name || '蒙庆烟花',
      createdAt: r.createdAt,
    }));

    return success(res, {
      list: result,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
    });
  } catch (err: any) {
    console.error('[ReservationController] getAgentOrders error:', err);
    return error(res, '获取客户预约列表失败');
  }
}

/**
 * 取消预约
 * DELETE /api/reservations/:id
 * 【2026-01-17修复】支持从query或body获取phone参数
 */
export async function cancel(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    // 支持从body或query获取phone
    const phone = req.body?.phone || req.query?.phone;

    if (isNaN(id)) {
      return badRequest(res, '预约ID无效');
    }

    if (!phone) {
      return badRequest(res, '请提供手机号验证身份');
    }

    const result = await cancelReservation(id, phone as string);

    if (result.success) {
      return success(res, null, result.message);
    } else {
      return badRequest(res, result.message);
    }
  } catch (err: any) {
    console.error('[ReservationController] cancel error:', err);
    return error(res, '取消预约失败');
  }
}

export default {
  getComplianceNotice,
  getGiftTiers,
  checkCustomer,
  create,
  getDetail,
  getMyReservations,
  getCounts,
  getAgentOrders,
  cancel,
};

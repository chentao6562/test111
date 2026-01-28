/**
 * 客户风控服务
 * 【2026-01-16 预约模式升级】爽约管理机制
 */

import prisma from '../../utils/prisma';
import { CustomerRiskLevel, ReservationStatus } from './types';

/**
 * 获取或创建客户记录
 * @param phone 手机号
 * @param name 姓名（可选）
 * @param agentId 推销员ID（可选）【2026-01-28新增】
 * @param agentName 推销员姓名（可选）【2026-01-28新增】
 */
export async function getOrCreateCustomer(
  phone: string,
  name?: string,
  agentId?: number,
  agentName?: string
) {
  let customer = await prisma.customerRecord.findUnique({
    where: { phone },
  });

  if (!customer) {
    // 新客户：记录首次接触的推销员
    customer = await prisma.customerRecord.create({
      data: {
        phone,
        name,
        firstAgentId: agentId || null,
        firstAgentName: agentName || null,
        totalOrders: 0,
        completedOrders: 0,
        noShowCount: 0,
        riskLevel: CustomerRiskLevel.NORMAL,
        isBlocked: false,
      },
    });
  } else if (name && !customer.name) {
    // 更新姓名
    customer = await prisma.customerRecord.update({
      where: { id: customer.id },
      data: { name },
    });
  }

  return customer;
}

/**
 * 检查客户是否可以预约
 * @param phone 手机号
 * @returns { canReserve, message, riskLevel }
 * 【2026-01-22 P1修复】添加同一客户待处理预约数量限制
 */
export async function checkCustomerCanReserve(phone: string): Promise<{
  canReserve: boolean;
  message: string;
  riskLevel: number;
}> {
  const customer = await prisma.customerRecord.findUnique({
    where: { phone },
  });

  if (!customer) {
    // 【2026-01-22 P1修复】新客户也要检查待处理预约数量
    const pendingCount = await prisma.reservation.count({
      where: {
        customerPhone: phone,
        status: {
          in: [
            ReservationStatus.PENDING,
            ReservationStatus.CALLING,
            ReservationStatus.CONFIRMED,
            ReservationStatus.PENDING_PREPARE,
            ReservationStatus.PREPARING,
            ReservationStatus.PENDING_PICKUP,
          ],
        },
      },
    });

    // 限制每个客户最多3个待处理预约
    const MAX_PENDING_RESERVATIONS = 3;
    if (pendingCount >= MAX_PENDING_RESERVATIONS) {
      return {
        canReserve: false,
        message: `您有${pendingCount}个预约正在处理中，请先完成提货后再预约新订单`,
        riskLevel: CustomerRiskLevel.NORMAL,
      };
    }

    return {
      canReserve: true,
      message: '新客户，欢迎预约',
      riskLevel: CustomerRiskLevel.NORMAL,
    };
  }

  if (customer.isBlocked) {
    return {
      canReserve: false,
      message: customer.blockedReason || '该手机号已被限制预约，请联系客服',
      riskLevel: CustomerRiskLevel.BLACKLIST,
    };
  }

  // 【2026-01-22 P1修复】检查同一客户待处理预约数量
  const pendingCount = await prisma.reservation.count({
    where: {
      customerPhone: phone,
      status: {
        in: [
          ReservationStatus.PENDING,
          ReservationStatus.CALLING,
          ReservationStatus.CONFIRMED,
          ReservationStatus.PENDING_PREPARE,
          ReservationStatus.PREPARING,
          ReservationStatus.PENDING_PICKUP,
        ],
      },
    },
  });

  // 限制每个客户最多3个待处理预约
  const MAX_PENDING_RESERVATIONS = 3;
  if (pendingCount >= MAX_PENDING_RESERVATIONS) {
    return {
      canReserve: false,
      message: `您有${pendingCount}个预约正在处理中，请先完成提货后再预约新订单`,
      riskLevel: customer.riskLevel,
    };
  }

  return {
    canReserve: true,
    message: customer.riskLevel >= CustomerRiskLevel.HIGH_RISK
      ? '温馨提示：您有过爽约记录，本次预约不享受赠品'
      : '欢迎预约',
    riskLevel: customer.riskLevel,
  };
}

/**
 * 记录预约（客户下单时调用）
 * @param phone 手机号
 */
export async function recordReservation(phone: string): Promise<void> {
  await prisma.customerRecord.upsert({
    where: { phone },
    update: {
      totalOrders: { increment: 1 },
    },
    create: {
      phone,
      totalOrders: 1,
      completedOrders: 0,
      noShowCount: 0,
      riskLevel: CustomerRiskLevel.NORMAL,
      isBlocked: false,
    },
  });
}

/**
 * 记录完成提货（核销时调用）
 * 【2026-01-17】使用upsert确保记录存在
 * @param phone 手机号
 */
export async function recordCompletion(phone: string): Promise<void> {
  await prisma.customerRecord.upsert({
    where: { phone },
    update: {
      completedOrders: { increment: 1 },
    },
    create: {
      phone,
      completedOrders: 1,
      noShowCount: 0,
      riskLevel: CustomerRiskLevel.NORMAL,
      isBlocked: false,
    },
  });
}

/**
 * 记录爽约（过期时调用）
 * @param phone 手机号
 */
export async function recordNoShow(phone: string): Promise<void> {
  const customer = await prisma.customerRecord.findUnique({
    where: { phone },
  });

  if (!customer) {
    return;
  }

  const newNoShowCount = customer.noShowCount + 1;
  let newRiskLevel = customer.riskLevel;
  let isBlocked = customer.isBlocked;
  let blockedReason = customer.blockedReason;

  // 根据爽约次数更新风险等级
  if (newNoShowCount === 1) {
    newRiskLevel = CustomerRiskLevel.HAS_RECORD;
  } else if (newNoShowCount === 2) {
    newRiskLevel = CustomerRiskLevel.HIGH_RISK;
  } else if (newNoShowCount >= 3) {
    newRiskLevel = CustomerRiskLevel.BLACKLIST;
    isBlocked = true;
    blockedReason = `累计爽约${newNoShowCount}次，已自动加入黑名单`;
  }

  await prisma.customerRecord.update({
    where: { phone },
    data: {
      noShowCount: newNoShowCount,
      riskLevel: newRiskLevel,
      isBlocked,
      blockedReason,
    },
  });
}

/**
 * 管理后台：获取客户列表
 */
export async function getCustomerList(params: {
  page?: number;
  pageSize?: number;
  phone?: string;
  riskLevel?: number;
  isBlocked?: boolean;
}) {
  const { page = 1, pageSize = 20, phone, riskLevel, isBlocked } = params;

  const where: any = {};

  if (phone) {
    where.phone = { contains: phone };
  }
  if (riskLevel !== undefined) {
    where.riskLevel = riskLevel;
  }
  if (isBlocked !== undefined) {
    where.isBlocked = isBlocked;
  }

  const [total, list] = await Promise.all([
    prisma.customerRecord.count({ where }),
    prisma.customerRecord.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [
        { riskLevel: 'desc' },
        { noShowCount: 'desc' },
        { createdAt: 'desc' },
      ],
    }),
  ]);

  return {
    total,
    list,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 管理后台：手动加入黑名单
 */
export async function blockCustomer(phone: string, reason: string): Promise<void> {
  await prisma.customerRecord.upsert({
    where: { phone },
    update: {
      isBlocked: true,
      blockedReason: reason,
      riskLevel: CustomerRiskLevel.BLACKLIST,
    },
    create: {
      phone,
      totalOrders: 0,
      completedOrders: 0,
      noShowCount: 0,
      riskLevel: CustomerRiskLevel.BLACKLIST,
      isBlocked: true,
      blockedReason: reason,
    },
  });
}

/**
 * 管理后台：解除黑名单
 */
export async function unblockCustomer(phone: string): Promise<void> {
  await prisma.customerRecord.update({
    where: { phone },
    data: {
      isBlocked: false,
      blockedReason: null,
      // 保留风险等级记录，但允许预约
    },
  });
}

/**
 * 获取客户风险等级标签
 */
export function getRiskLevelLabel(riskLevel: number): string {
  const labels: Record<number, string> = {
    [CustomerRiskLevel.NORMAL]: '正常',
    [CustomerRiskLevel.HAS_RECORD]: '有记录',
    [CustomerRiskLevel.HIGH_RISK]: '高风险',
    [CustomerRiskLevel.BLACKLIST]: '黑名单',
  };
  return labels[riskLevel] || '未知';
}

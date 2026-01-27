import prisma from '../utils/prisma';
import { Agent, Order, Prisma } from '@prisma/client';

// 超时时间配置（默认1小时）
const CONFIRM_TIMEOUT_HOURS = parseInt(process.env.ORDER_CONFIRM_TIMEOUT_HOURS || '1');

/**
 * 判断代理商的订单是否需要确认
 *
 * 【2026-01-09 业务流程优化】
 * 根据用户需求："所有订单全部由客服确认，不是由上一级代理，因为客服要确认收到款项"
 *
 * 新流程：所有订单直接进入 pending_payment，由客服确认收款后进入 pending_accept
 * 移除上级代理商确认环节，统一由客服处理收款确认
 *
 * @returns 始终返回 false，不再需要上级确认
 */
export async function needConfirmation(agentId: number): Promise<boolean> {
  // 【业务优化】所有订单都不需要上级代理确认
  // 订单直接进入 pending_payment 状态，由客服确认收款
  return false;
}

/**
 * 获取应该确认订单的一级代理商
 * 沿着上级链路查找第一个一级代理商
 */
export async function getConfirmer(agentId: number): Promise<Agent | null> {
  let currentId: number | null = agentId;
  const visited = new Set<number>();

  while (currentId) {
    // 防止循环引用
    if (visited.has(currentId)) {
      break;
    }
    visited.add(currentId);

    const agentData: Agent | null = await prisma.agent.findUnique({
      where: { id: currentId },
    });

    if (!agentData) {
      break;
    }

    // 找到一级代理商
    if (agentData.type === 'LEVEL1') {
      return agentData;
    }

    // 继续往上找
    currentId = agentData.parentId;
  }

  return null;
}

/**
 * 检查确认人是否有权限确认该订单
 * 确认人必须是下单代理商上级链中的一级代理商
 */
export async function canConfirmOrder(orderId: number, confirmerId: number): Promise<boolean> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { agentId: true, status: true, needConfirm: true },
  });

  if (!order) {
    return false;
  }

  // 订单不需要确认或状态不是待确认
  if (!order.needConfirm || order.status !== 'pending_confirm') {
    return false;
  }

  // 检查确认人是否是一级代理商
  const confirmer = await prisma.agent.findUnique({
    where: { id: confirmerId },
    select: { type: true },
  });

  if (!confirmer || confirmer.type !== 'LEVEL1') {
    return false;
  }

  // 检查下单人是否是确认人的下级（直接或间接）
  let currentAgentId: number | null = order.agentId;
  const visitedSet = new Set<number>();

  while (currentAgentId) {
    if (visitedSet.has(currentAgentId)) {
      break;
    }
    visitedSet.add(currentAgentId);

    const agentRecord: { parentId: number | null } | null = await prisma.agent.findUnique({
      where: { id: currentAgentId },
      select: { parentId: true },
    });

    if (!agentRecord) {
      break;
    }

    // 找到确认人，说明下单人是确认人的下级
    if (agentRecord.parentId === confirmerId) {
      return true;
    }

    currentAgentId = agentRecord.parentId;
  }

  return false;
}

/**
 * 确认订单
 */
export async function confirmOrder(
  orderId: number,
  confirmerId: number,
  remark?: string
): Promise<Order> {
  // 验证权限
  const canConfirm = await canConfirmOrder(orderId, confirmerId);
  if (!canConfirm) {
    throw new Error('无权确认该订单');
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new Error('订单不存在');
  }

  if (order.status !== 'pending_confirm') {
    throw new Error('订单状态不允许确认');
  }

  // 获取确认人名称
  const confirmer = await prisma.agent.findUnique({
    where: { id: confirmerId },
    select: { name: true },
  });

  // 使用事务更新订单和记录日志
  const updatedOrder = await prisma.$transaction(async (tx) => {
    // 更新订单状态
    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'pending_payment',
        confirmerId,
        confirmedAt: new Date(),
        confirmRemark: remark,
      },
      include: {
        items: true,
        agent: {
          select: {
            id: true,
            name: true,
            phone: true,
            type: true,
          },
        },
      },
    });

    // 记录确认日志
    await tx.orderConfirmLog.create({
      data: {
        orderId,
        operatorId: confirmerId,
        operatorType: 'AGENT',
        operatorName: confirmer?.name || '',
        action: 'CONFIRM',
        remark,
      },
    });

    return updated;
  });

  return updatedOrder;
}

/**
 * 客服强制确认订单
 */
export async function csConfirmOrder(
  orderId: number,
  adminUserId: number,
  remark: string
): Promise<Order> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new Error('订单不存在');
  }

  if (order.status !== 'pending_confirm') {
    throw new Error('订单状态不允许确认');
  }

  // 获取管理员名称
  const admin = await prisma.systemUser.findUnique({
    where: { id: adminUserId },
    select: { name: true },
  });

  // 使用事务更新订单和记录日志
  const updatedOrder = await prisma.$transaction(async (tx) => {
    // 更新订单状态
    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'pending_payment',
        confirmedAt: new Date(),
        confirmRemark: `客服确认: ${remark}`,
      },
      include: {
        items: true,
        agent: {
          select: {
            id: true,
            name: true,
            phone: true,
            type: true,
          },
        },
      },
    });

    // 记录确认日志
    await tx.orderConfirmLog.create({
      data: {
        orderId,
        operatorId: adminUserId,
        operatorType: 'ADMIN',
        operatorName: admin?.name || '',
        action: 'CS_CONFIRM',
        remark,
      },
    });

    return updated;
  });

  return updatedOrder;
}

/**
 * 获取待一级代理商确认的订单列表
 */
export async function getPendingConfirmOrders(
  confirmerId: number,
  params: {
    page?: number;
    pageSize?: number;
  } = {}
) {
  const { page = 1, pageSize = 10 } = params;

  // 验证确认人是否是一级代理商
  const confirmer = await prisma.agent.findUnique({
    where: { id: confirmerId },
    select: { type: true },
  });

  if (!confirmer || confirmer.type !== 'LEVEL1') {
    return {
      list: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  // 获取该一级代理商的所有下级代理商ID
  const subordinateIds = await getSubordinateIds(confirmerId);

  if (subordinateIds.length === 0) {
    return {
      list: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  // 查询待确认订单
  const where = {
    agentId: { in: subordinateIds },
    status: 'pending_confirm',
    needConfirm: true,
  };

  const total = await prisma.order.count({ where });

  const list = await prisma.order.findMany({
    where,
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              images: true,
              unit: true,
            },
          },
        },
      },
      agent: {
        select: {
          id: true,
          name: true,
          phone: true,
          type: true,
          avatar: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' }, // 按时间升序，先下的订单优先处理
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    list,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 获取超时未确认的订单
 */
export async function getTimeoutOrders() {
  const timeoutDate = new Date(Date.now() - CONFIRM_TIMEOUT_HOURS * 60 * 60 * 1000);

  const orders = await prisma.order.findMany({
    where: {
      status: 'pending_confirm',
      needConfirm: true,
      createdAt: { lt: timeoutDate },
    },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          phone: true,
          type: true,
        },
      },
      confirmLogs: {
        where: {
          action: 'TIMEOUT',
        },
        take: 1,
      },
    },
  });

  // 过滤掉已经标记过超时的订单
  return orders.filter(order => order.confirmLogs.length === 0);
}

/**
 * 标记订单为超时
 */
export async function markTimeout(orderId: number): Promise<void> {
  // 记录超时日志
  await prisma.orderConfirmLog.create({
    data: {
      orderId,
      operatorId: 0, // 系统操作
      operatorType: 'SYSTEM',
      operatorName: '系统',
      action: 'TIMEOUT',
      remark: '订单超时未确认，已通知客服',
    },
  });
}

/**
 * 获取超时统计
 */
export async function getTimeoutStats() {
  const timeoutDate = new Date(Date.now() - CONFIRM_TIMEOUT_HOURS * 60 * 60 * 1000);

  const [totalPending, timeoutCount, todayTimeout] = await Promise.all([
    // 总待确认数
    prisma.order.count({
      where: {
        status: 'pending_confirm',
        needConfirm: true,
      },
    }),
    // 超时待处理数
    prisma.order.count({
      where: {
        status: 'pending_confirm',
        needConfirm: true,
        createdAt: { lt: timeoutDate },
      },
    }),
    // 今日超时数（今日产生的超时）
    prisma.orderConfirmLog.count({
      where: {
        action: 'TIMEOUT',
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
  ]);

  return {
    totalPending,
    timeoutCount,
    todayTimeout,
  };
}

/**
 * 获取确认统计（一级代理商用）
 */
export async function getConfirmStats(confirmerId: number) {
  // 验证确认人是否是一级代理商
  const confirmer = await prisma.agent.findUnique({
    where: { id: confirmerId },
    select: { type: true },
  });

  if (!confirmer || confirmer.type !== 'LEVEL1') {
    return {
      pendingCount: 0,
      todayConfirmedCount: 0,
    };
  }

  // 获取下级代理商ID
  const subordinateIds = await getSubordinateIds(confirmerId);

  if (subordinateIds.length === 0) {
    return {
      pendingCount: 0,
      todayConfirmedCount: 0,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [pendingCount, todayConfirmedCount] = await Promise.all([
    // 待确认数
    prisma.order.count({
      where: {
        agentId: { in: subordinateIds },
        status: 'pending_confirm',
        needConfirm: true,
      },
    }),
    // 今日已确认数
    prisma.orderConfirmLog.count({
      where: {
        operatorId: confirmerId,
        action: 'CONFIRM',
        createdAt: { gte: today },
      },
    }),
  ]);

  return {
    pendingCount,
    todayConfirmedCount,
  };
}

/**
 * 获取代理商的所有下级代理商ID（递归）
 */
async function getSubordinateIds(agentId: number): Promise<number[]> {
  const result: number[] = [];
  const queue: number[] = [agentId];
  const visited = new Set<number>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;

    if (visited.has(currentId)) {
      continue;
    }
    visited.add(currentId);

    // 获取直接下级
    const children = await prisma.agent.findMany({
      where: { parentId: currentId },
      select: { id: true },
    });

    for (const child of children) {
      result.push(child.id);
      queue.push(child.id);
    }
  }

  return result;
}

/**
 * 获取管理后台待确认订单列表
 */
export async function adminGetPendingOrders(params: {
  page?: number;
  pageSize?: number;
  isTimeout?: boolean;
  agentId?: number;
  startDate?: string;
  endDate?: string;
}) {
  const { page = 1, pageSize = 10, isTimeout, agentId, startDate, endDate } = params;

  const where: any = {
    status: 'pending_confirm',
    needConfirm: true,
  };

  // 超时筛选
  if (isTimeout !== undefined) {
    const timeoutDate = new Date(Date.now() - CONFIRM_TIMEOUT_HOURS * 60 * 60 * 1000);
    if (isTimeout) {
      where.createdAt = { lt: timeoutDate };
    } else {
      where.createdAt = { gte: timeoutDate };
    }
  }

  // 代理商筛选
  if (agentId) {
    where.agentId = agentId;
  }

  // 日期范围筛选
  if (startDate || endDate) {
    if (!where.createdAt) {
      where.createdAt = {};
    }
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      where.createdAt.lt = end;
    }
  }

  const total = await prisma.order.count({ where });

  const list = await prisma.order.findMany({
    where,
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              images: true,
            },
          },
        },
      },
      agent: {
        select: {
          id: true,
          name: true,
          phone: true,
          type: true,
          parent: {
            select: {
              id: true,
              name: true,
              type: true,
              parent: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
        },
      },
      confirmLogs: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
    orderBy: { createdAt: 'asc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  // 计算等待时长和应确认人
  const timeoutDate = new Date(Date.now() - CONFIRM_TIMEOUT_HOURS * 60 * 60 * 1000);
  const enrichedList = await Promise.all(
    list.map(async (order) => {
      const waitingMinutes = Math.floor((Date.now() - order.createdAt.getTime()) / 60000);
      const isOrderTimeout = order.createdAt < timeoutDate;

      // 找到应确认的一级代理商
      const expectedConfirmer = await getConfirmer(order.agentId);

      return {
        ...order,
        waitingMinutes,
        isTimeout: isOrderTimeout,
        expectedConfirmer: expectedConfirmer
          ? {
              id: expectedConfirmer.id,
              name: expectedConfirmer.name,
              phone: expectedConfirmer.phone,
            }
          : null,
      };
    })
  );

  return {
    list: enrichedList,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export default {
  needConfirmation,
  getConfirmer,
  canConfirmOrder,
  confirmOrder,
  csConfirmOrder,
  getPendingConfirmOrders,
  getTimeoutOrders,
  markTimeout,
  getTimeoutStats,
  getConfirmStats,
  adminGetPendingOrders,
};

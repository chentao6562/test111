import prisma from '../utils/prisma';

// 生成锁货申请编号
function generateRequestNo(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `SQ-${dateStr}-${random}`;
}

// 生成异常工单编号
function generateTicketNo(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `YC-${dateStr}-${random}`;
}

// 获取客服统计数据
export async function getStatistics() {
  const [
    pendingLockStock,
    totalLockStock,
    pendingException,
    totalException,
  ] = await Promise.all([
    prisma.lockStockRequest.count({ where: { status: 'PENDING' } }),
    prisma.lockStockRequest.count(),
    prisma.exceptionOrder.count({ where: { status: 'PENDING' } }),
    prisma.exceptionOrder.count(),
  ]);

  return {
    pendingLockStock,
    totalLockStock,
    pendingException,
    totalException,
  };
}

// ========== 锁货申请相关 ==========

// 获取锁货申请列表
export async function getLockStockList(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  keyword?: string;
  startDate?: string;
  endDate?: string;
}) {
  const { page = 1, pageSize = 10, status, keyword, startDate, endDate } = params;
  const skip = (page - 1) * pageSize;

  const where: any = {};

  if (status) {
    where.status = status;
  }

  if (keyword) {
    where.OR = [
      { requestNo: { contains: keyword } },
      { agent: { name: { contains: keyword } } },
      { agent: { phone: { contains: keyword } } },
      { product: { name: { contains: keyword } } },
    ];
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
    }
  }

  const [list, total] = await Promise.all([
    prisma.lockStockRequest.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        agent: {
          select: { id: true, name: true, phone: true },
        },
        product: {
          select: { id: true, name: true, images: true },
        },
      },
    }),
    prisma.lockStockRequest.count({ where }),
  ]);

  return {
    list,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// 获取锁货申请详情
export async function getLockStockDetail(id: number) {
  const request = await prisma.lockStockRequest.findUnique({
    where: { id },
    include: {
      agent: {
        select: { id: true, name: true, phone: true, type: true },
      },
      product: {
        select: { id: true, name: true, images: true, retailPrice: true, stock: true },
      },
    },
  });

  return request;
}

// 创建锁货申请（代理商端调用）
export async function createLockStockRequest(data: {
  agentId: number;
  productId: number;
  quantity: number;
  remark?: string;
}) {
  const { agentId, productId, quantity, remark } = data;

  // 检查商品是否存在
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });
  if (!product) {
    throw new Error('商品不存在');
  }

  // 检查库存是否足够
  if (product.stock < quantity) {
    throw new Error('库存不足');
  }

  // 创建锁货申请
  const request = await prisma.lockStockRequest.create({
    data: {
      requestNo: generateRequestNo(),
      agentId,
      productId,
      quantity,
      remark,
      status: 'PENDING',
    },
    include: {
      agent: {
        select: { id: true, name: true, phone: true },
      },
      product: {
        select: { id: true, name: true, images: true },
      },
    },
  });

  return request;
}

// 审核锁货申请
export async function reviewLockStockRequest(
  id: number,
  data: {
    action: 'approve' | 'reject';
    rejectReason?: string;
    reviewedBy: number;
  }
) {
  const { action, rejectReason, reviewedBy } = data;

  // 检查申请是否存在
  const request = await prisma.lockStockRequest.findUnique({
    where: { id },
    include: { product: true },
  });
  if (!request) {
    throw new Error('申请不存在');
  }

  if (request.status !== 'PENDING') {
    throw new Error('该申请已处理');
  }

  if (action === 'approve') {
    // 检查库存是否足够
    if (request.product.stock < request.quantity) {
      throw new Error('库存不足，无法通过');
    }

    // 使用事务：更新申请状态 + 锁定库存
    const result = await prisma.$transaction([
      prisma.lockStockRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedBy,
          reviewedAt: new Date(),
        },
      }),
      // 增加锁定库存
      prisma.product.update({
        where: { id: request.productId },
        data: {
          lockStock: { increment: request.quantity },
        },
      }),
    ]);

    return result[0];
  } else {
    // 驳回
    const result = await prisma.lockStockRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectReason,
        reviewedBy,
        reviewedAt: new Date(),
      },
    });

    return result;
  }
}

// ========== 异常工单相关 ==========

// 获取异常工单列表
export async function getExceptionList(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  type?: string;
  keyword?: string;
  startDate?: string;
  endDate?: string;
}) {
  const { page = 1, pageSize = 10, status, type, keyword, startDate, endDate } = params;
  const skip = (page - 1) * pageSize;

  const where: any = {};

  if (status) {
    where.status = status;
  }

  if (type) {
    where.type = type;
  }

  if (keyword) {
    where.OR = [
      { ticketNo: { contains: keyword } },
      { description: { contains: keyword } },
      { order: { orderNo: { contains: keyword } } },
    ];
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
    }
  }

  const [list, total] = await Promise.all([
    prisma.exceptionOrder.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: {
            id: true,
            orderNo: true,
            status: true,
            totalAmount: true,
            agent: {
              select: { id: true, name: true, phone: true },
            },
          },
        },
      },
    }),
    prisma.exceptionOrder.count({ where }),
  ]);

  return {
    list,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// 获取异常工单详情
export async function getExceptionDetail(id: number) {
  const ticket = await prisma.exceptionOrder.findUnique({
    where: { id },
    include: {
      order: {
        select: {
          id: true,
          orderNo: true,
          status: true,
          totalAmount: true,
          contactName: true,
          contactPhone: true,
          createdAt: true,
          agent: {
            select: { id: true, name: true, phone: true, type: true },
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true, images: true },
              },
            },
          },
        },
      },
    },
  });

  return ticket;
}

// 创建异常工单
export async function createExceptionOrder(data: {
  orderId: number;
  type: string;
  description: string;
}) {
  const { orderId, type, description } = data;

  // 检查订单是否存在
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });
  if (!order) {
    throw new Error('订单不存在');
  }

  // 创建异常工单
  const ticket = await prisma.exceptionOrder.create({
    data: {
      ticketNo: generateTicketNo(),
      orderId,
      type,
      description,
      status: 'PENDING',
    },
    include: {
      order: {
        select: { id: true, orderNo: true, status: true },
      },
    },
  });

  return ticket;
}

// 处理异常工单
export async function resolveExceptionOrder(
  id: number,
  data: {
    resolution: string;
    resolvedBy: number;
  }
) {
  const { resolution, resolvedBy } = data;

  // 检查工单是否存在
  const ticket = await prisma.exceptionOrder.findUnique({
    where: { id },
  });
  if (!ticket) {
    throw new Error('工单不存在');
  }

  if (ticket.status === 'RESOLVED') {
    throw new Error('该工单已处理');
  }

  // 更新工单状态
  const result = await prisma.exceptionOrder.update({
    where: { id },
    data: {
      status: 'RESOLVED',
      resolution,
      resolvedBy,
      resolvedAt: new Date(),
    },
  });

  return result;
}

// 异常工单类型
export const EXCEPTION_TYPES = {
  PRODUCT_ISSUE: '商品问题',
  DELIVERY_ISSUE: '配送问题',
  PAYMENT_ISSUE: '支付问题',
  REFUND_REQUEST: '退款申请',
  OTHER: '其他',
};

import prisma from '../utils/prisma';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * 门店零售服务
 * 支持现金/扫码/转账三种收款方式
 * 转账需后台确认
 */

// 零售商品项
interface RetailItem {
  productId: number;
  quantity: number;
}

// 创建零售单参数
interface CreateRetailOrderParams {
  items: RetailItem[];
  paymentType: 'CASH' | 'SCAN' | 'TRANSFER';
  customerName?: string;
  customerPhone?: string;
  remark?: string;
}

// 分页查询参数
interface RetailOrderQueryParams {
  page?: number;
  pageSize?: number;
  status?: string;
  paymentType?: string;
  operatorId?: number;
  startDate?: string;
  endDate?: string;
}

/**
 * 生成零售单号
 * 格式: R + YYYYMMDD + 6位序号
 */
async function generateOrderNo(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `R${dateStr}`;

  // 获取今日最大单号
  const lastOrder = await prisma.retailOrder.findFirst({
    where: {
      orderNo: {
        startsWith: prefix
      }
    },
    orderBy: {
      orderNo: 'desc'
    }
  });

  let seq = 1;
  if (lastOrder) {
    const lastSeq = parseInt(lastOrder.orderNo.slice(-6), 10);
    seq = lastSeq + 1;
  }

  return `${prefix}${seq.toString().padStart(6, '0')}`;
}

/**
 * 检查库存是否充足
 */
async function checkStock(items: RetailItem[]): Promise<{ valid: boolean; message?: string; product?: string }> {
  for (const item of items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId }
    });

    if (!product) {
      return { valid: false, message: '商品不存在', product: `商品ID: ${item.productId}` };
    }

    if (product.status !== 'ACTIVE') {
      return { valid: false, message: '商品已下架', product: product.name };
    }

    // 可售库存 = stock - lockStock
    const availableStock = product.stock - product.lockStock;
    if (availableStock < item.quantity) {
      return {
        valid: false,
        message: `库存不足，当前可售${availableStock}${product.unit}`,
        product: product.name
      };
    }
  }

  return { valid: true };
}

/**
 * 创建零售订单
 */
export async function createRetailOrder(
  operatorId: number,
  operatorName: string,
  params: CreateRetailOrderParams
): Promise<{ success: boolean; message: string; order?: any }> {
  const { items, paymentType, customerName, customerPhone, remark } = params;

  // 验证商品数量
  if (!items || items.length === 0) {
    return { success: false, message: '请选择商品' };
  }

  // 检查库存
  const stockCheck = await checkStock(items);
  if (!stockCheck.valid) {
    return { success: false, message: `${stockCheck.product}: ${stockCheck.message}` };
  }

  // 获取商品详情并计算总金额
  const productIds = items.map(item => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } }
  });

  const productMap = new Map(products.map(p => [p.id, p]));
  let totalAmount = new Decimal(0);
  const orderItems: any[] = [];
  const itemsJson: any[] = [];

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) continue;

    // 使用零售价
    const price = product.retailPrice;
    const subtotal = price.mul(item.quantity);
    totalAmount = totalAmount.add(subtotal);

    // 解析图片，兼容非JSON格式的旧数据
    let images: string[] = [];
    if (product.images) {
      try {
        const parsed = JSON.parse(product.images);
        images = Array.isArray(parsed) ? parsed : [product.images];
      } catch {
        // 如果不是JSON格式，清理方括号后作为单个图片路径
        const cleaned = product.images.replace(/^\[|\]$/g, '').trim();
        images = cleaned ? [cleaned] : [];
      }
    }

    const itemData = {
      productId: product.id,
      productName: product.name,
      productImage: images[0] || null,
      price,
      quantity: item.quantity,
      subtotal
    };

    orderItems.push(itemData);
    itemsJson.push({
      productId: product.id,
      name: product.name,
      image: images[0] || null,
      price: price.toNumber(),
      quantity: item.quantity,
      subtotal: subtotal.toNumber()
    });
  }

  // 生成单号
  const orderNo = await generateOrderNo();

  // 确定初始状态（现金/扫码直接为待付款，转账也是待付款但需后台确认）
  const initialStatus = 'pending';

  try {
    // 使用事务创建订单
    const order = await prisma.$transaction(async (tx) => {
      // 创建零售订单
      const retailOrder = await tx.retailOrder.create({
        data: {
          orderNo,
          items: JSON.stringify(itemsJson),
          totalAmount,
          paymentType,
          status: initialStatus,
          operatorId,
          operatorName,
          customerName,
          customerPhone,
          remark
        }
      });

      // 创建订单明细
      for (const item of orderItems) {
        await tx.retailOrderItem.create({
          data: {
            retailOrderId: retailOrder.id,
            productId: item.productId,
            productName: item.productName,
            productImage: item.productImage,
            price: item.price,
            quantity: item.quantity,
            subtotal: item.subtotal
          }
        });
      }

      return retailOrder;
    });

    return {
      success: true,
      message: '零售单创建成功',
      order: {
        ...order,
        items: itemsJson
      }
    };
  } catch (error: any) {
    console.error('[RetailService] 创建零售单失败:', error);
    return { success: false, message: '创建零售单失败，请重试' };
  }
}

/**
 * 确认收款（现金/扫码由库管确认，转账由后台确认）
 */
export async function confirmPayment(
  orderId: number,
  confirmerId: number,
  confirmerName: string,
  confirmerType: 'WAREHOUSE' | 'ADMIN'
): Promise<{ success: boolean; message: string; order?: any }> {
  // 查询订单
  const order = await prisma.retailOrder.findUnique({
    where: { id: orderId },
    include: { retailItems: true }
  });

  if (!order) {
    return { success: false, message: '零售单不存在' };
  }

  if (order.status !== 'pending') {
    return { success: false, message: `订单状态为${order.status}，无法确认收款` };
  }

  // 转账订单只能由管理员确认
  if (order.paymentType === 'TRANSFER' && confirmerType !== 'ADMIN') {
    return { success: false, message: '转账订单需由后台确认收款' };
  }

  try {
    // 使用事务：确认收款并扣减库存
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 更新订单状态
      const updated = await tx.retailOrder.update({
        where: { id: orderId },
        data: {
          status: 'paid',
          paidAt: new Date(),
          confirmerId,
          confirmerName
        }
      });

      // 扣减库存
      for (const item of order.retailItems) {
        // 扣减库存
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
            salesCount: { increment: item.quantity }
          }
        });

        // 记录库存日志
        const product = await tx.product.findUnique({
          where: { id: item.productId }
        });

        if (product) {
          await tx.stockLog.create({
            data: {
              productId: item.productId,
              type: 'OUT',
              quantity: -item.quantity,
              beforeStock: product.stock + item.quantity,
              afterStock: product.stock,
              operatorId: confirmerId,
              operatorName: confirmerName,
              remark: `零售出库 - 单号: ${order.orderNo}`
            }
          });
        }
      }

      return updated;
    });

    return { success: true, message: '收款确认成功', order: updatedOrder };
  } catch (error: any) {
    console.error('[RetailService] 确认收款失败:', error);
    return { success: false, message: '确认收款失败，请重试' };
  }
}

/**
 * 取消零售单
 */
export async function cancelRetailOrder(
  orderId: number,
  operatorId: number,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  const order = await prisma.retailOrder.findUnique({
    where: { id: orderId }
  });

  if (!order) {
    return { success: false, message: '零售单不存在' };
  }

  if (order.status !== 'pending') {
    return { success: false, message: '只能取消待付款的零售单' };
  }

  // 只能取消自己创建的订单（管理员除外）
  if (order.operatorId !== operatorId) {
    // 检查是否为管理员 - 此处简化处理，实际应检查角色
    const operator = await prisma.systemUser.findUnique({
      where: { id: operatorId }
    });
    if (!operator || operator.role !== 'ADMIN') {
      return { success: false, message: '只能取消自己创建的零售单' };
    }
  }

  await prisma.retailOrder.update({
    where: { id: orderId },
    data: {
      status: 'cancelled',
      remark: reason ? `${order.remark || ''} [取消原因: ${reason}]` : order.remark
    }
  });

  return { success: true, message: '零售单已取消' };
}

/**
 * 获取零售单详情
 */
export async function getRetailOrderDetail(orderId: number) {
  const order = await prisma.retailOrder.findUnique({
    where: { id: orderId },
    include: {
      retailItems: true
    }
  });

  if (!order) {
    return null;
  }

  // 解析items JSON
  let itemsJson = [];
  try {
    itemsJson = JSON.parse(order.items);
  } catch (e) {
    itemsJson = [];
  }

  return {
    ...order,
    itemsParsed: itemsJson
  };
}

/**
 * 获取零售单列表
 */
export async function getRetailOrderList(params: RetailOrderQueryParams) {
  const {
    page = 1,
    pageSize = 10,
    status,
    paymentType,
    operatorId,
    startDate,
    endDate
  } = params;

  const where: any = {};

  if (status) {
    where.status = status;
  }

  if (paymentType) {
    where.paymentType = paymentType;
  }

  if (operatorId) {
    where.operatorId = operatorId;
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

  const [total, list] = await Promise.all([
    prisma.retailOrder.count({ where }),
    prisma.retailOrder.findMany({
      where,
      include: {
        retailItems: true
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    })
  ]);

  // 解析每个订单的items
  const orders = list.map(order => {
    let itemsParsed = [];
    try {
      itemsParsed = JSON.parse(order.items);
    } catch (e) {
      itemsParsed = [];
    }
    return {
      ...order,
      itemsParsed
    };
  });

  return {
    list: orders,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  };
}

/**
 * 获取待后台确认的转账订单
 */
export async function getPendingTransferOrders(params: { page?: number; pageSize?: number }) {
  const { page = 1, pageSize = 10 } = params;

  const where = {
    paymentType: 'TRANSFER',
    status: 'pending'
  };

  const [total, list] = await Promise.all([
    prisma.retailOrder.count({ where }),
    prisma.retailOrder.findMany({
      where,
      include: {
        retailItems: true
      },
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    })
  ]);

  return {
    list,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  };
}

/**
 * 记录打印次数
 */
export async function recordPrint(orderId: number): Promise<boolean> {
  try {
    await prisma.retailOrder.update({
      where: { id: orderId },
      data: {
        printCount: { increment: 1 }
      }
    });
    return true;
  } catch (error) {
    console.error('[RetailService] 记录打印失败:', error);
    return false;
  }
}

/**
 * 获取零售统计数据
 */
export async function getRetailStatistics(operatorId?: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const where: any = {
    status: 'paid'
  };

  if (operatorId) {
    where.operatorId = operatorId;
  }

  // 今日统计
  const todayWhere = {
    ...where,
    paidAt: { gte: today }
  };

  const [todayCount, todayAmount, totalCount, totalAmount] = await Promise.all([
    prisma.retailOrder.count({ where: todayWhere }),
    prisma.retailOrder.aggregate({
      where: todayWhere,
      _sum: { totalAmount: true }
    }),
    prisma.retailOrder.count({ where }),
    prisma.retailOrder.aggregate({
      where,
      _sum: { totalAmount: true }
    })
  ]);

  return {
    today: {
      count: todayCount,
      amount: todayAmount._sum.totalAmount || 0
    },
    total: {
      count: totalCount,
      amount: totalAmount._sum.totalAmount || 0
    }
  };
}

/**
 * 生成小票数据
 */
export async function generateReceiptData(orderId: number) {
  const order = await getRetailOrderDetail(orderId);

  if (!order) {
    return null;
  }

  const paymentTypeMap: Record<string, string> = {
    'CASH': '现金',
    'SCAN': '扫码',
    'TRANSFER': '转账'
  };

  const statusMap: Record<string, string> = {
    'pending': '待付款',
    'paid': '已付款',
    'cancelled': '已取消'
  };

  return {
    storeName: '蒙庆烟花',
    storeAddress: '呼和浩特市和林格尔县盛乐镇姑子板村华门世家1号门面房',
    storePhone: '13190531439',
    orderNo: order.orderNo,
    createTime: order.createdAt,
    items: order.itemsParsed,
    totalAmount: order.totalAmount,
    paymentType: paymentTypeMap[order.paymentType] || order.paymentType,
    status: statusMap[order.status] || order.status,
    operatorName: order.operatorName,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    printCount: order.printCount + 1 // 即将打印
  };
}

export default {
  createRetailOrder,
  confirmPayment,
  cancelRetailOrder,
  getRetailOrderDetail,
  getRetailOrderList,
  getPendingTransferOrders,
  recordPrint,
  getRetailStatistics,
  generateReceiptData
};

import prisma from '../utils/prisma';
import { Prisma } from '@prisma/client';

// 获取销售报表统计
export async function getSalesStatistics(startDate?: string, endDate?: string) {
  const where: Prisma.OrderWhereInput = {
    status: { in: ['completed', 'pending_pickup'] }
  };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      where.createdAt.lt = end;
    }
  }

  // 本月日期范围
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // 上月日期范围
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  // 本月销售额
  const monthSales = await prisma.order.aggregate({
    where: {
      status: { in: ['completed', 'pending_pickup'] },
      createdAt: { gte: monthStart, lte: monthEnd }
    },
    _sum: { totalAmount: true },
    _count: true
  });

  // 上月销售额
  const lastMonthSales = await prisma.order.aggregate({
    where: {
      status: { in: ['completed', 'pending_pickup'] },
      createdAt: { gte: lastMonthStart, lte: lastMonthEnd }
    },
    _sum: { totalAmount: true },
    _count: true
  });

  // 本月订单总量
  const monthOrders = monthSales._count || 0;
  const lastMonthOrders = lastMonthSales._count || 0;

  // 计算平均客单价
  const monthAmount = monthSales._sum.totalAmount || new Prisma.Decimal(0);
  const avgOrderAmount = monthOrders > 0
    ? monthAmount.div(monthOrders)
    : new Prisma.Decimal(0);

  const lastMonthAmount = lastMonthSales._sum.totalAmount || new Prisma.Decimal(0);
  const lastAvgOrderAmount = lastMonthOrders > 0
    ? lastMonthAmount.div(lastMonthOrders)
    : new Prisma.Decimal(0);

  // 计算退货率（取消订单/总订单）
  const monthCancelled = await prisma.order.count({
    where: {
      status: 'cancelled',
      createdAt: { gte: monthStart, lte: monthEnd }
    }
  });

  const monthTotal = await prisma.order.count({
    where: {
      createdAt: { gte: monthStart, lte: monthEnd }
    }
  });

  const returnRate = monthTotal > 0 ? (monthCancelled / monthTotal * 100) : 0;

  // 计算同比增长
  const salesGrowth = lastMonthAmount.gt(0)
    ? monthAmount.sub(lastMonthAmount).div(lastMonthAmount).mul(100).toNumber()
    : 0;

  const ordersGrowth = lastMonthOrders > 0
    ? ((monthOrders - lastMonthOrders) / lastMonthOrders * 100)
    : 0;

  const avgGrowth = lastAvgOrderAmount.gt(0)
    ? avgOrderAmount.sub(lastAvgOrderAmount).div(lastAvgOrderAmount).mul(100).toNumber()
    : 0;

  return {
    monthSalesAmount: monthAmount,
    monthOrderCount: monthOrders,
    avgOrderAmount,
    returnRate: Number(returnRate.toFixed(1)),
    salesGrowth: Number(salesGrowth.toFixed(1)),
    ordersGrowth: Number(ordersGrowth.toFixed(1)),
    avgGrowth: Number(avgGrowth.toFixed(1))
  };
}

// 获取销售趋势数据（近30天）- 基于Reservation表已完成的预约
export async function getSalesTrend(days: number = 30) {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);
  startDate.setHours(0, 0, 0, 0);

  // 改为从Reservation表查询已完成的预约
  const reservations = await prisma.reservation.findMany({
    where: {
      status: 3, // 已完成
      completedAt: { gte: startDate, lte: endDate }
    },
    select: {
      totalAmount: true,
      completedAt: true
    }
  });

  // 格式化日期为本地时间 YYYY-MM-DD
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 按日期分组
  const dailyData: { [key: string]: { amount: number; count: number } } = {};

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const key = formatDate(date);
    dailyData[key] = { amount: 0, count: 0 };
  }

  reservations.forEach(r => {
    if (r.completedAt) {
      const key = formatDate(new Date(r.completedAt));
      if (dailyData[key]) {
        dailyData[key].amount += Number(r.totalAmount);
        dailyData[key].count += 1;
      }
    }
  });

  return Object.entries(dailyData).map(([date, data]) => ({
    date,
    amount: data.amount,
    count: data.count
  }));
}

// 获取热销品类占比
export async function getCategorySales(startDate?: string, endDate?: string) {
  const where: Prisma.OrderWhereInput = {
    status: { in: ['completed', 'pending_pickup'] }
  };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      where.createdAt.lt = end;
    }
  }

  // 获取订单商品及分类信息
  const orderItems = await prisma.orderItem.findMany({
    where: { order: where },
    include: {
      product: {
        include: { category: true }
      }
    }
  });

  // 按分类汇总
  const categoryMap: { [key: string]: { name: string; amount: number } } = {};
  let totalAmount = 0;

  orderItems.forEach(item => {
    const categoryName = item.product.category?.name || '其他';
    const amount = Number(item.price) * item.quantity;
    totalAmount += amount;

    if (!categoryMap[categoryName]) {
      categoryMap[categoryName] = { name: categoryName, amount: 0 };
    }
    categoryMap[categoryName].amount += amount;
  });

  // 计算占比并排序
  const categories = Object.values(categoryMap)
    .map(cat => ({
      name: cat.name,
      amount: cat.amount,
      percentage: totalAmount > 0 ? Number((cat.amount / totalAmount * 100).toFixed(1)) : 0
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return categories;
}

// 获取销售明细列表
export async function getSalesDetail(params: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  categoryId?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
}) {
  const { page = 1, pageSize = 10, keyword, categoryId, status, startDate, endDate } = params;

  const where: Prisma.OrderItemWhereInput = {};

  if (keyword) {
    where.OR = [
      { productName: { contains: keyword } },
      { order: { orderNo: { contains: keyword } } }
    ];
  }

  if (categoryId) {
    where.product = { categoryId };
  }

  if (status && status !== 'all') {
    where.order = { ...where.order as any, status };
  }

  if (startDate || endDate) {
    where.order = where.order || {};
    (where.order as any).createdAt = {};
    if (startDate) {
      (where.order as any).createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      (where.order as any).createdAt.lt = end;
    }
  }

  const [list, total] = await Promise.all([
    prisma.orderItem.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNo: true,
            status: true,
            createdAt: true
          }
        },
        product: {
          include: {
            category: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { order: { createdAt: 'desc' } },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.orderItem.count({ where })
  ]);

  return {
    list: list.map(item => ({
      id: item.id,
      date: item.order.createdAt,
      productName: item.productName,
      category: item.product.category?.name || '未分类',
      quantity: item.quantity,
      price: item.price,
      totalAmount: Number(item.price) * item.quantity,
      status: item.order.status,
      orderNo: item.order.orderNo
    })),
    total,
    page,
    pageSize
  };
}

// 获取库存报表统计
export async function getStockStatistics() {
  // 总库存数量
  const stockSum = await prisma.product.aggregate({
    where: { status: 'ACTIVE' },
    _sum: { stock: true }
  });

  // 库存预警数量（使用原生SQL查询，因为需要比较两个字段）
  const warningResult = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM products
    WHERE status = 'ACTIVE' AND stock <= minStock AND stock > 0
  ` as any[];
  const warningCount = Number(warningResult[0]?.count || 0);

  // 缺货数量
  const outOfStockCount = await prisma.product.count({
    where: {
      status: 'ACTIVE',
      stock: { lte: 0 }
    }
  });

  // 库存金额（库存 * 成本价）
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    select: { stock: true, costPrice: true }
  });

  let stockValue = 0;
  products.forEach(p => {
    if (p.costPrice) {
      stockValue += p.stock * Number(p.costPrice);
    }
  });

  return {
    totalStock: stockSum._sum.stock || 0,
    warningCount,
    outOfStockCount,
    stockValue
  };
}

// 获取财务报表统计
export async function getFinanceStatistics(startDate?: string, endDate?: string) {
  const where: any = {};

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      where.createdAt.lt = end;
    }
  }

  // 总收入（充值总额）
  const rechargeSum = await prisma.rechargeRequest.aggregate({
    where: { ...where, status: 'APPROVED' },
    _sum: { amount: true }
  });

  // 总支出（提现总额）
  const withdrawalSum = await prisma.withdrawal.aggregate({
    where: { ...where, status: { in: ['APPROVED', 'COMPLETED'] } },
    _sum: { amount: true }
  });

  // 订单总额
  const orderSum = await prisma.order.aggregate({
    where: { ...where, status: { in: ['completed', 'pending_pickup'] } },
    _sum: { totalAmount: true }
  });

  // 分润总额
  const commissionSum = await prisma.commission.aggregate({
    where: { ...where, status: { in: ['PENDING', 'SETTLED'] } },
    _sum: { amount: true }
  });

  return {
    totalRecharge: rechargeSum._sum.amount || 0,
    totalWithdrawal: withdrawalSum._sum.amount || 0,
    totalOrderAmount: orderSum._sum.totalAmount || 0,
    totalCommission: commissionSum._sum.amount || 0
  };
}

// 获取控制台首页数据（基于预约模式）
export async function getDashboardData() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // ========== 销售额统计（基于已完成预约） ==========
  // 今日销售额
  const todaySales = await prisma.reservation.aggregate({
    where: {
      status: 3, // 已完成
      completedAt: { gte: today, lt: tomorrow }
    },
    _sum: { totalAmount: true }
  });

  // 昨日销售额
  const yesterdaySales = await prisma.reservation.aggregate({
    where: {
      status: 3,
      completedAt: { gte: yesterday, lt: today }
    },
    _sum: { totalAmount: true }
  });

  // ========== 总代理利润统计 ==========
  // 今日总代利润
  const todayProfit = await prisma.reservation.aggregate({
    where: {
      status: 3,
      completedAt: { gte: today, lt: tomorrow }
    },
    _sum: { masterProfit: true }
  });

  // 昨日总代利润（用于环比）
  const yesterdayProfit = await prisma.reservation.aggregate({
    where: {
      status: 3,
      completedAt: { gte: yesterday, lt: today }
    },
    _sum: { masterProfit: true }
  });

  // 本月总代利润
  const monthProfit = await prisma.reservation.aggregate({
    where: {
      status: 3,
      completedAt: { gte: monthStart }
    },
    _sum: { masterProfit: true }
  });

  // 上月总代利润（用于同比）
  const lastMonthProfit = await prisma.reservation.aggregate({
    where: {
      status: 3,
      completedAt: { gte: lastMonthStart, lte: lastMonthEnd }
    },
    _sum: { masterProfit: true }
  });

  // ========== 预约量统计 ==========
  // 本月预约量
  const monthReservations = await prisma.reservation.count({
    where: { createdAt: { gte: monthStart } }
  });

  // 上月预约量
  const lastMonthReservations = await prisma.reservation.count({
    where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } }
  });

  // ========== 库存预警 ==========
  const warningCount = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM products
    WHERE status = 'ACTIVE' AND stock > 0 AND (stock <= 10 OR (minStock > 0 AND stock <= minStock))
  ` as any[];

  const outOfStockCount = await prisma.product.count({
    where: {
      status: 'ACTIVE',
      stock: { lte: 0 }
    }
  });

  // ========== 推销员统计 ==========
  const newAgents = await prisma.agent.count({
    where: { createdAt: { gte: monthStart } }
  });

  const lastMonthNewAgents = await prisma.agent.count({
    where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } }
  });

  // ========== 客服角色专属统计 ==========
  // 待确认预约数（状态0=待确认 + 状态1=确认中）
  const pendingConfirm = await prisma.reservation.count({
    where: { status: { in: [0, 1] } }
  });

  // 今日已确认数（状态2=已确认，今日确认的）
  const todayConfirmed = await prisma.reservation.count({
    where: {
      status: { in: [2, 7, 8, 9, 3] }, // 已确认及后续状态
      confirmedAt: { gte: today, lt: tomorrow }
    }
  });

  // ========== 计算增长率 ==========
  const todayAmount = Number(todaySales._sum.totalAmount || 0);
  const yesterdayAmount = Number(yesterdaySales._sum.totalAmount || 0);
  const salesGrowth = yesterdayAmount > 0
    ? ((todayAmount - yesterdayAmount) / yesterdayAmount * 100).toFixed(1)
    : '0';

  const reservationsGrowth = lastMonthReservations > 0
    ? ((monthReservations - lastMonthReservations) / lastMonthReservations * 100).toFixed(1)
    : '0';

  const agentsGrowth = lastMonthNewAgents > 0
    ? ((newAgents - lastMonthNewAgents) / lastMonthNewAgents * 100).toFixed(1)
    : '0';

  // 利润增长率
  const todayMasterProfit = Number(todayProfit._sum.masterProfit || 0);
  const yesterdayMasterProfit = Number(yesterdayProfit._sum.masterProfit || 0);
  const monthMasterProfit = Number(monthProfit._sum.masterProfit || 0);
  const lastMonthMasterProfit = Number(lastMonthProfit._sum.masterProfit || 0);

  const profitDayGrowth = yesterdayMasterProfit > 0
    ? ((todayMasterProfit - yesterdayMasterProfit) / yesterdayMasterProfit * 100).toFixed(1)
    : '0';

  const profitMonthGrowth = lastMonthMasterProfit > 0
    ? ((monthMasterProfit - lastMonthMasterProfit) / lastMonthMasterProfit * 100).toFixed(1)
    : '0';

  return {
    // 销售相关
    todaySales: todayAmount,
    salesGrowth: Number(salesGrowth),
    monthReservations,
    reservationsGrowth: Number(reservationsGrowth),
    // 库存相关
    warningCount: Number(warningCount[0]?.count || 0),
    outOfStockCount,
    // 推销员相关
    newAgents,
    agentsGrowth: Number(agentsGrowth),
    // 【新增】总代理利润统计
    todayMasterProfit,
    profitDayGrowth: Number(profitDayGrowth),
    monthMasterProfit,
    profitMonthGrowth: Number(profitMonthGrowth),
    // 【2026-01-24新增】客服角色专属统计
    pendingConfirm,
    todayConfirmed,
  };
}

// 获取热销商品排行 - 基于ReservationItem表已完成的预约
export async function getHotProducts(limit: number = 5) {
  // 从ReservationItem聚合，基于已完成的预约
  const items = await prisma.reservationItem.findMany({
    where: {
      reservation: { status: 3 } // 已完成的预约
    },
    select: {
      productId: true,
      productName: true,
      price: true,
      quantity: true
    }
  });

  // 按商品汇总销售额
  const productMap: { [key: number]: { name: string; quantity: number; amount: number } } = {};
  items.forEach(item => {
    if (!productMap[item.productId]) {
      productMap[item.productId] = { name: item.productName, quantity: 0, amount: 0 };
    }
    productMap[item.productId].quantity += item.quantity;
    productMap[item.productId].amount += Number(item.price) * item.quantity;
  });

  // 排序并返回TOP N
  return Object.entries(productMap)
    .map(([id, data]) => ({
      id: parseInt(id),
      name: data.name,
      salesCount: data.quantity,
      salesAmount: data.amount
    }))
    .sort((a, b) => b.salesAmount - a.salesAmount)
    .slice(0, limit);
}

// 获取最新预约（排除无效状态的预约）- 查询Reservation表
export async function getRecentOrders(limit: number = 5) {
  const reservations = await prisma.reservation.findMany({
    where: {
      // 排除已取消(4)、已过期(5)、确认失败(6)
      status: { notIn: [4, 5, 6] }
    },
    // 优先显示待处理的预约（按状态升序+时间降序）
    orderBy: [
      { status: 'asc' },
      { createdAt: 'desc' }
    ],
    take: limit,
    include: {
      items: {
        take: 3,
        select: {
          productName: true,
          quantity: true
        }
      }
    }
  });

  // 获取推销员信息
  const salespersonIds = reservations
    .filter(r => r.salespersonId != null)
    .map(r => r.salespersonId as number);

  const salespersons = salespersonIds.length > 0
    ? await prisma.agent.findMany({
        where: { id: { in: salespersonIds } },
        select: { id: true, name: true }
      })
    : [];

  const salespersonMap = new Map(salespersons.map(s => [s.id, s]));

  // 转换为前端期望的格式
  return reservations.map(r => {
    const salesperson = r.salespersonId ? salespersonMap.get(r.salespersonId) : null;
    return {
      id: r.id,
      orderNo: r.reservationNo,
      status: r.status,
      totalAmount: Number(r.totalAmount),
      createdAt: r.createdAt,
      // 预约模式无移库功能，统一返回false
      needTransfer: false,
      agent: salesperson ? {
        id: salesperson.id,
        name: salesperson.name,
      } : null,
      items: r.items.map((item: { productName: string; quantity: number }) => ({
        productName: item.productName,
        quantity: item.quantity
      }))
    };
  });
}

// ============ 预约报表（基于Reservation表）============

/**
 * 获取预约统计 - 今日/周/月预约数、完成率、增长率
 */
export async function getReservationStatistics(startDate?: string, endDate?: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 昨日
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // 本周起始（周一）
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));

  // 上周起始
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(weekStart);

  // 本月起始
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  // 上月起始
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // 日期筛选
  const dateWhere: Prisma.ReservationWhereInput = {};
  if (startDate || endDate) {
    dateWhere.createdAt = {};
    if (startDate) dateWhere.createdAt.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      dateWhere.createdAt.lt = end;
    }
  }

  // 今日预约数
  const todayCount = await prisma.reservation.count({
    where: { createdAt: { gte: today, lt: tomorrow } }
  });

  // 昨日预约数（用于计算日增长率）
  const yesterdayCount = await prisma.reservation.count({
    where: { createdAt: { gte: yesterday, lt: today } }
  });

  // 本周预约数
  const weekCount = await prisma.reservation.count({
    where: { createdAt: { gte: weekStart } }
  });

  // 上周预约数（用于计算周增长率）
  const lastWeekCount = await prisma.reservation.count({
    where: { createdAt: { gte: lastWeekStart, lt: lastWeekEnd } }
  });

  // 本月预约数
  const monthCount = await prisma.reservation.count({
    where: { createdAt: { gte: monthStart } }
  });

  // 上月预约数（用于计算月增长率）
  const lastMonthCount = await prisma.reservation.count({
    where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } }
  });

  // 筛选范围内的统计
  const totalCount = await prisma.reservation.count({ where: dateWhere });
  const completedCount = await prisma.reservation.count({
    where: { ...dateWhere, status: 3 }
  });
  const cancelledCount = await prisma.reservation.count({
    where: { ...dateWhere, status: { in: [4, 5, 6] } }
  });
  const pendingCount = await prisma.reservation.count({
    where: { ...dateWhere, status: { in: [0, 1, 2, 7, 8, 9] } }
  });

  // 完成率
  const completionRate = totalCount > 0 ? Math.round(completedCount / totalCount * 100) : 0;
  // 取消率
  const cancelRate = totalCount > 0 ? Math.round(cancelledCount / totalCount * 100) : 0;

  // 销售额
  const salesResult = await prisma.reservation.aggregate({
    where: { ...dateWhere, status: 3 },
    _sum: { totalAmount: true }
  });

  // 计算增长率
  const todayGrowth = yesterdayCount > 0
    ? Number(((todayCount - yesterdayCount) / yesterdayCount * 100).toFixed(1))
    : 0;
  const weekGrowth = lastWeekCount > 0
    ? Number(((weekCount - lastWeekCount) / lastWeekCount * 100).toFixed(1))
    : 0;
  const monthGrowth = lastMonthCount > 0
    ? Number(((monthCount - lastMonthCount) / lastMonthCount * 100).toFixed(1))
    : 0;

  return {
    todayCount,
    weekCount,
    monthCount,
    todayGrowth,
    weekGrowth,
    monthGrowth,
    totalCount,
    completedCount,
    cancelledCount,
    pendingCount,
    completionRate,
    cancelRate,
    totalSales: Number(salesResult._sum.totalAmount || 0)
  };
}

/**
 * 获取预约趋势 - 近N天的预约数据
 */
export async function getReservationTrend(days: number = 30) {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);
  startDate.setHours(0, 0, 0, 0);

  const reservations = await prisma.reservation.findMany({
    where: { createdAt: { gte: startDate, lte: endDate } },
    select: { createdAt: true, totalAmount: true, status: true }
  });

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const dailyData: { [key: string]: { count: number; amount: number; completed: number } } = {};
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dailyData[formatDate(date)] = { count: 0, amount: 0, completed: 0 };
  }

  reservations.forEach(r => {
    const key = formatDate(new Date(r.createdAt));
    if (dailyData[key]) {
      dailyData[key].count += 1;
      dailyData[key].amount += Number(r.totalAmount || 0);
      if (r.status === 3) dailyData[key].completed += 1;
    }
  });

  return Object.entries(dailyData).map(([date, data]) => ({
    date,
    count: data.count,
    amount: data.amount,
    completed: data.completed
  }));
}

/**
 * 获取预约状态分布
 */
export async function getReservationStatusDistribution() {
  const statusCounts = await prisma.reservation.groupBy({
    by: ['status'],
    _count: true
  });

  return statusCounts.map(item => ({
    status: item.status,
    count: item._count
  }));
}

// ============ 销售报表（基于Reservation表）============

/**
 * 获取销售统计 - 月销售额、订单数、取消率
 */
export async function getReservationSalesStatistics(startDate?: string, endDate?: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  // 本月销售额（已完成）
  const monthSales = await prisma.reservation.aggregate({
    where: { status: 3, completedAt: { gte: monthStart, lte: monthEnd } },
    _sum: { totalAmount: true },
    _count: true
  });

  // 上月销售额
  const lastMonthSales = await prisma.reservation.aggregate({
    where: { status: 3, completedAt: { gte: lastMonthStart, lte: lastMonthEnd } },
    _sum: { totalAmount: true },
    _count: true
  });

  // 本月取消数
  const monthCancelled = await prisma.reservation.count({
    where: { status: { in: [4, 5, 6] }, createdAt: { gte: monthStart, lte: monthEnd } }
  });

  // 本月总预约数
  const monthTotal = await prisma.reservation.count({
    where: { createdAt: { gte: monthStart, lte: monthEnd } }
  });

  const monthAmount = Number(monthSales._sum.totalAmount || 0);
  const lastMonthAmount = Number(lastMonthSales._sum.totalAmount || 0);
  const monthOrders = monthSales._count || 0;
  const lastMonthOrders = lastMonthSales._count || 0;

  // 平均客单价
  const avgOrderAmount = monthOrders > 0 ? monthAmount / monthOrders : 0;
  const lastAvgOrderAmount = lastMonthOrders > 0 ? lastMonthAmount / lastMonthOrders : 0;

  // 取消率
  const cancelRate = monthTotal > 0 ? (monthCancelled / monthTotal * 100) : 0;

  // 增长率
  const salesGrowth = lastMonthAmount > 0 ? ((monthAmount - lastMonthAmount) / lastMonthAmount * 100) : 0;
  const ordersGrowth = lastMonthOrders > 0 ? ((monthOrders - lastMonthOrders) / lastMonthOrders * 100) : 0;
  const avgGrowth = lastAvgOrderAmount > 0 ? ((avgOrderAmount - lastAvgOrderAmount) / lastAvgOrderAmount * 100) : 0;

  return {
    monthSalesAmount: monthAmount,
    monthOrderCount: monthOrders,
    avgOrderAmount: Number(avgOrderAmount.toFixed(2)),
    cancelRate: Number(cancelRate.toFixed(1)),
    salesGrowth: Number(salesGrowth.toFixed(1)),
    ordersGrowth: Number(ordersGrowth.toFixed(1)),
    avgGrowth: Number(avgGrowth.toFixed(1))
  };
}

/**
 * 获取销售趋势 - 基于Reservation的近N天趋势
 */
export async function getReservationSalesTrend(days: number = 30) {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);
  startDate.setHours(0, 0, 0, 0);

  const reservations = await prisma.reservation.findMany({
    where: { status: 3, completedAt: { gte: startDate, lte: endDate } },
    select: { totalAmount: true, completedAt: true }
  });

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const dailyData: { [key: string]: { amount: number; count: number } } = {};
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dailyData[formatDate(date)] = { amount: 0, count: 0 };
  }

  reservations.forEach(r => {
    if (r.completedAt) {
      const key = formatDate(new Date(r.completedAt));
      if (dailyData[key]) {
        dailyData[key].amount += Number(r.totalAmount || 0);
        dailyData[key].count += 1;
      }
    }
  });

  return Object.entries(dailyData).map(([date, data]) => ({
    date,
    amount: data.amount,
    count: data.count
  }));
}

/**
 * 获取商品销售排行
 */
export async function getProductSalesRanking(limit: number = 10, startDate?: string, endDate?: string) {
  const where: Prisma.ReservationWhereInput = { status: 3 };
  if (startDate || endDate) {
    where.completedAt = {};
    if (startDate) where.completedAt.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      where.completedAt.lt = end;
    }
  }

  // 获取已完成预约的商品
  const items = await prisma.reservationItem.findMany({
    where: { reservation: where },
    select: {
      productId: true,
      productName: true,
      price: true,
      quantity: true
    }
  });

  // 按商品汇总
  const productMap: { [key: number]: { name: string; quantity: number; amount: number } } = {};
  items.forEach(item => {
    if (!productMap[item.productId]) {
      productMap[item.productId] = { name: item.productName, quantity: 0, amount: 0 };
    }
    productMap[item.productId].quantity += item.quantity;
    productMap[item.productId].amount += Number(item.price) * item.quantity;
  });

  // 排序并返回TOP N
  return Object.entries(productMap)
    .map(([id, data]) => ({
      productId: parseInt(id),
      productName: data.name,
      salesQuantity: data.quantity,
      salesAmount: Number(data.amount.toFixed(2))
    }))
    .sort((a, b) => b.salesAmount - a.salesAmount)
    .slice(0, limit);
}

/**
 * 获取推销员业绩排行 - 包含分润数据
 */
export async function getAgentSalesRanking(limit: number = 10, startDate?: string, endDate?: string) {
  const where: Prisma.ReservationWhereInput = { status: 3, salespersonId: { not: null } };
  if (startDate || endDate) {
    where.completedAt = {};
    if (startDate) where.completedAt.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      where.completedAt.lt = end;
    }
  }

  // 按推销员分组聚合，同时聚合销售额和分润
  const salesByAgent = await prisma.reservation.groupBy({
    by: ['salespersonId'],
    where,
    _sum: {
      totalAmount: true,
      level1Profit: true,
      level2Profit: true
    },
    _count: true
  });

  // 获取推销员信息
  const agentIds = salesByAgent.map(s => s.salespersonId).filter(Boolean) as number[];
  const agents = agentIds.length > 0 ? await prisma.agent.findMany({
    where: { id: { in: agentIds } },
    select: { id: true, name: true, phone: true, type: true }
  }) : [];
  const agentMap = new Map(agents.map(a => [a.id, a]));

  return salesByAgent
    .filter(s => s.salespersonId)
    .map(s => {
      const agent = agentMap.get(s.salespersonId!);
      // 根据推销员类型确定分润金额
      const commission = agent?.type === 'LEVEL1'
        ? Number(s._sum.level1Profit || 0)
        : Number(s._sum.level2Profit || 0);

      return {
        agentId: s.salespersonId,
        agentName: agent?.name || '未知',
        agentPhone: agent?.phone || '',
        agentType: agent?.type || '',
        orderCount: s._count,
        salesAmount: Number(s._sum.totalAmount || 0),
        totalAmount: Number(s._sum.totalAmount || 0),  // 前端兼容字段
        commission: commission  // 新增分润字段
      };
    })
    .sort((a, b) => b.salesAmount - a.salesAmount)
    .slice(0, limit);
}

// ============ 客户报表 ============

/**
 * 获取客户统计 - 包含增长率
 */
export async function getCustomerStatistics() {
  // 总客户数（有预约记录的客户）
  const totalCustomers = await prisma.customerRecord.count();

  // 本月新增（本月首次预约的客户）
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const newCustomers = await prisma.customerRecord.count({
    where: { createdAt: { gte: monthStart } }
  });

  // 上月新增（用于计算增长率）
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const lastMonthNewCustomers = await prisma.customerRecord.count({
    where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } }
  });

  // 计算新增客户增长率
  const newGrowth = lastMonthNewCustomers > 0
    ? Number(((newCustomers - lastMonthNewCustomers) / lastMonthNewCustomers * 100).toFixed(1))
    : 0;

  // 高风险客户
  const highRiskCustomers = await prisma.customerRecord.count({
    where: { riskLevel: { gte: 2 } }
  });

  // 黑名单客户
  const blockedCustomers = await prisma.customerRecord.count({
    where: { isBlocked: true }
  });

  // 正常客户
  const normalCustomers = await prisma.customerRecord.count({
    where: { riskLevel: 0, isBlocked: false }
  });

  return {
    totalCustomers,
    totalCount: totalCustomers,  // 前端兼容字段
    newCustomers,
    monthNewCount: newCustomers,  // 前端兼容字段
    newGrowth,
    highRiskCustomers,
    highRiskCount: highRiskCustomers,  // 前端兼容字段
    blockedCustomers,
    blockedCount: blockedCustomers,  // 前端兼容字段
    normalCustomers
  };
}

/**
 * 获取客户增长趋势
 */
export async function getCustomerTrend(days: number = 30) {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);
  startDate.setHours(0, 0, 0, 0);

  const customers = await prisma.customerRecord.findMany({
    where: { createdAt: { gte: startDate, lte: endDate } },
    select: { createdAt: true }
  });

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const dailyData: { [key: string]: number } = {};
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dailyData[formatDate(date)] = 0;
  }

  customers.forEach(c => {
    const key = formatDate(new Date(c.createdAt));
    if (dailyData[key] !== undefined) {
      dailyData[key] += 1;
    }
  });

  // 累计计算
  let cumulative = await prisma.customerRecord.count({
    where: { createdAt: { lt: startDate } }
  });

  return Object.entries(dailyData).map(([date, newCount]) => {
    cumulative += newCount;
    return { date, newCount, cumulative };
  });
}

/**
 * 获取客户风险等级分布
 */
export async function getCustomerRiskDistribution() {
  const distribution = await prisma.customerRecord.groupBy({
    by: ['riskLevel'],
    _count: true
  });

  return distribution.map(item => ({
    level: item.riskLevel,
    count: item._count
  }));
}

// ============ 分润报表（基于Reservation表）============

/**
 * 获取分润统计 - 基于已完成的预约单
 * 返回总代利润、一级分润、二级分润及占比
 */
export async function getCommissionStatistics(startDate?: string, endDate?: string) {
  const where: Prisma.ReservationWhereInput = {
    status: 3  // 已完成的预约
  };

  if (startDate || endDate) {
    where.completedAt = {};
    if (startDate) {
      where.completedAt.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      where.completedAt.lt = end;
    }
  }

  // 聚合所有利润字段
  const result = await prisma.reservation.aggregate({
    where,
    _sum: {
      masterProfit: true,
      level1Profit: true,
      level2Profit: true,
      totalAmount: true,
    },
    _count: true,
  });

  const masterProfit = Number(result._sum.masterProfit || 0);
  const level1Profit = Number(result._sum.level1Profit || 0);
  const level2Profit = Number(result._sum.level2Profit || 0);
  // 【2026-01-27修复】区分销售总额和利润总额
  const salesAmount = Number(result._sum.totalAmount || 0); // 实际销售总额
  const totalProfit = masterProfit + level1Profit + level2Profit; // 利润总和

  // 【2026-01-27修复】计算占比 - 相对于利润总和的分配比例
  const masterPercent = totalProfit > 0 ? Math.round(masterProfit / totalProfit * 100) : 0;
  const level1Percent = totalProfit > 0 ? Math.round(level1Profit / totalProfit * 100) : 0;
  const level2Percent = totalProfit > 0 ? Math.round(level2Profit / totalProfit * 100) : 0;

  // 【2026-01-27修复】利润率 = 总利润 / 销售额
  const profitRate = salesAmount > 0 ? Number((totalProfit / salesAmount * 100).toFixed(1)) : 0;

  return {
    totalAmount: totalProfit, // 保持向后兼容，返回利润总额
    salesAmount, // 【2026-01-27新增】实际销售总额
    totalProfit, // 【2026-01-27新增】利润总额（与totalAmount相同）
    profitRate, // 【2026-01-27新增】利润率
    masterProfit,
    level1Profit,
    level2Profit,
    masterPercent,
    level1Percent,
    level2Percent,
    reservationCount: result._count,
  };
}

/**
 * 获取分润趋势 - 近N天的利润数据
 */
export async function getCommissionTrend(days: number = 30) {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);
  startDate.setHours(0, 0, 0, 0);

  // 获取日期范围内所有已完成的预约
  const reservations = await prisma.reservation.findMany({
    where: {
      status: 3,
      completedAt: { gte: startDate, lte: endDate }
    },
    select: {
      masterProfit: true,
      level1Profit: true,
      level2Profit: true,
      completedAt: true,
    }
  });

  // 格式化日期
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 初始化每日数据
  const dailyData: { [key: string]: { masterProfit: number; level1Profit: number; level2Profit: number; count: number } } = {};

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const key = formatDate(date);
    dailyData[key] = { masterProfit: 0, level1Profit: 0, level2Profit: 0, count: 0 };
  }

  // 按日期汇总
  reservations.forEach(r => {
    if (r.completedAt) {
      const key = formatDate(new Date(r.completedAt));
      if (dailyData[key]) {
        dailyData[key].masterProfit += Number(r.masterProfit || 0);
        dailyData[key].level1Profit += Number(r.level1Profit || 0);
        dailyData[key].level2Profit += Number(r.level2Profit || 0);
        dailyData[key].count += 1;
      }
    }
  });

  return Object.entries(dailyData).map(([date, data]) => {
    const total = data.masterProfit + data.level1Profit + data.level2Profit;
    return {
      date,
      masterProfit: data.masterProfit,
      level1Profit: data.level1Profit,
      level2Profit: data.level2Profit,
      total,
      amount: total,  // 前端兼容字段
      count: data.count,
    };
  });
}

/**
 * 获取分润明细列表 - 按预约列出
 */
export async function getCommissionList(params: {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
}) {
  const { page = 1, pageSize = 10, startDate, endDate } = params;

  const where: Prisma.ReservationWhereInput = {
    status: 3,  // 已完成
    OR: [
      { masterProfit: { gt: 0 } },
      { level1Profit: { gt: 0 } },
      { level2Profit: { gt: 0 } },
    ]
  };

  if (startDate || endDate) {
    where.completedAt = {};
    if (startDate) {
      where.completedAt.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      where.completedAt.lt = end;
    }
  }

  const [reservations, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      orderBy: { completedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.reservation.count({ where }),
  ]);

  // 获取相关推销员信息
  const salespersonIds = [...new Set(reservations.map(r => r.salespersonId).filter(Boolean))] as number[];
  const agents = salespersonIds.length > 0 ? await prisma.agent.findMany({
    where: { id: { in: salespersonIds } },
    select: { id: true, name: true, phone: true, type: true },
  }) : [];
  const agentMap = new Map(agents.map(a => [a.id, a]));

  return {
    list: reservations.map(r => ({
      id: r.id,
      reservationNo: r.reservationNo,
      customerName: r.customerName,
      totalAmount: Number(r.totalAmount),
      masterProfit: Number(r.masterProfit),
      level1Profit: Number(r.level1Profit),
      level2Profit: Number(r.level2Profit),
      totalProfit: Number(r.masterProfit) + Number(r.level1Profit) + Number(r.level2Profit),
      completedAt: r.completedAt,
      salesperson: r.salespersonId ? agentMap.get(r.salespersonId) || null : null,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

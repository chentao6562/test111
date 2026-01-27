/**
 * 分润规则服务
 * 处理分润规则的增删改查
 */
import prisma from '../../utils/prisma';

/**
 * 获取分润规则列表
 */
export async function getRules() {
  const rules = await prisma.commissionRule.findMany({
    orderBy: { minAmount: 'asc' },
  });

  return rules.map(rule => ({
    id: rule.id,
    minAmount: Number(rule.minAmount),
    level1Rate: Number(rule.level1Rate),
    level2Rate: Number(rule.level2Rate),
    status: rule.status,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  }));
}

/**
 * 创建分润规则
 */
export async function createRule(data: {
  minAmount: number;
  level1Rate: number;
  level2Rate: number;
}) {
  // 验证比例范围
  if (data.level1Rate < 0 || data.level1Rate > 100) {
    throw new Error('一级分润比例必须在0-100之间');
  }
  if (data.level2Rate < 0 || data.level2Rate > 100) {
    throw new Error('二级分润比例必须在0-100之间');
  }

  return prisma.commissionRule.create({
    data: {
      minAmount: data.minAmount,
      level1Rate: data.level1Rate,
      level2Rate: data.level2Rate,
      status: 'ACTIVE',
    },
  });
}

/**
 * 更新分润规则
 */
export async function updateRule(id: number, data: {
  minAmount?: number;
  level1Rate?: number;
  level2Rate?: number;
  status?: string;
}) {
  if (data.level1Rate !== undefined && (data.level1Rate < 0 || data.level1Rate > 100)) {
    throw new Error('一级分润比例必须在0-100之间');
  }
  if (data.level2Rate !== undefined && (data.level2Rate < 0 || data.level2Rate > 100)) {
    throw new Error('二级分润比例必须在0-100之间');
  }

  return prisma.commissionRule.update({
    where: { id },
    data,
  });
}

/**
 * 删除分润规则
 */
export async function deleteRule(id: number) {
  return prisma.commissionRule.delete({
    where: { id },
  });
}

/**
 * 管理后台：获取分润记录列表
 * 【2026-01-17】改为查询FundFlow表中的PROFIT类型记录
 */
export async function getAdminCommissionRecords(params: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  type?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}) {
  const { page = 1, pageSize = 20, keyword, startDate, endDate } = params;

  const where: any = {
    type: 'PROFIT', // 只查询利润类型的资金流水
  };

  // 关键词搜索（推销员姓名、手机号）
  if (keyword && keyword.trim()) {
    where.agent = {
      OR: [
        { name: { contains: keyword.trim() } },
        { phone: { contains: keyword.trim() } },
      ],
    };
  }

  // 日期范围
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

  const total = await prisma.fundFlow.count({ where });

  const list = await prisma.fundFlow.findMany({
    where,
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          phone: true,
          type: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  // 获取关联的预约信息
  const relatedIds = list
    .filter(item => item.relatedType === 'RESERVATION' && item.relatedId)
    .map(item => item.relatedId as number);

  const reservations = relatedIds.length > 0
    ? await prisma.reservation.findMany({
        where: { id: { in: relatedIds } },
        select: {
          id: true,
          reservationNo: true,
          totalAmount: true,
        },
      })
    : [];

  const reservationMap = new Map(reservations.map(r => [r.id, r]));

  return {
    list: list.map(item => {
      const reservation = item.relatedType === 'RESERVATION' && item.relatedId
        ? reservationMap.get(item.relatedId)
        : null;

      const amount = Number(item.amount);
      const orderAmount = reservation ? Number(reservation.totalAmount) : 0;
      // 【2026-01-20 修复】计算实际分润比例 = 利润金额 / 订单金额 * 100
      const rate = orderAmount > 0 ? Math.round((amount / orderAmount) * 10000) / 100 : 0;

      return {
        id: item.id,
        agentId: item.agentId,
        agentName: item.agent.name,
        agentPhone: item.agent.phone,
        agentType: item.agent.type,
        orderId: item.relatedId,
        orderNo: reservation?.reservationNo || '-',
        orderAmount,
        orderAgentName: '-', // 暂不显示推销员名称
        amount,
        rate, // 实际分润比例（百分比，保留2位小数）
        type: 'PROFIT', // 统一为利润类型
        status: 'SETTLED', // 即时结算，全部已结算
        createdAt: item.createdAt,
        settledAt: item.createdAt, // 即时结算
        remark: item.remark,
      };
    }),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 批量结算分润
 */
export async function settleCommissions(ids?: number[]) {
  const where: any = { status: 'PENDING' };
  if (ids && ids.length > 0) {
    where.id = { in: ids };
  }

  const result = await prisma.commission.updateMany({
    where,
    data: {
      status: 'SETTLED',
      settledAt: new Date(),
    },
  });

  return { settledCount: result.count };
}

/**
 * 按日期结算分润（T+1结算）
 * 结算指定日期创建的所有待结算分润
 * @param date 结算日期
 */
export async function settleCommissionsByDate(date: Date): Promise<{ count: number; amount: number }> {
  // 设置日期范围：当天0点到次日0点
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setDate(endOfDay.getDate() + 1);
  endOfDay.setHours(0, 0, 0, 0);

  return prisma.$transaction(async (tx) => {
    // 1. 查找该日期的所有待结算分润
    const pendingCommissions = await tx.commission.findMany({
      where: {
        status: 'PENDING',
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    if (pendingCommissions.length === 0) {
      console.log(`[T+1结算] ${date.toISOString().split('T')[0]} 无待结算分润`);
      return { count: 0, amount: 0 };
    }

    let totalAmount = 0;

    // 2. 逐条结算并增加代理商余额
    for (const commission of pendingCommissions) {
      const amount = Number(commission.amount);
      totalAmount += amount;

      // 获取代理商当前余额
      const agent = await tx.agent.findUnique({
        where: { id: commission.agentId },
        select: { balance: true },
      });

      const currentBalance = Number(agent?.balance || 0);

      // 增加余额
      await tx.agent.update({
        where: { id: commission.agentId },
        data: {
          balance: { increment: amount },
        },
      });

      // 创建资金流水
      await tx.fundFlow.create({
        data: {
          agentId: commission.agentId,
          type: 'COMMISSION',
          amount: amount,
          beforeBalance: currentBalance,
          afterBalance: currentBalance + amount,
          relatedId: commission.id,
          relatedType: 'COMMISSION',
          remark: `T+1分润结算（${commission.type === 'DIRECT' ? '直接分润' : '间接分润'}）`,
        },
      });

      // 更新分润状态
      await tx.commission.update({
        where: { id: commission.id },
        data: {
          status: 'SETTLED',
          settledAt: new Date(),
        },
      });
    }

    console.log(`[T+1结算] ${date.toISOString().split('T')[0]} 结算完成: ${pendingCommissions.length}条, ￥${totalAmount.toFixed(2)}`);
    return { count: pendingCommissions.length, amount: totalAmount };
  });
}

/**
 * 分润统计
 * 【2026-01-17】改为从FundFlow表统计PROFIT类型记录
 */
export async function getCommissionStatistics() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const where = { type: 'PROFIT' as const };

  const [
    totalDistributed,
    monthlyDistributed,
    totalCount,
  ] = await Promise.all([
    // 累计分润总额
    prisma.fundFlow.aggregate({
      where,
      _sum: { amount: true },
    }),
    // 本月分润
    prisma.fundFlow.aggregate({
      where: {
        ...where,
        createdAt: { gte: monthStart },
      },
      _sum: { amount: true },
    }),
    // 总记录数
    prisma.fundFlow.count({ where }),
  ]);

  const totalAmountValue = Number(totalDistributed._sum.amount || 0);

  return {
    // 兼容旧字段名
    totalDistributed: totalAmountValue,
    monthlyDistributed: Number(monthlyDistributed._sum.amount || 0),
    pendingCount: 0, // 即时结算模式无待结算
    pendingAmount: 0, // 即时结算模式无待结算
    // 新增前端需要的字段
    totalAmount: totalAmountValue,
    settledAmount: totalAmountValue, // 全部已结算
    totalCount,
    byType: {
      PROFIT: totalAmountValue, // 统一为利润类型
    },
  };
}

/**
 * 【2026-01-20 新增】获取分润记录详情
 * 返回完整的利润分配信息，包括预约详情、各层级利润、商品明细
 */
export async function getCommissionRecordDetail(recordId: number) {
  // 查询资金流水记录
  const fundFlow = await prisma.fundFlow.findUnique({
    where: { id: recordId },
    include: {
      agent: {
        select: { id: true, name: true, phone: true, type: true },
      },
    },
  });

  if (!fundFlow || fundFlow.type !== 'PROFIT') {
    return null;
  }

  // 如果关联预约，获取预约详情
  let reservationDetail = null;
  if (fundFlow.relatedType === 'RESERVATION' && fundFlow.relatedId) {
    const reservation = await prisma.reservation.findUnique({
      where: { id: fundFlow.relatedId },
      include: {
        items: true,
        store: { select: { id: true, name: true } },
      },
    });

    if (reservation) {
      // 获取推销员信息
      let salesperson = null;
      if (reservation.salespersonId) {
        salesperson = await prisma.agent.findUnique({
          where: { id: reservation.salespersonId },
          select: { id: true, name: true, phone: true, type: true },
        });
      }

      // 获取上级推销员信息
      let parentSalesperson = null;
      if (reservation.parentSalespersonId) {
        parentSalesperson = await prisma.agent.findUnique({
          where: { id: reservation.parentSalespersonId },
          select: { id: true, name: true, phone: true, type: true },
        });
      }

      reservationDetail = {
        id: reservation.id,
        reservationNo: reservation.reservationNo,
        customerName: reservation.customerName,
        customerPhone: reservation.customerPhone,
        pickupDate: reservation.pickupDate,
        totalAmount: Number(reservation.totalAmount),
        status: reservation.status,
        completedAt: reservation.completedAt,
        paymentMethod: reservation.paymentMethod,
        // 利润分配
        profitDistribution: {
          masterProfit: Number(reservation.masterProfit || 0),
          level1Profit: Number(reservation.level1Profit || 0),
          level2Profit: Number(reservation.level2Profit || 0),
          totalProfit: Number(reservation.masterProfit || 0) + Number(reservation.level1Profit || 0) + Number(reservation.level2Profit || 0),
        },
        // 推销员层级信息
        salespersonLevel: reservation.salespersonLevel,
        salesperson,
        parentSalesperson,
        // 门店信息
        store: reservation.store,
        // 赠品信息
        giftName: reservation.giftName,
        giftDelivered: reservation.giftDelivered,
        // 商品明细
        items: reservation.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          productImage: item.productImage,
          quantity: item.quantity,
          price: Number(item.price),
          subtotal: Number(item.price) * item.quantity,
          // 价格快照（用于利润计算参考）
          priceSnapshot: {
            costPrice: Number(item.snapshotCostPrice || 0),
            supplyPrice: Number(item.snapshotSupplyPrice || 0),
            level1Price: item.snapshotLevel1Price ? Number(item.snapshotLevel1Price) : null,
            retailPrice: Number(item.snapshotRetailPrice || item.price),
          },
        })),
      };
    }
  }

  const orderAmount = reservationDetail?.totalAmount || 0;
  const amount = Number(fundFlow.amount);

  return {
    id: fundFlow.id,
    type: 'PROFIT',
    amount,
    rate: orderAmount > 0 ? Math.round((amount / orderAmount) * 10000) / 100 : 0,
    status: 'SETTLED',
    createdAt: fundFlow.createdAt,
    remark: fundFlow.remark,
    // 当前推销员（获得此笔分润的人）
    agent: fundFlow.agent,
    // 关联预约详情
    reservation: reservationDetail,
  };
}

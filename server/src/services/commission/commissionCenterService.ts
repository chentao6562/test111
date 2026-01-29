/**
 * 分润中心服务
 * 处理代理商分润查询相关功能
 * 【2026-01-17 预约模式适配】改用FundFlow表读取利润记录
 */
import prisma from '../../utils/prisma';

/**
 * 获取代理商分润中心数据
 * 【2026-01-17 预约模式适配】从FundFlow表读取利润数据
 */
export async function getCommissionCenter(agentId: number) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: {
      balance: true,
      totalCommission: true,
    },
  });

  if (!agent) {
    throw new Error('代理商不存在');
  }

  // 计算本月利润（从FundFlow表读取）
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthlyProfit = await prisma.fundFlow.aggregate({
    where: {
      agentId,
      type: 'PROFIT',
      createdAt: { gte: monthStart },
    },
    _sum: { amount: true },
  });

  // 计算累计利润（从FundFlow表读取）
  const totalProfit = await prisma.fundFlow.aggregate({
    where: {
      agentId,
      type: 'PROFIT',
    },
    _sum: { amount: true },
  });

  // 预约模式下没有"待结算"概念，利润核销时即时入账
  // 但保留字段兼容前端显示

  return {
    withdrawableAmount: Number(agent.balance),
    totalIncome: Number(totalProfit._sum.amount || agent.totalCommission || 0),
    monthlyIncome: Number(monthlyProfit._sum.amount || 0),
    settlingAmount: 0, // 预约模式即时结算，无待结算金额
  };
}

/**
 * 获取分润记录列表
 * 【2026-01-17 预约模式适配】从FundFlow表读取利润记录
 */
export async function getCommissionRecords(params: {
  agentId: number;
  page?: number;
  pageSize?: number;
  type?: string; // all, PROFIT, WITHDRAWAL
  month?: string; // YYYY-MM
}) {
  const { agentId, page = 1, pageSize = 20, type, month } = params;

  const where: any = { agentId };

  // 【2026-01-19修复】类型筛选：只在明确指定类型时才过滤
  if (type && type !== 'all') {
    where.type = type;
  }
  // 移除默认 type = 'PROFIT' 限制，允许查看所有类型的资金流水

  // 月份筛选
  if (month) {
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 1);
    where.createdAt = {
      gte: startDate,
      lt: endDate,
    };
  }

  const total = await prisma.fundFlow.count({ where });

  const list = await prisma.fundFlow.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  // 获取关联的预约信息
  const reservationIds = list
    .filter(item => item.relatedType === 'RESERVATION' && item.relatedId)
    .map(item => item.relatedId!);

  const reservations = reservationIds.length > 0
    ? await prisma.reservation.findMany({
        where: { id: { in: reservationIds } },
        select: {
          id: true,
          reservationNo: true,
          customerName: true,
          totalAmount: true,
        },
      })
    : [];

  const reservationMap = new Map(reservations.map(r => [r.id, r]));

  return {
    list: list.map(item => {
      const reservation = item.relatedId ? reservationMap.get(item.relatedId) : null;
      return {
        id: item.id,
        type: item.type,
        amount: Number(item.amount),
        status: 'settled', // FundFlow记录都是已结算的
        reservationNo: reservation?.reservationNo || '-',
        customerName: reservation?.customerName || '-',
        totalAmount: reservation ? Number(reservation.totalAmount) : 0,
        remark: item.remark,
        createdAt: item.createdAt,
      };
    }),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 获取推广中心数据
 */
export async function getPromotionData(agentId: number) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: {
      inviteCode: true,
      type: true,
      totalCommission: true,
    },
  });

  if (!agent) {
    throw new Error('代理商不存在');
  }

  // 已邀请人数
  const invitedCount = await prisma.agent.count({
    where: { parentId: agentId },
  });

  // 【2026-01-09 Phase 9】本月新增邀请
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthInvited = await prisma.agent.count({
    where: {
      parentId: agentId,
      createdAt: { gte: monthStart },
    },
  });

  return {
    inviteCode: agent.inviteCode,
    invitedCount,
    monthInvited,
    totalIncome: Number(agent.totalCommission),
    tier: agent.type,
  };
}

/**
 * 【2026-01-09 Phase 9】获取邀请记录列表
 * 【2026-01-17 预约模式适配】使用预约数据计算贡献
 */
export async function getInviteRecords(agentId: number, page = 1, pageSize = 10) {
  const total = await prisma.agent.count({
    where: { parentId: agentId },
  });

  const list = await prisma.agent.findMany({
    where: { parentId: agentId },
    select: {
      id: true,
      name: true,
      phone: true,
      type: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  // 计算每个下级的预约数和贡献
  const statsMap = new Map<number, { reservationCount: number; contribution: number }>();
  for (const item of list) {
    // 获取该下级创建的预约数量（salespersonId = 下级ID）
    const reservationCount = await prisma.reservation.count({
      where: { salespersonId: item.id },
    });

    // 获取该下级所有已完成预约产生的一级利润（当前用户作为一级，从二级预约中获得的利润）
    const completedReservationIds = (await prisma.reservation.findMany({
      where: { salespersonId: item.id, status: 3 }, // 已完成的预约
      select: { id: true },
    })).map(r => r.id);

    let contribution = 0;
    if (completedReservationIds.length > 0) {
      const indirectProfits = await prisma.fundFlow.aggregate({
        where: {
          agentId,
          type: 'PROFIT',
          relatedType: 'RESERVATION',
          relatedId: { in: completedReservationIds },
        },
        _sum: { amount: true },
      });
      contribution = Number(indirectProfits._sum.amount || 0);
    }

    statsMap.set(item.id, { reservationCount, contribution });
  }

  const records = list.map(item => {
    const stats = statsMap.get(item.id) || { reservationCount: 0, contribution: 0 };
    return {
      id: item.id,
      name: item.name,
      phone: item.phone?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),  // 脱敏手机号
      type: item.type,
      typeLabel: getTypeLabel(item.type),
      reservationCount: stats.reservationCount,
      contribution: stats.contribution,
      createdAt: item.createdAt,
    };
  });

  return {
    list: records,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 【2026-01-17】移除LEVEL3，更新术语
 */
function getTypeLabel(type: string) {
  const labels: Record<string, string> = {
    'LEVEL1': '一级推销员',
    'LEVEL2': '二级推销员',
    'WHOLESALE': '普通用户',
  };
  return labels[type] || '推销员';
}

/**
 * 【2026-01-29】H5端：获取分润记录详情
 * 复用管理后台详情逻辑，增加推销员权限校验和客户手机号脱敏
 */
export async function getCommissionRecordDetailForAgent(recordId: number, agentId: number) {
  // 1. 先验证该记录是否属于当前推销员
  const fundFlow = await prisma.fundFlow.findFirst({
    where: {
      id: recordId,
      agentId, // 关键：只能查看自己的记录
      type: 'PROFIT',
    },
  });

  if (!fundFlow) {
    return null;
  }

  // 2. 获取关联预约的完整详情
  if (fundFlow.relatedType !== 'RESERVATION' || !fundFlow.relatedId) {
    // 非预约类型的利润记录，返回基础信息
    return {
      id: fundFlow.id,
      type: 'PROFIT',
      amount: Number(fundFlow.amount),
      status: 'settled',
      createdAt: fundFlow.createdAt,
      remark: fundFlow.remark,
      reservation: null,
    };
  }

  // 3. 获取预约详情
  const reservation = await prisma.reservation.findUnique({
    where: { id: fundFlow.relatedId },
    include: {
      items: true,
      store: { select: { id: true, name: true } },
    },
  });

  if (!reservation) {
    return {
      id: fundFlow.id,
      type: 'PROFIT',
      amount: Number(fundFlow.amount),
      status: 'settled',
      createdAt: fundFlow.createdAt,
      remark: fundFlow.remark,
      reservation: null,
    };
  }

  // 4. 构建详情数据（对客户手机号脱敏）
  const amount = Number(fundFlow.amount);
  const totalAmount = Number(reservation.totalAmount);

  return {
    id: fundFlow.id,
    type: 'PROFIT',
    amount,
    rate: totalAmount > 0 ? Math.round((amount / totalAmount) * 10000) / 100 : 0,
    status: 'settled',
    createdAt: fundFlow.createdAt,
    remark: fundFlow.remark,
    reservation: {
      id: reservation.id,
      reservationNo: reservation.reservationNo,
      customerName: reservation.customerName,
      // 客户手机号脱敏：138****1234
      customerPhone: reservation.customerPhone?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') || '',
      pickupDate: reservation.pickupDate,
      totalAmount,
      status: reservation.status,
      completedAt: reservation.completedAt,
      storeName: reservation.store?.name || '蒙庆烟花',
      // 利润分配
      profitDistribution: {
        masterProfit: Number(reservation.masterProfit || 0),
        level1Profit: Number(reservation.level1Profit || 0),
        level2Profit: Number(reservation.level2Profit || 0),
        totalProfit: Number(reservation.masterProfit || 0) + Number(reservation.level1Profit || 0) + Number(reservation.level2Profit || 0),
      },
      // 商品明细
      items: reservation.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        productImage: item.productImage,
        quantity: item.quantity,
        price: Number(item.price),
        subtotal: Number(item.price) * item.quantity,
        // 价格快照（成本分析）
        priceSnapshot: {
          costPrice: Number(item.snapshotCostPrice || 0),
          supplyPrice: Number(item.snapshotSupplyPrice || 0),
          level1Price: item.snapshotLevel1Price ? Number(item.snapshotLevel1Price) : null,
          retailPrice: Number(item.snapshotRetailPrice || item.price),
        },
      })),
    },
  };
}

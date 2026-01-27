/**
 * 提现服务
 * 处理代理商提现申请和审核
 */
import prisma from '../../utils/prisma';

/**
 * 获取代理商自己的提现记录
 */
export async function getAgentWithdrawals(params: {
  agentId: number;
  page?: number;
  pageSize?: number;
  status?: string;
}) {
  const { agentId, page = 1, pageSize = 20, status } = params;

  const where: any = { agentId };

  if (status && status !== 'all') {
    where.status = status;
  }

  const total = await prisma.withdrawal.count({ where });

  const list = await prisma.withdrawal.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    list: list.map(item => ({
      id: item.id,
      amount: Number(item.amount),
      status: item.status,
      statusText: getWithdrawalStatusText(item.status),
      rejectReason: item.rejectReason,
      createdAt: item.createdAt,
      reviewedAt: item.reviewedAt,
      completedAt: item.completedAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 获取提现状态文本
 */
function getWithdrawalStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    PENDING: '审核中',
    APPROVED: '已通过',
    COMPLETED: '已到账',
    REJECTED: '已拒绝',
  };
  return statusMap[status] || status;
}

/**
 * 提现申请
 */
export async function createWithdrawal(agentId: number, amount: number) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    throw new Error('代理商不存在');
  }

  if (amount <= 0) {
    throw new Error('提现金额必须大于0');
  }

  // 【2026-01-22 安全修复】先检查余额是否为正，防止负余额提现漏洞
  const currentBalance = Number(agent.balance);
  if (currentBalance <= 0) {
    throw new Error('余额不足，无法提现');
  }

  if (currentBalance < amount) {
    throw new Error(`余额不足，当前可提现余额：¥${currentBalance.toFixed(2)}`);
  }

  // 最低提现金额检查（可从配置读取，默认100）
  const minWithdrawal = 100;
  if (amount < minWithdrawal) {
    throw new Error(`最低提现金额为${minWithdrawal}元`);
  }

  // 检查是否有待审核的提现申请
  const pendingWithdrawal = await prisma.withdrawal.findFirst({
    where: {
      agentId,
      status: 'PENDING',
    },
  });

  if (pendingWithdrawal) {
    throw new Error('您有一笔提现申请正在审核中');
  }

  // 创建提现申请并冻结余额
  return prisma.$transaction(async (tx) => {
    // 扣减余额
    await tx.agent.update({
      where: { id: agentId },
      data: {
        balance: { decrement: amount },
      },
    });

    // 创建提现记录
    const withdrawal = await tx.withdrawal.create({
      data: {
        agentId,
        amount,
        status: 'PENDING',
      },
    });

    return withdrawal;
  });
}

/**
 * 获取提现申请列表
 */
export async function getWithdrawals(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  keyword?: string;
}) {
  const { page = 1, pageSize = 20, status, keyword } = params;

  const where: any = {};

  if (status && status !== 'all') {
    where.status = status;
  }

  if (keyword && keyword.trim()) {
    where.agent = {
      OR: [
        { name: { contains: keyword.trim() } },
        { phone: { contains: keyword.trim() } },
      ],
    };
  }

  const total = await prisma.withdrawal.count({ where });

  const list = await prisma.withdrawal.findMany({
    where,
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          phone: true,
          type: true,
          balance: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    list: list.map(item => ({
      id: item.id,
      agentId: item.agentId,
      agentName: item.agent.name,
      agentPhone: item.agent.phone,
      agentType: item.agent.type,
      currentBalance: Number(item.agent.balance),
      amount: Number(item.amount),
      status: item.status,
      reviewedBy: item.reviewedBy,
      reviewedAt: item.reviewedAt,
      rejectReason: item.rejectReason,
      createdAt: item.createdAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 获取提现详情（包含代理商分润统计）
 * 用于提现审核时查看代理商分润情况
 */
export async function getWithdrawalDetail(id: number) {
  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          phone: true,
          type: true,
          balance: true,
          totalCommission: true,
        },
      },
    },
  });

  if (!withdrawal) {
    throw new Error('提现申请不存在');
  }

  // 获取代理商分润统计
  const agentId = withdrawal.agentId;

  // 累计已提现金额
  const totalWithdrawn = await prisma.withdrawal.aggregate({
    where: {
      agentId,
      status: { in: ['APPROVED', 'COMPLETED'] },
    },
    _sum: { amount: true },
  });

  // 最近5条分润记录
  const recentCommissions = await prisma.commission.findMany({
    where: { agentId },
    include: {
      order: {
        select: {
          orderNo: true,
          totalAmount: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  // 本月分润
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthlyCommission = await prisma.commission.aggregate({
    where: {
      agentId,
      createdAt: { gte: monthStart },
      status: { not: 'CANCELLED' },
    },
    _sum: { amount: true },
  });

  return {
    withdrawal: {
      id: withdrawal.id,
      amount: Number(withdrawal.amount),
      status: withdrawal.status,
      createdAt: withdrawal.createdAt,
      reviewedAt: withdrawal.reviewedAt,
      rejectReason: withdrawal.rejectReason,
    },
    agent: {
      id: withdrawal.agent.id,
      name: withdrawal.agent.name,
      phone: withdrawal.agent.phone,
      type: withdrawal.agent.type,
      currentBalance: Number(withdrawal.agent.balance),
      totalCommission: Number(withdrawal.agent.totalCommission),
      totalWithdrawn: Number(totalWithdrawn._sum.amount || 0),
      monthlyCommission: Number(monthlyCommission._sum.amount || 0),
    },
    recentCommissions: recentCommissions.map(item => ({
      id: item.id,
      type: item.type,
      amount: Number(item.amount),
      rate: Number(item.rate),
      orderNo: item.order?.orderNo,
      orderAmount: Number(item.order?.totalAmount || 0),
      createdAt: item.createdAt,
    })),
  };
}

/**
 * 审核提现申请
 * 【P0-07修复】使用事务+行锁防止并发审核导致重复退款
 */
export async function reviewWithdrawal(id: number, data: {
  action: 'approve' | 'reject';
  reviewerId: number;
  reason?: string;
}) {
  // 【P0-07修复】将状态检查和更新放入事务，使用行锁
  return prisma.$transaction(async (tx) => {
    // 使用行锁获取提现记录（FOR UPDATE）
    const withdrawals = await tx.$queryRaw<any[]>`
      SELECT id, status, agentId, amount FROM withdrawals WHERE id = ${id} FOR UPDATE
    `;

    if (!withdrawals || withdrawals.length === 0) {
      throw new Error('提现申请不存在');
    }

    const withdrawal = withdrawals[0];

    if (withdrawal.status !== 'PENDING') {
      throw new Error('该提现申请已处理');
    }

    if (data.action === 'approve') {
      // 批准：更新状态为已通过
      return tx.withdrawal.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedBy: data.reviewerId,
          reviewedAt: new Date(),
        },
      });
    } else {
      // 拒绝：退回余额
      const amount = Number(withdrawal.amount);

      // 获取代理商当前余额（用于资金流水）
      const agent = await tx.agent.findUnique({
        where: { id: withdrawal.agentId },
        select: { balance: true },
      });

      // 退回余额
      await tx.agent.update({
        where: { id: withdrawal.agentId },
        data: {
          balance: { increment: amount },
        },
      });

      // 创建资金流水记录
      await tx.fundFlow.create({
        data: {
          agentId: withdrawal.agentId,
          type: 'WITHDRAWAL_REFUND',
          amount: amount,
          beforeBalance: Number(agent?.balance || 0),
          afterBalance: Number(agent?.balance || 0) + amount,
          relatedId: id,
          relatedType: 'WITHDRAWAL',
          remark: `提现申请被拒绝，退回余额${data.reason ? '：' + data.reason : ''}`,
        },
      });

      // 更新状态
      return tx.withdrawal.update({
        where: { id },
        data: {
          status: 'REJECTED',
          reviewedBy: data.reviewerId,
          reviewedAt: new Date(),
          rejectReason: data.reason,
        },
      });
    }
  });
}

/**
 * 确认提现完成（打款完成）
 * 【优化计划 Task 2.1】支持提现从APPROVED到COMPLETED的状态流转
 */
export async function completeWithdrawal(id: number, data: {
  operatorId: number;
  remark?: string;
}) {
  return prisma.$transaction(async (tx) => {
    // 使用行锁获取提现记录
    const withdrawals = await tx.$queryRaw<any[]>`
      SELECT id, status, agentId, amount FROM withdrawals WHERE id = ${id} FOR UPDATE
    `;

    if (!withdrawals || withdrawals.length === 0) {
      throw new Error('提现申请不存在');
    }

    const withdrawal = withdrawals[0];

    if (withdrawal.status !== 'APPROVED') {
      throw new Error('只有已审核通过的提现才能确认打款完成');
    }

    // 更新状态为COMPLETED
    const updatedWithdrawal = await tx.withdrawal.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        completedBy: data.operatorId,
        completeRemark: data.remark,
      },
    });

    console.log(`提现${id}已确认打款完成，操作人：${data.operatorId}`);

    return updatedWithdrawal;
  });
}

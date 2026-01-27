import prisma from '../utils/prisma';
import { Prisma } from '@prisma/client';

// 获取财务统计数据
export async function getFinanceStatistics() {
  // 今日日期范围
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 本月开始日期
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  // 并行查询所有统计数据
  const [
    pendingRechargeCount,
    pendingWithdrawalCount,
    pendingStaffWithdrawalCount,
    todayFlows,
    // 新增：代理商提现统计
    withdrawalStats,
    // 新增：员工提现统计
    staffWithdrawalStats,
    // 新增：本月资金流水
    monthlyFlows,
  ] = await Promise.all([
    // 待审批加款数量
    prisma.rechargeRequest.count({
      where: { status: 'PENDING' }
    }),
    // 待审批提现数量（代理商）
    prisma.withdrawal.count({
      where: { status: 'PENDING' }
    }),
    // 待审批员工提现数量
    prisma.staffWithdrawal.count({
      where: { status: 'PENDING' }
    }),
    // 今日流水总额（所有入账）
    prisma.fundFlow.aggregate({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow
        },
        amount: { gt: 0 }
      },
      _sum: { amount: true }
    }),
    // 代理商提现统计：待打款 + 本月已打款金额
    prisma.withdrawal.aggregate({
      where: {
        status: { in: ['APPROVED', 'COMPLETED'] }
      },
      _sum: { amount: true },
      _count: true
    }),
    // 员工提现统计
    prisma.staffWithdrawal.aggregate({
      where: {
        status: { in: ['APPROVED', 'COMPLETED'] }
      },
      _sum: { amount: true },
      _count: true
    }),
    // 本月资金流水总额
    prisma.fundFlow.aggregate({
      where: {
        createdAt: {
          gte: monthStart,
          lt: tomorrow
        }
      },
      _sum: { amount: true },
      _count: true
    }),
  ]);

  // 查询待打款数量（已审核但未打款）
  const [pendingPaymentWithdrawal, pendingPaymentStaffWithdrawal] = await Promise.all([
    prisma.withdrawal.count({ where: { status: 'APPROVED' } }),
    prisma.staffWithdrawal.count({ where: { status: 'APPROVED' } }),
  ]);

  // 查询代理商数量和总余额（用于数据核对）
  const [agentCount, agentBalanceSum] = await Promise.all([
    prisma.agent.count({ where: { status: 'ACTIVE' } }),
    prisma.agent.aggregate({
      where: { status: 'ACTIVE' },
      _sum: { balance: true }
    })
  ]);

  return {
    // 待审批数量
    pendingRechargeCount,
    pendingWithdrawalCount,
    pendingStaffWithdrawalCount,
    // 今日流水
    todayFlowAmount: Number(todayFlows._sum.amount || 0),
    // 新增统计数据
    pendingPaymentWithdrawal,      // 代理商待打款数量
    pendingPaymentStaffWithdrawal, // 员工待打款数量
    totalWithdrawalAmount: Number(withdrawalStats._sum.amount || 0),       // 代理商累计提现金额
    totalStaffWithdrawalAmount: Number(staffWithdrawalStats._sum.amount || 0), // 员工累计提现金额
    monthlyFlowAmount: Number(monthlyFlows._sum.amount || 0),              // 本月流水总额
    monthlyFlowCount: monthlyFlows._count || 0,                            // 本月流水笔数
    // 数据核对用
    totalAgents: agentCount,                                               // 代理商总数
    totalAgentBalance: Number(agentBalanceSum._sum.balance || 0),          // 代理商总余额
  };
}

// 获取加款申请列表
export async function getRechargeList(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  keyword?: string;
  startDate?: string;
  endDate?: string;
}) {
  const { page = 1, pageSize = 10, status, keyword, startDate, endDate } = params;

  const where: Prisma.RechargeRequestWhereInput = {};

  if (status && status !== 'all') {
    where.status = status;
  }

  if (keyword) {
    where.agent = {
      OR: [
        { name: { contains: keyword } },
        { phone: { contains: keyword } }
      ]
    };
  }

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

  const [list, total] = await Promise.all([
    prisma.rechargeRequest.findMany({
      where,
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            phone: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.rechargeRequest.count({ where })
  ]);

  return {
    list,
    total,
    page,
    pageSize
  };
}

// 审核加款申请
export async function reviewRecharge(
  id: number,
  action: 'approve' | 'reject',
  reviewedBy: number,
  rejectReason?: string
) {
  const request = await prisma.rechargeRequest.findUnique({
    where: { id },
    include: { agent: true }
  });

  if (!request) {
    throw new Error('加款申请不存在');
  }

  if (request.status !== 'PENDING') {
    throw new Error('该申请已处理');
  }

  if (action === 'approve') {
    // 审核通过：更新申请状态、增加代理商余额、创建流水记录
    await prisma.$transaction(async (tx) => {
      // 更新申请状态
      await tx.rechargeRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedBy,
          reviewedAt: new Date()
        }
      });

      // 获取当前余额
      const agent = await tx.agent.findUnique({
        where: { id: request.agentId }
      });

      const beforeBalance = agent?.balance || new Prisma.Decimal(0);
      const afterBalance = beforeBalance.add(request.amount);

      // 更新代理商余额
      await tx.agent.update({
        where: { id: request.agentId },
        data: {
          balance: afterBalance
        }
      });

      // 创建流水记录
      await tx.fundFlow.create({
        data: {
          agentId: request.agentId,
          type: 'RECHARGE',
          amount: request.amount,
          beforeBalance,
          afterBalance,
          relatedId: id,
          relatedType: 'RECHARGE_REQUEST',
          remark: '充值审核通过'
        }
      });
    });

    return { success: true, message: '审核通过' };
  } else {
    // 审核拒绝
    await prisma.rechargeRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedBy,
        reviewedAt: new Date(),
        rejectReason
      }
    });

    return { success: true, message: '已拒绝' };
  }
}

// 获取资金流水列表
export async function getFundFlowList(params: {
  page?: number;
  pageSize?: number;
  type?: string;
  agentId?: number;
  keyword?: string;
  startDate?: string;
  endDate?: string;
}) {
  const { page = 1, pageSize = 10, type, agentId, keyword, startDate, endDate } = params;

  const where: Prisma.FundFlowWhereInput = {};

  if (type && type !== 'all') {
    where.type = type;
  }

  if (agentId) {
    where.agentId = agentId;
  }

  if (keyword) {
    where.agent = {
      OR: [
        { name: { contains: keyword } },
        { phone: { contains: keyword } }
      ]
    };
  }

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

  const [list, total] = await Promise.all([
    prisma.fundFlow.findMany({
      where,
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.fundFlow.count({ where })
  ]);

  return {
    list,
    total,
    page,
    pageSize
  };
}

// 获取加款申请详情
export async function getRechargeDetail(id: number) {
  const request = await prisma.rechargeRequest.findUnique({
    where: { id },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          phone: true,
          avatar: true,
          type: true,
          balance: true
        }
      }
    }
  });

  if (!request) {
    throw new Error('加款申请不存在');
  }

  return request;
}

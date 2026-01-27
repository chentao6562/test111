/**
 * 员工提现服务
 * 处理货管/库管的收款信息管理和提现申请
 */

import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';

// ============ 收款信息管理 ============

/**
 * 获取员工收款信息
 */
export async function getPaymentInfo(staffId: number) {
  const staff = await prisma.systemUser.findUnique({
    where: { id: staffId },
    select: {
      id: true,
      name: true,
      phone: true,
      balance: true,
      totalIncome: true,
      bankName: true,
      bankAccount: true,
      accountName: true,
      alipay: true,
      wechat: true,
    },
  });

  if (!staff) {
    throw new Error('员工不存在');
  }

  return staff;
}

/**
 * 更新员工收款信息
 */
export async function updatePaymentInfo(
  staffId: number,
  data: {
    bankName?: string;
    bankAccount?: string;
    accountName?: string;
    alipay?: string;
    wechat?: string;
  }
) {
  // 至少填写一种收款方式
  const hasBankInfo = data.bankName && data.bankAccount && data.accountName;
  const hasAlipay = data.alipay;
  const hasWechat = data.wechat;

  if (!hasBankInfo && !hasAlipay && !hasWechat) {
    throw new Error('请至少填写一种收款方式');
  }

  const staff = await prisma.systemUser.update({
    where: { id: staffId },
    data: {
      bankName: data.bankName || null,
      bankAccount: data.bankAccount || null,
      accountName: data.accountName || null,
      alipay: data.alipay || null,
      wechat: data.wechat || null,
    },
    select: {
      id: true,
      name: true,
      bankName: true,
      bankAccount: true,
      accountName: true,
      alipay: true,
      wechat: true,
    },
  });

  return staff;
}

// ============ 提现申请 ============

/**
 * 创建提现申请
 */
export async function createWithdrawal(staffId: number, amount: number) {
  // 获取员工信息
  const staff = await prisma.systemUser.findUnique({
    where: { id: staffId },
    select: {
      id: true,
      name: true,
      balance: true,
      bankName: true,
      bankAccount: true,
      accountName: true,
      alipay: true,
      wechat: true,
    },
  });

  if (!staff) {
    throw new Error('员工不存在');
  }

  // 检查金额
  if (amount <= 0) {
    throw new Error('提现金额必须大于0');
  }

  if (amount < 100) {
    throw new Error('最低提现金额为100元');
  }

  // 检查余额
  const balance = Number(staff.balance);
  if (amount > balance) {
    throw new Error(`余额不足，当前可提现余额：¥${balance.toFixed(2)}`);
  }

  // 检查是否有收款信息
  const hasPaymentInfo =
    (staff.bankName && staff.bankAccount && staff.accountName) ||
    staff.alipay ||
    staff.wechat;

  if (!hasPaymentInfo) {
    throw new Error('请先设置收款信息');
  }

  // 检查是否有待审核的提现
  const pendingCount = await prisma.staffWithdrawal.count({
    where: {
      staffId,
      status: 'PENDING',
    },
  });

  if (pendingCount > 0) {
    throw new Error('您有待审核的提现申请，请等待处理后再申请');
  }

  // 创建提现申请并扣减余额（事务）
  const result = await prisma.$transaction(async (tx) => {
    // 扣减余额
    await tx.systemUser.update({
      where: { id: staffId },
      data: {
        balance: { decrement: amount },
      },
    });

    // 创建提现记录
    const withdrawal = await tx.staffWithdrawal.create({
      data: {
        staffId,
        staffName: staff.name,
        amount,
        bankName: staff.bankName,
        bankAccount: staff.bankAccount,
        accountName: staff.accountName,
        alipay: staff.alipay,
        wechat: staff.wechat,
        status: 'PENDING',
      },
    });

    return withdrawal;
  });

  return result;
}

/**
 * 获取员工提现记录
 */
export async function getWithdrawalList(params: {
  staffId?: number;
  status?: string;
  page: number;
  pageSize: number;
}) {
  const { staffId, status, page, pageSize } = params;

  const where: Prisma.StaffWithdrawalWhereInput = {};
  if (staffId) where.staffId = staffId;
  if (status) where.status = status;

  const [total, items] = await Promise.all([
    prisma.staffWithdrawal.count({ where }),
    prisma.staffWithdrawal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 获取提现详情
 */
export async function getWithdrawalDetail(id: number) {
  const withdrawal = await prisma.staffWithdrawal.findUnique({
    where: { id },
  });

  if (!withdrawal) {
    throw new Error('提现记录不存在');
  }

  return withdrawal;
}

// ============ 管理后台审核 ============

/**
 * 审核提现申请
 */
export async function reviewWithdrawal(
  id: number,
  adminId: number,
  action: 'APPROVED' | 'REJECTED',
  reason?: string
) {
  const withdrawal = await prisma.staffWithdrawal.findUnique({
    where: { id },
  });

  if (!withdrawal) {
    throw new Error('提现记录不存在');
  }

  if (withdrawal.status !== 'PENDING') {
    throw new Error('该提现申请已处理');
  }

  if (action === 'REJECTED') {
    // 拒绝：退回余额
    await prisma.$transaction(async (tx) => {
      // 退回余额
      await tx.systemUser.update({
        where: { id: withdrawal.staffId },
        data: {
          balance: { increment: Number(withdrawal.amount) },
        },
      });

      // 更新提现状态
      await tx.staffWithdrawal.update({
        where: { id },
        data: {
          status: 'REJECTED',
          reviewedBy: adminId,
          reviewedAt: new Date(),
          rejectReason: reason || '审核未通过',
        },
      });
    });
  } else {
    // 通过
    await prisma.staffWithdrawal.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });
  }

  return await getWithdrawalDetail(id);
}

/**
 * 确认打款完成
 */
export async function completeWithdrawal(
  id: number,
  adminId: number,
  remark?: string
) {
  const withdrawal = await prisma.staffWithdrawal.findUnique({
    where: { id },
  });

  if (!withdrawal) {
    throw new Error('提现记录不存在');
  }

  if (withdrawal.status !== 'APPROVED') {
    throw new Error('该提现申请不是已通过状态');
  }

  await prisma.staffWithdrawal.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      completedBy: adminId,
      completedAt: new Date(),
      completeRemark: remark,
    },
  });

  return await getWithdrawalDetail(id);
}

/**
 * 获取我的提现统计（员工端用）
 */
export async function getMyWithdrawalStats(staffId: number) {
  const [totalCount, pendingCount, totalAmount] = await Promise.all([
    // 总申请数
    prisma.staffWithdrawal.count({ where: { staffId } }),
    // 待处理数（待审核+待打款）
    prisma.staffWithdrawal.count({
      where: {
        staffId,
        status: { in: ['PENDING', 'APPROVED'] },
      },
    }),
    // 总提现金额（已完成）
    prisma.staffWithdrawal.aggregate({
      where: {
        staffId,
        status: 'COMPLETED',
      },
      _sum: { amount: true },
    }),
  ]);

  return {
    totalCount,
    pendingCount,
    totalAmount: Number(totalAmount._sum.amount) || 0,
  };
}

/**
 * 获取提现统计（管理后台用）
 */
export async function getWithdrawalStats() {
  const [pending, approved, todayCompleted, totalCompleted] = await Promise.all([
    // 待审核数量
    prisma.staffWithdrawal.count({ where: { status: 'PENDING' } }),
    // 待打款数量
    prisma.staffWithdrawal.count({ where: { status: 'APPROVED' } }),
    // 今日已打款金额
    prisma.staffWithdrawal.aggregate({
      where: {
        status: 'COMPLETED',
        completedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
      _sum: { amount: true },
    }),
    // 累计打款金额
    prisma.staffWithdrawal.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amount: true },
    }),
  ]);

  return {
    pending,
    approved,
    todayCompleted: Number(todayCompleted._sum.amount) || 0,
    totalCompleted: Number(totalCompleted._sum.amount) || 0,
  };
}

/**
 * 增加员工余额（任务完成时调用）
 */
export async function addStaffBalance(staffId: number, amount: number, tx?: any) {
  const client = tx || prisma;

  await client.systemUser.update({
    where: { id: staffId },
    data: {
      balance: { increment: amount },
      totalIncome: { increment: amount },
    },
  });
}

export default {
  getPaymentInfo,
  updatePaymentInfo,
  createWithdrawal,
  getWithdrawalList,
  getWithdrawalDetail,
  reviewWithdrawal,
  completeWithdrawal,
  getMyWithdrawalStats,
  getWithdrawalStats,
  addStaffBalance,
};

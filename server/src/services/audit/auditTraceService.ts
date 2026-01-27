/**
 * 交易审计追踪服务
 *
 * 核心功能：
 * 1. 记录所有资金变动的完整链路
 * 2. 提供余额快照和恢复能力
 * 3. 自动对账和异常检测
 * 4. 支持问题定位和数据补救
 *
 * @author Claude
 * @date 2026-01-22
 */

import { PrismaClient, Prisma } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// 交易类型枚举
export enum TraceType {
  PROFIT_SETTLE = 'PROFIT_SETTLE',       // 利润结算
  COUPON_ISSUE = 'COUPON_ISSUE',         // 代金券发放
  COUPON_REDEEM = 'COUPON_REDEEM',       // 代金券核销
  RECHARGE = 'RECHARGE',                 // 充值
  WITHDRAW = 'WITHDRAW',                 // 提现
  GIFT_COST = 'GIFT_COST',               // 赠品成本
  BALANCE_ADJUST = 'BALANCE_ADJUST',     // 人工调账
  REFUND = 'REFUND',                     // 退款
}

// 操作人类型
export enum OperatorType {
  SYSTEM = 'SYSTEM',
  STAFF = 'STAFF',
  ADMIN = 'ADMIN',
  AGENT = 'AGENT',
}

// 告警类型
export enum AlertType {
  BALANCE_MISMATCH = 'BALANCE_MISMATCH',       // 余额不一致
  DUPLICATE_SETTLE = 'DUPLICATE_SETTLE',       // 重复结算
  NEGATIVE_BALANCE = 'NEGATIVE_BALANCE',       // 负余额
  LARGE_TRANSACTION = 'LARGE_TRANSACTION',     // 大额交易
  SUSPICIOUS_PATTERN = 'SUSPICIOUS_PATTERN',   // 可疑模式
  MISSING_TRACE = 'MISSING_TRACE',             // 缺失追踪记录
}

// 告警严重程度
export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * 生成唯一追踪ID
 */
function generateTraceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `TRC${timestamp}${random}`.toUpperCase();
}

/**
 * 计算数据校验和（防篡改）
 */
function calculateChecksum(data: Record<string, unknown>): string {
  const sortedData = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash('sha256').update(sortedData).digest('hex').substring(0, 64);
}

/**
 * 创建交易追踪记录
 * 在任何资金变动时调用此函数
 */
export async function createTransactionTrace(
  tx: Prisma.TransactionClient,
  params: {
    traceType: TraceType;
    agentId: number;
    amount: number;
    beforeBalance: number;
    afterBalance: number;
    sourceTable: string;
    sourceId: number;
    sourceNo?: string;
    details?: Record<string, unknown>;
    operatorType: OperatorType;
    operatorId?: number;
    operatorName?: string;
    remark?: string;
  }
): Promise<string> {
  const traceId = generateTraceId();

  // 计算校验和
  const checksumData = {
    traceId,
    agentId: params.agentId,
    amount: params.amount,
    beforeBalance: params.beforeBalance,
    afterBalance: params.afterBalance,
    traceType: params.traceType,
    sourceTable: params.sourceTable,
    sourceId: params.sourceId,
  };
  const checksum = calculateChecksum(checksumData);

  await tx.transactionTrace.create({
    data: {
      traceId,
      traceType: params.traceType,
      agentId: params.agentId,
      amount: new Prisma.Decimal(params.amount),
      beforeBalance: new Prisma.Decimal(params.beforeBalance),
      afterBalance: new Prisma.Decimal(params.afterBalance),
      sourceTable: params.sourceTable,
      sourceId: params.sourceId,
      sourceNo: params.sourceNo,
      details: params.details ? JSON.stringify(params.details) : null,
      operatorType: params.operatorType,
      operatorId: params.operatorId,
      operatorName: params.operatorName,
      checksum,
      remark: params.remark,
    },
  });

  // 检查是否需要触发告警
  await checkAndCreateAlerts(tx, params);

  return traceId;
}

/**
 * 检查并创建告警
 */
async function checkAndCreateAlerts(
  tx: Prisma.TransactionClient,
  params: {
    traceType: TraceType;
    agentId: number;
    amount: number;
    afterBalance: number;
  }
): Promise<void> {
  // 检查负余额
  if (params.afterBalance < 0) {
    await tx.auditAlert.create({
      data: {
        alertType: AlertType.NEGATIVE_BALANCE,
        severity: AlertSeverity.MEDIUM,
        agentId: params.agentId,
        title: '推销员余额为负',
        description: `推销员ID ${params.agentId} 余额变为负数：${params.afterBalance}元，交易类型：${params.traceType}`,
        details: JSON.stringify({
          amount: params.amount,
          afterBalance: params.afterBalance,
          traceType: params.traceType,
        }),
      },
    });
  }

  // 检查大额交易（超过5000元）
  if (Math.abs(params.amount) >= 5000) {
    await tx.auditAlert.create({
      data: {
        alertType: AlertType.LARGE_TRANSACTION,
        severity: AlertSeverity.LOW,
        agentId: params.agentId,
        title: '大额交易记录',
        description: `推销员ID ${params.agentId} 发生大额交易：${params.amount}元，类型：${params.traceType}`,
        details: JSON.stringify({
          amount: params.amount,
          traceType: params.traceType,
        }),
      },
    });
  }
}

/**
 * 创建余额快照
 */
export async function createBalanceSnapshot(
  agentId: number,
  snapshotType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'MANUAL' | 'PRE_OPERATION',
  relatedTraceId?: string
): Promise<void> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: {
      balance: true,
      totalCommission: true,
      totalSales: true,
      teamSales: true,
    },
  });

  if (!agent) return;

  // 计算期望余额（基于交易追踪记录）
  const traces = await prisma.transactionTrace.aggregate({
    where: { agentId, status: 'SUCCESS' },
    _sum: { amount: true },
    _count: true,
  });

  // 初始余额假设为0，期望余额 = 所有交易金额之和
  const expectedBalance = Number(traces._sum.amount || 0);
  const actualBalance = Number(agent.balance);
  const discrepancy = actualBalance - expectedBalance;
  const isConsistent = Math.abs(discrepancy) < 0.01; // 允许1分钱误差

  await prisma.balanceSnapshot.create({
    data: {
      agentId,
      balance: agent.balance,
      totalCommission: agent.totalCommission,
      totalSales: agent.totalSales,
      teamSales: agent.teamSales,
      snapshotType,
      relatedTraceId,
      transactionCount: traces._count,
      expectedBalance: new Prisma.Decimal(expectedBalance),
      isConsistent,
      discrepancy: isConsistent ? null : new Prisma.Decimal(discrepancy),
    },
  });

  // 如果余额不一致，创建告警
  if (!isConsistent) {
    await prisma.auditAlert.create({
      data: {
        alertType: AlertType.BALANCE_MISMATCH,
        severity: Math.abs(discrepancy) > 100 ? AlertSeverity.HIGH : AlertSeverity.MEDIUM,
        agentId,
        title: '余额与交易记录不一致',
        description: `推销员ID ${agentId} 实际余额 ${actualBalance}元，期望余额 ${expectedBalance}元，差异 ${discrepancy}元`,
        details: JSON.stringify({
          actualBalance,
          expectedBalance,
          discrepancy,
          transactionCount: traces._count,
        }),
      },
    });
  }
}

/**
 * 批量创建所有推销员的余额快照
 */
export async function createAllBalanceSnapshots(
  snapshotType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'MANUAL'
): Promise<{ total: number; consistent: number; discrepancy: number }> {
  const agents = await prisma.agent.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true },
  });

  let consistent = 0;
  let discrepancy = 0;

  for (const agent of agents) {
    await createBalanceSnapshot(agent.id, snapshotType);

    // 检查最新快照是否一致
    const latestSnapshot = await prisma.balanceSnapshot.findFirst({
      where: { agentId: agent.id },
      orderBy: { createdAt: 'desc' },
    });

    if (latestSnapshot?.isConsistent) {
      consistent++;
    } else {
      discrepancy++;
    }
  }

  return { total: agents.length, consistent, discrepancy };
}

/**
 * 执行对账任务
 */
export async function runReconciliation(
  startTime: Date,
  endTime: Date,
  reconcileType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'MANUAL',
  executorId?: number
): Promise<number> {
  const startMs = Date.now();

  try {
    const agents = await prisma.agent.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        balance: true,
      },
    });

    const discrepancies: Array<{
      agentId: number;
      expected: number;
      actual: number;
      diff: number;
      possibleCause: string;
    }> = [];

    for (const agent of agents) {
      // 获取该时间段的所有交易
      const traces = await prisma.transactionTrace.findMany({
        where: {
          agentId: agent.id,
          createdAt: { gte: startTime, lte: endTime },
          status: 'SUCCESS',
        },
        orderBy: { createdAt: 'asc' },
      });

      if (traces.length === 0) continue;

      // 检查每笔交易的前后余额连续性
      for (let i = 1; i < traces.length; i++) {
        const prevTrace = traces[i - 1];
        const currTrace = traces[i];

        const prevAfter = Number(prevTrace.afterBalance);
        const currBefore = Number(currTrace.beforeBalance);

        if (Math.abs(prevAfter - currBefore) > 0.01) {
          discrepancies.push({
            agentId: agent.id,
            expected: prevAfter,
            actual: currBefore,
            diff: currBefore - prevAfter,
            possibleCause: `交易${prevTrace.traceId}与${currTrace.traceId}之间余额断裂`,
          });
        }
      }

      // 检查最后一笔交易的afterBalance与当前余额
      const lastTrace = traces[traces.length - 1];
      const lastAfter = Number(lastTrace.afterBalance);
      const currentBalance = Number(agent.balance);

      if (Math.abs(lastAfter - currentBalance) > 0.01) {
        // 检查是否有更新的交易
        const laterTraces = await prisma.transactionTrace.count({
          where: {
            agentId: agent.id,
            createdAt: { gt: endTime },
          },
        });

        if (laterTraces === 0) {
          discrepancies.push({
            agentId: agent.id,
            expected: lastAfter,
            actual: currentBalance,
            diff: currentBalance - lastAfter,
            possibleCause: '最后交易记录与当前余额不一致，可能存在未记录的交易',
          });
        }
      }
    }

    const executionTime = Date.now() - startMs;

    // 创建对账记录
    const log = await prisma.reconciliationLog.create({
      data: {
        startTime,
        endTime,
        reconcileType,
        totalAgents: agents.length,
        consistentCount: agents.length - discrepancies.length,
        discrepancyCount: discrepancies.length,
        discrepancies: discrepancies.length > 0 ? JSON.stringify(discrepancies) : null,
        executedBy: executorId ? 'ADMIN' : 'SYSTEM',
        executorId,
        executionTime,
        status: 'COMPLETED',
      },
    });

    // 为每个差异创建告警
    for (const d of discrepancies) {
      await prisma.auditAlert.create({
        data: {
          alertType: AlertType.BALANCE_MISMATCH,
          severity: Math.abs(d.diff) > 100 ? AlertSeverity.HIGH : AlertSeverity.MEDIUM,
          agentId: d.agentId,
          title: '对账发现余额差异',
          description: d.possibleCause,
          details: JSON.stringify(d),
        },
      });
    }

    return log.id;
  } catch (error) {
    const executionTime = Date.now() - startMs;

    await prisma.reconciliationLog.create({
      data: {
        startTime,
        endTime,
        reconcileType,
        totalAgents: 0,
        consistentCount: 0,
        discrepancyCount: 0,
        executedBy: executorId ? 'ADMIN' : 'SYSTEM',
        executorId,
        executionTime,
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });

    throw error;
  }
}

/**
 * 查询推销员的完整资金链路
 */
export async function getAgentFundTrace(
  agentId: number,
  options?: {
    startDate?: Date;
    endDate?: Date;
    traceType?: TraceType;
    limit?: number;
    offset?: number;
  }
): Promise<{
  traces: Array<{
    traceId: string;
    traceType: string;
    amount: number;
    beforeBalance: number;
    afterBalance: number;
    sourceTable: string;
    sourceNo: string | null;
    remark: string | null;
    createdAt: Date;
  }>;
  summary: {
    totalIn: number;
    totalOut: number;
    netChange: number;
    currentBalance: number;
  };
}> {
  const where: any = {
    agentId,
    status: 'SUCCESS',
  };

  if (options?.startDate) {
    where.createdAt = { ...where.createdAt as object, gte: options.startDate };
  }
  if (options?.endDate) {
    where.createdAt = { ...where.createdAt as object, lte: options.endDate };
  }
  if (options?.traceType) {
    where.traceType = options.traceType;
  }

  const traces = await prisma.transactionTrace.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 100,
    skip: options?.offset || 0,
    select: {
      traceId: true,
      traceType: true,
      amount: true,
      beforeBalance: true,
      afterBalance: true,
      sourceTable: true,
      sourceNo: true,
      remark: true,
      createdAt: true,
    },
  });

  // 计算汇总
  const aggregation = await prisma.transactionTrace.groupBy({
    by: ['agentId'],
    where: { agentId, status: 'SUCCESS' },
    _sum: { amount: true },
  });

  const totalSum = Number(aggregation[0]?._sum.amount || 0);

  // 分别计算收入和支出
  const incomeAgg = await prisma.transactionTrace.aggregate({
    where: { agentId, status: 'SUCCESS', amount: { gt: 0 } },
    _sum: { amount: true },
  });
  const expenseAgg = await prisma.transactionTrace.aggregate({
    where: { agentId, status: 'SUCCESS', amount: { lt: 0 } },
    _sum: { amount: true },
  });

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { balance: true },
  });

  return {
    traces: traces.map((t: any) => ({
      traceId: t.traceId,
      traceType: t.traceType,
      amount: Number(t.amount),
      beforeBalance: Number(t.beforeBalance),
      afterBalance: Number(t.afterBalance),
      sourceTable: t.sourceTable,
      sourceNo: t.sourceNo,
      remark: t.remark,
      createdAt: t.createdAt,
    })),
    summary: {
      totalIn: Number(incomeAgg._sum.amount || 0),
      totalOut: Math.abs(Number(expenseAgg._sum.amount || 0)),
      netChange: totalSum,
      currentBalance: Number(agent?.balance || 0),
    },
  };
}

/**
 * 追溯单笔预约的完整资金流向
 */
export async function traceReservationFunds(reservationId: number): Promise<{
  reservation: {
    id: number;
    reservationNo: string;
    totalAmount: number;
    status: number;
    settled: boolean;
  } | null;
  profitDistribution: {
    masterProfit: number;
    level1Profit: number;
    level2Profit: number;
    giftCost: number;
  };
  traces: Array<{
    traceId: string;
    agentId: number;
    agentName: string;
    traceType: string;
    amount: number;
    createdAt: Date;
  }>;
  couponsUsed: Array<{
    couponCode: string;
    amount: number;
    agentId: number;
  }>;
}> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
  });

  if (!reservation) {
    return {
      reservation: null,
      profitDistribution: { masterProfit: 0, level1Profit: 0, level2Profit: 0, giftCost: 0 },
      traces: [],
      couponsUsed: [],
    };
  }

  // 查询所有相关的交易追踪
  const traces = await prisma.transactionTrace.findMany({
    where: {
      sourceTable: 'reservations',
      sourceId: reservationId,
    },
    include: {
      agent: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // 查询使用的代金券
  const coupons = await prisma.coupon.findMany({
    where: {
      usedOrderNo: reservation.reservationNo,
      status: 'USED',
    },
    select: {
      code: true,
      amount: true,
      agentId: true,
    },
  });

  return {
    reservation: {
      id: reservation.id,
      reservationNo: reservation.reservationNo,
      totalAmount: Number(reservation.totalAmount),
      status: reservation.status,
      settled: reservation.settled,
    },
    profitDistribution: {
      masterProfit: Number(reservation.masterProfit || 0),
      level1Profit: Number(reservation.level1Profit || 0),
      level2Profit: Number(reservation.level2Profit || 0),
      giftCost: Number((reservation as any).giftCost || 0),
    },
    traces: traces.map((t: any) => ({
      traceId: t.traceId,
      agentId: t.agentId,
      agentName: t.agent.name,
      traceType: t.traceType,
      amount: Number(t.amount),
      createdAt: t.createdAt,
    })),
    couponsUsed: coupons.map(c => ({
      couponCode: c.code,
      amount: Number(c.amount),
      agentId: c.agentId,
    })),
  };
}

/**
 * 检测重复结算（普通版，用于非事务场景）
 */
export async function detectDuplicateSettlement(
  sourceTable: string,
  sourceId: number,
  traceType: TraceType
): Promise<boolean> {
  const existing = await (prisma as any).transactionTrace.findFirst({
    where: {
      sourceTable,
      sourceId,
      traceType,
      status: 'SUCCESS',
    },
  });

  if (existing) {
    // 创建告警
    await (prisma as any).auditAlert.create({
      data: {
        alertType: AlertType.DUPLICATE_SETTLE,
        severity: AlertSeverity.HIGH,
        relatedTable: sourceTable,
        relatedId: sourceId,
        title: '检测到重复结算尝试',
        description: `尝试对 ${sourceTable} ID=${sourceId} 进行重复${traceType}操作，已有记录：${existing.traceId}`,
        details: JSON.stringify({
          existingTraceId: existing.traceId,
          existingCreatedAt: existing.createdAt,
        }),
      },
    });
    return true;
  }

  return false;
}

/**
 * 检测重复结算（事务版，用于并发安全场景）
 * 使用 SELECT FOR UPDATE 锁定检测，防止并发重复
 */
export async function detectDuplicateSettlementInTx(
  tx: Prisma.TransactionClient,
  sourceTable: string,
  sourceId: number,
  traceType: TraceType,
  agentId: number
): Promise<boolean> {
  // 使用原生SQL查询+FOR UPDATE锁，确保并发安全
  const existing = await tx.$queryRaw<Array<{ trace_id: string; created_at: Date }>>`
    SELECT trace_id, created_at FROM transaction_traces
    WHERE source_table = ${sourceTable}
      AND source_id = ${sourceId}
      AND trace_type = ${traceType}
      AND agent_id = ${agentId}
      AND status = 'SUCCESS'
    LIMIT 1
    FOR UPDATE
  `;

  if (existing && existing.length > 0) {
    // 创建告警（在事务内）
    await (tx as any).$executeRaw`
      INSERT INTO audit_alerts (alert_type, severity, related_table, related_id, agent_id, title, description, details, status, created_at, updated_at)
      VALUES (
        ${AlertType.DUPLICATE_SETTLE},
        ${AlertSeverity.HIGH},
        ${sourceTable},
        ${sourceId},
        ${agentId},
        '检测到重复结算尝试',
        ${`尝试对 ${sourceTable} ID=${sourceId} agentId=${agentId} 进行重复${traceType}操作，已有记录：${existing[0].trace_id}`},
        ${JSON.stringify({ existingTraceId: existing[0].trace_id, existingCreatedAt: existing[0].created_at })},
        'PENDING',
        NOW(),
        NOW()
      )
    `;
    return true;
  }

  return false;
}

/**
 * 获取待处理的告警列表
 */
export async function getPendingAlerts(options?: {
  alertType?: AlertType;
  severity?: AlertSeverity;
  agentId?: number;
  limit?: number;
}): Promise<Array<{
  id: number;
  alertType: string;
  severity: string;
  title: string;
  description: string;
  agentId: number | null;
  createdAt: Date;
}>> {
  return prisma.auditAlert.findMany({
    where: {
      status: 'PENDING',
      ...(options?.alertType && { alertType: options.alertType }),
      ...(options?.severity && { severity: options.severity }),
      ...(options?.agentId && { agentId: options.agentId }),
    },
    orderBy: [
      { severity: 'desc' },
      { createdAt: 'desc' },
    ],
    take: options?.limit || 50,
    select: {
      id: true,
      alertType: true,
      severity: true,
      title: true,
      description: true,
      agentId: true,
      createdAt: true,
    },
  });
}

/**
 * 处理告警
 */
export async function resolveAlert(
  alertId: number,
  handledBy: number,
  resolution: string,
  status: 'RESOLVED' | 'IGNORED' | 'AUTO_FIXED' = 'RESOLVED'
): Promise<void> {
  await prisma.auditAlert.update({
    where: { id: alertId },
    data: {
      status,
      handledBy,
      handledAt: new Date(),
      resolution,
    },
  });
}

/**
 * 人工调账（需要完整审计记录）
 * 【2026-01-22 P1修复】添加余额下限检查，默认不允许余额变负
 * @param allowNegative 是否允许余额变负（默认false）
 */
export async function manualBalanceAdjust(
  agentId: number,
  amount: number,
  reason: string,
  operatorId: number,
  operatorName: string,
  allowNegative: boolean = false
): Promise<string> {
  return prisma.$transaction(async (tx) => {
    // 获取当前余额
    const agent = await tx.agent.findUnique({
      where: { id: agentId },
      select: { balance: true },
    });

    if (!agent) {
      throw new Error('推销员不存在');
    }

    const beforeBalance = Number(agent.balance);
    const afterBalance = beforeBalance + amount;

    // 【2026-01-22 P1修复】余额下限检查
    if (afterBalance < 0 && !allowNegative) {
      throw new Error(`余额不足，当前余额${beforeBalance}元，扣减${Math.abs(amount)}元后将变为负数`);
    }

    // 更新余额
    await tx.agent.update({
      where: { id: agentId },
      data: { balance: new Prisma.Decimal(afterBalance) },
    });

    // 创建审计追踪
    const traceId = await createTransactionTrace(tx, {
      traceType: TraceType.BALANCE_ADJUST,
      agentId,
      amount,
      beforeBalance,
      afterBalance,
      sourceTable: 'manual_adjustment',
      sourceId: 0,
      details: { reason, adjustType: amount > 0 ? 'ADD' : 'DEDUCT' },
      operatorType: OperatorType.ADMIN,
      operatorId,
      operatorName,
      remark: `人工调账：${reason}`,
    });

    return traceId;
  }, {
    timeout: 30000, // 增加事务超时时间到30秒
  }).then(async (traceId) => {
    // 在事务外部创建余额快照（避免嵌套事务超时）
    await createBalanceSnapshot(agentId, 'PRE_OPERATION', traceId);
    return traceId;
  });
}

/**
 * 获取系统审计统计概览
 */
export async function getAuditOverview(): Promise<{
  todayTransactions: number;
  todayAmount: number;
  pendingAlerts: number;
  criticalAlerts: number;
  lastReconciliation: Date | null;
  inconsistentAgents: number;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    todayTraces,
    pendingAlerts,
    criticalAlerts,
    lastReconciliation,
    inconsistentSnapshots,
  ] = await Promise.all([
    prisma.transactionTrace.aggregate({
      where: { createdAt: { gte: today } },
      _count: true,
      _sum: { amount: true },
    }),
    prisma.auditAlert.count({
      where: { status: 'PENDING' },
    }),
    prisma.auditAlert.count({
      where: { status: 'PENDING', severity: 'CRITICAL' },
    }),
    prisma.reconciliationLog.findFirst({
      where: { status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
    prisma.balanceSnapshot.groupBy({
      by: ['agentId'],
      where: { isConsistent: false },
      _count: true,
    }),
  ]);

  return {
    todayTransactions: todayTraces._count,
    todayAmount: Number(todayTraces._sum.amount || 0),
    pendingAlerts,
    criticalAlerts,
    lastReconciliation: lastReconciliation?.createdAt || null,
    inconsistentAgents: inconsistentSnapshots.length,
  };
}

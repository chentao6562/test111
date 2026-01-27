/**
 * 利润结算执行器
 * 【2026-01-17 代码重构】统一利润入账逻辑，消除重复代码
 *
 * 负责：
 * - 单个代理商的利润入账
 * - 批量入账（总代+一级+二级）
 * - 创建资金流水记录
 */

import { Prisma } from '@prisma/client';
import {
  createTransactionTrace,
  TraceType,
  OperatorType,
  detectDuplicateSettlementInTx,
} from '../audit/auditTraceService';

// 利润来源类型
export type ProfitSourceType = 'RESERVATION' | 'ORDER';

// 利润分配信息
export interface ProfitDistribution {
  masterProfit: number;
  level1Profit: number;
  level2Profit: number;
  masterAgentId: number | null;
  level1AgentId: number | null;
  level2AgentId: number | null;
}

/**
 * 执行单个代理商的利润入账
 * @param agentId 代理商ID
 * @param amount 入账金额
 * @param sourceType 来源类型
 * @param sourceId 来源ID（预约ID或订单ID）
 * @param sourceNo 来源编号（预约号或订单号）
 * @param tx Prisma事务客户端
 */
export async function executeSettlement(
  agentId: number,
  amount: number,
  sourceType: ProfitSourceType,
  sourceId: number,
  sourceNo: string,
  tx: Prisma.TransactionClient
): Promise<void> {
  // 【2026-01-17 金额验证】确保金额合法
  if (amount <= 0) return;
  if (!Number.isFinite(amount) || Number.isNaN(amount)) {
    console.error(`[settlementExecutor] 无效金额: ${amount}, agentId: ${agentId}, sourceNo: ${sourceNo}`);
    return;
  }
  // 金额上限检查（单次结算不超过100万）
  if (amount > 1000000) {
    console.error(`[settlementExecutor] 金额超限: ${amount}, agentId: ${agentId}, sourceNo: ${sourceNo}`);
    throw new Error('结算金额超出限制，请联系管理员');
  }

  // 【2026-01-22 并发安全修复】使用SELECT FOR UPDATE锁定行，确保流水记录准确
  const agents = await tx.$queryRaw<{ id: number; balance: any }[]>`
    SELECT id, balance FROM agents WHERE id = ${agentId} FOR UPDATE
  `;

  // 【2026-01-22 高并发优化】在事务内检测重复结算（使用FOR UPDATE锁）
  const isDuplicate = await detectDuplicateSettlementInTx(
    tx,
    sourceType === 'RESERVATION' ? 'reservations' : 'orders',
    sourceId,
    TraceType.PROFIT_SETTLE,
    agentId
  );
  if (isDuplicate) {
    console.warn(`[settlementExecutor] 检测到重复结算尝试: ${sourceType} ${sourceId}, agentId: ${agentId}`);
    return;
  }

  if (!agents || agents.length === 0) {
    console.warn(`[settlementExecutor] 代理商不存在: ${agentId}`);
    return;
  }

  const beforeBalance = Number(agents[0].balance || 0);
  const afterBalance = beforeBalance + amount;

  // 【2026-01-24 P0-01修复】负余额抵扣透明化
  // 如果推销员有负余额，本次分润会先抵扣负数部分
  let negativeDeduction = 0;
  let actualProfit = amount;
  if (beforeBalance < 0) {
    // 计算需要抵扣的负余额部分
    negativeDeduction = Math.min(amount, Math.abs(beforeBalance));
    actualProfit = amount - negativeDeduction;
    console.log(
      `[settlementExecutor] 推销员${agentId}有负余额${beforeBalance}元，` +
      `本次分润${amount}元先抵扣${negativeDeduction}元，实际入账${actualProfit}元，` +
      `结算后余额${afterBalance}元`
    );
  }

  // 更新余额和累计分润（使用原子操作）
  await tx.$executeRaw`
    UPDATE agents
    SET balance = balance + ${amount},
        totalCommission = totalCommission + ${amount}
    WHERE id = ${agentId}
  `;

  // 创建资金流水
  const sourceLabel = sourceType === 'RESERVATION' ? '预约号' : '订单号';
  await tx.fundFlow.create({
    data: {
      agentId,
      type: 'PROFIT',
      amount,
      beforeBalance,
      afterBalance,
      relatedId: sourceId,
      relatedType: sourceType,
      remark: `利润结算（${sourceLabel}：${sourceNo}）`,
    },
  });

  // 【2026-01-22】创建审计追踪记录
  // 【2026-01-24 P0-01修复】添加负余额抵扣详情到审计记录
  await createTransactionTrace(tx, {
    traceType: TraceType.PROFIT_SETTLE,
    agentId,
    amount,
    beforeBalance,
    afterBalance,
    sourceTable: sourceType === 'RESERVATION' ? 'reservations' : 'orders',
    sourceId,
    sourceNo,
    details: {
      sourceType,
      sourceNo,
      profitAmount: amount,
      // 负余额抵扣信息
      hadNegativeBalance: beforeBalance < 0,
      negativeDeduction: negativeDeduction,
      actualProfit: actualProfit,
    },
    operatorType: OperatorType.SYSTEM,
    remark: negativeDeduction > 0
      ? `利润结算（${sourceLabel}：${sourceNo}）- 抵扣负余额${negativeDeduction}元`
      : `利润结算（${sourceLabel}：${sourceNo}）`,
  });
}

/**
 * 批量执行利润入账（总代+一级+二级）
 * @param distribution 利润分配信息
 * @param sourceType 来源类型
 * @param sourceId 来源ID
 * @param sourceNo 来源编号
 * @param tx Prisma事务客户端
 */
export async function settleAllProfits(
  distribution: ProfitDistribution,
  sourceType: ProfitSourceType,
  sourceId: number,
  sourceNo: string,
  tx: Prisma.TransactionClient
): Promise<void> {
  const {
    masterProfit,
    level1Profit,
    level2Profit,
    masterAgentId,
    level1AgentId,
    level2AgentId,
  } = distribution;

  // 总代理利润入账
  if (masterProfit > 0 && masterAgentId) {
    await executeSettlement(
      masterAgentId,
      masterProfit,
      sourceType,
      sourceId,
      sourceNo,
      tx
    );
  }

  // 一级推销员利润入账
  if (level1Profit > 0 && level1AgentId) {
    await executeSettlement(
      level1AgentId,
      level1Profit,
      sourceType,
      sourceId,
      sourceNo,
      tx
    );
  }

  // 二级推销员利润入账
  if (level2Profit > 0 && level2AgentId) {
    await executeSettlement(
      level2AgentId,
      level2Profit,
      sourceType,
      sourceId,
      sourceNo,
      tx
    );
  }
}

export default {
  executeSettlement,
  settleAllProfits,
};

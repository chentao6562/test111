/**
 * 预约操作审计服务
 * 【2026-01-17 新增】
 * 【2026-01-24 P0-04修复】支持事务客户端，确保审计记录与业务操作的事务一致性
 */

import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';

// 操作类型枚举
export enum AuditAction {
  CREATED = 'CREATED',                   // 创建预约
  ASSIGNED = 'ASSIGNED',                 // 自动分配
  CALL_RECORDED = 'CALL_RECORDED',       // 记录拨打电话
  CONFIRMED = 'CONFIRMED',               // 确认成功
  CALL_FAILED = 'CALL_FAILED',           // 确认失败
  PREPARE_STARTED = 'PREPARE_STARTED',   // 开始备货
  PREPARE_COMPLETED = 'PREPARE_COMPLETED', // 完成备货
  PICKUP_COMPLETED = 'PICKUP_COMPLETED', // 核销完成
  CANCELLED = 'CANCELLED',               // 取消预约
  EXPIRED = 'EXPIRED',                   // 预约过期
  ISSUE_REPORTED = 'ISSUE_REPORTED',     // 问题上报
}

// 操作类型中文标签
export const AuditActionLabels: Record<string, string> = {
  [AuditAction.CREATED]: '创建预约',
  [AuditAction.ASSIGNED]: '自动分配',
  [AuditAction.CALL_RECORDED]: '记录拨打电话',
  [AuditAction.CONFIRMED]: '确认成功',
  [AuditAction.CALL_FAILED]: '确认失败',
  [AuditAction.PREPARE_STARTED]: '开始备货',
  [AuditAction.PREPARE_COMPLETED]: '完成备货',
  [AuditAction.PICKUP_COMPLETED]: '核销完成',
  [AuditAction.CANCELLED]: '取消预约',
  [AuditAction.EXPIRED]: '预约过期',
  [AuditAction.ISSUE_REPORTED]: '问题上报',
};

// 操作人类型
export type OperatorType = 'SYSTEM' | 'STAFF' | 'ADMIN' | 'CUSTOMER';

// 操作人类型中文标签
export const OperatorTypeLabels: Record<string, string> = {
  SYSTEM: '系统',
  STAFF: '门店员工',
  ADMIN: '管理员',
  CUSTOMER: '客户',
};

/**
 * 记录预约操作审计日志
 * 【2026-01-24 P0-04修复】支持传入事务客户端，确保审计记录与业务操作的事务一致性
 * @param params 参数
 * @param tx 可选的Prisma事务客户端，如果提供则在事务内创建审计记录
 */
export async function logReservationAction(params: {
  reservationId: number;
  action: AuditAction | string;
  operatorId?: number;
  operatorType: OperatorType;
  operatorName?: string;
  details?: Record<string, any>;
  ipAddress?: string;
}, tx?: Prisma.TransactionClient): Promise<void> {
  const {
    reservationId,
    action,
    operatorId,
    operatorType,
    operatorName,
    details,
    ipAddress,
  } = params;

  // 使用传入的事务客户端或默认的prisma客户端
  const client = tx || prisma;

  try {
    await client.reservationAudit.create({
      data: {
        reservationId,
        action,
        operatorId,
        operatorType,
        operatorName,
        details: details ? JSON.stringify(details) : null,
        ipAddress,
      },
    });

    console.log(`[AuditService] 记录审计日志 - 预约ID: ${reservationId}, 操作: ${action}, 操作人: ${operatorName || operatorType}, 事务内: ${!!tx}`);
  } catch (error) {
    // 如果在事务内，抛出错误让事务回滚
    // 如果在事务外，只记录日志不影响主流程
    if (tx) {
      console.error('[AuditService] 事务内写入审计日志失败，将回滚事务:', error);
      throw error;
    } else {
      console.error('[AuditService] 写入审计日志失败:', error);
    }
  }
}

/**
 * 获取预约的审计日志列表
 */
export async function getReservationAuditLogs(reservationId: number) {
  const audits = await prisma.reservationAudit.findMany({
    where: { reservationId },
    orderBy: { createdAt: 'desc' },
  });

  return audits.map(audit => ({
    id: audit.id,
    action: audit.action,
    actionLabel: AuditActionLabels[audit.action] || audit.action,
    operatorId: audit.operatorId,
    operatorType: audit.operatorType,
    operatorTypeLabel: audit.operatorType ? OperatorTypeLabels[audit.operatorType] || audit.operatorType : null,
    operatorName: audit.operatorName,
    details: audit.details ? JSON.parse(audit.details) : null,
    ipAddress: audit.ipAddress,
    createdAt: audit.createdAt,
  }));
}

/**
 * 批量获取多个预约的最新操作
 */
export async function getLatestAuditForReservations(reservationIds: number[]) {
  if (reservationIds.length === 0) return {};

  const audits = await prisma.reservationAudit.findMany({
    where: { reservationId: { in: reservationIds } },
    orderBy: { createdAt: 'desc' },
  });

  // 按预约ID分组，只取最新一条
  const latestMap: Record<number, any> = {};
  for (const audit of audits) {
    if (!latestMap[audit.reservationId]) {
      latestMap[audit.reservationId] = {
        action: audit.action,
        actionLabel: AuditActionLabels[audit.action] || audit.action,
        operatorName: audit.operatorName,
        createdAt: audit.createdAt,
      };
    }
  }

  return latestMap;
}

export default {
  logReservationAction,
  getReservationAuditLogs,
  getLatestAuditForReservations,
  AuditAction,
  AuditActionLabels,
  OperatorTypeLabels,
};

/**
 * 审计追踪控制器
 * 提供管理后台的审计查询和操作API
 *
 * @author Claude
 * @date 2026-01-22
 */

import { Request, Response } from 'express';
import {
  getAgentFundTrace,
  traceReservationFunds,
  getPendingAlerts,
  resolveAlert,
  manualBalanceAdjust,
  getAuditOverview,
  createBalanceSnapshot,
  runReconciliation,
  createAllBalanceSnapshots,
  TraceType,
  AlertType,
  AlertSeverity,
} from '../services/audit/auditTraceService';
import prisma from '../utils/prisma';

/**
 * 获取审计概览数据
 * GET /api/admin/audit/overview
 */
export async function getOverview(req: Request, res: Response): Promise<void> {
  try {
    const overview = await getAuditOverview();

    res.json({
      code: 0,
      data: overview,
      message: '获取成功',
    });
  } catch (error) {
    console.error('[审计] 获取概览失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取审计概览失败',
    });
  }
}

/**
 * 查询推销员资金链路
 * GET /api/admin/audit/agent/:agentId/traces
 */
export async function getAgentTraces(req: Request, res: Response): Promise<void> {
  try {
    const agentId = parseInt(req.params.agentId);
    const { startDate, endDate, traceType, page = '1', pageSize = '20' } = req.query;

    const limit = parseInt(pageSize as string);
    const offset = (parseInt(page as string) - 1) * limit;

    const result = await getAgentFundTrace(agentId, {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      traceType: traceType as TraceType | undefined,
      limit,
      offset,
    });

    // 获取总数
    const total = await (prisma as any).transactionTrace.count({
      where: {
        agentId,
        status: 'SUCCESS',
        ...(startDate && { createdAt: { gte: new Date(startDate as string) } }),
        ...(endDate && { createdAt: { lte: new Date(endDate as string) } }),
        ...(traceType && { traceType: traceType as string }),
      },
    });

    res.json({
      code: 0,
      data: {
        ...result,
        pagination: {
          page: parseInt(page as string),
          pageSize: limit,
          total,
        },
      },
      message: '获取成功',
    });
  } catch (error) {
    console.error('[审计] 查询资金链路失败:', error);
    res.status(500).json({
      code: 500,
      message: '查询资金链路失败',
    });
  }
}

/**
 * 追溯预约的资金流向
 * GET /api/admin/audit/reservation/:reservationId/trace
 */
export async function getReservationTrace(req: Request, res: Response): Promise<void> {
  try {
    const reservationId = parseInt(req.params.reservationId);

    const result = await traceReservationFunds(reservationId);

    if (!result.reservation) {
      res.status(404).json({
        code: 404,
        message: '预约不存在',
      });
      return;
    }

    res.json({
      code: 0,
      data: result,
      message: '获取成功',
    });
  } catch (error) {
    console.error('[审计] 追溯预约资金失败:', error);
    res.status(500).json({
      code: 500,
      message: '追溯预约资金失败',
    });
  }
}

/**
 * 获取告警列表
 * GET /api/admin/audit/alerts
 */
export async function getAlerts(req: Request, res: Response): Promise<void> {
  try {
    const { alertType, severity, agentId, status = 'PENDING', page = '1', pageSize = '20' } = req.query;

    const limit = parseInt(pageSize as string);
    const offset = (parseInt(page as string) - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (alertType) where.alertType = alertType;
    if (severity) where.severity = severity;
    if (agentId) where.agentId = parseInt(agentId as string);

    const [alerts, total] = await Promise.all([
      (prisma as any).auditAlert.findMany({
        where,
        orderBy: [
          { severity: 'desc' },
          { createdAt: 'desc' },
        ],
        take: limit,
        skip: offset,
      }),
      (prisma as any).auditAlert.count({ where }),
    ]);

    res.json({
      code: 0,
      data: {
        list: alerts.map((a: any) => ({
          ...a,
          details: a.details ? JSON.parse(a.details) : null,
        })),
        pagination: {
          page: parseInt(page as string),
          pageSize: limit,
          total,
        },
      },
      message: '获取成功',
    });
  } catch (error) {
    console.error('[审计] 获取告警列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取告警列表失败',
    });
  }
}

/**
 * 处理告警
 * POST /api/admin/audit/alerts/:alertId/resolve
 */
export async function handleResolveAlert(req: Request, res: Response): Promise<void> {
  try {
    const alertId = parseInt(req.params.alertId);
    const { resolution, status = 'RESOLVED' } = req.body;
    const adminId = (req as any).user?.id || 0;

    if (!resolution) {
      res.status(400).json({
        code: 400,
        message: '请填写处理说明',
      });
      return;
    }

    await resolveAlert(alertId, adminId, resolution, status);

    res.json({
      code: 0,
      message: '处理成功',
    });
  } catch (error) {
    console.error('[审计] 处理告警失败:', error);
    res.status(500).json({
      code: 500,
      message: '处理告警失败',
    });
  }
}

/**
 * 人工调账
 * POST /api/admin/audit/agent/:agentId/adjust
 */
export async function adjustBalance(req: Request, res: Response): Promise<void> {
  try {
    const agentId = parseInt(req.params.agentId);
    const { amount, reason } = req.body;
    const admin = (req as any).user;

    if (!amount || amount === 0) {
      res.status(400).json({
        code: 400,
        message: '请填写调账金额',
      });
      return;
    }

    if (!reason) {
      res.status(400).json({
        code: 400,
        message: '请填写调账原因',
      });
      return;
    }

    const traceId = await manualBalanceAdjust(
      agentId,
      amount,
      reason,
      admin?.id || 0,
      admin?.name || '管理员'
    );

    res.json({
      code: 0,
      data: { traceId },
      message: '调账成功',
    });
  } catch (error) {
    console.error('[审计] 人工调账失败:', error);
    res.status(500).json({
      code: 500,
      message: error instanceof Error ? error.message : '人工调账失败',
    });
  }
}

/**
 * 获取余额快照列表
 * GET /api/admin/audit/snapshots
 */
export async function getSnapshots(req: Request, res: Response): Promise<void> {
  try {
    const { agentId, snapshotType, isConsistent, page = '1', pageSize = '20' } = req.query;

    const limit = parseInt(pageSize as string);
    const offset = (parseInt(page as string) - 1) * limit;

    const where: Record<string, unknown> = {};
    if (agentId) where.agentId = parseInt(agentId as string);
    if (snapshotType) where.snapshotType = snapshotType;
    if (isConsistent !== undefined) where.isConsistent = isConsistent === 'true';

    const [snapshots, total] = await Promise.all([
      (prisma as any).balanceSnapshot.findMany({
        where,
        include: {
          agent: {
            select: { id: true, name: true, phone: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      (prisma as any).balanceSnapshot.count({ where }),
    ]);

    res.json({
      code: 0,
      data: {
        list: snapshots,
        pagination: {
          page: parseInt(page as string),
          pageSize: limit,
          total,
        },
      },
      message: '获取成功',
    });
  } catch (error) {
    console.error('[审计] 获取快照列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取快照列表失败',
    });
  }
}

/**
 * 手动创建余额快照
 * POST /api/admin/audit/agent/:agentId/snapshot
 */
export async function createSnapshot(req: Request, res: Response): Promise<void> {
  try {
    const agentId = parseInt(req.params.agentId);

    await createBalanceSnapshot(agentId, 'MANUAL');

    res.json({
      code: 0,
      message: '快照创建成功',
    });
  } catch (error) {
    console.error('[审计] 创建快照失败:', error);
    res.status(500).json({
      code: 500,
      message: '创建快照失败',
    });
  }
}

/**
 * 手动执行对账
 * POST /api/admin/audit/reconciliation
 */
export async function runManualReconciliation(req: Request, res: Response): Promise<void> {
  try {
    const { startDate, endDate } = req.body;
    const adminId = (req as any).user?.id || 0;

    if (!startDate || !endDate) {
      res.status(400).json({
        code: 400,
        message: '请选择对账时间范围',
      });
      return;
    }

    const logId = await runReconciliation(
      new Date(startDate),
      new Date(endDate),
      'MANUAL',
      adminId
    );

    res.json({
      code: 0,
      data: { logId },
      message: '对账完成',
    });
  } catch (error) {
    console.error('[审计] 手动对账失败:', error);
    res.status(500).json({
      code: 500,
      message: '对账失败',
    });
  }
}

/**
 * 获取对账记录列表
 * GET /api/admin/audit/reconciliation/logs
 */
export async function getReconciliationLogs(req: Request, res: Response): Promise<void> {
  try {
    const { reconcileType, status, page = '1', pageSize = '20' } = req.query;

    const limit = parseInt(pageSize as string);
    const offset = (parseInt(page as string) - 1) * limit;

    const where: Record<string, unknown> = {};
    if (reconcileType) where.reconcileType = reconcileType;
    if (status) where.status = status;

    const [logs, total] = await Promise.all([
      (prisma as any).reconciliationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      (prisma as any).reconciliationLog.count({ where }),
    ]);

    res.json({
      code: 0,
      data: {
        list: logs.map((l: any) => ({
          ...l,
          discrepancies: l.discrepancies ? JSON.parse(l.discrepancies) : null,
        })),
        pagination: {
          page: parseInt(page as string),
          pageSize: limit,
          total,
        },
      },
      message: '获取成功',
    });
  } catch (error) {
    console.error('[审计] 获取对账记录失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取对账记录失败',
    });
  }
}

/**
 * 批量创建所有推销员快照
 * POST /api/admin/audit/snapshots/batch
 */
export async function createBatchSnapshots(req: Request, res: Response): Promise<void> {
  try {
    const result = await createAllBalanceSnapshots('MANUAL');

    res.json({
      code: 0,
      data: result,
      message: `快照创建完成：共${result.total}人，一致${result.consistent}人，差异${result.discrepancy}人`,
    });
  } catch (error) {
    console.error('[审计] 批量创建快照失败:', error);
    res.status(500).json({
      code: 500,
      message: '批量创建快照失败',
    });
  }
}

/**
 * 获取交易追踪详情
 * GET /api/admin/audit/trace/:traceId
 */
export async function getTraceDetail(req: Request, res: Response): Promise<void> {
  try {
    const { traceId } = req.params;

    const trace = await (prisma as any).transactionTrace.findUnique({
      where: { traceId },
      include: {
        agent: {
          select: { id: true, name: true, phone: true },
        },
      },
    });

    if (!trace) {
      res.status(404).json({
        code: 404,
        message: '追踪记录不存在',
      });
      return;
    }

    res.json({
      code: 0,
      data: {
        ...trace,
        details: trace.details ? JSON.parse(trace.details) : null,
      },
      message: '获取成功',
    });
  } catch (error) {
    console.error('[审计] 获取追踪详情失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取追踪详情失败',
    });
  }
}

export default {
  getOverview,
  getAgentTraces,
  getReservationTrace,
  getAlerts,
  handleResolveAlert,
  adjustBalance,
  getSnapshots,
  createSnapshot,
  runManualReconciliation,
  getReconciliationLogs,
  createBatchSnapshots,
  getTraceDetail,
};

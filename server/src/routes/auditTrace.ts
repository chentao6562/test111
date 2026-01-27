/**
 * 审计追踪路由
 * 管理后台专用，用于资金追踪、对账和异常处理
 *
 * @author Claude
 * @date 2026-01-22
 */

import { Router } from 'express';
import {
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
} from '../controllers/auditTraceController';
import { authAdmin } from '../middlewares/auth';

const router = Router();

// 所有路由都需要管理员认证
router.use(authAdmin);

// 概览
router.get('/overview', getOverview);

// 交易追踪
router.get('/agent/:agentId/traces', getAgentTraces);
router.get('/reservation/:reservationId/trace', getReservationTrace);
router.get('/trace/:traceId', getTraceDetail);

// 告警管理
router.get('/alerts', getAlerts);
router.post('/alerts/:alertId/resolve', handleResolveAlert);

// 余额调账
router.post('/agent/:agentId/adjust', adjustBalance);

// 余额快照
router.get('/snapshots', getSnapshots);
router.post('/agent/:agentId/snapshot', createSnapshot);
router.post('/snapshots/batch', createBatchSnapshots);

// 对账
router.post('/reconciliation', runManualReconciliation);
router.get('/reconciliation/logs', getReconciliationLogs);

export default router;

/**
 * 健康检查路由
 * 【2026-01-22 高并发优化】
 *
 * @author Claude
 * @date 2026-01-22
 */

import { Router } from 'express';
import {
  healthCheck,
  detailedHealthCheck,
  systemMetrics,
  readinessCheck,
  livenessCheck,
} from '../controllers/healthController';
import { authAdmin } from '../middlewares/auth';

const router = Router();

// 公开端点（无需认证）
router.get('/', healthCheck);           // 基础健康检查
router.get('/live', livenessCheck);     // 存活检查
router.get('/ready', readinessCheck);   // 就绪检查

// 受保护端点（需要管理员认证）
router.get('/detailed', authAdmin, detailedHealthCheck);  // 详细健康检查
router.get('/metrics', authAdmin, systemMetrics);         // 系统指标

export default router;

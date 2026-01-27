/**
 * 发圈审核路由
 * 【2026-01-20】
 */

import { Router } from 'express';
import { authAgent, authAdmin } from '../middlewares/auth';
import {
  submitShareHandler,
  getMySharesHandler,
  getPendingSharesHandler,
  approveShareHandler,
  rejectShareHandler,
  batchApproveHandler,
  getShareStatsHandler,
} from '../controllers/shareAuditController';

const router = Router();

// ==================== 推销员端 API ====================

// 提交发圈
router.post('/shares', authAgent, submitShareHandler);

// 获取我的发圈列表
router.get('/shares', authAgent, getMySharesHandler);

// ==================== 管理后台 API ====================

// 获取发圈列表（支持筛选状态）
router.get('/admin/shares', authAdmin, getPendingSharesHandler);

// 审核通过
router.post('/admin/shares/:id/approve', authAdmin, approveShareHandler);

// 审核驳回
router.post('/admin/shares/:id/reject', authAdmin, rejectShareHandler);

// 批量审核通过
router.post('/admin/shares/batch-approve', authAdmin, batchApproveHandler);

// 获取审核统计
router.get('/admin/shares/stats', authAdmin, getShareStatsHandler);

export default router;

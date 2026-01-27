/**
 * 发圈审核控制器
 * 【2026-01-20】
 */

import { Request, Response } from 'express';
import * as shareAuditService from '../services/campaign2026/shareAuditService';

// ==================== 推销员端 API ====================

/**
 * 提交发圈
 * POST /api/shares
 */
export async function submitShareHandler(req: Request, res: Response): Promise<void> {
  try {
    const agentId = (req as any).agent?.id;
    if (!agentId) {
      res.status(401).json({ code: 401, message: '未登录' });
      return;
    }

    const { imageUrl, shareType } = req.body;

    if (!imageUrl) {
      res.status(400).json({ code: 400, message: '请上传发圈截图' });
      return;
    }

    const result = await shareAuditService.submitShare({
      agentId,
      imageUrl,
      shareType,
    });

    res.json({
      code: 0,
      message: result.message,
      data: {
        id: result.id,
        status: result.status,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '提交失败';
    res.status(400).json({ code: 400, message });
  }
}

/**
 * 获取我的发圈列表
 * GET /api/shares
 */
export async function getMySharesHandler(req: Request, res: Response): Promise<void> {
  try {
    const agentId = (req as any).agent?.id;
    if (!agentId) {
      res.status(401).json({ code: 401, message: '未登录' });
      return;
    }

    const { status, page, pageSize } = req.query;

    const result = await shareAuditService.getAgentShares(agentId, {
      status: status as string,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });

    res.json({
      code: 0,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取失败';
    res.status(500).json({ code: 500, message });
  }
}

// ==================== 管理后台 API ====================

/**
 * 获取待审核发圈列表
 * GET /api/admin/shares
 */
export async function getPendingSharesHandler(req: Request, res: Response): Promise<void> {
  try {
    const { status, agentId, keyword, page, pageSize } = req.query;

    const result = await shareAuditService.getPendingShares({
      status: status as string,
      agentId: agentId ? Number(agentId) : undefined,
      keyword: keyword as string,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });

    res.json({
      code: 0,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取失败';
    res.status(500).json({ code: 500, message });
  }
}

/**
 * 审核通过
 * POST /api/admin/shares/:id/approve
 */
export async function approveShareHandler(req: Request, res: Response): Promise<void> {
  try {
    const shareId = Number(req.params.id);
    const adminId = (req as any).user?.id || 0;

    if (!shareId) {
      res.status(400).json({ code: 400, message: '无效的发圈ID' });
      return;
    }

    const result = await shareAuditService.approveShare(shareId, adminId);

    res.json({
      code: 0,
      message: '审核通过',
      data: {
        bonusIssued: result.bonusIssued,
        bonusAmount: result.bonusAmount,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '审核失败';
    res.status(400).json({ code: 400, message });
  }
}

/**
 * 审核驳回
 * POST /api/admin/shares/:id/reject
 */
export async function rejectShareHandler(req: Request, res: Response): Promise<void> {
  try {
    const shareId = Number(req.params.id);
    const adminId = (req as any).user?.id || 0;
    const { rejectReason } = req.body;

    if (!shareId) {
      res.status(400).json({ code: 400, message: '无效的发圈ID' });
      return;
    }

    if (!rejectReason) {
      res.status(400).json({ code: 400, message: '请填写驳回原因' });
      return;
    }

    await shareAuditService.rejectShare(shareId, adminId, rejectReason);

    res.json({
      code: 0,
      message: '已驳回',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '操作失败';
    res.status(400).json({ code: 400, message });
  }
}

/**
 * 批量审核通过
 * POST /api/admin/shares/batch-approve
 */
export async function batchApproveHandler(req: Request, res: Response): Promise<void> {
  try {
    const adminId = (req as any).user?.id || 0;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ code: 400, message: '请选择要审核的发圈' });
      return;
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ id: number; error: string }>,
    };

    for (const id of ids) {
      try {
        await shareAuditService.approveShare(Number(id), adminId);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          id,
          error: error instanceof Error ? error.message : '审核失败',
        });
      }
    }

    res.json({
      code: 0,
      message: `成功审核 ${results.success} 条，失败 ${results.failed} 条`,
      data: results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '操作失败';
    res.status(500).json({ code: 500, message });
  }
}

/**
 * 获取审核统计
 * GET /api/admin/shares/stats
 */
export async function getShareStatsHandler(req: Request, res: Response): Promise<void> {
  try {
    const stats = await shareAuditService.getShareAuditStats();

    res.json({
      code: 0,
      data: stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取失败';
    res.status(500).json({ code: 500, message });
  }
}

export default {
  submitShareHandler,
  getMySharesHandler,
  getPendingSharesHandler,
  approveShareHandler,
  rejectShareHandler,
  batchApproveHandler,
  getShareStatsHandler,
};

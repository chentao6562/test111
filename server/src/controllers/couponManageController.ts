/**
 * 代金券管理控制器
 * 【2026-01-21】
 *
 * API:
 * - GET /admin/coupon-stats/overview - 总体统计
 * - GET /admin/coupon-stats/by-source - 按来源统计
 * - GET /admin/coupon-stats/by-agent - 按推销员统计
 * - GET /admin/coupon-stats/list - 代金券明细
 * - POST /admin/coupon-stats/grant - 管理员发放代金券
 *
 * - GET /promotion/coupon/level2-list - 一级获取下级列表
 * - POST /promotion/coupon/grant - 一级给二级发券
 */

import { Request, Response } from 'express';
import * as couponManageService from '../services/campaign2026/couponManageService';

// ============ 管理后台接口 ============

/**
 * 获取代金券总体统计
 */
export const getOverview = async (req: Request, res: Response) => {
  try {
    const result = await couponManageService.getCouponOverview();
    res.json({
      code: 0,
      message: 'success',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      code: 500,
      message: error.message || '获取统计失败',
    });
  }
};

/**
 * 获取按来源统计
 */
export const getStatsBySource = async (req: Request, res: Response) => {
  try {
    const result = await couponManageService.getCouponStatsBySource();
    res.json({
      code: 0,
      message: 'success',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      code: 500,
      message: error.message || '获取统计失败',
    });
  }
};

/**
 * 获取按推销员统计
 */
export const getStatsByAgent = async (req: Request, res: Response) => {
  try {
    const { page, pageSize, keyword, agentType } = req.query;
    const result = await couponManageService.getCouponStatsByAgent({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      keyword: keyword as string,
      agentType: agentType as string,
    });
    res.json({
      code: 0,
      message: 'success',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      code: 500,
      message: error.message || '获取统计失败',
    });
  }
};

/**
 * 获取代金券明细列表
 */
export const getCouponList = async (req: Request, res: Response) => {
  try {
    const { page, pageSize, status, sourceType, agentId, keyword } = req.query;
    const result = await couponManageService.getCouponList({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      status: status as string,
      sourceType: sourceType as string,
      agentId: agentId ? Number(agentId) : undefined,
      keyword: keyword as string,
    });
    res.json({
      code: 0,
      message: 'success',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      code: 500,
      message: error.message || '获取列表失败',
    });
  }
};

/**
 * 管理员发放代金券
 */
export const adminGrant = async (req: Request, res: Response) => {
  try {
    const { agentId, amount, remark } = req.body;
    const operatorId = (req as any).user?.id || 0;

    if (!agentId) {
      res.status(400).json({
        code: 400,
        message: '请选择推销员',
      });
      return;
    }

    if (!amount || amount <= 0) {
      res.status(400).json({
        code: 400,
        message: '请输入正确的金额',
      });
      return;
    }

    const result = await couponManageService.adminGrantCoupon({
      agentId: Number(agentId),
      amount: Number(amount),
      remark,
      operatorId,
    });

    res.json({
      code: 0,
      message: '发放成功',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      code: 400,
      message: error.message || '发放失败',
    });
  }
};

// ============ H5端接口（一级给二级发券）============

/**
 * 获取一级推销员的下级列表
 */
export const getLevel2List = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).user?.id;
    if (!agentId) {
      res.status(401).json({
        code: 401,
        message: '请先登录',
      });
      return;
    }

    const result = await couponManageService.getLevel2List(agentId);
    res.json({
      code: 0,
      message: 'success',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      code: 400,
      message: error.message || '获取列表失败',
    });
  }
};

/**
 * 一级推销员给二级发放代金券
 */
export const level1Grant = async (req: Request, res: Response) => {
  try {
    const level1Id = (req as any).user?.id;
    if (!level1Id) {
      res.status(401).json({
        code: 401,
        message: '请先登录',
      });
      return;
    }

    const { level2Id, amount, remark } = req.body;

    if (!level2Id) {
      res.status(400).json({
        code: 400,
        message: '请选择下级推销员',
      });
      return;
    }

    if (!amount || amount <= 0) {
      res.status(400).json({
        code: 400,
        message: '请输入正确的金额',
      });
      return;
    }

    const result = await couponManageService.level1GrantCoupon({
      level1Id,
      level2Id: Number(level2Id),
      amount: Number(amount),
      remark,
    });

    res.json({
      code: 0,
      message: '发放成功',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      code: 400,
      message: error.message || '发放失败',
    });
  }
};

export default {
  getOverview,
  getStatsBySource,
  getStatsByAgent,
  getCouponList,
  adminGrant,
  getLevel2List,
  level1Grant,
};

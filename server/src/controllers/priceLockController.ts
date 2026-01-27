/**
 * 锁价控制器
 * @module controllers/priceLockController
 * @since 2026-01-21
 */

import { Request, Response } from 'express';
import * as priceLockService from '../services/priceLock/priceLockService';

/**
 * 获取锁价配置
 * GET /api/price-lock/config
 */
export async function getConfig(req: Request, res: Response) {
  try {
    const config = await priceLockService.getPriceLockConfig();
    res.json({
      code: 0,
      message: 'success',
      data: config,
    });
  } catch (error) {
    console.error('获取锁价配置失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取配置失败',
      data: null,
    });
  }
}

/**
 * 创建锁价
 * POST /api/price-lock/create
 * Body: { customerPhone, customerName?, salespersonId?, items }
 */
export async function createPriceLock(req: Request, res: Response) {
  try {
    const { customerPhone, customerName, salespersonId, items } = req.body;

    if (!customerPhone) {
      res.status(400).json({
        code: 400,
        message: '请提供手机号',
        data: null,
      });
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        code: 400,
        message: '请选择要锁定价格的商品',
        data: null,
      });
      return;
    }

    const result = await priceLockService.createPriceLock({
      customerPhone,
      customerName,
      salespersonId,
      items,
    });

    if (result.success) {
      res.json({
        code: 0,
        message: 'success',
        data: { code: result.code },
      });
    } else {
      res.status(400).json({
        code: 400,
        message: result.message,
        data: null,
      });
    }
  } catch (error) {
    console.error('创建锁价失败:', error);
    res.status(500).json({
      code: 500,
      message: '创建锁价失败',
      data: null,
    });
  }
}

/**
 * 获取锁价详情
 * GET /api/price-lock/:code
 */
export async function getPriceLockDetail(req: Request, res: Response) {
  try {
    const { code } = req.params;

    const priceLock = await priceLockService.getPriceLockByCode(code);

    if (!priceLock) {
      res.status(404).json({
        code: 404,
        message: '锁价记录不存在',
        data: null,
      });
      return;
    }

    res.json({
      code: 0,
      message: 'success',
      data: priceLock,
    });
  } catch (error) {
    console.error('获取锁价详情失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取详情失败',
      data: null,
    });
  }
}

/**
 * 获取我的锁价列表
 * GET /api/price-lock/my
 * Query: customerPhone
 */
export async function getMyPriceLocks(req: Request, res: Response) {
  try {
    const customerPhone = req.query.customerPhone as string;

    if (!customerPhone) {
      res.status(400).json({
        code: 400,
        message: '请提供手机号',
        data: null,
      });
      return;
    }

    const priceLocks = await priceLockService.getCustomerPriceLocks(customerPhone);

    res.json({
      code: 0,
      message: 'success',
      data: priceLocks,
    });
  } catch (error) {
    console.error('获取锁价列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取列表失败',
      data: null,
    });
  }
}

/**
 * 获取当前有效的锁价
 * GET /api/price-lock/active
 * Query: customerPhone
 */
export async function getActivePriceLock(req: Request, res: Response) {
  try {
    const customerPhone = req.query.customerPhone as string;

    if (!customerPhone) {
      res.status(400).json({
        code: 400,
        message: '请提供手机号',
        data: null,
      });
      return;
    }

    const priceLock = await priceLockService.getActivePriceLock(customerPhone);

    res.json({
      code: 0,
      message: 'success',
      data: priceLock, // 可能为 null，表示没有有效锁价
    });
  } catch (error) {
    console.error('获取当前锁价失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取失败',
      data: null,
    });
  }
}

/**
 * 验证锁价码
 * POST /api/price-lock/validate
 * Body: { code, customerPhone }
 */
export async function validatePriceLock(req: Request, res: Response) {
  try {
    const { code, customerPhone } = req.body;

    if (!code || !customerPhone) {
      res.status(400).json({
        code: 400,
        message: '请提供锁价码和手机号',
        data: null,
      });
      return;
    }

    const result = await priceLockService.validatePriceLock(code, customerPhone);

    if (result.valid) {
      res.json({
        code: 0,
        message: 'success',
        data: result.priceLock,
      });
    } else {
      res.status(400).json({
        code: 400,
        message: result.message,
        data: null,
      });
    }
  } catch (error) {
    console.error('验证锁价码失败:', error);
    res.status(500).json({
      code: 500,
      message: '验证失败',
      data: null,
    });
  }
}

import { Request, Response } from 'express';
import { success, error, badRequest } from '../utils/response';
import * as retailService from '../services/retailService';

/**
 * 门店零售控制器
 */

/**
 * 创建零售订单
 * POST /api/retail/orders
 */
export async function createRetailOrder(req: Request, res: Response) {
  try {
    const { items, paymentType, customerName, customerPhone, remark } = req.body;

    // 验证必填字段
    if (!items || !Array.isArray(items) || items.length === 0) {
      return badRequest(res, '请选择商品');
    }

    if (!paymentType || !['CASH', 'SCAN', 'TRANSFER'].includes(paymentType)) {
      return badRequest(res, '请选择收款方式');
    }

    // 验证每个商品项
    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity < 1) {
        return badRequest(res, '商品数据无效');
      }
    }

    // 获取操作员信息 (从认证中间件获取)
    const user = (req as any).user;
    if (!user || user.type !== 'staff') {
      return error(res, '无权操作', 403);
    }

    const result = await retailService.createRetailOrder(
      user.id,
      user.name || user.username,
      {
        items,
        paymentType,
        customerName,
        customerPhone,
        remark
      }
    );

    if (result.success) {
      return success(res, result.order, result.message);
    } else {
      return badRequest(res, result.message);
    }
  } catch (err: any) {
    console.error('[RetailController] createRetailOrder error:', err);
    return error(res, '创建零售单失败');
  }
}

/**
 * 确认收款（库管端 - 现金/扫码）
 * POST /api/retail/orders/:id/confirm
 */
export async function confirmPayment(req: Request, res: Response) {
  try {
    const orderId = parseInt(req.params.id, 10);
    if (isNaN(orderId)) {
      return badRequest(res, '订单ID无效');
    }

    const user = (req as any).user;
    if (!user || user.type !== 'staff') {
      return error(res, '无权操作', 403);
    }

    const result = await retailService.confirmPayment(
      orderId,
      user.id,
      user.name || user.username,
      'WAREHOUSE'
    );

    if (result.success) {
      return success(res, result.order, result.message);
    } else {
      return badRequest(res, result.message);
    }
  } catch (err: any) {
    console.error('[RetailController] confirmPayment error:', err);
    return error(res, '确认收款失败');
  }
}

/**
 * 后台确认转账收款
 * POST /api/admin/retail/orders/:id/confirm
 */
export async function adminConfirmPayment(req: Request, res: Response) {
  try {
    const orderId = parseInt(req.params.id, 10);
    if (isNaN(orderId)) {
      return badRequest(res, '订单ID无效');
    }

    const user = (req as any).user;
    if (!user || user.type !== 'admin') {
      return error(res, '无权操作', 403);
    }

    const result = await retailService.confirmPayment(
      orderId,
      user.id,
      user.name || user.username,
      'ADMIN'
    );

    if (result.success) {
      return success(res, result.order, result.message);
    } else {
      return badRequest(res, result.message);
    }
  } catch (err: any) {
    console.error('[RetailController] adminConfirmPayment error:', err);
    return error(res, '确认收款失败');
  }
}

/**
 * 取消零售单
 * POST /api/retail/orders/:id/cancel
 */
export async function cancelRetailOrder(req: Request, res: Response) {
  try {
    const orderId = parseInt(req.params.id, 10);
    if (isNaN(orderId)) {
      return badRequest(res, '订单ID无效');
    }

    const { reason } = req.body;

    const user = (req as any).user;
    if (!user) {
      return error(res, '无权操作', 403);
    }

    const result = await retailService.cancelRetailOrder(orderId, user.id, reason);

    if (result.success) {
      return success(res, null, result.message);
    } else {
      return badRequest(res, result.message);
    }
  } catch (err: any) {
    console.error('[RetailController] cancelRetailOrder error:', err);
    return error(res, '取消零售单失败');
  }
}

/**
 * 获取零售单详情
 * GET /api/retail/orders/:id
 */
export async function getRetailOrderDetail(req: Request, res: Response) {
  try {
    const orderId = parseInt(req.params.id, 10);
    if (isNaN(orderId)) {
      return badRequest(res, '订单ID无效');
    }

    const order = await retailService.getRetailOrderDetail(orderId);

    if (!order) {
      return error(res, '零售单不存在', 404);
    }

    return success(res, order);
  } catch (err: any) {
    console.error('[RetailController] getRetailOrderDetail error:', err);
    return error(res, '获取零售单详情失败');
  }
}

/**
 * 获取零售单列表（库管端）
 * GET /api/retail/orders
 */
export async function getRetailOrderList(req: Request, res: Response) {
  try {
    const user = (req as any).user;

    const params = {
      page: parseInt(req.query.page as string, 10) || 1,
      pageSize: parseInt(req.query.pageSize as string, 10) || 10,
      status: req.query.status as string,
      paymentType: req.query.paymentType as string,
      operatorId: user?.type === 'staff' ? user.id : undefined, // 库管只能看自己的
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string
    };

    const result = await retailService.getRetailOrderList(params);
    return success(res, result);
  } catch (err: any) {
    console.error('[RetailController] getRetailOrderList error:', err);
    return error(res, '获取零售单列表失败');
  }
}

/**
 * 获取所有零售单列表（管理后台）
 * GET /api/admin/retail/orders
 */
export async function adminGetRetailOrderList(req: Request, res: Response) {
  try {
    const params = {
      page: parseInt(req.query.page as string, 10) || 1,
      pageSize: parseInt(req.query.pageSize as string, 10) || 10,
      status: req.query.status as string,
      paymentType: req.query.paymentType as string,
      operatorId: req.query.operatorId ? parseInt(req.query.operatorId as string, 10) : undefined,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string
    };

    const result = await retailService.getRetailOrderList(params);
    return success(res, result);
  } catch (err: any) {
    console.error('[RetailController] adminGetRetailOrderList error:', err);
    return error(res, '获取零售单列表失败');
  }
}

/**
 * 获取待确认的转账订单（管理后台）
 * GET /api/admin/retail/pending-transfers
 */
export async function getPendingTransferOrders(req: Request, res: Response) {
  try {
    const params = {
      page: parseInt(req.query.page as string, 10) || 1,
      pageSize: parseInt(req.query.pageSize as string, 10) || 10
    };

    const result = await retailService.getPendingTransferOrders(params);
    return success(res, result);
  } catch (err: any) {
    console.error('[RetailController] getPendingTransferOrders error:', err);
    return error(res, '获取待确认订单失败');
  }
}

/**
 * 记录打印次数
 * POST /api/retail/orders/:id/print
 */
export async function recordPrint(req: Request, res: Response) {
  try {
    const orderId = parseInt(req.params.id, 10);
    if (isNaN(orderId)) {
      return badRequest(res, '订单ID无效');
    }

    const result = await retailService.recordPrint(orderId);

    if (result) {
      return success(res, null, '打印记录已保存');
    } else {
      return error(res, '保存打印记录失败');
    }
  } catch (err: any) {
    console.error('[RetailController] recordPrint error:', err);
    return error(res, '保存打印记录失败');
  }
}

/**
 * 获取零售统计（库管端）
 * GET /api/retail/statistics
 */
export async function getRetailStatistics(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const operatorId = user?.type === 'staff' ? user.id : undefined;

    const result = await retailService.getRetailStatistics(operatorId);
    return success(res, result);
  } catch (err: any) {
    console.error('[RetailController] getRetailStatistics error:', err);
    return error(res, '获取统计数据失败');
  }
}

/**
 * 获取零售统计（管理后台 - 全部数据）
 * GET /api/admin/retail/statistics
 */
export async function adminGetRetailStatistics(req: Request, res: Response) {
  try {
    const operatorId = req.query.operatorId
      ? parseInt(req.query.operatorId as string, 10)
      : undefined;

    const result = await retailService.getRetailStatistics(operatorId);
    return success(res, result);
  } catch (err: any) {
    console.error('[RetailController] adminGetRetailStatistics error:', err);
    return error(res, '获取统计数据失败');
  }
}

/**
 * 获取小票数据
 * GET /api/retail/orders/:id/receipt
 */
export async function getReceiptData(req: Request, res: Response) {
  try {
    const orderId = parseInt(req.params.id, 10);
    if (isNaN(orderId)) {
      return badRequest(res, '订单ID无效');
    }

    const receipt = await retailService.generateReceiptData(orderId);

    if (!receipt) {
      return error(res, '零售单不存在', 404);
    }

    return success(res, receipt);
  } catch (err: any) {
    console.error('[RetailController] getReceiptData error:', err);
    return error(res, '获取小票数据失败');
  }
}

export default {
  createRetailOrder,
  confirmPayment,
  adminConfirmPayment,
  cancelRetailOrder,
  getRetailOrderDetail,
  getRetailOrderList,
  adminGetRetailOrderList,
  getPendingTransferOrders,
  recordPrint,
  getRetailStatistics,
  adminGetRetailStatistics,
  getReceiptData
};

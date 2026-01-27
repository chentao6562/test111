/**
 * 秒杀控制器
 * 【2026-01-20 秒杀系统】
 */

import { Request, Response } from 'express';
import { success, error, badRequest } from '../utils/response';
import * as flashSaleService from '../services/flashSale';

// ============ H5端接口 ============

/**
 * 获取当前秒杀活动
 * GET /api/h5/flash-sale/current
 */
export async function getCurrentActivity(req: Request, res: Response) {
  try {
    const result = await flashSaleService.getCurrentActivity();
    return success(res, result);
  } catch (err: any) {
    console.error('[FlashSaleController] getCurrentActivity error:', err);
    return error(res, '获取秒杀活动失败');
  }
}

/**
 * 检查是否满足加购条件
 * POST /api/h5/flash-sale/check-eligible
 * body: { normalOrderAmount: number }
 */
export async function checkEligible(req: Request, res: Response) {
  try {
    const { normalOrderAmount } = req.body;

    if (typeof normalOrderAmount !== 'number' || normalOrderAmount < 0) {
      return badRequest(res, '请提供有效的订单金额');
    }

    const activity = await flashSaleService.getCurrentActivity();

    if (!activity.hasActivity || !activity.activity) {
      return success(res, {
        eligible: false,
        message: '暂无秒杀活动',
      });
    }

    const minAmount = activity.activity.minOrderAmount;
    const eligible = normalOrderAmount >= minAmount;

    return success(res, {
      eligible,
      minOrderAmount: minAmount,
      currentAmount: normalOrderAmount,
      shortfall: eligible ? 0 : minAmount - normalOrderAmount,
      message: eligible
        ? '可加购秒杀商品'
        : `再买¥${(minAmount - normalOrderAmount).toFixed(2)}可加购秒杀商品`,
    });
  } catch (err: any) {
    console.error('[FlashSaleController] checkEligible error:', err);
    return error(res, '检查加购条件失败');
  }
}

// ============ 管理后台接口 ============

/**
 * 获取活动列表
 * GET /api/admin/flash-sale/activities
 */
export async function getActivityList(req: Request, res: Response) {
  try {
    const { page, pageSize, status } = req.query;

    const result = await flashSaleService.getActivityList({
      page: page ? parseInt(page as string, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize as string, 10) : 20,
      status: status as string | undefined,
    });

    return success(res, result);
  } catch (err: any) {
    console.error('[FlashSaleController] getActivityList error:', err);
    return error(res, '获取活动列表失败');
  }
}

/**
 * 获取活动详情
 * GET /api/admin/flash-sale/activities/:id
 */
export async function getActivityDetail(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return badRequest(res, '活动ID无效');
    }

    const activity = await flashSaleService.getActivityDetail(id);
    if (!activity) {
      return badRequest(res, '活动不存在');
    }

    return success(res, activity);
  } catch (err: any) {
    console.error('[FlashSaleController] getActivityDetail error:', err);
    return error(res, '获取活动详情失败');
  }
}

/**
 * 创建活动
 * POST /api/admin/flash-sale/activities
 */
export async function createActivity(req: Request, res: Response) {
  try {
    const { name, startTime, endTime, minOrderAmount, bannerImage, description } = req.body;
    const user = (req as any).user;

    if (!name || !startTime || !endTime) {
      return badRequest(res, '请填写完整活动信息');
    }

    if (new Date(endTime) <= new Date(startTime)) {
      return badRequest(res, '结束时间必须晚于开始时间');
    }

    const activity = await flashSaleService.createActivity({
      name,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      minOrderAmount: minOrderAmount || 200,
      bannerImage,
      description,
      createdBy: user?.id || 0,
    });

    return success(res, activity, '创建成功');
  } catch (err: any) {
    console.error('[FlashSaleController] createActivity error:', err);
    return error(res, '创建活动失败');
  }
}

/**
 * 更新活动
 * PUT /api/admin/flash-sale/activities/:id
 */
export async function updateActivity(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return badRequest(res, '活动ID无效');
    }

    const { name, startTime, endTime, minOrderAmount, bannerImage, description } = req.body;

    const activity = await flashSaleService.updateActivity(id, {
      name,
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      minOrderAmount,
      bannerImage,
      description,
    });

    return success(res, activity, '更新成功');
  } catch (err: any) {
    console.error('[FlashSaleController] updateActivity error:', err);
    return error(res, err.message || '更新活动失败');
  }
}

/**
 * 删除活动
 * DELETE /api/admin/flash-sale/activities/:id
 */
export async function deleteActivity(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return badRequest(res, '活动ID无效');
    }

    await flashSaleService.deleteActivity(id);
    return success(res, null, '删除成功');
  } catch (err: any) {
    console.error('[FlashSaleController] deleteActivity error:', err);
    return badRequest(res, err.message || '删除活动失败');
  }
}

/**
 * 更新活动状态
 * PUT /api/admin/flash-sale/activities/:id/status
 */
export async function updateActivityStatus(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return badRequest(res, '活动ID无效');
    }

    const { status } = req.body;
    if (!['DRAFT', 'ACTIVE', 'ENDED'].includes(status)) {
      return badRequest(res, '状态值无效');
    }

    const activity = await flashSaleService.updateActivityStatus(id, status);
    return success(res, activity, '状态更新成功');
  } catch (err: any) {
    console.error('[FlashSaleController] updateActivityStatus error:', err);
    return badRequest(res, err.message || '更新状态失败');
  }
}

/**
 * 添加秒杀商品（支持单个或批量）
 * POST /api/admin/flash-sale/activities/:id/items
 * body: { items: [...] } 或 { productId, flashPrice, flashStock, ... }
 */
export async function addItems(req: Request, res: Response) {
  try {
    const activityId = parseInt(req.params.id, 10);
    if (isNaN(activityId)) {
      return badRequest(res, '活动ID无效');
    }

    // 支持批量添加：前端传 { items: [...] }
    const { items, productId, flashPrice, flashStock, limitPerUser, sort } = req.body;

    // 批量添加模式
    if (items && Array.isArray(items)) {
      if (items.length === 0) {
        return badRequest(res, '请选择要添加的商品');
      }

      const addedItems = [];
      for (const item of items) {
        if (!item.productId || item.flashPrice === undefined || item.flashStock === undefined) {
          continue; // 跳过无效数据
        }
        const added = await flashSaleService.addFlashSaleItem(activityId, {
          productId: item.productId,
          flashPrice: item.flashPrice,
          flashStock: item.flashStock,
          limitPerUser: item.limitPerUser || 0,
          sort: item.sort || 0,
        });
        addedItems.push(added);
      }

      return success(res, addedItems, `成功添加${addedItems.length}件商品`);
    }

    // 单个添加模式（兼容旧逻辑）
    if (!productId || flashPrice === undefined || flashStock === undefined) {
      return badRequest(res, '请填写完整商品信息');
    }

    const item = await flashSaleService.addFlashSaleItem(activityId, {
      productId,
      flashPrice,
      flashStock,
      limitPerUser,
      sort,
    });

    return success(res, item, '添加成功');
  } catch (err: any) {
    console.error('[FlashSaleController] addItems error:', err);
    return badRequest(res, err.message || '添加商品失败');
  }
}

/**
 * 更新秒杀商品
 * PUT /api/admin/flash-sale/items/:itemId
 */
export async function updateItem(req: Request, res: Response) {
  try {
    const itemId = parseInt(req.params.itemId, 10);
    if (isNaN(itemId)) {
      return badRequest(res, '商品项ID无效');
    }

    const { flashPrice, flashStock, limitPerUser, sort } = req.body;

    const item = await flashSaleService.updateFlashSaleItem(itemId, {
      flashPrice,
      flashStock,
      limitPerUser,
      sort,
    });

    return success(res, item, '更新成功');
  } catch (err: any) {
    console.error('[FlashSaleController] updateItem error:', err);
    return badRequest(res, err.message || '更新商品失败');
  }
}

/**
 * 删除秒杀商品
 * DELETE /api/admin/flash-sale/items/:itemId
 */
export async function removeItem(req: Request, res: Response) {
  try {
    const itemId = parseInt(req.params.itemId, 10);
    if (isNaN(itemId)) {
      return badRequest(res, '商品项ID无效');
    }

    await flashSaleService.removeFlashSaleItem(itemId);
    return success(res, null, '删除成功');
  } catch (err: any) {
    console.error('[FlashSaleController] removeItem error:', err);
    return badRequest(res, err.message || '删除商品失败');
  }
}

export default {
  // H5
  getCurrentActivity,
  checkEligible,
  // Admin
  getActivityList,
  getActivityDetail,
  createActivity,
  updateActivity,
  deleteActivity,
  updateActivityStatus,
  addItems,
  updateItem,
  removeItem,
};

// 库存管理控制器
import { Request, Response } from 'express';
import * as stockService from '../services/stockService';
import { success, error } from '../utils/response';
import { sanitize } from '../utils/sanitize';

// ============ 管理后台 API ============

// 获取库存列表
export async function getStockList(req: Request, res: Response) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 10));
    // 支持 keyword 和 search 两种参数名
    const keyword = sanitize(req.query.keyword as string || req.query.search as string || '');
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
    const status = req.query.status as string;

    const result = await stockService.getStockList({
      page,
      pageSize,
      keyword,
      categoryId,
      status,
    });

    success(res, result);
  } catch (err: any) {
    console.error('获取库存列表失败:', err);
    error(res, err.message || '获取库存列表失败', 500);
  }
}

// 获取库存统计
export async function getStockStatistics(req: Request, res: Response) {
  try {
    const stats = await stockService.getStockStatistics();
    success(res, stats);
  } catch (err: any) {
    console.error('获取库存统计失败:', err);
    error(res, err.message || '获取库存统计失败', 500);
  }
}

// 获取商品库存详情
export async function getStockDetail(req: Request, res: Response) {
  try {
    const productId = parseInt(req.params.productId);
    if (isNaN(productId) || productId <= 0) {
      return error(res, '无效的商品ID', 400);
    }

    const detail = await stockService.getStockDetail(productId);
    success(res, detail);
  } catch (err: any) {
    console.error('获取库存详情失败:', err);
    if (err.message === '商品不存在') {
      return error(res, '商品不存在', 404);
    }
    error(res, err.message || '获取库存详情失败', 500);
  }
}

// 获取商品库存变动记录
export async function getStockLogs(req: Request, res: Response) {
  try {
    const productId = parseInt(req.params.productId);
    if (isNaN(productId) || productId <= 0) {
      return error(res, '无效的商品ID', 400);
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    const type = req.query.type as string;

    const logs = await stockService.getStockLogs(productId, { page, pageSize, type });
    success(res, logs);
  } catch (err: any) {
    console.error('获取库存日志失败:', err);
    error(res, err.message || '获取库存日志失败', 500);
  }
}

// 入库操作
export async function stockIn(req: Request, res: Response) {
  try {
    const { productId, quantity, remark } = req.body;

    if (!productId || isNaN(parseInt(productId))) {
      return error(res, '请选择商品', 400);
    }

    if (!quantity || isNaN(parseInt(quantity)) || parseInt(quantity) <= 0) {
      return error(res, '请输入有效的入库数量', 400);
    }

    // 从认证信息获取操作人
    const user = (req as any).user;

    const result = await stockService.stockIn({
      productId: parseInt(productId),
      quantity: parseInt(quantity),
      remark: sanitize(remark || ''),
      operatorId: user?.id,
      operatorName: user?.name || user?.username || '管理员',
    });

    success(res, result, '入库成功');
  } catch (err: any) {
    console.error('入库操作失败:', err);
    if (err.message === '商品不存在') {
      return error(res, '商品不存在', 404);
    }
    error(res, err.message || '入库操作失败', 500);
  }
}

// 库存调整
export async function stockAdjust(req: Request, res: Response) {
  try {
    const { productId, adjustQuantity, reason } = req.body;

    if (!productId || isNaN(parseInt(productId))) {
      return error(res, '请选择商品', 400);
    }

    if (adjustQuantity === undefined || adjustQuantity === null || isNaN(parseInt(adjustQuantity))) {
      return error(res, '请输入有效的调整数量', 400);
    }

    if (parseInt(adjustQuantity) === 0) {
      return error(res, '调整数量不能为0', 400);
    }

    if (!reason || !reason.trim()) {
      return error(res, '请输入调整原因', 400);
    }

    // 从认证信息获取操作人
    const user = (req as any).user;

    const result = await stockService.stockAdjust({
      productId: parseInt(productId),
      adjustQuantity: parseInt(adjustQuantity),
      reason: sanitize(reason),
      operatorId: user?.id,
      operatorName: user?.name || user?.username || '管理员',
    });

    success(res, result, '库存调整成功');
  } catch (err: any) {
    console.error('库存调整失败:', err);
    if (err.message === '商品不存在') {
      return error(res, '商品不存在', 404);
    }
    if (err.message === '调整后库存不能为负数') {
      return error(res, '调整后库存不能为负数', 400);
    }
    error(res, err.message || '库存调整失败', 500);
  }
}

// 设置预警值
export async function setStockWarning(req: Request, res: Response) {
  try {
    const productId = parseInt(req.params.productId);
    if (isNaN(productId) || productId <= 0) {
      return error(res, '无效的商品ID', 400);
    }

    const { minStock } = req.body;
    if (minStock === undefined || minStock === null || isNaN(parseInt(minStock))) {
      return error(res, '请输入有效的预警值', 400);
    }

    if (parseInt(minStock) < 0) {
      return error(res, '预警值不能为负数', 400);
    }

    const result = await stockService.setStockWarning(productId, parseInt(minStock));
    success(res, result, '预警值设置成功');
  } catch (err: any) {
    console.error('设置预警值失败:', err);
    if (err.message === '商品不存在') {
      return error(res, '商品不存在', 404);
    }
    error(res, err.message || '设置预警值失败', 500);
  }
}

// ============ 库管端 API ============

// 获取所有库存日志（库管端）
export async function getAllStockLogs(req: Request, res: Response) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    const type = req.query.type as string;
    const keyword = sanitize(req.query.keyword as string || '');

    const logs = await stockService.getAllStockLogs({ page, pageSize, type, keyword });
    success(res, logs);
  } catch (err: any) {
    console.error('获取库存日志失败:', err);
    error(res, err.message || '获取库存日志失败', 500);
  }
}

// 库管端入库操作
export async function staffStockIn(req: Request, res: Response) {
  try {
    const { productId, quantity, remark } = req.body;

    if (!productId || isNaN(parseInt(productId))) {
      return error(res, '请选择商品', 400);
    }

    if (!quantity || isNaN(parseInt(quantity)) || parseInt(quantity) <= 0) {
      return error(res, '请输入有效的入库数量', 400);
    }

    // 从认证信息获取操作人
    const user = (req as any).user;

    const result = await stockService.stockIn({
      productId: parseInt(productId),
      quantity: parseInt(quantity),
      remark: sanitize(remark || ''),
      operatorId: user?.id,
      operatorName: user?.name || '库管',
    });

    success(res, result, '入库成功');
  } catch (err: any) {
    console.error('入库操作失败:', err);
    if (err.message === '商品不存在') {
      return error(res, '商品不存在', 404);
    }
    error(res, err.message || '入库操作失败', 500);
  }
}

// 库管端库存调整
export async function staffStockAdjust(req: Request, res: Response) {
  try {
    const { productId, adjustQuantity, reason } = req.body;

    if (!productId || isNaN(parseInt(productId))) {
      return error(res, '请选择商品', 400);
    }

    if (adjustQuantity === undefined || adjustQuantity === null || isNaN(parseInt(adjustQuantity))) {
      return error(res, '请输入有效的调整数量', 400);
    }

    if (parseInt(adjustQuantity) === 0) {
      return error(res, '调整数量不能为0', 400);
    }

    if (!reason || !reason.trim()) {
      return error(res, '请输入调整原因', 400);
    }

    // 从认证信息获取操作人
    const user = (req as any).user;

    const result = await stockService.stockAdjust({
      productId: parseInt(productId),
      adjustQuantity: parseInt(adjustQuantity),
      reason: sanitize(reason),
      operatorId: user?.id,
      operatorName: user?.name || '库管',
    });

    success(res, result, '库存调整成功');
  } catch (err: any) {
    console.error('库存调整失败:', err);
    if (err.message === '商品不存在') {
      return error(res, '商品不存在', 404);
    }
    if (err.message === '调整后库存不能为负数') {
      return error(res, '调整后库存不能为负数', 400);
    }
    error(res, err.message || '库存调整失败', 500);
  }
}

// 通过条形码/商品ID/关键词查询商品（库管端扫码功能）
export async function getProductByBarcode(req: Request, res: Response) {
  try {
    const code = sanitize(req.query.code as string || '');

    if (!code || code.length < 1) {
      return error(res, '请输入条形码或商品编码', 400);
    }

    const product = await stockService.findProductByCode(code);

    if (!product) {
      return error(res, '未找到该商品，请检查条形码是否正确', 404);
    }

    success(res, product);
  } catch (err: any) {
    console.error('查询商品失败:', err);
    error(res, err.message || '查询商品失败', 500);
  }
}

// 库存盘点 - 提交盘点结果
export async function submitInventoryCheck(req: Request, res: Response) {
  try {
    const { productId, actualStock, remark } = req.body;

    if (!productId || isNaN(parseInt(productId))) {
      return error(res, '请选择商品', 400);
    }

    if (actualStock === undefined || actualStock === null || isNaN(parseInt(actualStock))) {
      return error(res, '请输入实际库存数量', 400);
    }

    if (parseInt(actualStock) < 0) {
      return error(res, '库存数量不能为负数', 400);
    }

    const user = (req as any).user;

    const result = await stockService.inventoryCheck({
      productId: parseInt(productId),
      actualStock: parseInt(actualStock),
      remark: sanitize(remark || ''),
      operatorId: user?.id,
      operatorName: user?.name || '库管',
    });

    success(res, result, result.message);
  } catch (err: any) {
    console.error('库存盘点失败:', err);
    if (err.message === '商品不存在') {
      return error(res, '商品不存在', 404);
    }
    error(res, err.message || '库存盘点失败', 500);
  }
}

// 批量盘点
export async function batchInventoryCheck(req: Request, res: Response) {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return error(res, '请提供盘点数据', 400);
    }

    const user = (req as any).user;
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const item of items) {
      try {
        if (!item.productId || item.actualStock === undefined) {
          results.push({ productId: item.productId, success: false, message: '数据不完整' });
          errorCount++;
          continue;
        }

        const result = await stockService.inventoryCheck({
          productId: parseInt(item.productId),
          actualStock: parseInt(item.actualStock),
          remark: sanitize(item.remark || '批量盘点'),
          operatorId: user?.id,
          operatorName: user?.name || '库管',
        });

        results.push({ ...result, success: true });
        successCount++;
      } catch (err: any) {
        results.push({ productId: item.productId, success: false, message: err.message });
        errorCount++;
      }
    }

    success(res, { results, successCount, errorCount }, `盘点完成: 成功${successCount}个, 失败${errorCount}个`);
  } catch (err: any) {
    console.error('批量盘点失败:', err);
    error(res, err.message || '批量盘点失败', 500);
  }
}

import { Request, Response } from 'express';
import * as cartService from '../services/cartService';
import { success, error, validationError } from '../utils/response';

/**
 * 获取购物车列表
 * GET /api/cart
 * 支持 ?selected=true 参数只返回选中的商品
 * 支持 ?s=推销员ID 参数，用于显示扫码绑定推销员的定价
 */
export async function getCartList(req: Request, res: Response) {
  try {
    const agentId = (req as any).user?.id;

    if (!agentId) {
      return error(res, '请先登录', 401);
    }

    const { selected, s: salespersonId } = req.query;
    // 【2026-01-19修复】传递扫码绑定的推销员ID
    const parsedSalespersonId = salespersonId ? parseInt(salespersonId as string, 10) : undefined;
    let items = await cartService.getCartItems(agentId, parsedSalespersonId);

    // 如果请求只要选中的商品
    if (selected === 'true') {
      items = items.filter((item: any) => item.selected === true);
      // 结算页需要的格式：直接返回数组，包含product信息
      const formattedItems = items.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        selected: item.selected,
        // 【2026-01-26】添加特价商品标识
        isSpecialPrice: item.isSpecialPrice || false,
        product: {
          id: item.productId,
          name: item.name,
          images: item.image ? [item.image] : [],
          agentPrice: item.price,
          retailPrice: item.originalPrice,
          stock: item.stock,
          unit: item.unit,
          specs: item.specs,
          // 【2026-01-11】移库费系统重构：添加移库相关字段
          allowTransfer: item.allowTransfer ?? true,
          transferFee: Number(item.transferFee || 0)
        }
      }));
      return success(res, formattedItems, '获取成功');
    }

    const summary = await cartService.getSelectedSummary(agentId);

    return success(res, {
      list: items,
      summary,
    }, '获取成功');
  } catch (err: any) {
    console.error('获取购物车失败:', err);
    return error(res, '获取购物车失败');
  }
}

/**
 * 获取购物车数量
 * GET /api/cart/count
 */
export async function getCartCount(req: Request, res: Response) {
  try {
    const agentId = (req as any).user?.id;

    if (!agentId) {
      return error(res, '请先登录', 401);
    }

    const count = await cartService.getCartCount(agentId);
    return success(res, { count }, '获取成功');
  } catch (err: any) {
    console.error('获取购物车数量失败:', err);
    return error(res, '获取购物车数量失败');
  }
}

/**
 * 添加商品到购物车
 * POST /api/cart
 */
export async function addToCart(req: Request, res: Response) {
  try {
    const agentId = (req as any).user?.id;
    const { productId, quantity = 1 } = req.body;

    if (!agentId) {
      return error(res, '请先登录', 401);
    }

    // 确保productId是数字类型
    const parsedProductId = Number(productId);
    if (!parsedProductId || isNaN(parsedProductId)) {
      return validationError(res, '商品ID无效');
    }

    // 确保quantity是数字类型
    const parsedQuantity = Number(quantity);
    if (!parsedQuantity || isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return validationError(res, '数量必须大于0');
    }

    const cartItem = await cartService.addToCart(agentId, parsedProductId, parsedQuantity);
    return success(res, cartItem, '添加成功');
  } catch (err: any) {
    console.error('添加购物车失败:', err);
    // 【2026-01-18 修复】处理更多业务错误情况
    if (err.message.includes('不存在') || err.message.includes('下架') ||
        err.message.includes('库存') || err.message.includes('登录') ||
        err.message.includes('禁用')) {
      return validationError(res, err.message);
    }
    return error(res, '添加购物车失败');
  }
}

/**
 * 更新购物车商品数量
 * PUT /api/cart/:id
 */
export async function updateCartItem(req: Request, res: Response) {
  try {
    const agentId = (req as any).user?.id;
    const { id } = req.params;
    const { quantity } = req.body;

    if (!agentId) {
      return error(res, '请先登录', 401);
    }

    if (!id || isNaN(parseInt(id, 10))) {
      return validationError(res, '购物车商品ID无效');
    }

    // 确保quantity是数字类型
    const parsedQuantity = Number(quantity);
    if (isNaN(parsedQuantity)) {
      return validationError(res, '数量无效');
    }

    const cartItem = await cartService.updateCartItem(
      agentId,
      parseInt(id, 10),
      parsedQuantity
    );

    return success(res, cartItem, quantity <= 0 ? '已删除' : '更新成功');
  } catch (err: any) {
    console.error('更新购物车失败:', err);
    if (err.message.includes('不存在') || err.message.includes('库存')) {
      return validationError(res, err.message);
    }
    return error(res, '更新购物车失败');
  }
}

/**
 * 删除购物车商品
 * DELETE /api/cart/:id
 */
export async function removeFromCart(req: Request, res: Response) {
  try {
    const agentId = (req as any).user?.id;
    const { id } = req.params;

    if (!agentId) {
      return error(res, '请先登录', 401);
    }

    if (!id || isNaN(parseInt(id, 10))) {
      return validationError(res, '购物车商品ID无效');
    }

    await cartService.removeFromCart(agentId, parseInt(id, 10));
    return success(res, null, '删除成功');
  } catch (err: any) {
    console.error('删除购物车失败:', err);
    if (err.message.includes('不存在')) {
      return validationError(res, err.message);
    }
    return error(res, '删除购物车失败');
  }
}

/**
 * 批量删除购物车商品
 * POST /api/cart/batch-delete
 */
export async function batchDelete(req: Request, res: Response) {
  try {
    const agentId = (req as any).user?.id;
    const { ids } = req.body;

    if (!agentId) {
      return error(res, '请先登录', 401);
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return validationError(res, '请选择要删除的商品');
    }

    const count = await cartService.batchRemoveFromCart(agentId, ids);
    return success(res, { deletedCount: count }, `已删除${count}件商品`);
  } catch (err: any) {
    console.error('批量删除购物车失败:', err);
    return error(res, '批量删除失败');
  }
}

/**
 * 清空购物车
 * DELETE /api/cart
 */
export async function clearCart(req: Request, res: Response) {
  try {
    const agentId = (req as any).user?.id;

    if (!agentId) {
      return error(res, '请先登录', 401);
    }

    await cartService.clearCart(agentId);
    return success(res, null, '已清空');
  } catch (err: any) {
    console.error('清空购物车失败:', err);
    return error(res, '清空购物车失败');
  }
}

/**
 * 更新选中状态
 * PUT /api/cart/:id/select
 */
export async function updateSelection(req: Request, res: Response) {
  try {
    const agentId = (req as any).user?.id;
    const { id } = req.params;
    const { selected } = req.body;

    if (!agentId) {
      return error(res, '请先登录', 401);
    }

    if (!id || isNaN(parseInt(id, 10))) {
      return validationError(res, '购物车商品ID无效');
    }

    if (typeof selected !== 'boolean') {
      return validationError(res, '选中状态无效');
    }

    const cartItem = await cartService.updateSelection(
      agentId,
      parseInt(id, 10),
      selected
    );

    return success(res, cartItem, '更新成功');
  } catch (err: any) {
    console.error('更新选中状态失败:', err);
    if (err.message.includes('不存在')) {
      return validationError(res, err.message);
    }
    return error(res, '更新选中状态失败');
  }
}

/**
 * 全选/取消全选
 * PUT /api/cart/select-all
 */
export async function selectAll(req: Request, res: Response) {
  try {
    const agentId = (req as any).user?.id;
    const { selected } = req.body;

    if (!agentId) {
      return error(res, '请先登录', 401);
    }

    if (typeof selected !== 'boolean') {
      return validationError(res, '选中状态无效');
    }

    await cartService.selectAll(agentId, selected);
    return success(res, null, selected ? '已全选' : '已取消全选');
  } catch (err: any) {
    console.error('全选操作失败:', err);
    return error(res, '全选操作失败');
  }
}

export default {
  getCartList,
  getCartCount,
  addToCart,
  updateCartItem,
  removeFromCart,
  batchDelete,
  clearCart,
  updateSelection,
  selectAll,
};

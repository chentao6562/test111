import { Request, Response } from 'express';
import * as categoryService from '../services/categoryService';
import { success, error, validationError } from '../utils/response';
import { sanitize } from '../utils/sanitize';

/**
 * 获取分类列表（公开接口）
 * GET /api/categories
 */
export async function list(req: Request, res: Response) {
  try {
    const { status } = req.query;

    const categories = await categoryService.findAll({
      status: status as string,
      includeProductCount: true,
    });

    success(res, categories);
  } catch (err: any) {
    console.error('获取分类列表失败:', err);
    error(res, '获取分类列表失败', 500);
  }
}

/**
 * 获取分类详情
 * GET /api/categories/:id
 */
export async function detail(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      error(res, '无效的分类ID', 400);
      return;
    }

    const category = await categoryService.findById(id);

    if (!category) {
      error(res, '分类不存在', 404);
      return;
    }

    success(res, category);
  } catch (err: any) {
    console.error('获取分类详情失败:', err);
    error(res, '获取分类详情失败', 500);
  }
}

/**
 * 创建分类（管理员）
 * POST /api/admin/categories
 */
export async function create(req: Request, res: Response) {
  try {
    const { name, icon, sort } = req.body;

    // 参数验证
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      validationError(res, '请输入分类名称');
      return;
    }

    if (name.length > 50) {
      validationError(res, '分类名称不能超过50个字符');
      return;
    }

    const category = await categoryService.create({
      name: sanitize(name.trim()),
      icon: icon ? sanitize(icon.trim()) : undefined,
      sort: typeof sort === 'number' ? sort : 0,
    });

    success(res, category, '创建成功');
  } catch (err: any) {
    console.error('创建分类失败:', err);
    error(res, '创建分类失败', 500);
  }
}

/**
 * 更新分类（管理员）
 * PUT /api/admin/categories/:id
 */
export async function update(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, icon, sort, status: statusVal } = req.body;

    if (isNaN(id)) {
      error(res, '无效的分类ID', 400);
      return;
    }

    // 检查分类是否存在
    const existing = await categoryService.findById(id);
    if (!existing) {
      error(res, '分类不存在', 404);
      return;
    }

    // 参数验证
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        validationError(res, '分类名称不能为空');
        return;
      }
      if (name.length > 50) {
        validationError(res, '分类名称不能超过50个字符');
        return;
      }
    }

    if (statusVal !== undefined && !['ACTIVE', 'INACTIVE'].includes(statusVal)) {
      validationError(res, '无效的状态值');
      return;
    }

    const category = await categoryService.update(id, {
      name: name ? sanitize(name.trim()) : undefined,
      icon: icon !== undefined ? (icon ? sanitize(icon.trim()) : null) : undefined,
      sort: typeof sort === 'number' ? sort : undefined,
      status: statusVal,
    });

    success(res, category, '更新成功');
  } catch (err: any) {
    console.error('更新分类失败:', err);
    error(res, '更新分类失败', 500);
  }
}

/**
 * 删除分类（管理员）
 * DELETE /api/admin/categories/:id
 */
export async function remove(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      error(res, '无效的分类ID', 400);
      return;
    }

    await categoryService.deleteCategory(id);
    success(res, null, '删除成功');
  } catch (err: any) {
    console.error('删除分类失败:', err);
    if (err.message.includes('无法删除') || err.message.includes('不存在')) {
      error(res, err.message, 400);
    } else {
      error(res, '删除分类失败', 500);
    }
  }
}

/**
 * 更新分类排序（管理员）
 * PUT /api/admin/categories/sort
 */
export async function updateSort(req: Request, res: Response) {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      validationError(res, '请提供分类ID列表');
      return;
    }

    // 验证所有ID都是数字
    if (!ids.every((id) => typeof id === 'number' && id > 0)) {
      validationError(res, '无效的分类ID');
      return;
    }

    await categoryService.updateSort(ids);
    success(res, null, '排序更新成功');
  } catch (err: any) {
    console.error('更新排序失败:', err);
    error(res, '更新排序失败', 500);
  }
}

/**
 * 切换分类状态（管理员）
 * PUT /api/admin/categories/:id/toggle
 */
export async function toggleStatus(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      error(res, '无效的分类ID', 400);
      return;
    }

    const category = await categoryService.toggleStatus(id);
    success(res, category, '状态更新成功');
  } catch (err: any) {
    console.error('切换状态失败:', err);
    if (err.message.includes('不存在')) {
      error(res, err.message, 404);
    } else {
      error(res, '切换状态失败', 500);
    }
  }
}

/**
 * 初始化场景分类（管理员）
 * POST /api/admin/categories/init-scene
 * 【2026-01-25】创建5个场景分类：网红款、居家款、套餐、常规款、特效礼花
 */
export async function initSceneCategories(req: Request, res: Response) {
  try {
    const categories = await categoryService.initSceneCategories();
    success(res, categories, '场景分类初始化成功');
  } catch (err: any) {
    console.error('初始化场景分类失败:', err);
    error(res, err.message || '初始化失败', 500);
  }
}

/**
 * 批量更新商品分类（管理员）
 * PUT /api/admin/products/batch-category
 * 【2026-01-25】支持批量将商品移动到指定分类
 */
export async function batchUpdateProductCategory(req: Request, res: Response) {
  try {
    const { productIds, categoryId } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      validationError(res, '请选择要更新的商品');
      return;
    }

    if (!categoryId || typeof categoryId !== 'number') {
      validationError(res, '请选择目标分类');
      return;
    }

    const result = await categoryService.batchUpdateProductCategory(
      productIds,
      categoryId
    );
    success(res, result, `成功更新${result.count}个商品的分类`);
  } catch (err: any) {
    console.error('批量更新商品分类失败:', err);
    error(res, err.message || '批量更新失败', 500);
  }
}

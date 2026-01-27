/**
 * 推荐商品控制器
 */
import { Request, Response } from 'express';
import * as recommendService from '../services/recommendService';
import { success, error } from '../utils/response';

/**
 * 获取推荐商品列表（小程序端）
 * 【2026-01-26】支持推销员看到拿货价
 * 【2026-01-27】支持客户通过推销员链接访问时看到推销员设置的价格
 */
export async function getRecommends(req: Request, res: Response) {
  try {
    const { type, s } = req.query;
    const salespersonId = s ? parseInt(s as string, 10) : null;

    // 【2026-01-26】获取用户信息，用于返回对应价格
    const user = (req as any).user;
    let agentType = user?.type === 'agent' ? user?.agentType : undefined;
    const agentId = user?.type === 'agent' ? user?.id : undefined;

    // 【2026-01-26】如果token中没有agentType（旧token），从数据库查询
    if (agentId && !agentType) {
      const prisma = (await import('../utils/prisma')).default;
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { type: true },
      });
      agentType = agent?.type;
    }

    const recommends = await recommendService.getActiveRecommends(
      type as string,
      agentType,
      agentId,
      salespersonId || undefined // 【2026-01-27】传递推销员ID用于客户访问场景
    );
    success(res, recommends);
  } catch (err: any) {
    console.error('获取推荐商品失败:', err);
    error(res, err.message || '获取推荐商品失败', 500);
  }
}

/**
 * 获取推荐商品列表（管理后台）
 */
export async function getAllRecommends(req: Request, res: Response) {
  try {
    const { page, pageSize, type, status } = req.query;
    const result = await recommendService.getAllRecommends({
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 20,
      type: type as string,
      status: status as string,
    });
    success(res, result);
  } catch (err: any) {
    console.error('获取推荐商品列表失败:', err);
    error(res, err.message || '获取推荐商品列表失败', 500);
  }
}

/**
 * 获取单个推荐商品
 */
export async function getRecommendById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const recommend = await recommendService.getRecommendById(parseInt(id));
    if (!recommend) {
      error(res, '推荐商品不存在', 404);
      return;
    }
    success(res, recommend);
  } catch (err: any) {
    console.error('获取推荐商品失败:', err);
    error(res, err.message || '获取推荐商品失败', 500);
  }
}

/**
 * 创建推荐商品
 */
export async function createRecommend(req: Request, res: Response) {
  try {
    const { productId, type, title, subtitle, badge, sortOrder, status } = req.body;

    if (!productId) {
      error(res, '商品ID不能为空', 400);
      return;
    }

    const userId = (req as any).user?.id || 0;
    const recommend = await recommendService.createRecommend({
      productId: parseInt(productId),
      type: type || 'HOT',
      title,
      subtitle,
      badge,
      sort: sortOrder ? parseInt(sortOrder) : 0,
      status: status || 'ACTIVE',
      createdBy: userId,
    });

    success(res, recommend, '创建成功');
  } catch (err: any) {
    console.error('创建推荐商品失败:', err);
    error(res, err.message || '创建推荐商品失败', 500);
  }
}

/**
 * 更新推荐商品
 */
export async function updateRecommend(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = req.body;

    const recommend = await recommendService.updateRecommend(parseInt(id), {
      type: data.type,
      title: data.title,
      subtitle: data.subtitle,
      badge: data.badge,
      sort: data.sortOrder !== undefined ? parseInt(data.sortOrder) : undefined,
      status: data.status,
    });

    success(res, recommend, '更新成功');
  } catch (err: any) {
    console.error('更新推荐商品失败:', err);
    error(res, err.message || '更新推荐商品失败', 500);
  }
}

/**
 * 删除推荐商品
 */
export async function deleteRecommend(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await recommendService.deleteRecommend(parseInt(id));
    success(res, null, '删除成功');
  } catch (err: any) {
    console.error('删除推荐商品失败:', err);
    error(res, err.message || '删除推荐商品失败', 500);
  }
}

/**
 * 批量更新排序
 */
export async function updateRecommendSort(req: Request, res: Response) {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      error(res, '排序数据不能为空', 400);
      return;
    }

    await recommendService.updateRecommendSort(items);
    success(res, null, '排序更新成功');
  } catch (err: any) {
    console.error('更新排序失败:', err);
    error(res, err.message || '更新排序失败', 500);
  }
}

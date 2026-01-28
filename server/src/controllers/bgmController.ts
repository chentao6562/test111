/**
 * BGM背景音乐控制器
 * @since 2026-01-28
 */

import { Request, Response } from 'express';
import * as bgmService from '../services/bgmService';

/**
 * 获取BGM列表（管理后台）
 * GET /admin/bgm
 */
export async function getBgmList(req: Request, res: Response) {
  try {
    const list = await bgmService.getBgmList();
    res.json({
      code: 0,
      data: list,
      message: 'success',
    });
  } catch (error) {
    console.error('获取BGM列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取BGM列表失败',
    });
  }
}

/**
 * 获取随机BGM（公开API）
 * GET /api/bgm/random
 */
export async function getRandomBgm(req: Request, res: Response) {
  try {
    const bgm = await bgmService.getRandomBgm();
    if (!bgm) {
      res.json({
        code: 0,
        data: null,
        message: '暂无可用BGM',
      });
      return;
    }
    res.json({
      code: 0,
      data: {
        id: bgm.id,
        name: bgm.name,
        url: bgm.url,
        duration: bgm.duration,
      },
      message: 'success',
    });
  } catch (error) {
    console.error('获取随机BGM失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取随机BGM失败',
    });
  }
}

/**
 * 创建BGM（管理后台）
 * POST /admin/bgm
 */
export async function createBgm(req: Request, res: Response) {
  try {
    const { name, url, duration, isActive, sortOrder } = req.body;

    if (!name || !url) {
      res.status(400).json({
        code: 400,
        message: '名称和URL不能为空',
      });
      return;
    }

    const bgm = await bgmService.createBgm({
      name,
      url,
      duration: duration ? parseInt(duration, 10) : undefined,
      isActive: isActive !== undefined ? isActive : true,
      sortOrder: sortOrder ? parseInt(sortOrder, 10) : 0,
    });

    res.json({
      code: 0,
      data: bgm,
      message: '创建成功',
    });
  } catch (error) {
    console.error('创建BGM失败:', error);
    res.status(500).json({
      code: 500,
      message: '创建BGM失败',
    });
  }
}

/**
 * 更新BGM（管理后台）
 * PUT /admin/bgm/:id
 */
export async function updateBgm(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, url, duration, isActive, sortOrder } = req.body;

    const existing = await bgmService.getBgmById(id);
    if (!existing) {
      res.status(404).json({
        code: 404,
        message: 'BGM不存在',
      });
      return;
    }

    const updateData: bgmService.UpdateBgmInput = {};
    if (name !== undefined) updateData.name = name;
    if (url !== undefined) updateData.url = url;
    if (duration !== undefined) updateData.duration = parseInt(duration, 10);
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = parseInt(sortOrder, 10);

    const bgm = await bgmService.updateBgm(id, updateData);

    res.json({
      code: 0,
      data: bgm,
      message: '更新成功',
    });
  } catch (error) {
    console.error('更新BGM失败:', error);
    res.status(500).json({
      code: 500,
      message: '更新BGM失败',
    });
  }
}

/**
 * 删除BGM（管理后台）
 * DELETE /admin/bgm/:id
 */
export async function deleteBgm(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);

    const existing = await bgmService.getBgmById(id);
    if (!existing) {
      res.status(404).json({
        code: 404,
        message: 'BGM不存在',
      });
      return;
    }

    await bgmService.deleteBgm(id);

    res.json({
      code: 0,
      message: '删除成功',
    });
  } catch (error) {
    console.error('删除BGM失败:', error);
    res.status(500).json({
      code: 500,
      message: '删除BGM失败',
    });
  }
}

/**
 * 批量更新排序（管理后台）
 * PUT /admin/bgm/sort
 */
export async function updateSortOrder(req: Request, res: Response) {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        code: 400,
        message: '排序数据不能为空',
      });
      return;
    }

    await bgmService.updateBgmSortOrder(items);

    res.json({
      code: 0,
      message: '排序更新成功',
    });
  } catch (error) {
    console.error('更新排序失败:', error);
    res.status(500).json({
      code: 500,
      message: '更新排序失败',
    });
  }
}

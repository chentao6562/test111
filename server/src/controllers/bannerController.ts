// Banner控制器
import { Request, Response } from 'express';
import * as bannerService from '../services/bannerService';
import { success, error } from '../utils/response';

// 获取Banner列表（小程序端）
export async function getBanners(req: Request, res: Response) {
  try {
    const banners = await bannerService.getActiveBanners();
    success(res, banners);
  } catch (err) {
    console.error('获取Banner列表失败:', err);
    error(res, '获取Banner列表失败', 500);
  }
}

// 获取所有Banner（管理后台）
export async function getAllBanners(req: Request, res: Response) {
  try {
    const { page, pageSize, status } = req.query;
    const result = await bannerService.getAllBanners({
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 10,
      status: status as string,
    });
    success(res, result);
  } catch (err) {
    console.error('获取Banner列表失败:', err);
    error(res, '获取Banner列表失败', 500);
  }
}

// 获取单个Banner
export async function getBannerById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const banner = await bannerService.getBannerById(parseInt(id));
    if (!banner) {
      error(res, 'Banner不存在', 404);
      return;
    }
    success(res, banner);
  } catch (err) {
    console.error('获取Banner失败:', err);
    error(res, '获取Banner失败', 500);
  }
}

// 创建Banner
export async function createBanner(req: Request, res: Response) {
  try {
    const { title, subtitle, imageUrl, linkType, linkValue, sortOrder, status } = req.body;

    if (!title || !imageUrl) {
      error(res, '标题和图片地址不能为空', 400);
      return;
    }

    const banner = await bannerService.createBanner({
      title,
      subtitle,
      imageUrl,
      linkType,
      linkValue,
      sortOrder,
      status,
    });

    success(res, banner, '创建成功');
  } catch (err) {
    console.error('创建Banner失败:', err);
    error(res, '创建Banner失败', 500);
  }
}

// 更新Banner
export async function updateBanner(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing = await bannerService.getBannerById(parseInt(id));
    if (!existing) {
      error(res, 'Banner不存在', 404);
      return;
    }

    const banner = await bannerService.updateBanner(parseInt(id), data);
    success(res, banner, '更新成功');
  } catch (err) {
    console.error('更新Banner失败:', err);
    error(res, '更新Banner失败', 500);
  }
}

// 删除Banner
export async function deleteBanner(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const existing = await bannerService.getBannerById(parseInt(id));
    if (!existing) {
      error(res, 'Banner不存在', 404);
      return;
    }

    await bannerService.deleteBanner(parseInt(id));
    success(res, null, '删除成功');
  } catch (err) {
    console.error('删除Banner失败:', err);
    error(res, '删除Banner失败', 500);
  }
}

// 批量更新排序
export async function updateBannerSort(req: Request, res: Response) {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      error(res, '排序数据不能为空', 400);
      return;
    }

    await bannerService.updateBannerSort(items);
    success(res, null, '排序更新成功');
  } catch (err) {
    console.error('更新排序失败:', err);
    error(res, '更新排序失败', 500);
  }
}

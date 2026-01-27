/**
 * 推广资料控制器
 * 处理推广文案和品牌素材的API请求
 */

import { Request, Response } from 'express';
import * as promotionMaterialService from '../services/promotionMaterialService';

// ============ 推广文案接口 ============

/**
 * 获取推广文案列表（管理后台）
 * GET /api/h5/admin/promotion-copies
 */
export async function getPromotionCopies(req: Request, res: Response) {
  try {
    const {
      type,
      productId,
      status,
      keyword,
      page = '1',
      pageSize = '10',
    } = req.query;

    const result = await promotionMaterialService.getPromotionCopies({
      type: type as string,
      productId: productId ? Number(productId) : undefined,
      status: status as string,
      keyword: keyword as string,
      page: Number(page),
      pageSize: Number(pageSize),
    });

    res.json({
      code: 0,
      message: 'success',
      data: result,
    });
  } catch (error) {
    console.error('获取推广文案列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取推广文案列表失败',
    });
  }
}

/**
 * 获取启用的推广文案列表（H5前端）
 * GET /api/h5/promotion-copies
 */
export async function getActiveCopies(req: Request, res: Response) {
  try {
    const { type, productId } = req.query;

    const list = await promotionMaterialService.getActiveCopies(
      type as string,
      productId ? Number(productId) : undefined
    );

    res.json({
      code: 0,
      message: 'success',
      data: list,
    });
  } catch (error) {
    console.error('获取推广文案失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取推广文案失败',
    });
  }
}

/**
 * 获取单个文案详情
 * GET /api/h5/admin/promotion-copies/:id
 */
export async function getCopyById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const copy = await promotionMaterialService.getCopyById(Number(id));

    if (!copy) {
      return res.status(404).json({
        code: 404,
        message: '文案不存在',
      });
    }

    res.json({
      code: 0,
      message: 'success',
      data: copy,
    });
  } catch (error) {
    console.error('获取文案详情失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取文案详情失败',
    });
  }
}

/**
 * 创建推广文案
 * POST /api/h5/admin/promotion-copies
 */
export async function createCopy(req: Request, res: Response) {
  try {
    const { type, productId, title, content, tags, sort, status } = req.body;

    // 参数校验
    if (!type || !title || !content) {
      return res.status(400).json({
        code: 400,
        message: '类型、标题和内容不能为空',
      });
    }

    // 验证类型
    const validTypes = ['MOMENTS', 'TALK', 'PRODUCT'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        code: 400,
        message: '无效的文案类型',
      });
    }

    const adminUser = (req as any).adminUser;
    const copy = await promotionMaterialService.createCopy({
      type,
      productId: productId ? Number(productId) : undefined,
      title,
      content,
      tags,
      sort: sort ? Number(sort) : 0,
      status: status || 'ACTIVE',
      createdBy: adminUser?.id || 0,
    });

    res.json({
      code: 0,
      message: '创建成功',
      data: copy,
    });
  } catch (error) {
    console.error('创建推广文案失败:', error);
    res.status(500).json({
      code: 500,
      message: '创建推广文案失败',
    });
  }
}

/**
 * 更新推广文案
 * PUT /api/h5/admin/promotion-copies/:id
 */
export async function updateCopy(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { type, productId, title, content, tags, sort, status } = req.body;

    // 检查文案是否存在
    const existing = await promotionMaterialService.getCopyById(Number(id));
    if (!existing) {
      return res.status(404).json({
        code: 404,
        message: '文案不存在',
      });
    }

    // 验证类型
    if (type) {
      const validTypes = ['MOMENTS', 'TALK', 'PRODUCT'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          code: 400,
          message: '无效的文案类型',
        });
      }
    }

    const copy = await promotionMaterialService.updateCopy(Number(id), {
      type,
      productId: productId === null ? null : (productId ? Number(productId) : undefined),
      title,
      content,
      tags: tags === null ? null : tags,
      sort: sort !== undefined ? Number(sort) : undefined,
      status,
    });

    res.json({
      code: 0,
      message: '更新成功',
      data: copy,
    });
  } catch (error) {
    console.error('更新推广文案失败:', error);
    res.status(500).json({
      code: 500,
      message: '更新推广文案失败',
    });
  }
}

/**
 * 删除推广文案
 * DELETE /api/h5/admin/promotion-copies/:id
 */
export async function deleteCopy(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // 检查文案是否存在
    const existing = await promotionMaterialService.getCopyById(Number(id));
    if (!existing) {
      return res.status(404).json({
        code: 404,
        message: '文案不存在',
      });
    }

    await promotionMaterialService.deleteCopy(Number(id));

    res.json({
      code: 0,
      message: '删除成功',
    });
  } catch (error) {
    console.error('删除推广文案失败:', error);
    res.status(500).json({
      code: 500,
      message: '删除推广文案失败',
    });
  }
}

// ============ 品牌素材接口 ============

/**
 * 获取品牌素材列表（管理后台）
 * GET /api/h5/admin/brand-assets
 */
export async function getBrandAssets(req: Request, res: Response) {
  try {
    const {
      type,
      status,
      keyword,
      page = '1',
      pageSize = '10',
    } = req.query;

    const result = await promotionMaterialService.getBrandAssets({
      type: type as string,
      status: status as string,
      keyword: keyword as string,
      page: Number(page),
      pageSize: Number(pageSize),
    });

    res.json({
      code: 0,
      message: 'success',
      data: result,
    });
  } catch (error) {
    console.error('获取品牌素材列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取品牌素材列表失败',
    });
  }
}

/**
 * 获取启用的品牌素材列表（H5前端）
 * GET /api/h5/brand-assets
 */
export async function getActiveAssets(req: Request, res: Response) {
  try {
    const { type } = req.query;

    const list = await promotionMaterialService.getActiveAssets(type as string);

    res.json({
      code: 0,
      message: 'success',
      data: list,
    });
  } catch (error) {
    console.error('获取品牌素材失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取品牌素材失败',
    });
  }
}

/**
 * 获取单个素材详情
 * GET /api/h5/admin/brand-assets/:id
 */
export async function getAssetById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const asset = await promotionMaterialService.getAssetById(Number(id));

    if (!asset) {
      return res.status(404).json({
        code: 404,
        message: '素材不存在',
      });
    }

    res.json({
      code: 0,
      message: 'success',
      data: asset,
    });
  } catch (error) {
    console.error('获取素材详情失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取素材详情失败',
    });
  }
}

/**
 * 创建品牌素材
 * POST /api/h5/admin/brand-assets
 */
export async function createAsset(req: Request, res: Response) {
  try {
    const { type, name, url, thumbnail, fileSize, description, sort, status } = req.body;

    // 参数校验
    if (!type || !name || !url) {
      return res.status(400).json({
        code: 400,
        message: '类型、名称和URL不能为空',
      });
    }

    // 验证类型
    const validTypes = ['LOGO', 'PHOTO', 'VIDEO', 'POSTER'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        code: 400,
        message: '无效的素材类型',
      });
    }

    const adminUser = (req as any).adminUser;
    const asset = await promotionMaterialService.createAsset({
      type,
      name,
      url,
      thumbnail,
      fileSize: fileSize ? Number(fileSize) : undefined,
      description,
      sort: sort ? Number(sort) : 0,
      status: status || 'ACTIVE',
      createdBy: adminUser?.id || 0,
    });

    res.json({
      code: 0,
      message: '创建成功',
      data: asset,
    });
  } catch (error) {
    console.error('创建品牌素材失败:', error);
    res.status(500).json({
      code: 500,
      message: '创建品牌素材失败',
    });
  }
}

/**
 * 更新品牌素材
 * PUT /api/h5/admin/brand-assets/:id
 */
export async function updateAsset(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { type, name, url, thumbnail, fileSize, description, sort, status } = req.body;

    // 检查素材是否存在
    const existing = await promotionMaterialService.getAssetById(Number(id));
    if (!existing) {
      return res.status(404).json({
        code: 404,
        message: '素材不存在',
      });
    }

    // 验证类型
    if (type) {
      const validTypes = ['LOGO', 'PHOTO', 'VIDEO', 'POSTER'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          code: 400,
          message: '无效的素材类型',
        });
      }
    }

    const asset = await promotionMaterialService.updateAsset(Number(id), {
      type,
      name,
      url,
      thumbnail: thumbnail === null ? null : thumbnail,
      fileSize: fileSize === null ? null : (fileSize !== undefined ? Number(fileSize) : undefined),
      description: description === null ? null : description,
      sort: sort !== undefined ? Number(sort) : undefined,
      status,
    });

    res.json({
      code: 0,
      message: '更新成功',
      data: asset,
    });
  } catch (error) {
    console.error('更新品牌素材失败:', error);
    res.status(500).json({
      code: 500,
      message: '更新品牌素材失败',
    });
  }
}

/**
 * 删除品牌素材
 * DELETE /api/h5/admin/brand-assets/:id
 */
export async function deleteAsset(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // 检查素材是否存在
    const existing = await promotionMaterialService.getAssetById(Number(id));
    if (!existing) {
      return res.status(404).json({
        code: 404,
        message: '素材不存在',
      });
    }

    await promotionMaterialService.deleteAsset(Number(id));

    res.json({
      code: 0,
      message: '删除成功',
    });
  } catch (error) {
    console.error('删除品牌素材失败:', error);
    res.status(500).json({
      code: 500,
      message: '删除品牌素材失败',
    });
  }
}

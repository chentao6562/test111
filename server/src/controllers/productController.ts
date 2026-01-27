import { Request, Response } from 'express';
import * as productService from '../services/productService';
import { success, error, validationError } from '../utils/response';
import { sanitize } from '../utils/sanitize';
import { parsePagination, parseId } from '../utils/controllerHelper';
import * as aiCopywritingService from '../services/aiCopywritingService';

/**
 * 获取商品列表（公开接口）
 * GET /api/products
 * 【2026-01-19修复】增加agentId传递，让推销员看到自己设置的零售价
 */
export async function list(req: Request, res: Response) {
  try {
    const { categoryId, keyword, sort } = req.query;
    const { page, pageSize } = parsePagination(req.query as any);

    // 获取当前用户类型和ID（从token中解析）
    const user = (req as any).user;
    let agentType = user?.type === 'agent' ? user?.agentType : undefined;
    const agentId = user?.type === 'agent' ? user?.id : undefined;

    // 【2026-01-19修复】如果token中没有agentType（旧token），从数据库查询
    if (agentId && !agentType) {
      const prisma = (await import('../utils/prisma')).default;
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { type: true },
      });
      agentType = agent?.type;
    }

    const result = await productService.findAll({
      page,
      pageSize,
      categoryId: categoryId ? parseInt(categoryId as string, 10) : undefined,
      status: 'ACTIVE', // 公开接口只返回上架商品
      keyword: keyword as string,
      sort: sort as any,
      agentType,
      agentId, // 【2026-01-19修复】传递推销员ID用于查询其设置的零售价
    });

    success(res, result);
  } catch (err: any) {
    console.error('获取商品列表失败:', err);
    error(res, '获取商品列表失败', 500);
  }
}

/**
 * 获取商品详情
 * GET /api/products/:id
 * 【2026-01-19修复】增加agentId传递，让推销员看到自己设置的零售价
 */
export async function detail(req: Request, res: Response) {
  try {
    const productId = parseId(req.params.id, '商品ID');

    // 获取当前用户类型和ID（从token中解析）
    const user = (req as any).user;
    let agentType = user?.type === 'agent' ? user?.agentType : undefined;
    const agentId = user?.type === 'agent' ? user?.id : undefined;

    // 【2026-01-19修复】如果token中没有agentType（旧token），从数据库查询
    if (agentId && !agentType) {
      const prisma = (await import('../utils/prisma')).default;
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { type: true },
      });
      agentType = agent?.type;
    }

    const product = await productService.findById(productId, agentType, agentId);

    if (!product) {
      error(res, '商品不存在', 404);
      return;
    }

    // 公开接口只返回上架商品
    if (product.status !== 'ACTIVE') {
      error(res, '商品已下架', 404);
      return;
    }

    success(res, product);
  } catch (err: any) {
    console.error('获取商品详情失败:', err);
    if (err.message.includes('无效的')) {
      error(res, err.message, 400);
      return;
    }
    error(res, '获取商品详情失败', 500);
  }
}

/**
 * 获取商品列表（管理员）
 * GET /api/admin/products
 */
export async function adminList(req: Request, res: Response) {
  try {
    const { categoryId, status, keyword, sort } = req.query;
    const { page, pageSize } = parsePagination(req.query as any);

    const result = await productService.findAll({
      page,
      pageSize,
      categoryId: categoryId ? parseInt(categoryId as string, 10) : undefined,
      status: status as string,
      keyword: keyword as string,
      sort: sort as any,
    });

    success(res, result);
  } catch (err: any) {
    console.error('获取商品列表失败:', err);
    error(res, '获取商品列表失败', 500);
  }
}

/**
 * 获取商品详情（管理员）
 * GET /api/admin/products/:id
 */
export async function adminDetail(req: Request, res: Response) {
  try {
    const productId = parseId(req.params.id, '商品ID');
    const product = await productService.findById(productId);

    if (!product) {
      error(res, '商品不存在', 404);
      return;
    }

    success(res, product);
  } catch (err: any) {
    console.error('获取商品详情失败:', err);
    if (err.message.includes('无效的')) {
      error(res, err.message, 400);
      return;
    }
    error(res, '获取商品详情失败', 500);
  }
}

/**
 * 创建商品（管理员）
 * POST /api/admin/products
 */
export async function create(req: Request, res: Response) {
  try {
    const {
      name,
      categoryId,
      images,
      description,
      retailPrice,
      agentPrice,
      wholesalePrice,
      costPrice,
      // 【2026-01-26 修复】新增四级价格体系字段
      supplyPrice,
      suggestedPrice,
      minRetailPrice,
      masterRetailPrice,
      stock,
      unit,
      purchaseUnit,
      unitConversion,
      specs,
      status: statusVal,
      sort,
      // 【2026-01-23 视频字段】
      videoUrl,
      videoThumbnail,
      videoDuration,
      // 【2026-01-26 特价商品】不参与任何营销活动
      isSpecialPrice,
    } = req.body;

    // 参数验证
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      validationError(res, '请输入商品名称');
      return;
    }

    if (name.length > 100) {
      validationError(res, '商品名称不能超过100个字符');
      return;
    }

    if (!categoryId || typeof categoryId !== 'number') {
      validationError(res, '请选择商品分类');
      return;
    }

    if (!images) {
      validationError(res, '请上传商品图片');
      return;
    }

    // 修复BUG-002: 价格验证 - 确保是有效数字且非负
    // 支持数字和可转换为数字的字符串
    const parsePrice = (value: any, fieldName: string): number | null => {
      if (value === undefined || value === null || value === '') {
        return null;
      }
      const num = Number(value);
      if (isNaN(num) || !isFinite(num) || num < 0) {
        return null;
      }
      return num;
    };

    const parsedRetailPrice = parsePrice(retailPrice, '零售价');
    if (parsedRetailPrice === null) {
      validationError(res, '请输入有效的零售价（必须为非负数字）');
      return;
    }

    const parsedAgentPrice = parsePrice(agentPrice, '代理价');
    if (parsedAgentPrice === null) {
      validationError(res, '请输入有效的代理价（必须为非负数字）');
      return;
    }

    const parsedWholesalePrice = parsePrice(wholesalePrice, '批发价');
    if (parsedWholesalePrice === null) {
      validationError(res, '请输入有效的批发价（必须为非负数字）');
      return;
    }

    // 处理图片（确保是JSON字符串）
    let imagesJson: string;
    if (typeof images === 'string') {
      imagesJson = images;
    } else if (Array.isArray(images)) {
      imagesJson = JSON.stringify(images);
    } else {
      validationError(res, '图片格式错误');
      return;
    }

    // 处理成本价（可选）
    const parsedCostPrice = costPrice !== undefined ? parsePrice(costPrice, '成本价') : undefined;

    // 【2026-01-26 修复】处理新价格字段（可选）
    const parsedSupplyPrice = supplyPrice !== undefined ? parsePrice(supplyPrice, '供货价') : undefined;
    const parsedSuggestedPrice = suggestedPrice !== undefined ? parsePrice(suggestedPrice, '建议零售价') : undefined;
    const parsedMinRetailPrice = minRetailPrice !== undefined ? parsePrice(minRetailPrice, '最低零售价') : undefined;
    const parsedMasterRetailPrice = masterRetailPrice !== undefined ? parsePrice(masterRetailPrice, '总代理零售价') : undefined;

    const product = await productService.create({
      name: sanitize(name.trim()),
      categoryId,
      images: imagesJson,
      description: description ? sanitize(description) : undefined,
      retailPrice: parsedRetailPrice,
      agentPrice: parsedAgentPrice,
      wholesalePrice: parsedWholesalePrice,
      costPrice: parsedCostPrice ?? undefined,
      // 【2026-01-26 修复】新增四级价格体系字段
      supplyPrice: parsedSupplyPrice ?? undefined,
      suggestedPrice: parsedSuggestedPrice ?? undefined,
      minRetailPrice: parsedMinRetailPrice ?? undefined,
      masterRetailPrice: parsedMasterRetailPrice ?? undefined,
      stock: stock || 0,
      unit: unit || '箱',
      purchaseUnit: purchaseUnit || '件',
      unitConversion: unitConversion || 1,
      specs: specs ? (typeof specs === 'string' ? specs : JSON.stringify(specs)) : undefined,
      status: statusVal || 'ACTIVE',
      sort: sort || 0,
      // 【2026-01-23 视频字段】
      videoUrl: videoUrl || undefined,
      videoThumbnail: videoThumbnail || undefined,
      videoDuration: videoDuration ? parseInt(videoDuration, 10) : undefined,
      // 【2026-01-26 特价商品】不参与任何营销活动
      isSpecialPrice: isSpecialPrice || false,
    });

    success(res, product, '创建成功');
  } catch (err: any) {
    console.error('创建商品失败:', err);
    if (err.message.includes('不存在')) {
      error(res, err.message, 400);
    } else {
      error(res, '创建商品失败', 500);
    }
  }
}

/**
 * 更新商品（管理员）
 * PUT /api/admin/products/:id
 */
export async function update(req: Request, res: Response) {
  try {
    const productId = parseId(req.params.id, '商品ID');

    // 检查商品是否存在
    const existing = await productService.findById(productId);
    if (!existing) {
      error(res, '商品不存在', 404);
      return;
    }

    const {
      name,
      categoryId,
      images,
      description,
      retailPrice,
      agentPrice,
      wholesalePrice,
      costPrice,
      // 【2026-01-26 修复】新增四级价格体系字段
      supplyPrice,
      suggestedPrice,
      minRetailPrice,
      masterRetailPrice,
      stock,
      unit,
      purchaseUnit,
      unitConversion,
      specs,
      status: statusVal,
      sort,
      // 【2026-01-23 视频字段】
      videoUrl,
      videoThumbnail,
      videoDuration,
      // 【2026-01-26 特价商品】不参与任何营销活动
      isSpecialPrice,
    } = req.body;

    // 参数验证
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        validationError(res, '商品名称不能为空');
        return;
      }
      if (name.length > 100) {
        validationError(res, '商品名称不能超过100个字符');
        return;
      }
    }

    // 处理图片
    let imagesJson: string | undefined;
    if (images !== undefined) {
      if (typeof images === 'string') {
        imagesJson = images;
      } else if (Array.isArray(images)) {
        imagesJson = JSON.stringify(images);
      }
    }

    // 修复BUG-002: 更新时也需要验证价格类型
    const parsePriceForUpdate = (value: any): number | undefined => {
      if (value === undefined) return undefined;
      if (value === null || value === '') return undefined;
      const num = Number(value);
      if (isNaN(num) || !isFinite(num) || num < 0) return null as any; // null表示验证失败
      return num;
    };

    const parsedRetailPrice = parsePriceForUpdate(retailPrice);
    if (parsedRetailPrice === null) {
      validationError(res, '请输入有效的零售价（必须为非负数字）');
      return;
    }

    const parsedAgentPrice = parsePriceForUpdate(agentPrice);
    if (parsedAgentPrice === null) {
      validationError(res, '请输入有效的代理价（必须为非负数字）');
      return;
    }

    const parsedWholesalePrice = parsePriceForUpdate(wholesalePrice);
    if (parsedWholesalePrice === null) {
      validationError(res, '请输入有效的批发价（必须为非负数字）');
      return;
    }

    const parsedCostPrice = parsePriceForUpdate(costPrice);
    if (parsedCostPrice === null) {
      validationError(res, '请输入有效的成本价（必须为非负数字）');
      return;
    }

    // 【2026-01-26 修复】解析新价格字段
    const parsedSupplyPrice = parsePriceForUpdate(supplyPrice);
    const parsedSuggestedPrice = parsePriceForUpdate(suggestedPrice);
    const parsedMinRetailPrice = parsePriceForUpdate(minRetailPrice);
    const parsedMasterRetailPrice = parsePriceForUpdate(masterRetailPrice);

    const product = await productService.update(productId, {
      name: name ? sanitize(name.trim()) : undefined,
      categoryId,
      images: imagesJson,
      description: description !== undefined ? (description ? sanitize(description) : null) : undefined,
      retailPrice: parsedRetailPrice,
      agentPrice: parsedAgentPrice,
      wholesalePrice: parsedWholesalePrice,
      costPrice: parsedCostPrice,
      // 【2026-01-26 修复】新增四级价格体系字段
      supplyPrice: parsedSupplyPrice,
      suggestedPrice: parsedSuggestedPrice,
      minRetailPrice: parsedMinRetailPrice,
      masterRetailPrice: parsedMasterRetailPrice,
      stock,
      unit,
      purchaseUnit,
      unitConversion,
      specs: specs !== undefined ? (typeof specs === 'string' ? specs : JSON.stringify(specs)) : undefined,
      status: statusVal,
      sort,
      // 【2026-01-23 视频字段】
      videoUrl: videoUrl !== undefined ? (videoUrl || null) : undefined,
      videoThumbnail: videoThumbnail !== undefined ? (videoThumbnail || null) : undefined,
      videoDuration: videoDuration !== undefined ? (videoDuration ? parseInt(videoDuration, 10) : null) : undefined,
      // 【2026-01-26 特价商品】不参与任何营销活动
      isSpecialPrice: isSpecialPrice !== undefined ? isSpecialPrice : undefined,
    });

    success(res, product, '更新成功');
  } catch (err: any) {
    console.error('更新商品失败:', err);
    if (err.message.includes('不存在') || err.message.includes('无效的')) {
      error(res, err.message, 400);
    } else {
      error(res, '更新商品失败', 500);
    }
  }
}

/**
 * 删除商品（管理员）
 * DELETE /api/admin/products/:id
 */
export async function remove(req: Request, res: Response) {
  try {
    const productId = parseId(req.params.id, '商品ID');

    await productService.deleteProduct(productId);
    success(res, null, '删除成功');
  } catch (err: any) {
    console.error('删除商品失败:', err);
    if (err.message.includes('无法删除') || err.message.includes('不存在') || err.message.includes('未完成') || err.message.includes('无效的')) {
      error(res, err.message, 400);
    } else {
      error(res, '删除商品失败', 500);
    }
  }
}

/**
 * 批量更新状态（管理员）
 * PUT /api/admin/products/batch-status
 */
export async function batchStatus(req: Request, res: Response) {
  try {
    const { ids, status: statusVal } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      validationError(res, '请选择商品');
      return;
    }

    if (!['ACTIVE', 'INACTIVE'].includes(statusVal)) {
      validationError(res, '无效的状态值');
      return;
    }

    const result = await productService.batchUpdateStatus(ids, statusVal);
    success(res, { count: result.count }, `成功${statusVal === 'ACTIVE' ? '上架' : '下架'} ${result.count} 个商品`);
  } catch (err: any) {
    console.error('批量更新状态失败:', err);
    error(res, '批量更新状态失败', 500);
  }
}

/**
 * 切换商品状态（管理员）
 * PUT /api/admin/products/:id/toggle
 */
export async function toggleStatus(req: Request, res: Response) {
  try {
    const productId = parseId(req.params.id, '商品ID');
    const product = await productService.toggleStatus(productId);
    success(res, product, '状态更新成功');
  } catch (err: any) {
    console.error('切换状态失败:', err);
    if (err.message.includes('不存在') || err.message.includes('无效的')) {
      error(res, err.message, 404);
    } else {
      error(res, '切换状态失败', 500);
    }
  }
}

/**
 * 设置商品移库费（管理员）
 * PUT /api/admin/products/:id/transfer
 * 2026-01-11 新增
 */
export async function setTransferSettings(req: Request, res: Response) {
  try {
    const productId = parseId(req.params.id, '商品ID');
    const { transferFee, allowTransfer } = req.body;

    // 验证移库费
    if (transferFee !== undefined) {
      const fee = Number(transferFee);
      if (isNaN(fee) || fee < 0) {
        validationError(res, '移库费必须为非负数');
        return;
      }
    }

    const product = await productService.setTransferSettings(productId, {
      transferFee: transferFee !== undefined ? Number(transferFee) : undefined,
      allowTransfer: allowTransfer !== undefined ? Boolean(allowTransfer) : undefined,
    });

    success(res, product, '设置成功');
  } catch (err: any) {
    console.error('设置移库费失败:', err);
    if (err.message.includes('不存在')) {
      error(res, err.message, 404);
    } else {
      error(res, '设置移库费失败', 500);
    }
  }
}

/**
 * 批量设置商品移库费（管理员）
 * PUT /api/admin/products/batch-transfer
 * 2026-01-11 新增
 */
export async function batchSetTransferSettings(req: Request, res: Response) {
  try {
    const { productIds, transferFee, allowTransfer } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      validationError(res, '请选择商品');
      return;
    }

    // 验证移库费
    if (transferFee !== undefined) {
      const fee = Number(transferFee);
      if (isNaN(fee) || fee < 0) {
        validationError(res, '移库费必须为非负数');
        return;
      }
    }

    const result = await productService.batchSetTransferSettings(productIds, {
      transferFee: transferFee !== undefined ? Number(transferFee) : undefined,
      allowTransfer: allowTransfer !== undefined && allowTransfer !== null ? Boolean(allowTransfer) : undefined,
    });

    success(res, { updated: result.count }, `成功更新 ${result.count} 个商品`);
  } catch (err: any) {
    console.error('批量设置移库费失败:', err);
    error(res, '批量设置移库费失败', 500);
  }
}

/**
 * 生成单个商品的AI文案（管理员）
 * POST /api/admin/products/:id/ai-copy
 * @created 2026-01-18
 */
export async function generateAICopy(req: Request, res: Response) {
  try {
    const productId = parseId(req.params.id, '商品ID');

    const result = await aiCopywritingService.generateAndSaveProductCopy(productId);

    if (!result) {
      error(res, 'AI文案生成失败，请稍后重试', 500);
      return;
    }

    success(res, result, 'AI文案生成成功');
  } catch (err: any) {
    console.error('生成AI文案失败:', err);
    if (err.message.includes('不存在') || err.message.includes('无效的')) {
      error(res, err.message, 404);
    } else {
      error(res, 'AI文案生成失败', 500);
    }
  }
}

/**
 * 批量生成商品AI文案（管理员）
 * POST /api/admin/products/batch-ai-copy
 * @created 2026-01-18
 */
export async function batchGenerateAICopy(req: Request, res: Response) {
  try {
    const { productIds } = req.body;

    // productIds可选，不传则处理所有上架商品
    const ids = Array.isArray(productIds) && productIds.length > 0
      ? productIds.map((id: any) => parseInt(id, 10)).filter((id: number) => !isNaN(id))
      : undefined;

    const result = await aiCopywritingService.batchGenerateProductCopy(ids);

    success(res, result, `AI文案生成完成：成功 ${result.success} 个，失败 ${result.failed} 个`);
  } catch (err: any) {
    console.error('批量生成AI文案失败:', err);
    error(res, '批量生成AI文案失败', 500);
  }
}

/**
 * 批量更新商品排序（管理员）
 * PUT /api/admin/products/sort
 * @created 2026-01-25
 */
export async function updateSort(req: Request, res: Response) {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      validationError(res, '请提供商品ID列表');
      return;
    }

    // 验证所有ID都是正整数
    if (!ids.every((id) => typeof id === 'number' && id > 0 && Number.isInteger(id))) {
      validationError(res, '无效的商品ID');
      return;
    }

    await productService.updateSort(ids);
    success(res, null, '排序更新成功');
  } catch (err: any) {
    console.error('更新排序失败:', err);
    error(res, '更新排序失败', 500);
  }
}

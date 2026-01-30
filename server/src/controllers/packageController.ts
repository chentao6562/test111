/**
 * 套餐控制器
 * 【2026-01-25】新增套餐功能
 */
import { Request, Response } from 'express';
import * as packageService from '../services/packageService';
import prisma from '../utils/prisma';

/**
 * 获取当前用户的代理商信息
 */
async function getAgentInfo(req: Request) {
  const user = (req as any).user;
  if (!user || user.type !== 'agent') {
    return { agentType: undefined, agentId: undefined };
  }

  let agentType = user.agentType;
  const agentId = user.id;

  // 如果token中没有agentType（旧token），从数据库查询
  if (agentId && !agentType) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { type: true },
    });
    agentType = agent?.type;
  }

  return { agentType, agentId };
}

/**
 * 获取套餐列表（H5端）
 */
export async function getPackages(req: Request, res: Response) {
  try {
    const { page, pageSize, positioning, keyword } = req.query;
    const { agentType, agentId } = await getAgentInfo(req);

    const result = await packageService.findAll({
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 10,
      positioning: positioning as string,
      keyword: keyword as string,
      status: 'ACTIVE',
      agentType,
      agentId,
    });

    res.json({
      code: 0,
      message: 'success',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      code: 500,
      message: error.message || '获取套餐列表失败',
    });
  }
}

/**
 * 获取套餐详情（H5端）
 */
export async function getPackageDetail(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { agentType, agentId } = await getAgentInfo(req);

    const pkg = await packageService.findById(
      parseInt(id),
      agentType,
      agentId
    );

    if (!pkg) {
      return res.status(404).json({
        code: 404,
        message: '套餐不存在',
      });
    }

    res.json({
      code: 0,
      message: 'success',
      data: pkg,
    });
  } catch (error: any) {
    res.status(500).json({
      code: 500,
      message: error.message || '获取套餐详情失败',
    });
  }
}

/**
 * 推销员设置套餐价格
 */
export async function setPackagePrice(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { retailPrice, subPrice } = req.body;
    const user = (req as any).user;

    if (!user || user.type !== 'agent') {
      return res.status(401).json({
        code: 401,
        message: '请先登录',
      });
    }

    const result = await packageService.setAgentPrice(
      parseInt(id),
      user.id,
      retailPrice,
      subPrice
    );

    res.json({
      code: 0,
      message: '价格设置成功',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      code: 400,
      message: error.message || '设置价格失败',
    });
  }
}

// ============ 管理后台接口 ============

/**
 * 获取套餐列表（管理后台）
 */
export async function adminGetPackages(req: Request, res: Response) {
  try {
    const { page, pageSize, positioning, status, keyword } = req.query;

    const result = await packageService.findAll({
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 20,
      positioning: positioning as string,
      status: status as string,
      keyword: keyword as string,
    });

    res.json({
      code: 0,
      message: 'success',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      code: 500,
      message: error.message || '获取套餐列表失败',
    });
  }
}

/**
 * 获取套餐详情（管理后台）
 */
export async function adminGetPackageDetail(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const pkg = await packageService.findById(parseInt(id));

    if (!pkg) {
      return res.status(404).json({
        code: 404,
        message: '套餐不存在',
      });
    }

    res.json({
      code: 0,
      message: 'success',
      data: pkg,
    });
  } catch (error: any) {
    res.status(500).json({
      code: 500,
      message: error.message || '获取套餐详情失败',
    });
  }
}

/**
 * 创建套餐
 */
export async function createPackage(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const data = req.body;

    if (!data.code || !data.name || !data.positioning) {
      return res.status(400).json({
        code: 400,
        message: '套餐编码、名称和定位不能为空',
      });
    }

    const pkg = await packageService.create({
      ...data,
      createdBy: user?.id || 0,
    });

    res.json({
      code: 0,
      message: '创建成功',
      data: pkg,
    });
  } catch (error: any) {
    res.status(400).json({
      code: 400,
      message: error.message || '创建套餐失败',
    });
  }
}

/**
 * 更新套餐
 */
export async function updatePackage(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = req.body;

    const pkg = await packageService.update(parseInt(id), data);

    res.json({
      code: 0,
      message: '更新成功',
      data: pkg,
    });
  } catch (error: any) {
    res.status(400).json({
      code: 400,
      message: error.message || '更新套餐失败',
    });
  }
}

/**
 * 删除套餐
 */
export async function deletePackage(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await packageService.deletePackage(parseInt(id));

    res.json({
      code: 0,
      message: '删除成功',
    });
  } catch (error: any) {
    res.status(400).json({
      code: 400,
      message: error.message || '删除套餐失败',
    });
  }
}

/**
 * 切换套餐状态
 */
export async function togglePackageStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const pkg = await packageService.toggleStatus(parseInt(id));

    res.json({
      code: 0,
      message: pkg.status === 'ACTIVE' ? '已上架' : '已下架',
      data: pkg,
    });
  } catch (error: any) {
    res.status(400).json({
      code: 400,
      message: error.message || '切换状态失败',
    });
  }
}

/**
 * 配置套餐商品
 */
export async function setPackageItems(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '请至少添加一个商品',
      });
    }

    const result = await packageService.setPackageItems(parseInt(id), items);

    res.json({
      code: 0,
      message: '配置成功',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      code: 400,
      message: error.message || '配置套餐商品失败',
    });
  }
}

/**
 * 创建套餐预约（H5端）
 * 【2026-01-26】新增套餐预约功能
 */
export async function createPackageReservation(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { customerName, customerPhone, pickupDate, storeId, remark } = req.body;
    const user = (req as any).user;

    // 参数验证
    if (!customerName || !customerPhone || !pickupDate) {
      return res.status(400).json({
        code: 400,
        message: '请填写客户姓名、联系电话和提货日期',
      });
    }

    // 手机号格式验证
    if (!/^1[3-9]\d{9}$/.test(customerPhone)) {
      return res.status(400).json({
        code: 400,
        message: '请输入正确的手机号',
      });
    }

    // 提货日期验证
    const pickupDateObj = new Date(pickupDate);
    if (isNaN(pickupDateObj.getTime())) {
      return res.status(400).json({
        code: 400,
        message: '请选择正确的提货日期',
      });
    }

    // 获取门店ID（如果前端没传，使用默认门店）
    const finalStoreId = storeId || 1;

    // 获取推销员ID（可选）
    const salespersonId = user?.type === 'agent' ? user.id : undefined;

    // 【2026-01-30修复】传递userId用于自购判断
    const result = await packageService.createPackageReservation({
      packageId: parseInt(id),
      customerName,
      customerPhone,
      pickupDate: pickupDateObj,
      storeId: finalStoreId,
      salespersonId,
      remark,
      userId: user?.id,
    });

    if (!result.success) {
      return res.status(400).json({
        code: 400,
        message: result.message || '预约失败',
      });
    }

    // Type assertion: after checking success=true, result has reservationId and reservationNo
    const successResult = result as { success: true; reservationId: number; reservationNo: string; message: string };

    res.json({
      code: 0,
      message: '预约成功',
      data: {
        reservationId: successResult.reservationId,
        reservationNo: successResult.reservationNo,
      },
    });
  } catch (error: any) {
    console.error('创建套餐预约失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '预约失败，请稍后重试',
    });
  }
}

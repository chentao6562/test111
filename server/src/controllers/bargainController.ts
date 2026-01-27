/**
 * 砍价活动H5端控制器
 * @module controllers/bargainController
 * @since 2026-01-22
 */

import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import {
  getActiveBargainConfig,
  getBargainProducts,
  createBargain,
  getBargainByCode,
  getMyBargains,
  cancelBargain,
  helpCut,
  sendHelpCutCode,
  getBargainReservation,
  checkCartThreshold,
  addBargainToCart,
  removeBargainFromCart,
  getBargainLimits,
} from '../services/bargain';

/**
 * 从JWT用户信息获取完整的推销员信息
 */
async function getAgentFromUser(user: { id: number }) {
  return await prisma.agent.findUnique({
    where: { id: user.id },
    select: { id: true, phone: true, name: true, type: true, parentId: true, isMaster: true },
  });
}

/**
 * 获取砍价活动配置
 * GET /api/bargain/config
 */
export async function getConfig(req: Request, res: Response) {
  try {
    const config = await getActiveBargainConfig();
    res.json({
      code: 0,
      message: 'success',
      data: config,
    });
  } catch (error: any) {
    console.error('[砍价] 获取配置失败:', error);
    res.json({
      code: 500,
      message: error.message || '获取配置失败',
    });
  }
}

/**
 * 获取砍价商品列表
 * GET /api/bargain/products
 */
export async function getProducts(req: Request, res: Response) {
  try {
    const configId = req.query.configId ? Number(req.query.configId) : undefined;
    const products = await getBargainProducts(configId);
    res.json({
      code: 0,
      message: 'success',
      data: products,
    });
  } catch (error: any) {
    console.error('[砍价] 获取商品列表失败:', error);
    res.json({
      code: 500,
      message: error.message || '获取商品列表失败',
    });
  }
}

/**
 * 获取砍价详情
 * GET /api/bargain/detail/:code
 */
export async function getDetail(req: Request, res: Response) {
  try {
    const { code } = req.params;
    if (!code) {
      return res.json({ code: 400, message: '缺少砍价码' });
    }

    const detail = await getBargainByCode(code);
    if (!detail) {
      return res.json({ code: 404, message: '砍价活动不存在' });
    }

    res.json({
      code: 0,
      message: 'success',
      data: detail,
    });
  } catch (error: any) {
    console.error('[砍价] 获取详情失败:', error);
    res.json({
      code: 500,
      message: error.message || '获取详情失败',
    });
  }
}

/**
 * 发起砍价
 * POST /api/bargain/create
 * 需要登录（authAgent中间件）
 */
export async function create(req: Request, res: Response) {
  try {
    const { productId, configId, storeId, quantity, pickupDate } = req.body;
    const user = (req as any).user;

    // 【2026-01-22 P1修复】防御性检查用户对象
    if (!user || typeof user.id !== 'number') {
      return res.json({ code: 401, message: '请先登录' });
    }

    // 从数据库获取完整的推销员信息
    const agent = await getAgentFromUser(user);
    if (!agent || !agent.phone) {
      return res.json({ code: 401, message: '推销员信息不存在或数据不完整' });
    }

    if (!productId || !configId || !storeId) {
      return res.json({ code: 400, message: '缺少必要参数' });
    }

    const result = await createBargain({
      phone: agent.phone,
      name: agent.name || '',
      productId: Number(productId),
      configId: Number(configId),
      storeId: Number(storeId),
      pickupDate: pickupDate || null, // 【2026-01-23】添加提货日期
      quantity: quantity ? Number(quantity) : 1,
      salespersonId: agent.id,
      agentId: agent.id, // 【2026-01-23】用于采购单门槛检查
    });

    if (!result.success) {
      // 【2026-01-23】根据失败原因返回不同的code
      let errorCode = 400;
      if (result.existingCode) {
        errorCode = 40001; // 已有进行中的砍价
      } else if (result.thresholdInfo) {
        errorCode = 40003; // 采购单门槛不满足
      }

      return res.json({
        code: errorCode,
        message: result.message,
        data: result.existingCode
          ? { existingCode: result.existingCode }
          : result.thresholdInfo
            ? { thresholdInfo: result.thresholdInfo }
            : undefined,
      });
    }

    res.json({
      code: 0,
      message: 'success',
      data: {
        code: result.code,
        bargainId: result.bargainId,
        firstCutAmount: result.firstCutAmount, // 【2026-01-23】返回第一刀金额
      },
    });
  } catch (error: any) {
    console.error('[砍价] 发起砍价失败:', error);
    res.json({
      code: 500,
      message: error.message || '发起砍价失败',
    });
  }
}

/**
 * 获取我的砍价列表
 * GET /api/bargain/my
 */
export async function getMyList(req: Request, res: Response) {
  try {
    const user = (req as any).user;

    // 【2026-01-22 P2修复】防御性检查用户对象
    if (!user || typeof user.id !== 'number') {
      return res.json({ code: 401, message: '请先登录' });
    }

    // 从数据库获取完整的推销员信息
    const agent = await getAgentFromUser(user);
    if (!agent || !agent.phone) {
      return res.json({ code: 401, message: '推销员信息不存在或数据不完整' });
    }

    const { page, pageSize, status } = req.query;

    const result = await getMyBargains(agent.phone, {
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 10,
      status: status as any,
    });

    res.json({
      code: 0,
      message: 'success',
      data: result,
    });
  } catch (error: any) {
    console.error('[砍价] 获取我的砍价列表失败:', error);
    res.json({
      code: 500,
      message: error.message || '获取列表失败',
    });
  }
}

/**
 * 取消砍价
 * DELETE /api/bargain/:code/cancel
 */
export async function cancel(req: Request, res: Response) {
  try {
    const { code } = req.params;
    const user = (req as any).user;

    // 【2026-01-22 P2修复】防御性检查用户对象
    if (!user || typeof user.id !== 'number') {
      return res.json({ code: 401, message: '请先登录' });
    }

    // 从数据库获取完整的推销员信息
    const agent = await getAgentFromUser(user);
    if (!agent || !agent.phone) {
      return res.json({ code: 401, message: '推销员信息不存在或数据不完整' });
    }

    if (!code) {
      return res.json({ code: 400, message: '缺少砍价码' });
    }

    const result = await cancelBargain(code, agent.phone);
    if (!result.success) {
      return res.json({ code: 400, message: result.message });
    }

    res.json({
      code: 0,
      message: '取消成功',
    });
  } catch (error: any) {
    console.error('[砍价] 取消砍价失败:', error);
    res.json({
      code: 500,
      message: error.message || '取消失败',
    });
  }
}

/**
 * 发送帮砍验证码
 * POST /api/bargain/help-cut/send-code
 */
export async function sendCode(req: Request, res: Response) {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.json({ code: 400, message: '缺少手机号' });
    }

    const result = await sendHelpCutCode(phone);
    if (!result.success) {
      return res.json({ code: 400, message: result.message });
    }

    res.json({
      code: 0,
      message: '验证码已发送',
    });
  } catch (error: any) {
    console.error('[砍价] 发送验证码失败:', error);
    res.json({
      code: 500,
      message: error.message || '发送验证码失败',
    });
  }
}

/**
 * 帮砍
 * POST /api/bargain/help-cut
 */
export async function doHelpCut(req: Request, res: Response) {
  try {
    const { bargainCode, helperPhone, helperName, verifyCode } = req.body;

    if (!bargainCode || !helperPhone || !verifyCode) {
      return res.json({ code: 400, message: '缺少必要参数' });
    }

    // 获取IP和设备信息
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || '';
    const deviceId = req.headers['x-device-id'] as string || '';

    const result = await helpCut({
      bargainCode,
      helperPhone,
      helperName,
      verifyCode,
      ipAddress,
      deviceId,
    });

    if (!result.success) {
      return res.json({ code: 400, message: result.message });
    }

    res.json({
      code: 0,
      message: result.message || '帮砍成功',
      data: {
        success: true,
        cutAmount: result.cutAmount,
        currentPrice: result.currentPrice,
        isNewUser: result.isNewUser,
        reachedFloor: result.reachedFloor,
        message: result.message,
        helperBargainCode: result.helperBargainCode,
      },
    });
  } catch (error: any) {
    console.error('[砍价] 帮砍失败:', error);
    res.json({
      code: 500,
      message: error.message || '帮砍失败',
    });
  }
}

/**
 * 获取砍价关联的预约信息
 * GET /api/bargain/:code/reservation
 */
export async function getReservation(req: Request, res: Response) {
  try {
    const { code } = req.params;

    if (!code) {
      return res.json({ code: 400, message: '缺少砍价码' });
    }

    const reservation = await getBargainReservation(code);
    if (!reservation) {
      return res.json({ code: 404, message: '未找到关联的预约' });
    }

    res.json({
      code: 0,
      message: 'success',
      data: reservation,
    });
  } catch (error: any) {
    console.error('[砍价] 获取预约信息失败:', error);
    res.json({
      code: 500,
      message: error.message || '获取预约信息失败',
    });
  }
}

/**
 * 【2026-01-23】获取采购单门槛状态
 * GET /api/bargain/eligibility
 * 需要登录
 */
export async function getEligibility(req: Request, res: Response) {
  try {
    const { configId } = req.query;
    const user = (req as any).user;

    if (!user || typeof user.id !== 'number') {
      return res.json({ code: 401, message: '请先登录' });
    }

    if (!configId) {
      return res.json({ code: 400, message: '缺少活动配置ID' });
    }

    const result = await checkCartThreshold(user.id, Number(configId));

    res.json({
      code: 0,
      message: 'success',
      data: {
        eligible: result.eligible,
        currentCartAmount: result.currentCartAmount,
        requiredAmount: result.requiredAmount,
        difference: result.difference,
        message: result.message,
      },
    });
  } catch (error: any) {
    console.error('[砍价] 获取门槛状态失败:', error);
    res.json({
      code: 500,
      message: error.message || '获取门槛状态失败',
    });
  }
}

/**
 * 【2026-01-23】将砍价商品加入采购单
 * POST /api/bargain/:code/add-to-cart
 * 需要登录
 */
export async function addToCart(req: Request, res: Response) {
  try {
    const { code } = req.params;
    const user = (req as any).user;

    if (!user || typeof user.id !== 'number') {
      return res.json({ code: 401, message: '请先登录' });
    }

    if (!code) {
      return res.json({ code: 400, message: '缺少砍价码' });
    }

    const result = await addBargainToCart(code, user.id);

    if (!result.success) {
      return res.json({ code: 400, message: result.message });
    }

    res.json({
      code: 0,
      message: '已加入采购单',
      data: {
        cartItemId: result.cartItemId,
      },
    });
  } catch (error: any) {
    console.error('[砍价] 加入采购单失败:', error);
    res.json({
      code: 500,
      message: error.message || '加入采购单失败',
    });
  }
}

/**
 * 【2026-01-23】从采购单移除砍价商品
 * DELETE /api/bargain/:code/remove-from-cart
 * 需要登录
 */
export async function removeFromCart(req: Request, res: Response) {
  try {
    const { code } = req.params;
    const user = (req as any).user;

    if (!user || typeof user.id !== 'number') {
      return res.json({ code: 401, message: '请先登录' });
    }

    if (!code) {
      return res.json({ code: 400, message: '缺少砍价码' });
    }

    const result = await removeBargainFromCart(code, user.id);

    if (!result.success) {
      return res.json({ code: 400, message: result.message });
    }

    res.json({
      code: 0,
      message: '已从采购单移除',
    });
  } catch (error: any) {
    console.error('[砍价] 移除采购单失败:', error);
    res.json({
      code: 500,
      message: error.message || '移除采购单失败',
    });
  }
}

/**
 * 【2026-01-25】获取用户砍价限制状态
 * GET /api/bargain/limits
 * 需要登录
 */
export async function getLimits(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user || typeof user.id !== 'number') {
      return res.json({ code: 401, message: '请先登录' });
    }

    // 获取用户手机号
    const agent = await getAgentFromUser(user);
    if (!agent) {
      return res.json({ code: 404, message: '用户不存在' });
    }

    // 获取当前活动配置
    const config = await getActiveBargainConfig();
    if (!config.enabled || !config.activeConfig) {
      return res.json({
        code: 0,
        message: 'success',
        data: {
          enabled: false,
          limits: null,
        },
      });
    }

    // 获取用户砍价限制状态
    const limits = await getBargainLimits(agent.phone, config.activeConfig.id);

    res.json({
      code: 0,
      message: 'success',
      data: {
        enabled: true,
        configId: config.activeConfig.id,
        limits,
      },
    });
  } catch (error: any) {
    console.error('[砍价] 获取限制状态失败:', error);
    res.json({
      code: 500,
      message: error.message || '获取限制状态失败',
    });
  }
}

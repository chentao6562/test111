/**
 * 拼团控制器
 * @module controllers/groupBuyController
 * @since 2026-01-21
 */

import { Request, Response } from 'express';
import * as groupBuyService from '../services/groupBuy/groupBuyService';
import * as groupBuyPickupService from '../services/groupBuy/groupBuyPickupService';
import prisma from '../utils/prisma';

/**
 * 获取拼团配置
 * GET /api/group-buy/config
 */
export async function getConfig(req: Request, res: Response) {
  try {
    const config = await groupBuyService.getGroupBuyConfig();
    res.json({ code: 0, data: config });
  } catch (error) {
    console.error('获取拼团配置失败:', error);
    res.status(500).json({ code: 500, message: '获取配置失败' });
  }
}

/**
 * 发起拼团
 * POST /api/group-buy/create
 */
export async function createGroupBuy(req: Request, res: Response) {
  try {
    const { reservationId } = req.body;

    if (!reservationId) {
      return res.status(400).json({ code: 400, message: '缺少预约ID' });
    }

    const result = await groupBuyService.createGroupBuy({ reservationId });

    if (result.success) {
      res.json({ code: 0, data: { code: result.code } });
    } else {
      res.status(400).json({ code: 400, message: result.message });
    }
  } catch (error) {
    console.error('发起拼团失败:', error);
    res.status(500).json({ code: 500, message: '发起拼团失败' });
  }
}

/**
 * 加入拼团
 * POST /api/group-buy/join
 */
export async function joinGroupBuy(req: Request, res: Response) {
  try {
    const { reservationId, groupCode } = req.body;

    if (!reservationId || !groupCode) {
      return res.status(400).json({ code: 400, message: '参数不完整' });
    }

    const result = await groupBuyService.joinGroupBuy({ reservationId, groupCode });

    if (result.success) {
      res.json({ code: 0, data: null });
    } else {
      res.status(400).json({ code: 400, message: result.message });
    }
  } catch (error) {
    console.error('加入拼团失败:', error);
    res.status(500).json({ code: 500, message: '加入拼团失败' });
  }
}

/**
 * 获取拼团详情
 * GET /api/group-buy/:code
 */
export async function getGroupBuyDetail(req: Request, res: Response) {
  try {
    const { code } = req.params;

    const groupBuy = await groupBuyService.getGroupBuyByCode(code);

    if (!groupBuy) {
      return res.status(404).json({ code: 404, message: '拼团不存在' });
    }

    res.json({ code: 0, data: groupBuy });
  } catch (error) {
    console.error('获取拼团详情失败:', error);
    res.status(500).json({ code: 500, message: '获取详情失败' });
  }
}

/**
 * 获取我的拼团列表
 * GET /api/group-buy/my
 */
export async function getMyGroupBuys(req: Request, res: Response) {
  try {
    // 从认证信息获取代理商ID，再查询手机号
    const agentId = (req as any).user?.id;

    if (!agentId) {
      return res.status(401).json({ code: 401, message: '未登录' });
    }

    // 从数据库查询代理商手机号
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { phone: true },
    });

    if (!agent?.phone) {
      return res.status(400).json({ code: 400, message: '获取用户信息失败' });
    }

    const groupBuys = await groupBuyService.getMyGroupBuys(agent.phone);

    res.json({ code: 0, data: groupBuys });
  } catch (error) {
    console.error('获取我的拼团失败:', error);
    res.status(500).json({ code: 500, message: '获取列表失败' });
  }
}

/**
 * 【2026-01-21 顺路拼团】获取同区域可加入的拼团
 * GET /api/group-buy/nearby
 * 参数: regionId (必填), pickupDate (可选), storeId (可选)
 */
export async function getNearbyGroupBuys(req: Request, res: Response) {
  try {
    const { regionId, pickupDate, storeId } = req.query;

    if (!regionId) {
      return res.status(400).json({ code: 400, message: '缺少区域ID' });
    }

    const groupBuys = await groupBuyService.getNearbyGroupBuys(
      parseInt(regionId as string, 10),
      pickupDate as string | undefined,
      storeId ? parseInt(storeId as string, 10) : undefined
    );

    res.json({ code: 0, data: groupBuys });
  } catch (error) {
    console.error('获取同区域拼团失败:', error);
    res.status(500).json({ code: 500, message: '获取列表失败' });
  }
}

/**
 * 退出拼团
 * DELETE /api/group-buy/:code/quit
 */
export async function quitGroupBuy(req: Request, res: Response) {
  try {
    const { code } = req.params;
    let { reservationId } = req.body;
    const agentId = (req as any).user?.id;

    // 如果没有传reservationId或为0，通过手机号查找
    if (!reservationId && agentId) {
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { phone: true },
      });

      if (agent?.phone) {
        const result = await groupBuyService.quitGroupBuyByPhone(code, agent.phone);
        if (result.success) {
          return res.json({ code: 0, data: null });
        } else {
          return res.status(400).json({ code: 400, message: result.message });
        }
      }
    }

    if (!reservationId) {
      return res.status(400).json({ code: 400, message: '缺少预约ID' });
    }

    const result = await groupBuyService.quitGroupBuy(code, reservationId);

    if (result.success) {
      res.json({ code: 0, data: null });
    } else {
      res.status(400).json({ code: 400, message: result.message });
    }
  } catch (error) {
    console.error('退出拼团失败:', error);
    res.status(500).json({ code: 500, message: '退出拼团失败' });
  }
}

// ========== 门店端接口 ==========

/**
 * 查询预约关联的拼团
 * GET /api/store/group-buy/:reservationId
 */
export async function getGroupBuyByReservation(req: Request, res: Response) {
  try {
    const reservationId = parseInt(req.params.reservationId, 10);

    if (isNaN(reservationId)) {
      return res.status(400).json({ code: 400, message: '无效的预约ID' });
    }

    const groupBuyInfo = await groupBuyPickupService.getGroupBuyByReservation(reservationId);

    res.json({ code: 0, data: groupBuyInfo });
  } catch (error) {
    console.error('查询拼团信息失败:', error);
    res.status(500).json({ code: 500, message: '查询失败' });
  }
}

/**
 * 发放拼团赠品
 * POST /api/store/group-buy/deliver-bonus
 */
export async function deliverBonusGift(req: Request, res: Response) {
  try {
    const { groupBuyId } = req.body;
    const operatorId = (req as any).user?.id || 0;

    if (!groupBuyId) {
      return res.status(400).json({ code: 400, message: '缺少拼团ID' });
    }

    const result = await groupBuyPickupService.deliverBonusGift(groupBuyId, operatorId);

    if (result.success) {
      res.json({ code: 0, data: null });
    } else {
      res.status(400).json({ code: 400, message: result.message });
    }
  } catch (error) {
    console.error('发放赠品失败:', error);
    res.status(500).json({ code: 500, message: '发放失败' });
  }
}

/**
 * 获取待发放拼团赠品列表
 * GET /api/store/group-buy/pending-bonus
 */
export async function getPendingBonusGifts(req: Request, res: Response) {
  try {
    const storeId = (req as any).user?.warehouseId;

    if (!storeId) {
      return res.status(400).json({ code: 400, message: '未关联门店' });
    }

    const list = await groupBuyPickupService.getPendingBonusGifts(storeId);

    res.json({ code: 0, data: list });
  } catch (error) {
    console.error('获取待发放列表失败:', error);
    res.status(500).json({ code: 500, message: '获取列表失败' });
  }
}

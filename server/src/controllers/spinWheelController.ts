/**
 * 现金大转盘控制器
 * @module controllers/spinWheelController
 * @since 2026-01-23
 */

import { Request, Response } from 'express';
import {
  getActiveConfig,
  joinSpinWheel,
  getParticipationByCode,
  getParticipationByPhone,
  spin,
  shareForSpins,
  getSpinRecords,
  getShareDetail,
} from '../services/spinWheel/spinWheelService';
import { sendHelpCode, helpSpin } from '../services/spinWheel/spinWheelHelpService';
import { redeemCoupon, getRedeemRecords, checkRedeemEligibility } from '../services/spinWheel/spinWheelRedeemService';
import { generateFakeNotices } from '../services/spinWheel/spinAlgorithm';

/**
 * 获取活动配置
 */
export async function getConfig(req: Request, res: Response) {
  try {
    const result = await getActiveConfig();
    res.json({ code: 0, data: result });
  } catch (error) {
    console.error('[SpinWheel] 获取配置失败:', error);
    res.json({ code: 500, message: '获取配置失败' });
  }
}

/**
 * 加入活动
 */
export async function join(req: Request, res: Response) {
  try {
    const { phone, name, configId, salespersonId } = req.body;

    if (!phone || !configId) {
      return res.json({ code: 400, message: '参数错误' });
    }

    const result = await joinSpinWheel({
      phone,
      name,
      configId,
      salespersonId,
    });

    if (result.success) {
      res.json({ code: 0, data: result.participation });
    } else {
      res.json({ code: 400, message: result.message });
    }
  } catch (error) {
    console.error('[SpinWheel] 加入活动失败:', error);
    res.json({ code: 500, message: '加入活动失败' });
  }
}

/**
 * 获取我的参与信息
 */
export async function getMyParticipation(req: Request, res: Response) {
  try {
    const phone = (req as any).user?.phone;
    const { configId } = req.query;

    if (!phone || !configId) {
      return res.json({ code: 400, message: '参数错误' });
    }

    const result = await getParticipationByPhone(phone, Number(configId));

    if (result) {
      res.json({ code: 0, data: result });
    } else {
      res.json({ code: 404, message: '未参与活动' });
    }
  } catch (error) {
    console.error('[SpinWheel] 获取参与信息失败:', error);
    res.json({ code: 500, message: '获取参与信息失败' });
  }
}

/**
 * 抽奖
 */
export async function doSpin(req: Request, res: Response) {
  try {
    const phone = (req as any).user?.phone;
    const { configId } = req.body;

    if (!phone || !configId) {
      return res.json({ code: 400, message: '参数错误' });
    }

    const result = await spin({ phone, configId });

    if (result.success) {
      res.json({ code: 0, data: result });
    } else {
      res.json({ code: 400, message: result.message });
    }
  } catch (error) {
    console.error('[SpinWheel] 抽奖失败:', error);
    res.json({ code: 500, message: '抽奖失败' });
  }
}

/**
 * 分享获得次数
 */
export async function share(req: Request, res: Response) {
  try {
    const phone = (req as any).user?.phone;
    const { configId } = req.body;

    if (!phone || !configId) {
      return res.json({ code: 400, message: '参数错误' });
    }

    const result = await shareForSpins(phone, configId);

    if (result.success) {
      res.json({ code: 0, data: { spinsAdded: result.spinsAdded } });
    } else {
      res.json({ code: 400, message: result.message });
    }
  } catch (error) {
    console.error('[SpinWheel] 分享失败:', error);
    res.json({ code: 500, message: '分享失败' });
  }
}

/**
 * 获取抽奖记录
 */
export async function getRecords(req: Request, res: Response) {
  try {
    const phone = (req as any).user?.phone;
    const { configId, page, pageSize } = req.query;

    if (!phone || !configId) {
      return res.json({ code: 400, message: '参数错误' });
    }

    const result = await getSpinRecords(phone, Number(configId), {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });

    res.json({ code: 0, data: result });
  } catch (error) {
    console.error('[SpinWheel] 获取记录失败:', error);
    res.json({ code: 500, message: '获取记录失败' });
  }
}

/**
 * 获取分享页详情（公开接口）
 */
export async function getDetail(req: Request, res: Response) {
  try {
    const { code } = req.params;

    if (!code) {
      return res.json({ code: 400, message: '参数错误' });
    }

    const result = await getShareDetail(code);

    if (result) {
      res.json({ code: 0, data: result });
    } else {
      res.json({ code: 404, message: '参与记录不存在' });
    }
  } catch (error) {
    console.error('[SpinWheel] 获取详情失败:', error);
    res.json({ code: 500, message: '获取详情失败' });
  }
}

/**
 * 发送助力验证码（公开接口）
 */
export async function sendCode(req: Request, res: Response) {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.json({ code: 400, message: '请输入手机号' });
    }

    const result = await sendHelpCode(phone);

    if (result.success) {
      res.json({ code: 0, message: result.message });
    } else {
      res.json({ code: 400, message: result.message });
    }
  } catch (error) {
    console.error('[SpinWheel] 发送验证码失败:', error);
    res.json({ code: 500, message: '发送验证码失败' });
  }
}

/**
 * 助力（公开接口）
 */
export async function help(req: Request, res: Response) {
  try {
    const { participationCode, helperPhone, helperName, verifyCode } = req.body;

    if (!participationCode || !helperPhone || !verifyCode) {
      return res.json({ code: 400, message: '参数错误' });
    }

    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string;
    const deviceId = req.headers['x-device-id'] as string;

    const result = await helpSpin({
      participationCode,
      helperPhone,
      helperName,
      verifyCode,
      ipAddress,
      deviceId,
    });

    if (result.success) {
      res.json({ code: 0, data: result });
    } else {
      res.json({ code: 400, message: result.message });
    }
  } catch (error) {
    console.error('[SpinWheel] 助力失败:', error);
    res.json({ code: 500, message: '助力失败' });
  }
}

/**
 * 兑换代金券
 */
export async function redeem(req: Request, res: Response) {
  try {
    const phone = (req as any).user?.phone;
    const { configId, amount } = req.body;

    if (!phone || !configId || !amount) {
      return res.json({ code: 400, message: '参数错误' });
    }

    const result = await redeemCoupon({
      phone,
      configId,
      amount: Number(amount),
    });

    if (result.success) {
      res.json({ code: 0, data: result });
    } else {
      res.json({ code: 400, message: result.message });
    }
  } catch (error) {
    console.error('[SpinWheel] 兑换失败:', error);
    res.json({ code: 500, message: '兑换失败' });
  }
}

/**
 * 检查兑换资格
 */
export async function checkRedeem(req: Request, res: Response) {
  try {
    const phone = (req as any).user?.phone;
    const { configId } = req.query;

    if (!phone || !configId) {
      return res.json({ code: 400, message: '参数错误' });
    }

    const result = await checkRedeemEligibility(phone, Number(configId));
    res.json({ code: 0, data: result });
  } catch (error) {
    console.error('[SpinWheel] 检查兑换资格失败:', error);
    res.json({ code: 500, message: '检查失败' });
  }
}

/**
 * 获取兑换记录
 */
export async function getRedeems(req: Request, res: Response) {
  try {
    const phone = (req as any).user?.phone;
    const { configId, page, pageSize } = req.query;

    if (!phone || !configId) {
      return res.json({ code: 400, message: '参数错误' });
    }

    const result = await getRedeemRecords(phone, Number(configId), {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });

    res.json({ code: 0, data: result });
  } catch (error) {
    console.error('[SpinWheel] 获取兑换记录失败:', error);
    res.json({ code: 500, message: '获取记录失败' });
  }
}

/**
 * 获取滚动播报（公开接口）
 */
export async function getNotices(req: Request, res: Response) {
  try {
    // 生成虚假的滚动播报数据
    const notices = generateFakeNotices(15);
    res.json({ code: 0, data: notices });
  } catch (error) {
    console.error('[SpinWheel] 获取播报失败:', error);
    res.json({ code: 500, message: '获取播报失败' });
  }
}

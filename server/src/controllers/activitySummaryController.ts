/**
 * 活动汇总控制器
 * 【2026-01-23】
 *
 * 功能：获取当前进行中的所有活动列表
 * 用于首页活动中心横幅动态显示
 */

import { Request, Response } from 'express';
import prisma from '../utils/prisma';

// 活动类型
type ActivityType = 'FLASH_SALE' | 'BARGAIN' | 'GROUP_BUY' | 'COUPON_ACTIVITY' | 'SPIN_WHEEL' | 'GIFT';

// 活动信息结构
interface ActiveActivity {
  type: ActivityType;
  name: string;
  shortLabel: string;
  icon: string;
  priority: number;
  link: string;
  endTime?: string;
  extra?: Record<string, any>;
}

// 活动优先级配置
const ACTIVITY_PRIORITY: Record<string, number> = {
  FLASH_SALE: 100,      // 秒杀最高优先级
  BARGAIN: 90,          // 砍价次高
  SPIN_WHEEL: 80,       // 大转盘
  GROUP_BUY: 70,        // 拼团
  COUPON_ACTIVITY: 60,  // 代金券
  GIFT: 50,             // 满赠
};

/**
 * 获取活动汇总
 * GET /api/h5/activity-summary
 */
export async function getActivitySummary(req: Request, res: Response) {
  try {
    const now = new Date();
    const activeActivities: ActiveActivity[] = [];

    // 1. 检查秒杀活动
    try {
      const flashSale = await prisma.flashSaleActivity.findFirst({
        where: {
          status: 'ACTIVE',
          startTime: { lte: now },
          endTime: { gte: now },
        },
        include: { _count: { select: { items: true } } },
      });
      if (flashSale) {
        activeActivities.push({
          type: 'FLASH_SALE',
          name: flashSale.name,
          shortLabel: '限时秒杀',
          icon: 'flash_on',
          priority: ACTIVITY_PRIORITY.FLASH_SALE,
          link: '/flash-sale',
          endTime: flashSale.endTime.toISOString(),
          extra: { itemCount: flashSale._count.items },
        });
      }
    } catch (err) {
      console.warn('[ActivitySummary] 检查秒杀活动失败:', err);
    }

    // 2. 检查砍价活动
    try {
      const bargainConfig = await prisma.bargainConfig.findFirst({
        where: {
          isActive: true,
          startTime: { lte: now },
          endTime: { gte: now },
        },
      });
      if (bargainConfig) {
        activeActivities.push({
          type: 'BARGAIN',
          name: bargainConfig.name,
          shortLabel: '免费拿',
          icon: 'sell',
          priority: ACTIVITY_PRIORITY.BARGAIN,
          link: '/bargain-products',
          endTime: bargainConfig.endTime.toISOString(),
        });
      }
    } catch (err) {
      console.warn('[ActivitySummary] 检查砍价活动失败:', err);
    }

    // 3. 检查拼团活动
    try {
      const groupBuyConfig = await prisma.groupBuyConfig.findFirst({
        where: {
          isActive: true,
        },
      });
      if (groupBuyConfig) {
        activeActivities.push({
          type: 'GROUP_BUY',
          name: groupBuyConfig.name,
          shortLabel: '拼团到店',
          icon: 'group',
          priority: ACTIVITY_PRIORITY.GROUP_BUY,
          link: '/my-group-buys',
          endTime: groupBuyConfig.endTime?.toISOString(),
        });
      }
    } catch (err) {
      console.warn('[ActivitySummary] 检查拼团活动失败:', err);
    }

    // 4. 检查大转盘活动（通过配置开关）
    try {
      const spinWheelConfig = await prisma.rewardConfig.findUnique({
        where: { configKey: 'spin_wheel_enabled' },
      });
      if (spinWheelConfig?.configValue === 'true') {
        activeActivities.push({
          type: 'SPIN_WHEEL',
          name: '现金大转盘',
          shortLabel: '大转盘',
          icon: 'rotate_right',
          priority: ACTIVITY_PRIORITY.SPIN_WHEEL,
          link: '/spin-wheel',
        });
      }
    } catch (err) {
      console.warn('[ActivitySummary] 检查大转盘配置失败:', err);
    }

    // 5. 检查代金券活动（代金券系统总开关开启时）
    try {
      const couponSystemConfig = await prisma.rewardConfig.findUnique({
        where: { configKey: 'coupon_system_enabled' },
      });
      if (couponSystemConfig?.configValue === 'true') {
        activeActivities.push({
          type: 'COUPON_ACTIVITY',
          name: '代金券中心',
          shortLabel: '领代金券',
          icon: 'confirmation_number',
          priority: ACTIVITY_PRIORITY.COUPON_ACTIVITY,
          link: '/coupon-center',
        });
      }
    } catch (err) {
      console.warn('[ActivitySummary] 检查代金券配置失败:', err);
    }

    // 6. 满赠活动（默认常驻）
    activeActivities.push({
      type: 'GIFT',
      name: '满额送好礼',
      shortLabel: '满额赠礼',
      icon: 'card_giftcard',
      priority: ACTIVITY_PRIORITY.GIFT,
      link: '/gift-activity',
    });

    // 按优先级排序
    activeActivities.sort((a, b) => b.priority - a.priority);

    return res.json({
      code: 0,
      message: 'success',
      data: {
        activeActivities,
        totalCount: activeActivities.length,
      },
    });
  } catch (error: any) {
    console.error('[ActivitySummary] 获取活动汇总失败:', error);
    return res.status(500).json({
      code: 500,
      message: '获取活动汇总失败',
      data: null,
    });
  }
}

export default {
  getActivitySummary,
};

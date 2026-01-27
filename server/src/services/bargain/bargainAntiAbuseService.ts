/**
 * 砍价防反复机制服务
 * @module services/bargain/bargainAntiAbuseService
 * @since 2026-01-25
 *
 * 实现以下规则：
 * 规则1: 首次砍价免费参与
 * 规则2: 第二次砍价必须先核销上一个
 * 规则3: 每个品类只能砍1次
 * 规则4: 整个活动期间最多砍4次
 */

import prisma from '../../utils/prisma';
import { BargainStatus } from './types';

// ============ 类型定义 ============

/**
 * 品类砍价记录
 */
interface CategoryRecord {
  bargainId: number;
  productId: number;
  status: string;
  createdAt: string;
}

/**
 * 砍价资格检查结果
 */
export interface BargainEligibilityResult {
  eligible: boolean;
  reason?: string;
  reasonCode?: 'HAS_PENDING' | 'CATEGORY_LIMIT' | 'TOTAL_LIMIT' | 'CONFIG_INACTIVE';
  currentBargainCode?: string;  // 当前进行中的砍价码
}

/**
 * 砍价限制状态
 */
export interface BargainLimitsInfo {
  totalUsed: number;            // 已使用次数
  totalLimit: number;           // 总次数限制
  completedCount: number;       // 已核销次数
  currentBargain: {
    code: string;
    status: string;
    productName: string;
  } | null;
  categoryStatus: Record<string, {
    productId: number;
    productName: string;
    status: string;
    canBargain: boolean;
  }>;
}

// ============ 核心函数 ============

/**
 * 检查用户是否可以发起砍价
 * @param customerPhone 客户手机号
 * @param configId 活动配置ID
 * @param productId 商品ID
 * @param categoryCode 品类标识（可选）
 */
export async function checkBargainEligibility(
  customerPhone: string,
  configId: number,
  productId: number,
  categoryCode?: string | null
): Promise<BargainEligibilityResult> {
  // 1. 获取活动配置
  const config = await prisma.bargainConfig.findUnique({
    where: { id: configId },
    select: {
      isActive: true,
      maxTotalPerUser: true,
      requireCompleteBeforeNext: true,
      categoryLimitPerUser: true,
    },
  });

  if (!config || !config.isActive) {
    return {
      eligible: false,
      reason: '活动已结束或不存在',
      reasonCode: 'CONFIG_INACTIVE',
    };
  }

  // 2. 获取用户砍价统计
  const stats = await getOrCreateStats(customerPhone, configId);

  // 3. 检查总次数限制（规则4）
  if (stats.totalBargainCount >= config.maxTotalPerUser) {
    return {
      eligible: false,
      reason: `砍价达人就是你！你已达到本活动砍价上限（${config.maxTotalPerUser}次），快去店里把礼品都领回家吧！`,
      reasonCode: 'TOTAL_LIMIT',
    };
  }

  // 4. 检查是否需要先核销上一个（规则2）
  if (config.requireCompleteBeforeNext && stats.currentBargainId) {
    // 检查当前砍价的状态
    const currentBargain = await prisma.bargain.findUnique({
      where: { id: stats.currentBargainId },
      select: {
        code: true,
        status: true,
        product: { select: { name: true } },
      },
    });

    // 只有这些状态才需要阻止新砍价：BARGAINING, SUCCESS
    // ORDERED/EXPIRED/CANCELLED 都允许发起新砍价
    if (currentBargain && ['BARGAINING', 'SUCCESS'].includes(currentBargain.status)) {
      const statusText = currentBargain.status === 'BARGAINING' ? '进行中' : '已成功待领取';
      return {
        eligible: false,
        reason: `你有待领取的砍价礼品！你已砍价成功1个${currentBargain.product.name}${statusText}！请先到店领取后，即可解锁下一次砍价资格。`,
        reasonCode: 'HAS_PENDING',
        currentBargainCode: currentBargain.code,
      };
    }
  }

  // 5. 检查品类限制（规则3）
  if (categoryCode) {
    const categoryRecords = parseCategoryRecords(stats.categoryRecords);
    const categoryRecord = categoryRecords[categoryCode];

    if (categoryRecord) {
      // 检查该品类是否已经砍过
      const existingBargain = await prisma.bargain.findUnique({
        where: { id: categoryRecord.bargainId },
        select: {
          status: true,
          product: { select: { name: true } },
        },
      });

      // 如果砍价已取消或过期，允许重新砍
      const allowRetryStatuses = [BargainStatus.CANCELLED, BargainStatus.EXPIRED];
      if (existingBargain && !allowRetryStatuses.includes(existingBargain.status as any)) {
        return {
          eligible: false,
          reason: `该产品已参与过啦！你已经砍过${existingBargain.product.name}了，试试其他产品吧！`,
          reasonCode: 'CATEGORY_LIMIT',
        };
      }
    }
  }

  // 通过所有检查
  return { eligible: true };
}

/**
 * 更新用户砍价统计
 * @param customerPhone 客户手机号
 * @param configId 活动配置ID
 * @param bargainId 砍价ID
 * @param productId 商品ID
 * @param categoryCode 品类标识
 * @param action 动作类型
 */
export async function updateBargainStats(
  customerPhone: string,
  configId: number,
  bargainId: number,
  productId: number,
  categoryCode: string | null,
  action: 'STARTED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED' | 'ORDERED'
): Promise<void> {
  const stats = await getOrCreateStats(customerPhone, configId);
  const categoryRecords = parseCategoryRecords(stats.categoryRecords);

  switch (action) {
    case 'STARTED':
      // 发起新砍价
      await prisma.customerBargainStats.update({
        where: { id: stats.id },
        data: {
          totalBargainCount: stats.totalBargainCount + 1,
          currentBargainId: bargainId,
          currentBargainStatus: BargainStatus.BARGAINING,
          categoryRecords: categoryCode
            ? JSON.stringify({
                ...categoryRecords,
                [categoryCode]: {
                  bargainId,
                  productId,
                  status: BargainStatus.BARGAINING,
                  createdAt: new Date().toISOString(),
                },
              })
            : stats.categoryRecords,
          updatedAt: new Date(),
        },
      });
      break;

    case 'COMPLETED':
    case 'ORDERED':
      // 核销完成（预约已完成或已下单）
      await prisma.customerBargainStats.update({
        where: { id: stats.id },
        data: {
          totalCompletedCount: stats.totalCompletedCount + 1,
          currentBargainId: null,  // 清空当前砍价，解锁下一次
          currentBargainStatus: null,
          categoryRecords: categoryCode
            ? JSON.stringify({
                ...categoryRecords,
                [categoryCode]: {
                  ...categoryRecords[categoryCode],
                  status: action,
                },
              })
            : stats.categoryRecords,
          updatedAt: new Date(),
        },
      });
      break;

    case 'CANCELLED':
    case 'EXPIRED':
      // 取消或过期，解锁下一次但不增加完成计数
      // 对于取消的砍价，允许该品类重新砍
      const updatedCategoryRecords = { ...categoryRecords };
      if (categoryCode && categoryRecords[categoryCode]) {
        // 取消时删除品类记录，允许重新砍
        if (action === 'CANCELLED') {
          delete updatedCategoryRecords[categoryCode];
        } else {
          updatedCategoryRecords[categoryCode] = {
            ...categoryRecords[categoryCode],
            status: action,
          };
        }
      }

      await prisma.customerBargainStats.update({
        where: { id: stats.id },
        data: {
          // 取消或过期时递减砍价次数，允许用户重新砍价
          totalBargainCount: Math.max(0, stats.totalBargainCount - 1),
          currentBargainId: stats.currentBargainId === bargainId ? null : stats.currentBargainId,
          currentBargainStatus: stats.currentBargainId === bargainId ? null : stats.currentBargainStatus,
          categoryRecords: JSON.stringify(updatedCategoryRecords),
          updatedAt: new Date(),
        },
      });
      break;
  }
}

/**
 * 获取用户砍价限制状态
 * @param customerPhone 客户手机号
 * @param configId 活动配置ID
 */
export async function getBargainLimits(
  customerPhone: string,
  configId: number
): Promise<BargainLimitsInfo> {
  // 获取活动配置
  const config = await prisma.bargainConfig.findUnique({
    where: { id: configId },
    select: {
      maxTotalPerUser: true,
      items: {
        select: {
          productId: true,
          categoryCode: true,
          product: { select: { name: true } },
        },
      },
    },
  });

  if (!config) {
    return {
      totalUsed: 0,
      totalLimit: 4,
      completedCount: 0,
      currentBargain: null,
      categoryStatus: {},
    };
  }

  // 获取用户统计
  const stats = await getOrCreateStats(customerPhone, configId);
  const categoryRecords = parseCategoryRecords(stats.categoryRecords);

  // 构建当前砍价信息
  let currentBargain = null;
  if (stats.currentBargainId) {
    const bargain = await prisma.bargain.findUnique({
      where: { id: stats.currentBargainId },
      select: {
        code: true,
        status: true,
        product: { select: { name: true } },
      },
    });
    if (bargain && ['BARGAINING', 'SUCCESS'].includes(bargain.status)) {
      currentBargain = {
        code: bargain.code,
        status: bargain.status,
        productName: bargain.product.name,
      };
    }
  }

  // 构建品类状态
  const categoryStatus: Record<string, any> = {};
  for (const item of config.items) {
    if (item.categoryCode) {
      const record = categoryRecords[item.categoryCode];
      const canBargain = !record || record.status === BargainStatus.CANCELLED;
      categoryStatus[item.categoryCode] = {
        productId: item.productId,
        productName: item.product.name,
        status: record?.status || null,
        canBargain,
      };
    }
  }

  return {
    totalUsed: stats.totalBargainCount,
    totalLimit: config.maxTotalPerUser,
    completedCount: stats.totalCompletedCount,
    currentBargain,
    categoryStatus,
  };
}

/**
 * 根据砍价ID获取品类标识
 * @param bargainId 砍价ID
 */
export async function getCategoryCodeByBargainId(bargainId: number): Promise<string | null> {
  const bargain = await prisma.bargain.findUnique({
    where: { id: bargainId },
    select: {
      configId: true,
      productId: true,
    },
  });

  if (!bargain) return null;

  const configItem = await prisma.bargainConfigItem.findUnique({
    where: {
      configId_productId: {
        configId: bargain.configId,
        productId: bargain.productId,
      },
    },
    select: { categoryCode: true },
  });

  return configItem?.categoryCode || null;
}

// ============ 内部辅助函数 ============

/**
 * 获取或创建用户砍价统计记录
 */
async function getOrCreateStats(customerPhone: string, configId: number) {
  let stats = await prisma.customerBargainStats.findUnique({
    where: {
      customerPhone_configId: {
        customerPhone,
        configId,
      },
    },
  });

  if (!stats) {
    stats = await prisma.customerBargainStats.create({
      data: {
        customerPhone,
        configId,
        totalBargainCount: 0,
        totalCompletedCount: 0,
        categoryRecords: null,
        currentBargainId: null,
        currentBargainStatus: null,
      },
    });
  }

  return stats;
}

/**
 * 解析品类记录JSON
 */
function parseCategoryRecords(json: string | null): Record<string, CategoryRecord> {
  if (!json) return {};
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

/**
 * 砍价核心服务
 * @module services/bargain/bargainService
 * @since 2026-01-22
 */

import prisma from '../../utils/prisma';
import {
  BargainStatus,
  BargainStatusType,
  CreateBargainRequest,
  BargainConfigResponse,
  BargainProductItem,
  BargainDetailResponse,
  BargainCutInfo,
  MyBargainItem,
} from './types';
import { calculateCutAmount } from './bargainCutService';
import { checkCartThreshold } from './bargainThresholdService';
import { checkBargainEligibility, updateBargainStats } from './bargainAntiAbuseService';

/**
 * 生成砍价码
 */
function generateBargainCode(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `BG${timestamp}${random}`;
}

/**
 * 脱敏手机号
 */
function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  return phone.substring(0, 3) + '****' + phone.substring(7);
}

/**
 * 检查砍价功能是否启用
 */
export async function isBargainEnabled(): Promise<boolean> {
  const config = await prisma.config.findUnique({
    where: { key: 'bargain_enabled' },
  });
  return config?.value === 'true';
}

/**
 * 获取当前有效的砍价活动配置
 * 【2026-01-27修复】支持多活动：同时返回所有有效活动列表
 */
export async function getActiveBargainConfig(): Promise<BargainConfigResponse> {
  const now = new Date();

  // 【2026-01-27】查询所有有效的活动配置
  const activeConfigs = await prisma.bargainConfig.findMany({
    where: {
      isActive: true,
      startTime: { lte: now },
      endTime: { gte: now },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (activeConfigs.length === 0) {
    return {
      enabled: false,
      activeConfig: null,
      activeConfigs: [],
    };
  }

  // 第一个作为默认配置（兼容旧逻辑）
  const firstConfig = activeConfigs[0];

  return {
    enabled: true,
    activeConfig: {
      id: firstConfig.id,
      name: firstConfig.name,
      startTime: firstConfig.startTime.toISOString(),
      endTime: firstConfig.endTime.toISOString(),
      bargainHours: firstConfig.bargainHours,
      minBargainCount: firstConfig.minBargainCount,
      maxBargainCount: firstConfig.maxBargainCount,
      newUserBonus: Number(firstConfig.newUserBonus),
      costBearerType: firstConfig.costBearerType,
    },
    // 【2026-01-27】返回所有活动配置列表
    activeConfigs: activeConfigs.map(c => ({
      id: c.id,
      name: c.name,
      startTime: c.startTime.toISOString(),
      endTime: c.endTime.toISOString(),
    })),
  };
}

/**
 * 获取砍价商品列表
 * 【2026-01-26修复】返回所有活动配置的商品，而不仅仅是第一个
 */
export async function getBargainProducts(configId?: number): Promise<BargainProductItem[]> {
  const now = new Date();

  // 如果指定了configId，只获取该活动的商品
  if (configId) {
    return getBargainProductsByConfigId(configId);
  }

  // 【修复】获取所有有效的活动配置
  const activeConfigs = await prisma.bargainConfig.findMany({
    where: {
      isActive: true,
      startTime: { lte: now },
      endTime: { gte: now },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (activeConfigs.length === 0) {
    return [];
  }

  // 获取所有活动的商品项
  const allItems: BargainProductItem[] = [];
  for (const config of activeConfigs) {
    const configItems = await getBargainProductsByConfigId(config.id);
    allItems.push(...configItems);
  }

  return allItems;
}

/**
 * 根据活动配置ID获取砍价商品列表
 */
async function getBargainProductsByConfigId(configId: number): Promise<BargainProductItem[]> {
  const items = await prisma.bargainConfigItem.findMany({
    where: { configId },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          images: true,
          stock: true,
          status: true,
        },
      },
      config: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { sort: 'asc' },
  });

  return items.map(item => {
    const images = JSON.parse(item.product.images || '[]');
    const productImage = images[0] || '';
    const originalPrice = Number(item.originalPrice);
    const floorPrice = Number(item.floorPrice);

    // 判断是否可参与
    const hasStock = item.bargainStock === 0
      ? item.product.stock > 0
      : (item.bargainStock - item.soldCount) > 0;
    const isActive = item.product.status === 'ACTIVE';

    return {
      id: item.id,
      configId: item.configId,  // 添加configId以便前端区分活动
      configName: item.config.name,  // 添加活动名称
      productId: item.productId,
      productName: item.product.name,
      productImage,
      originalPrice,
      floorPrice,
      maxDiscount: originalPrice - floorPrice,
      bargainStock: item.bargainStock,
      soldCount: item.soldCount,
      limitPerUser: item.limitPerUser,
      available: hasStock && isActive,
    };
  });
}

/**
 * 发起砍价
 */
export async function createBargain(
  request: CreateBargainRequest
): Promise<{ success: boolean; code?: string; bargainId?: number; message?: string; firstCutAmount?: number; existingCode?: string; thresholdInfo?: { currentCartAmount: number; requiredAmount: number; difference: number } }> {
  const { phone, name, productId, configId, storeId, pickupDate, quantity = 1, salespersonId, agentId: requestAgentId } = request;

  // 【2026-01-23】检查用户是否有进行中的砍价（每人限一次）
  const activeBargain = await prisma.bargain.findFirst({
    where: {
      initiatorPhone: phone,
      status: BargainStatus.BARGAINING,
    },
  });
  if (activeBargain) {
    return {
      success: false,
      message: '您有一个砍价活动正在进行中，请先完成或取消后再发起新的砍价',
      existingCode: activeBargain.code,
    };
  }

  // 【2026-01-23】检查采购单门槛
  if (requestAgentId) {
    const thresholdResult = await checkCartThreshold(requestAgentId, configId);
    if (!thresholdResult.eligible) {
      return {
        success: false,
        message: thresholdResult.message || '采购单金额未达到参与门槛',
        thresholdInfo: {
          currentCartAmount: thresholdResult.currentCartAmount,
          requiredAmount: thresholdResult.requiredAmount,
          difference: thresholdResult.difference,
        },
      };
    }
  }

  // 检查活动配置
  const config = await prisma.bargainConfig.findUnique({
    where: { id: configId },
    include: {
      items: {
        where: { productId },
      },
    },
  });

  if (!config || !config.isActive) {
    return { success: false, message: '活动不存在或已结束' };
  }

  const now = new Date();
  if (now < config.startTime || now > config.endTime) {
    return { success: false, message: '活动未开始或已结束' };
  }

  // 检查商品配置
  const itemConfig = config.items[0];
  if (!itemConfig) {
    return { success: false, message: '该商品不在砍价活动中' };
  }

  // 【2026-01-25 防反复砍价机制检查】
  const eligibility = await checkBargainEligibility(
    phone,
    configId,
    productId,
    itemConfig.categoryCode
  );
  if (!eligibility.eligible) {
    return {
      success: false,
      message: eligibility.reason || '无法发起砍价',
      existingCode: eligibility.currentBargainCode,
    };
  }

  // 检查库存
  if (itemConfig.bargainStock > 0) {
    const remainStock = itemConfig.bargainStock - itemConfig.soldCount;
    if (remainStock < quantity) {
      return { success: false, message: '砍价库存不足' };
    }
  }

  // 检查商品状态
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });
  if (!product || product.status !== 'ACTIVE') {
    return { success: false, message: '商品已下架' };
  }
  if (product.stock < quantity) {
    return { success: false, message: '商品库存不足' };
  }

  // 【2026-01-23 P1-02修复】检查限购（包含进行中的砍价）
  if (itemConfig.limitPerUser > 0) {
    const userBargainCount = await prisma.bargain.count({
      where: {
        initiatorPhone: phone,
        configId,
        productId,
        // 包含BARGAINING状态，防止用户发起多个砍价绕过限购
        status: { in: [BargainStatus.BARGAINING, BargainStatus.SUCCESS, BargainStatus.ORDERED] },
      },
    });
    if (userBargainCount >= itemConfig.limitPerUser) {
      return { success: false, message: `该商品每人限购${itemConfig.limitPerUser}次` };
    }
  }

  // 检查门店
  const store = await prisma.warehouse.findUnique({
    where: { id: storeId },
  });
  if (!store || store.status !== 'ACTIVE') {
    return { success: false, message: '门店不存在或已停用' };
  }

  // 获取推销员信息
  let salespersonLevel: number | null = null;
  let parentSalespersonId: number | null = null;
  let agentId: number | null = null;

  if (salespersonId) {
    const salesperson = await prisma.agent.findUnique({
      where: { id: salespersonId },
      select: { id: true, type: true, parentId: true, isMaster: true },
    });
    if (salesperson) {
      if (salesperson.isMaster) {
        agentId = salesperson.id;
      } else if (salesperson.type === 'LEVEL1') {
        salespersonLevel = 1;
        // 查找总代理
        const master = await prisma.agent.findFirst({
          where: { isMaster: true },
          select: { id: true },
        });
        agentId = master?.id || null;
      } else if (salesperson.type === 'LEVEL2') {
        salespersonLevel = 2;
        parentSalespersonId = salesperson.parentId;
        // 查找总代理
        const master = await prisma.agent.findFirst({
          where: { isMaster: true },
          select: { id: true },
        });
        agentId = master?.id || null;
      }
    }
  }

  // 生成砍价码
  const code = generateBargainCode();
  const originalPrice = Number(itemConfig.originalPrice);
  const floorPrice = Number(itemConfig.floorPrice);
  const expireAt = new Date(now.getTime() + config.bargainHours * 60 * 60 * 1000);

  // 【2026-01-23】计算发起者自己的第一刀金额
  const totalAmount = originalPrice - floorPrice;
  const firstCutAmount = calculateCutAmount({
    remainingAmount: totalAmount,
    cutCount: 0, // 第一刀
    minCutCount: config.minBargainCount,
    maxCutCount: config.maxBargainCount,
    isNewUser: true, // 发起者算新用户加成
    newUserBonus: Number(config.newUserBonus),
    totalAmount,
  });

  // 计算第一刀后的价格
  const afterFirstCutPrice = Math.max(originalPrice - firstCutAmount, floorPrice);
  const actualFirstCut = originalPrice - afterFirstCutPrice;
  const reachedFloorOnFirst = afterFirstCutPrice <= floorPrice;

  // 使用事务创建砍价记录和第一刀记录
  const bargain = await prisma.$transaction(async (tx) => {
    // 创建砍价记录（已包含第一刀的结果）
    const newBargain = await tx.bargain.create({
      data: {
        code,
        initiatorPhone: phone,
        initiatorName: name,
        salespersonId,
        salespersonLevel,
        parentSalespersonId,
        agentId,
        configId,
        productId,
        originalPrice,
        floorPrice,
        currentPrice: afterFirstCutPrice,
        totalCut: actualFirstCut,
        quantity,
        storeId,
        pickupDate: pickupDate ? new Date(pickupDate) : null,
        cutCount: 1, // 已有一刀
        status: reachedFloorOnFirst ? BargainStatus.SUCCESS : BargainStatus.BARGAINING,
        reachedFloor: reachedFloorOnFirst,
        expireAt,
      },
    });

    // 创建发起者自己的帮砍记录
    await tx.bargainCut.create({
      data: {
        bargainId: newBargain.id,
        helperPhone: phone,
        helperName: name || '发起者',
        cutAmount: actualFirstCut,
        isNewUser: true,
        priceAfterCut: afterFirstCutPrice,
        ipAddress: null,
        deviceId: null,
      },
    });

    return newBargain;
  });

  // 【2026-01-25 更新用户砍价统计】
  await updateBargainStats(
    phone,
    configId,
    bargain.id,
    productId,
    itemConfig.categoryCode,
    'STARTED'
  );

  return {
    success: true,
    code: bargain.code,
    bargainId: bargain.id,
    firstCutAmount: actualFirstCut, // 返回第一刀金额
  };
}

/**
 * 获取砍价详情
 */
export async function getBargainByCode(code: string): Promise<BargainDetailResponse | null> {
  const bargain = await prisma.bargain.findUnique({
    where: { code },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          images: true,
        },
      },
      store: {
        select: {
          id: true,
          name: true,
          address: true,
        },
      },
      cuts: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  });

  if (!bargain) {
    return null;
  }

  // 检查是否过期
  const now = new Date();
  if (bargain.status === BargainStatus.BARGAINING && now > bargain.expireAt) {
    // 更新状态为过期
    await prisma.bargain.update({
      where: { id: bargain.id },
      data: { status: BargainStatus.EXPIRED },
    });
    bargain.status = BargainStatus.EXPIRED;
  }

  const images = JSON.parse(bargain.product.images || '[]');
  const productImage = images[0] || '';
  const originalPrice = Number(bargain.originalPrice);
  const floorPrice = Number(bargain.floorPrice);
  const currentPrice = Number(bargain.currentPrice);
  const totalCut = Number(bargain.totalCut);
  const maxDiscount = originalPrice - floorPrice;
  const remainingCut = Math.max(currentPrice - floorPrice, 0);
  const progressPercent = maxDiscount > 0 ? Math.round((totalCut / maxDiscount) * 100) : 0;

  const cuts: BargainCutInfo[] = bargain.cuts.map(cut => ({
    id: cut.id,
    helperPhone: maskPhone(cut.helperPhone),
    helperName: cut.helperName,
    cutAmount: Number(cut.cutAmount),
    isNewUser: cut.isNewUser,
    createdAt: cut.createdAt.toISOString(),
  }));

  return {
    id: bargain.id,
    code: bargain.code,
    initiatorPhone: maskPhone(bargain.initiatorPhone),
    initiatorName: bargain.initiatorName,
    productId: bargain.productId,
    productName: bargain.product.name,
    productImage,
    originalPrice,
    floorPrice,
    currentPrice,
    totalCut,
    cutCount: bargain.cutCount,
    quantity: bargain.quantity,
    status: bargain.status as BargainStatusType,
    reachedFloor: bargain.reachedFloor,
    storeId: bargain.storeId,
    storeName: bargain.store.name,
    storeAddress: bargain.store.address,
    pickupDate: bargain.pickupDate ? bargain.pickupDate.toISOString().split('T')[0] : null,
    expireAt: bargain.expireAt.toISOString(),
    createdAt: bargain.createdAt.toISOString(),
    remainingCut,
    progressPercent,
    cuts,
  };
}

/**
 * 获取我的砍价列表
 */
export async function getMyBargains(
  phone: string,
  params: { page?: number; pageSize?: number; status?: BargainStatusType }
): Promise<{ list: MyBargainItem[]; total: number }> {
  const { page = 1, pageSize = 10, status } = params;
  const skip = (page - 1) * pageSize;

  const where: any = {
    initiatorPhone: phone,
  };
  if (status) {
    where.status = status;
  }

  const [bargains, total] = await Promise.all([
    prisma.bargain.findMany({
      where,
      include: {
        product: {
          select: {
            name: true,
            images: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.bargain.count({ where }),
  ]);

  const now = new Date();
  const list: MyBargainItem[] = bargains.map(bargain => {
    const images = JSON.parse(bargain.product.images || '[]');
    const productImage = images[0] || '';
    const originalPrice = Number(bargain.originalPrice);
    const floorPrice = Number(bargain.floorPrice);
    const currentPrice = Number(bargain.currentPrice);
    const maxDiscount = originalPrice - floorPrice;
    const totalCut = Number(bargain.totalCut);
    const progressPercent = maxDiscount > 0 ? Math.round((totalCut / maxDiscount) * 100) : 0;

    // 检查是否过期
    let status = bargain.status as BargainStatusType;
    if (status === BargainStatus.BARGAINING && now > bargain.expireAt) {
      status = BargainStatus.EXPIRED;
    }

    return {
      id: bargain.id,
      code: bargain.code,
      productName: bargain.product.name,
      productImage,
      originalPrice,
      currentPrice,
      floorPrice,
      cutCount: bargain.cutCount,
      status,
      reachedFloor: bargain.reachedFloor,
      expireAt: bargain.expireAt.toISOString(),
      createdAt: bargain.createdAt.toISOString(),
      progressPercent,
    };
  });

  return { list, total };
}

/**
 * 取消砍价
 */
export async function cancelBargain(
  code: string,
  phone: string
): Promise<{ success: boolean; message?: string }> {
  const bargain = await prisma.bargain.findUnique({
    where: { code },
  });

  if (!bargain) {
    return { success: false, message: '砍价不存在' };
  }

  if (bargain.initiatorPhone !== phone) {
    return { success: false, message: '无权取消此砍价' };
  }

  if (bargain.status !== BargainStatus.BARGAINING && bargain.status !== BargainStatus.SUCCESS) {
    return { success: false, message: '当前状态无法取消' };
  }

  // 获取品类标识
  const configItem = await prisma.bargainConfigItem.findUnique({
    where: {
      configId_productId: {
        configId: bargain.configId,
        productId: bargain.productId,
      },
    },
    select: { categoryCode: true },
  });

  await prisma.bargain.update({
    where: { id: bargain.id },
    data: { status: BargainStatus.CANCELLED },
  });

  // 【2026-01-25 更新用户砍价统计】
  await updateBargainStats(
    phone,
    bargain.configId,
    bargain.id,
    bargain.productId,
    configItem?.categoryCode || null,
    'CANCELLED'
  );

  return { success: true };
}

/**
 * 检查并过期超时的砍价（定时任务使用）
 */
export async function checkAndExpireBargains(): Promise<number> {
  const now = new Date();

  // 1. 将砍价中但已过期的标记为过期
  const expiredBargaining = await prisma.bargain.updateMany({
    where: {
      status: BargainStatus.BARGAINING,
      expireAt: { lt: now },
    },
    data: {
      status: BargainStatus.EXPIRED,
    },
  });

  // 2. 将砍价成功但24小时未下单的标记为过期
  // 【2026-01-23 P1-07修复】使用successAt判断，避免其他更新操作刷新倒计时
  const successExpireTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const expiredSuccess = await prisma.bargain.updateMany({
    where: {
      status: BargainStatus.SUCCESS,
      reachedFloor: true,
      OR: [
        // 优先使用successAt（新记录）
        { successAt: { lt: successExpireTime } },
        // 兼容旧记录：没有successAt时使用updatedAt
        { successAt: null, updatedAt: { lt: successExpireTime } },
      ],
    },
    data: {
      status: BargainStatus.EXPIRED,
    },
  });

  const totalExpired = expiredBargaining.count + expiredSuccess.count;
  if (totalExpired > 0) {
    console.log(`[砍价过期任务] 砍价中过期: ${expiredBargaining.count}, 成功未下单过期: ${expiredSuccess.count}`);
  }

  return totalExpired;
}

/**
 * 【2026-01-23】为帮砍者自动创建砍价活动（拉新机制）
 *
 * @param helperPhone 帮砍者手机号
 * @param helperName 帮砍者姓名
 * @param configId 活动配置ID
 * @param storeId 门店ID（使用被帮砍活动的门店）
 * @returns 创建结果
 */
export async function createBargainForHelper(
  helperPhone: string,
  helperName: string | undefined,
  configId: number,
  storeId: number
): Promise<{ success: boolean; code?: string; message?: string }> {
  // 1. 检查帮砍者是否已有进行中的砍价
  const existingBargain = await prisma.bargain.findFirst({
    where: {
      initiatorPhone: helperPhone,
      status: BargainStatus.BARGAINING,
    },
  });

  if (existingBargain) {
    // 已有进行中的砍价，不再创建
    return { success: false, message: '已有进行中的砍价活动' };
  }

  // 2. 获取活动配置和商品列表
  const config = await prisma.bargainConfig.findUnique({
    where: { id: configId },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, stock: true, status: true },
          },
        },
      },
    },
  });

  if (!config || !config.isActive) {
    return { success: false, message: '活动已结束' };
  }

  const now = new Date();
  if (now < config.startTime || now > config.endTime) {
    return { success: false, message: '活动不在有效期内' };
  }

  // 3. 从可用商品中随机选一个
  const availableItems = config.items.filter(item => {
    const hasStock = item.bargainStock === 0
      ? item.product.stock > 0
      : (item.bargainStock - item.soldCount) > 0;
    return hasStock && item.product.status === 'ACTIVE';
  });

  if (availableItems.length === 0) {
    return { success: false, message: '暂无可参与的商品' };
  }

  // 随机选择一个商品
  const randomItem = availableItems[Math.floor(Math.random() * availableItems.length)];

  // 4. 创建砍价活动
  const code = generateBargainCode();
  const originalPrice = Number(randomItem.originalPrice);
  const floorPrice = Number(randomItem.floorPrice);
  const expireAt = new Date(now.getTime() + config.bargainHours * 60 * 60 * 1000);

  // 计算第一刀金额
  const totalAmount = originalPrice - floorPrice;
  const firstCutAmount = calculateCutAmount({
    remainingAmount: totalAmount,
    cutCount: 0,
    minCutCount: config.minBargainCount,
    maxCutCount: config.maxBargainCount,
    isNewUser: true,
    newUserBonus: Number(config.newUserBonus),
    totalAmount,
  });

  const afterFirstCutPrice = Math.max(originalPrice - firstCutAmount, floorPrice);
  const actualFirstCut = originalPrice - afterFirstCutPrice;
  const reachedFloorOnFirst = afterFirstCutPrice <= floorPrice;

  // 5. 事务创建砍价记录
  const bargain = await prisma.$transaction(async (tx) => {
    const newBargain = await tx.bargain.create({
      data: {
        code,
        initiatorPhone: helperPhone,
        initiatorName: helperName || null,
        salespersonId: null,
        salespersonLevel: null,
        parentSalespersonId: null,
        agentId: null,
        configId,
        productId: randomItem.productId,
        originalPrice,
        floorPrice,
        currentPrice: afterFirstCutPrice,
        totalCut: actualFirstCut,
        quantity: 1,
        storeId,
        pickupDate: null,
        cutCount: 1,
        status: reachedFloorOnFirst ? BargainStatus.SUCCESS : BargainStatus.BARGAINING,
        reachedFloor: reachedFloorOnFirst,
        expireAt,
      },
    });

    // 创建发起者自己的帮砍记录
    await tx.bargainCut.create({
      data: {
        bargainId: newBargain.id,
        helperPhone,
        helperName: helperName || '发起者',
        cutAmount: actualFirstCut,
        isNewUser: true,
        priceAfterCut: afterFirstCutPrice,
        ipAddress: null,
        deviceId: null,
      },
    });

    return newBargain;
  });

  console.log(`[拉新] 为帮砍者创建砍价: phone=${helperPhone}, code=${bargain.code}, product=${randomItem.product.name}`);

  return {
    success: true,
    code: bargain.code,
  };
}

/**
 * 【2026-01-23】砍价成功后将商品加入采购单
 *
 * @param bargainCode 砍价码
 * @param agentId 用户ID
 * @returns 结果
 */
/**
 * 【2026-01-23 P1-03修复】使用事务确保幂等性，防止并发重复添加
 */
export async function addBargainToCart(
  bargainCode: string,
  agentId: number
): Promise<{ success: boolean; cartItemId?: number; message?: string }> {
  // 1. 获取砍价记录
  const bargain = await prisma.bargain.findUnique({
    where: { code: bargainCode },
    include: {
      product: {
        select: { id: true, name: true, status: true },
      },
    },
  });

  if (!bargain) {
    return { success: false, message: '砍价不存在' };
  }

  // 2. 验证砍价状态必须是成功
  if (bargain.status !== BargainStatus.SUCCESS) {
    const statusMessages: Record<string, string> = {
      [BargainStatus.BARGAINING]: '砍价尚未完成',
      [BargainStatus.ORDERED]: '该砍价已下单',
      [BargainStatus.EXPIRED]: '该砍价已过期',
      [BargainStatus.CANCELLED]: '该砍价已取消',
    };
    return { success: false, message: statusMessages[bargain.status] || '当前状态无法加入采购单' };
  }

  // 3. 验证商品状态
  if (bargain.product.status !== 'ACTIVE') {
    return { success: false, message: '商品已下架' };
  }

  try {
    // 【P1-03核心修复】使用事务确保原子性
    const result = await prisma.$transaction(async (tx) => {
      // 在事务内检查是否已存在
      const existingCartItem = await tx.cartItem.findFirst({
        where: {
          agentId,
          bargainId: bargain.id,
          isBargainItem: true,
        },
      });

      if (existingCartItem) {
        // 幂等处理：已存在则直接返回
        return { cartItemId: existingCartItem.id, isNew: false };
      }

      // 创建新的采购单项
      const cartItem = await tx.cartItem.create({
        data: {
          agentId,
          productId: bargain.productId,
          quantity: bargain.quantity,
          selected: true,
          bargainId: bargain.id,
          isBargainItem: true,
          bargainPrice: bargain.currentPrice,
        },
      });

      return { cartItemId: cartItem.id, isNew: true };
    });

    if (result.isNew) {
      console.log(`[砍价] 商品加入采购单: 砍价码=${bargainCode}, 商品ID=${bargain.productId}, 砍后价=${bargain.currentPrice}`);
    }

    return {
      success: true,
      cartItemId: result.cartItemId,
    };
  } catch (error: any) {
    // 处理唯一约束冲突（并发情况下可能触发）
    if (error.code === 'P2002') {
      const existingCartItem = await prisma.cartItem.findFirst({
        where: {
          agentId,
          bargainId: bargain.id,
          isBargainItem: true,
        },
      });
      if (existingCartItem) {
        return { success: true, cartItemId: existingCartItem.id };
      }
    }
    console.error(`[砍价] 加入采购单失败: ${error.message}`);
    return { success: false, message: '加入采购单失败，请稍后重试' };
  }
}

/**
 * 【2026-01-23】从采购单移除砍价商品
 *
 * @param bargainCode 砍价码
 * @param agentId 用户ID
 * @returns 结果
 */
export async function removeBargainFromCart(
  bargainCode: string,
  agentId: number
): Promise<{ success: boolean; message?: string }> {
  // 1. 获取砍价记录
  const bargain = await prisma.bargain.findUnique({
    where: { code: bargainCode },
  });

  if (!bargain) {
    return { success: false, message: '砍价不存在' };
  }

  // 2. 删除采购单中的砍价商品
  const result = await prisma.cartItem.deleteMany({
    where: {
      agentId,
      bargainId: bargain.id,
      isBargainItem: true,
    },
  });

  if (result.count === 0) {
    return { success: false, message: '采购单中未找到该砍价商品' };
  }

  return { success: true };
}

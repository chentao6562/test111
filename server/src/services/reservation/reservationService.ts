/**
 * 预约核心服务
 * 【2026-01-16 预约模式升级】创建预约、查询预约
 * 【2026-01-20 秒杀系统】支持秒杀商品加购
 */

import prisma from '../../utils/prisma';
import {
  ReservationStatus,
  ReservationStatusLabels,
  CreateReservationInput,
  ReservationResult,
  ReservationDetail,
} from './types';
import { calculateGift, isEligibleForGift } from './giftService';
import { checkCustomerCanReserve, getOrCreateCustomer, recordReservation } from './customerService';
// 【2026-01-18 春节营销】引入首预约奖励服务
import { issueFirstReservationBonus } from '../campaign2026/instantRewardService';
// 【2026-01-20 秒杀系统】引入秒杀服务
import { validateFlashSaleItems, updateSoldCount } from '../flashSale';

/**
 * 生成预约号
 * 格式: MQ + YYYYMMDD + 5位序号
 */
/**
 * 解析商品图片字段
 * 支持多种格式：JSON数组、逗号分隔字符串、单个路径
 */
function parseProductImage(images: any): string | null {
  if (!images) return null;

  // 如果已经是字符串路径
  if (typeof images === 'string') {
    // 尝试解析JSON
    if (images.startsWith('[')) {
      try {
        const parsed = JSON.parse(images);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
      } catch {
        // 解析失败，当作普通字符串处理
      }
    }
    // 逗号分隔
    if (images.includes(',')) {
      return images.split(',')[0].trim();
    }
    // 单个路径
    return images;
  }

  // 如果是数组
  if (Array.isArray(images) && images.length > 0) {
    return images[0];
  }

  return null;
}

async function generateReservationNo(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `MQ${dateStr}`;

  // 查询今日最大序号
  const lastReservation = await prisma.reservation.findFirst({
    where: {
      reservationNo: { startsWith: prefix },
    },
    orderBy: { reservationNo: 'desc' },
  });

  let seq = 1;
  if (lastReservation) {
    const lastSeq = parseInt(lastReservation.reservationNo.slice(-5), 10);
    seq = lastSeq + 1;
  }

  return `${prefix}${seq.toString().padStart(5, '0')}`;
}

/**
 * 创建预约
 */
export async function createReservation(input: CreateReservationInput): Promise<ReservationResult> {
  const { customerName, customerPhone, pickupDate, items, flashSaleItems, bargainItems, salespersonId, storeId, regionId, regionName } = input;

  // 1. 检查客户是否可以预约
  const customerCheck = await checkCustomerCanReserve(customerPhone);
  if (!customerCheck.canReserve) {
    return {
      success: false,
      message: customerCheck.message,
    };
  }

  // 2. 验证门店存在
  const store = await prisma.warehouse.findUnique({
    where: { id: storeId },
  });
  if (!store || store.status !== 'ACTIVE') {
    return {
      success: false,
      message: '门店不存在或已停用',
    };
  }

  // 3. 验证商品和库存
  const productIds = items.map(item => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });

  if (products.length !== productIds.length) {
    return {
      success: false,
      message: '部分商品不存在',
    };
  }

  // 检查库存
  // 【2026-01-22 安全修复】添加库存非负检查和数据异常处理
  // 【2026-01-27 BUG修复】添加数量必须大于0的验证
  for (const item of items) {
    // 【2026-01-27】验证数量必须大于0
    if (!item.quantity || item.quantity <= 0) {
      return {
        success: false,
        message: '商品数量必须大于0',
      };
    }

    const product = products.find(p => p.id === item.productId);
    if (!product) continue;

    // 【2026-01-22 安全修复】检查库存数据是否异常（负数）
    if (product.stock < 0) {
      console.error(`[库存异常] 商品${product.id}(${product.name})库存为负: ${product.stock}`);
      return {
        success: false,
        message: `商品"${product.name}"库存数据异常，请联系管理员`,
      };
    }

    const availableStock = product.stock - product.lockStock;

    // 【2026-01-22 安全修复】检查可用库存是否为负（锁定数超过实际库存）
    if (availableStock < 0) {
      console.error(`[库存异常] 商品${product.id}(${product.name})可用库存为负: stock=${product.stock}, lockStock=${product.lockStock}`);
      return {
        success: false,
        message: `商品"${product.name}"库存数据异常，请联系管理员`,
      };
    }

    if (availableStock < item.quantity) {
      return {
        success: false,
        message: `商品"${product.name}"库存不足，可用库存${availableStock}`,
      };
    }
  }

  // 4. 获取推销员信息和定价（需要先获取，以便计算价格快照）
  let salespersonLevel: number | null = null;
  let parentSalespersonId: number | null = null;
  let agentId: number | null = null;
  let level1AgentId: number | null = null; // 一级推销员ID（用于获取subPrice）
  // 【2026-01-19】用于获取定价的有效推销员ID（WHOLESALE用户会被替换为其上级）
  let effectiveSalespersonId: number | null = salespersonId ?? null;
  // 【2026-01-28新增】推销员姓名，用于客户绑定记录
  let salespersonName: string | null = null;

  if (salespersonId) {
    const salesperson = await prisma.agent.findUnique({
      where: { id: salespersonId },
      select: { id: true, name: true, type: true, parentId: true, isMaster: true, status: true },
    });

    if (salesperson) {
      // 检查推销员状态
      if (salesperson.status !== 'ACTIVE') {
        return {
          success: false,
          message: '推销员已被禁用，无法创建预约',
        };
      }

      // 【2026-01-28新增】记录推销员姓名
      salespersonName = salesperson.name;

      if (salesperson.isMaster) {
        agentId = salesperson.id;
      } else if (salesperson.type === 'LEVEL1') {
        salespersonLevel = 1;
        level1AgentId = salesperson.id;
        // 查找总代理
        const master = await prisma.agent.findFirst({
          where: { isMaster: true },
        });
        agentId = master?.id || null;
      } else if (salesperson.type === 'LEVEL2') {
        salespersonLevel = 2;
        parentSalespersonId = salesperson.parentId;
        level1AgentId = salesperson.parentId;

        // 【2026-01-22 BUG修复】二级推销员必须有上级
        if (!salesperson.parentId) {
          return {
            success: false,
            message: '推销员数据异常（无上级），请联系管理员',
          };
        }

        // 【层级关系验证】验证上级是否真的是一级推销员
        const parent = await prisma.agent.findUnique({
          where: { id: salesperson.parentId },
          select: { type: true, status: true, isMaster: true },
        });

        // 【2026-01-22 BUG修复】验证上级必须存在且类型正确
        if (!parent || (parent.type !== 'LEVEL1' && !parent.isMaster)) {
          return {
            success: false,
            message: '推销员层级关系异常，请联系管理员',
          };
        }
        if (parent.status !== 'ACTIVE') {
          return {
            success: false,
            message: '上级推销员已被禁用，无法创建预约',
          };
        }

        // 查找总代理
        const master = await prisma.agent.findFirst({
          where: { isMaster: true },
        });
        agentId = master?.id || null;
      } else if (salesperson.type === 'WHOLESALE') {
        // 【2026-01-19修复】普通用户（WHOLESALE）处理
        // 普通用户不应该作为推销员分享链接，但如果发生了需要正确处理
        if (salesperson.parentId) {
          // 有上级：使用上级（开发者）的定价
          const parent = await prisma.agent.findUnique({
            where: { id: salesperson.parentId },
            select: { id: true, type: true, status: true, parentId: true },
          });

          if (!parent || parent.status !== 'ACTIVE') {
            return {
              success: false,
              message: '您的开发者账号已被禁用，无法创建预约',
            };
          }

          // 根据上级类型决定定价来源
          if (parent.type === 'LEVEL1') {
            // 上级是一级推销员，使用一级的定价
            level1AgentId = parent.id;
            // 使用上级ID获取定价
            effectiveSalespersonId = parent.id;
            salespersonLevel = 1;
          } else if (parent.type === 'LEVEL2' && parent.parentId) {
            // 上级是二级推销员，使用二级的定价，但需要知道二级的上级(一级)
            level1AgentId = parent.parentId;
            effectiveSalespersonId = parent.id;
            salespersonLevel = 2;
            parentSalespersonId = parent.parentId;
          }

          // 查找总代理
          const master = await prisma.agent.findFirst({
            where: { isMaster: true },
          });
          agentId = master?.id || null;
        } else {
          // 无上级的普通用户：使用总代理的建议零售价
          // 查找总代理，使用总代理的定价（如果有）
          const master = await prisma.agent.findFirst({
            where: { isMaster: true },
          });
          if (master) {
            agentId = master.id;
            // 使用总代理ID获取定价
            effectiveSalespersonId = master.id;
          }
        }
      }
    }
  }

  // 5. 【2026-01-17修复】获取推销员设置的零售价（不信任前端传入的价格）
  // 查询推销员的定价设置
  let salespersonPrices: Map<number, { retailPrice: number | null; subPrice: number | null }> = new Map();
  let level1Prices: Map<number, number | null> = new Map();

  // 【2026-01-19修复】使用effectiveSalespersonId获取定价（WHOLESALE用户已被替换为其上级）
  if (effectiveSalespersonId) {
    // 查询当前推销员的定价
    const agentPrices = await prisma.agentPrice.findMany({
      where: {
        agentId: effectiveSalespersonId,
        productId: { in: productIds },
      },
      select: { productId: true, retailPrice: true, subPrice: true },
    });

    for (const ap of agentPrices) {
      salespersonPrices.set(ap.productId, {
        retailPrice: ap.retailPrice ? Number(ap.retailPrice) : null,
        subPrice: ap.subPrice ? Number(ap.subPrice) : null,
      });
    }
  }

  // 如果是二级推销员，还需要获取一级给二级的价格（subPrice）用于利润计算
  if (salespersonLevel === 2 && level1AgentId) {
    const parentAgentPrices = await prisma.agentPrice.findMany({
      where: {
        agentId: level1AgentId,
        productId: { in: productIds },
      },
      select: { productId: true, subPrice: true },
    });

    for (const ap of parentAgentPrices) {
      level1Prices.set(ap.productId, ap.subPrice ? Number(ap.subPrice) : null);
    }

    // 【2026-01-22 BUG修复】检查商品价格，允许降级到供货价
    // 如果一级未设置subPrice，使用商品的supplyPrice作为二级的拿货价
    for (const item of items) {
      const subPrice = level1Prices.get(item.productId);
      if (subPrice === null || subPrice === undefined) {
        const product = products.find(p => p.id === item.productId);
        // 尝试降级到供货价
        const fallbackPrice = Number(product?.supplyPrice || product?.agentPrice || 0);
        if (fallbackPrice > 0) {
          // 使用供货价作为二级的拿货价
          level1Prices.set(item.productId, fallbackPrice);
          console.log(`[reservationService] 商品${item.productId}一级未设置subPrice，降级使用供货价${fallbackPrice}`);
        } else {
          return {
            success: false,
            message: `商品"${product?.name || item.productId}"未设置有效价格，无法销售`,
          };
        }
      }
    }
  }

  // 6. 计算总金额和构建预约商品
  // 【安全】价格从数据库获取，不使用前端传入的price
  let totalAmount = 0;
  let giftEligibleAmount = 0; // 【2026-01-26】赠品计算金额（排除特价商品）
  const reservationItems = items.map(item => {
    const product = products.find(p => p.id === item.productId)!;

    // 【2026-01-19修复】获取零售价的优先级：
    // 1. 推销员自己设置的retailPrice
    // 2. （二级）上级给的subPrice
    // 3. 商品默认零售价
    let retailPrice: number;
    const priceInfo = salespersonPrices.get(item.productId);
    if (priceInfo?.retailPrice !== null && priceInfo?.retailPrice !== undefined) {
      // 推销员自己设置了零售价
      retailPrice = priceInfo.retailPrice;
    } else if (salespersonLevel === 2 && level1Prices.has(item.productId)) {
      // 【2026-01-19修复】二级推销员没有设置零售价时，使用上级给的subPrice
      const subPrice = level1Prices.get(item.productId);
      if (subPrice !== null && subPrice !== undefined && subPrice > 0) {
        retailPrice = subPrice;
      } else {
        // subPrice为0或未设置，使用商品默认零售价
        retailPrice = Number(product.retailPrice || product.suggestedPrice || 0);
      }
    } else {
      // 使用商品默认零售价
      retailPrice = Number(product.retailPrice || product.suggestedPrice || 0);
    }

    // 【2026-01-23 安全修复】价格必须为正数
    if (!Number.isFinite(retailPrice) || retailPrice <= 0) {
      throw new Error(`商品"${product.name}"价格无效(${retailPrice})，请联系管理员设置商品价格`);
    }

    const subtotal = retailPrice * item.quantity;
    totalAmount += subtotal;
    // 【2026-01-26】特价商品不计入赠品金额
    if (!product.isSpecialPrice) {
      giftEligibleAmount += subtotal;
    }

    // 获取一级给二级的价格快照
    let snapshotLevel1Price: number | null = null;
    if (salespersonLevel === 2 && level1AgentId) {
      snapshotLevel1Price = level1Prices.get(item.productId) || null;
    }

    return {
      productId: item.productId,
      productName: item.productName || product.name,
      productImage: item.productImage || parseProductImage(product.images),
      quantity: item.quantity,
      price: retailPrice,
      snapshotCostPrice: product.costPrice,
      snapshotSupplyPrice: product.supplyPrice,
      snapshotLevel1Price,
      snapshotRetailPrice: retailPrice,
      isSpecialPrice: product.isSpecialPrice || false,  // 【2026-01-26】特价商品标识快照
    };
  });

  // 6.5 【2026-01-20 秒杀系统】验证和处理秒杀商品
  let flashSaleReservationItems: any[] = [];
  let flashSaleTotalAmount = 0;
  let validatedFlashSaleActivityId: number | undefined;

  if (flashSaleItems && flashSaleItems.length > 0) {
    // 验证秒杀商品（检查活动有效、门槛、库存、限购）
    // 【2026-01-26】使用有效金额（不含特价商品）验证加购门槛
    const flashValidation = await validateFlashSaleItems(flashSaleItems, giftEligibleAmount);
    if (!flashValidation.success) {
      return {
        success: false,
        message: flashValidation.message,
      };
    }

    validatedFlashSaleActivityId = flashValidation.activityId;

    // 构建秒杀商品的预约项
    for (const validatedItem of flashValidation.validatedItems) {
      const subtotal = validatedItem.price * validatedItem.quantity;
      flashSaleTotalAmount += subtotal;

      flashSaleReservationItems.push({
        productId: validatedItem.productId,
        productName: validatedItem.productName,
        productImage: validatedItem.productImage || null,
        quantity: validatedItem.quantity,
        price: validatedItem.price,
        isFlashSale: true,
        flashSaleItemId: validatedItem.flashSaleItemId,
        // 秒杀商品不记录分润相关价格快照
        snapshotCostPrice: null,
        snapshotSupplyPrice: null,
        snapshotLevel1Price: null,
        snapshotRetailPrice: validatedItem.price,
      });
    }
  }

  // 6.6 【2026-01-23 砍价系统】验证和处理砍价商品
  let bargainReservationItems: any[] = [];
  let bargainTotalAmount = 0;
  const bargainIdsToUpdate: number[] = [];

  if (bargainItems && bargainItems.length > 0) {
    for (const bargainItem of bargainItems) {
      // 查询砍价记录（包含商品信息）
      const bargain = await prisma.bargain.findUnique({
        where: { code: bargainItem.bargainCode },
        include: { product: true },
      });

      if (!bargain) {
        return { success: false, message: `砍价码 ${bargainItem.bargainCode} 不存在` };
      }

      // 验证砍价状态必须是 SUCCESS
      if (bargain.status !== 'SUCCESS') {
        return { success: false, message: `砍价商品"${bargain.product.name}"尚未砍价成功` };
      }

      // 验证砍价是否已被使用
      if (bargain.reservationId) {
        return { success: false, message: `砍价商品"${bargain.product.name}"已被使用` };
      }

      const subtotal = Number(bargain.currentPrice) * bargain.quantity;
      bargainTotalAmount += subtotal;
      bargainIdsToUpdate.push(bargain.id);

      bargainReservationItems.push({
        productId: bargain.productId,
        productName: bargain.product.name,
        productImage: parseProductImage(bargain.product.images),
        quantity: bargain.quantity,
        price: Number(bargain.currentPrice),  // 使用砍价后的价格
        isBargain: true,
        bargainId: bargain.id,
        // 砍价商品不记录分润相关价格快照（平台承担成本）
        snapshotCostPrice: null,
        snapshotSupplyPrice: null,
        snapshotLevel1Price: null,
        snapshotRetailPrice: Number(bargain.currentPrice),
      });
    }
  }

  // 总金额 = 正价商品 + 秒杀商品 + 砍价商品
  const finalTotalAmount = totalAmount + flashSaleTotalAmount + bargainTotalAmount;

  // 7. 计算赠品（高风险客户不享受）
  // 【2026-01-20 秒杀系统】赠品只按正价商品金额计算
  let giftTierId: number | null = null;
  let giftName: string | null = null;

  if (isEligibleForGift(customerCheck.riskLevel)) {
    const gift = await calculateGift(giftEligibleAmount);  // 【2026-01-26】使用排除特价商品后的金额
    if (gift) {
      giftTierId = gift.giftTierId;
      giftName = gift.giftName;
    }
  }

  // 8. 创建预约（事务）- 使用乐观锁防止并发超卖
  try {
    const reservation = await prisma.$transaction(async (tx) => {
      // 生成预约号
      const reservationNo = await generateReservationNo();

      // 【并发安全】使用原子操作锁定库存，同时检查库存是否足够
      // 使用 $executeRaw 执行原子 UPDATE，只有当库存足够时才更新
      for (const item of items) {
        const product = products.find(p => p.id === item.productId)!;
        const requiredStock = item.quantity;

        // 原子操作：UPDATE ... WHERE stock - lockStock >= requiredStock
        // 这确保了检查和更新在同一条SQL语句中完成，避免竞态条件
        // 注意：表名是 products（Prisma @@map 映射）
        const affectedRows = await tx.$executeRaw`
          UPDATE products
          SET lockStock = lockStock + ${requiredStock}
          WHERE id = ${item.productId}
          AND (stock - lockStock) >= ${requiredStock}
        `;

        // 如果影响行数为0，说明库存不足（被其他请求抢走了）
        if (affectedRows === 0) {
          // 重新查询当前库存状态以获取准确的错误信息
          const currentProduct = await tx.product.findUnique({
            where: { id: item.productId },
            select: { stock: true, lockStock: true, name: true },
          });
          const availableStock = currentProduct
            ? currentProduct.stock - currentProduct.lockStock
            : 0;
          throw new Error(`商品"${product.name}"库存不足，当前可用库存${availableStock}`);
        }
      }

      // 【2026-01-20 秒杀系统】更新秒杀商品已售数量
      if (flashSaleReservationItems.length > 0) {
        for (const flashItem of flashSaleReservationItems) {
          await updateSoldCount(tx, flashItem.flashSaleItemId, flashItem.quantity);
        }
      }

      // 合并正价商品、秒杀商品和砍价商品
      const allReservationItems = [...reservationItems, ...flashSaleReservationItems, ...bargainReservationItems];

      // 创建预约
      const newReservation = await tx.reservation.create({
        data: {
          reservationNo,
          customerName,
          customerPhone,
          pickupDate: new Date(pickupDate),
          salespersonId,
          salespersonLevel,
          parentSalespersonId,
          agentId,
          store: { connect: { id: storeId } },  // 使用 connect 关联门店
          totalAmount: finalTotalAmount,  // 【2026-01-20】使用包含秒杀的总金额
          hasFlashSaleItems: flashSaleReservationItems.length > 0,  // 【2026-01-20】标记是否包含秒杀
          flashSaleActivityId: validatedFlashSaleActivityId || null,  // 【2026-01-20】关联秒杀活动
          giftTierId,
          giftName,
          giftDelivered: false,
          status: ReservationStatus.PENDING,
          callCount: 0,
          customerRiskLevel: customerCheck.riskLevel,
          regionName, // 【2026-01-21 顺路拼团】区域名称
          // 【2026-01-21 顺路拼团】区域关联
          ...(regionId ? { region: { connect: { id: regionId } } } : {}),
          items: {
            create: allReservationItems,  // 【2026-01-23】包含正价、秒杀和砍价商品
          },
        },
        include: {
          items: true,
          store: true,
        },
      });

      // 记录客户预约【2026-01-28】传入推销员信息用于首次绑定
      await getOrCreateCustomer(customerPhone, customerName, salespersonId ?? undefined, salespersonName ?? undefined);
      await recordReservation(customerPhone);

      // 【2026-01-23 砍价系统】更新砍价状态为已下单
      if (bargainIdsToUpdate.length > 0) {
        await tx.bargain.updateMany({
          where: { id: { in: bargainIdsToUpdate } },
          data: {
            status: 'ORDERED',
            reservationId: newReservation.id,
          },
        });
      }

      return newReservation;
    }, {
      // 【2026-01-22 P1修复】延长事务超时到30秒，避免复杂预约操作超时
      timeout: 30000,
    });

    // 【2026-01-18 春节营销】发放首预约奖励
    // 在事务外异步处理，避免奖励发放失败影响预约创建
    if (salespersonId && salespersonLevel && salespersonLevel > 0) {
      // 只对推销员的预约发放首预约奖励（不是总代理直销）
      issueFirstReservationBonus(salespersonId).catch(err => {
        console.error(`[春节营销] 首预约奖励发放失败:`, err);
      });
    }

    // 查询门店信息（因事务类型推断问题，需要单独查询）
    const storeInfo = await prisma.warehouse.findUnique({
      where: { id: storeId },
      select: { name: true, contactPhone: true, address: true },
    });

    return {
      success: true,
      message: '您的到店意向已登记，门店将在30分钟内致电确认。请注意接听电话。到店后需现场确认并完成交易。',
      data: {
        reservationId: reservation.id,
        reservationNo: reservation.reservationNo,
        totalAmount: Number(reservation.totalAmount),
        giftName: reservation.giftName,
        storeName: storeInfo?.name || '',
        storePhone: storeInfo?.contactPhone || '',
        storeAddress: storeInfo?.address || '',
        // 合规提示
        notice: '本预约仅作为到店意向登记，不构成任何形式的线上交易。实际购买需到店完成，以店内实际交易为准。',
      },
    };
  } catch (error: any) {
    console.error('[ReservationService] createReservation error:', error);
    return {
      success: false,
      message: error.message || '创建预约失败，请稍后重试',
    };
  }
}

/**
 * 获取预约详情
 */
export async function getReservationDetail(id: number): Promise<ReservationDetail | null> {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      items: true,
      store: true,
      groupBuyMember: {  // 【2026-01-21 顺路拼团】包含拼团成员信息
        include: {
          groupBuy: {
            select: { code: true, status: true },
          },
        },
      },
    },
  });

  if (!reservation) {
    return null;
  }

  // 获取推销员信息
  let salesperson = null;
  if (reservation.salespersonId) {
    const agent = await prisma.agent.findUnique({
      where: { id: reservation.salespersonId },
      select: { id: true, name: true, phone: true },
    });
    if (agent) {
      salesperson = {
        id: agent.id,
        name: agent.name,
        phone: agent.phone,
      };
    }
  }

  // 【2026-01-21 顺路拼团】获取拼团信息
  let groupBuyCode: string | undefined;
  if (reservation.groupBuyMember && reservation.groupBuyMember.status !== 'QUIT') {
    groupBuyCode = reservation.groupBuyMember.groupBuy.code;
  }

  return {
    id: reservation.id,
    reservationNo: reservation.reservationNo,
    customerName: reservation.customerName,
    customerPhone: reservation.customerPhone,
    pickupDate: reservation.pickupDate,
    totalAmount: Number(reservation.totalAmount),
    status: reservation.status,
    statusLabel: ReservationStatusLabels[reservation.status] || '未知',
    giftName: reservation.giftName || undefined,
    giftDelivered: reservation.giftDelivered,
    pickupCode: reservation.pickupCode || undefined,  // 【2026-01-19】提货码
    items: reservation.items.map(item => ({
      productId: item.productId,
      productName: item.productName,
      productImage: item.productImage || undefined,
      quantity: item.quantity,
      price: Number(item.price),
      subtotal: Number(item.price) * item.quantity,
      isFlashSale: item.isFlashSale || false,  // 【2026-01-25修复】秒杀商品标记
      isBargain: item.isBargain || false,      // 【2026-01-25修复】砍价商品标记
      // 【2026-01-28修复】套餐商品字段
      isPackage: item.isPackage || false,
      packageId: item.packageId || undefined,
      packageName: item.packageName || undefined,
      packageItems: item.packageItems || undefined,
    })),
    store: {
      id: reservation.store.id,
      name: reservation.store.name,
      address: reservation.store.address,
      contactPhone: reservation.store.contactPhone,
    },
    salesperson: salesperson || undefined,
    callCount: reservation.callCount,
    confirmedAt: reservation.confirmedAt || undefined,
    completedAt: reservation.completedAt || undefined,
    paymentMethod: reservation.paymentMethod || undefined,  // 【2026-01-20】增加支付方式，便于对账
    createdAt: reservation.createdAt,
    groupBuyCode,  // 【2026-01-21 顺路拼团】拼团码
  };
}

/**
 * 根据预约号获取预约
 */
export async function getReservationByNo(reservationNo: string) {
  return prisma.reservation.findUnique({
    where: { reservationNo },
    include: {
      items: true,
      store: true,
    },
  });
}

/**
 * 获取客户预约列表
 */
export async function getCustomerReservations(customerPhone: string, params: {
  page?: number;
  pageSize?: number;
  status?: number;
}) {
  const { page = 1, pageSize = 10, status } = params;

  const where: any = { customerPhone };
  if (status !== undefined) {
    where.status = status;
  }

  const [total, list] = await Promise.all([
    prisma.reservation.count({ where }),
    prisma.reservation.findMany({
      where,
      include: {
        items: true,
        store: {
          select: { id: true, name: true, contactPhone: true },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    total,
    list: list.map(r => ({
      id: r.id,
      reservationNo: r.reservationNo,
      pickupDate: r.pickupDate,
      totalAmount: Number(r.totalAmount),
      status: r.status,
      statusLabel: ReservationStatusLabels[r.status] || '未知',
      giftName: r.giftName,
      itemCount: r.items.length,
      storeName: r.store.name,
      createdAt: r.createdAt,
    })),
    page,
    pageSize,
  };
}

/**
 * 获取客户预约统计
 * 【2026-01-17新增】供个人中心页面展示
 */
export async function getReservationCounts(customerPhone: string) {
  const [pending, confirmed, completed, total] = await Promise.all([
    // 待确认：状态0和1
    prisma.reservation.count({
      where: {
        customerPhone,
        status: { in: [ReservationStatus.PENDING, ReservationStatus.CALLING] },
      },
    }),
    // 已确认/处理中：状态2,7,8,9
    prisma.reservation.count({
      where: {
        customerPhone,
        status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING_PREPARE, ReservationStatus.PREPARING, ReservationStatus.PENDING_PICKUP] },
      },
    }),
    // 已完成：状态3
    prisma.reservation.count({
      where: {
        customerPhone,
        status: ReservationStatus.COMPLETED,
      },
    }),
    // 总数
    prisma.reservation.count({
      where: { customerPhone },
    }),
  ]);

  return { pending, confirmed, completed, total };
}

/**
 * 取消预约（客户端，仅限待确认状态）
 */
export async function cancelReservation(id: number, customerPhone: string): Promise<ReservationResult> {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!reservation) {
    return { success: false, message: '预约不存在' };
  }

  if (reservation.customerPhone !== customerPhone) {
    return { success: false, message: '无权操作此预约' };
  }

  if (reservation.status !== ReservationStatus.PENDING) {
    return { success: false, message: '当前状态不可取消，请联系门店' };
  }

  // 事务：更新状态 + 释放库存
  // 【2026-01-22 P1修复】使用Math.max防止lockStock变负
  await prisma.$transaction(async (tx) => {
    await tx.reservation.update({
      where: { id },
      data: { status: ReservationStatus.CANCELLED },
    });

    // 释放锁定库存（防止负值）
    for (const item of reservation.items) {
      // 先查询当前lockStock，使用Math.max防止负值
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { lockStock: true },
      });

      if (product) {
        const newLockStock = Math.max(0, product.lockStock - item.quantity);
        await tx.product.update({
          where: { id: item.productId },
          data: { lockStock: newLockStock },
        });
      }
    }
  });

  return { success: true, message: '已取消预约' };
}

/**
 * 获取门店待确认预约列表
 */
export async function getPendingReservations(storeId: number, params: {
  page?: number;
  pageSize?: number;
}) {
  const { page = 1, pageSize = 20 } = params;

  const where = {
    storeId,
    status: { in: [ReservationStatus.PENDING, ReservationStatus.CALLING] },
  };

  const [total, list] = await Promise.all([
    prisma.reservation.count({ where }),
    prisma.reservation.findMany({
      where,
      include: {
        items: true,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [
        { status: 'asc' }, // 待确认优先
        { createdAt: 'asc' }, // 先到先处理
      ],
    }),
  ]);

  return {
    total,
    list: list.map(r => ({
      id: r.id,
      reservationNo: r.reservationNo,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      pickupDate: r.pickupDate,
      totalAmount: Number(r.totalAmount),
      status: r.status,
      statusLabel: ReservationStatusLabels[r.status],
      callCount: r.callCount,
      lastCallAt: r.lastCallAt,
      giftName: r.giftName,
      itemCount: r.items.length,
      createdAt: r.createdAt,
    })),
    page,
    pageSize,
  };
}

/**
 * 获取门店预约列表
 */
export async function getStoreReservations(storeId: number, params: {
  page?: number;
  pageSize?: number;
  status?: number;
  statuses?: number[];  // 【2026-01-19】支持多状态查询
  customerPhone?: string;
  startDate?: string;
  endDate?: string;
}) {
  const { page = 1, pageSize = 20, status, statuses, customerPhone, startDate, endDate } = params;

  const where: any = { storeId };

  // 【2026-01-19】支持多状态查询，优先使用statuses数组
  if (statuses && statuses.length > 0) {
    where.status = { in: statuses };
  } else if (status !== undefined) {
    where.status = status;
  }
  if (customerPhone) {
    where.customerPhone = { contains: customerPhone };
  }
  if (startDate || endDate) {
    where.pickupDate = {};
    if (startDate) {
      where.pickupDate.gte = new Date(startDate);
    }
    if (endDate) {
      where.pickupDate.lte = new Date(endDate);
    }
  }

  const [total, list] = await Promise.all([
    prisma.reservation.count({ where }),
    prisma.reservation.findMany({
      where,
      include: {
        items: true,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    total,
    list: list.map(r => ({
      id: r.id,
      reservationNo: r.reservationNo,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      pickupDate: r.pickupDate,
      totalAmount: Number(r.totalAmount),
      status: r.status,
      statusLabel: ReservationStatusLabels[r.status],
      giftName: r.giftName,
      giftDelivered: r.giftDelivered,
      itemCount: r.items.length,
      completedAt: r.completedAt,
      createdAt: r.createdAt,
      paymentMethod: r.paymentMethod,  // 【2026-01-20】增加支付方式，便于对账
    })),
    page,
    pageSize,
  };
}

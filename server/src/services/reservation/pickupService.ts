/**
 * 门店核销服务
 * 【2026-01-16 预约模式升级】到店付款+提货核销
 * 【2026-01-16 利润即时结算】核销时立即计算并结算利润到推销员余额
 * 【2026-01-17 代码重构】使用settlementExecutor统一利润入账逻辑
 * 【2026-01-21 拼团到店】集成拼团核销逻辑
 * 【2026-01-21 代金券抵扣】支持提货时使用代金券抵扣
 */

import prisma from '../../utils/prisma';
import { ReservationStatus, ReservationResult } from './types';
import { recordCompletion } from './customerService';
import { markGiftDelivered } from './giftService';
import { calculateItemProfit } from '../promotion/profitService';
import * as priceService from '../promotion/priceService';
import { settleAllProfits, ProfitDistribution } from '../profit/settlementExecutor';
import { logReservationAction, AuditAction } from '../auditService';
// 【2026-01-24 P0-02修复】引入审计追踪服务，记录赠品成本缺口
import { createTransactionTrace, TraceType, OperatorType } from '../audit/auditTraceService';
// 【2026-01-18 春节营销】引入首单成交奖励服务
import { processFirstCompleteRewards } from '../campaign2026/instantRewardService';
// 【2026-01-20】引入周销售统计服务
import { updateWeeklySalesStats } from '../campaign2026/weeklyRewardService';
// 【2026-01-21 拼团到店】引入拼团核销服务
import { markMemberPickedUp, getGroupBuyByReservation } from '../groupBuy/groupBuyPickupService';
// 【2026-01-21 代金券抵扣】引入代金券服务
import { redeemCouponsForPickup, getAvailableCouponsForAgent } from '../campaign2026/couponService';

/**
 * 读取配置值
 */
async function getConfigValue(key: string): Promise<string | null> {
  const config = await prisma.config.findUnique({ where: { key } });
  return config?.value || null;
}

/**
 * 判断是否为可核销状态
 * 【2026-01-17】支持状态2（已确认）和状态9（待提货）
 */
function isPickupableStatus(status: number): boolean {
  return status === ReservationStatus.CONFIRMED || status === ReservationStatus.PENDING_PICKUP;
}

/**
 * 根据手机号查询可核销的预约
 * @param phone 客户手机号
 * @param storeId 门店ID
 */
export async function findReservationByPhone(
  phone: string,
  storeId: number
): Promise<ReservationResult> {
  // 【2026-01-17】查找可核销的预约（已确认 或 待提货）
  const reservations = await prisma.reservation.findMany({
    where: {
      customerPhone: phone,
      storeId,
      status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING_PICKUP] },
    },
    include: {
      items: true,
    },
    orderBy: { pickupDate: 'asc' },
  });

  if (reservations.length === 0) {
    return {
      success: false,
      message: '未找到可核销的预约，请确认手机号或预约状态',
    };
  }

  // 返回最近的预约
  const reservation = reservations[0];

  return {
    success: true,
    message: '找到预约',
    data: {
      id: reservation.id,
      reservationNo: reservation.reservationNo,
      customerName: reservation.customerName,
      customerPhone: reservation.customerPhone,
      pickupDate: reservation.pickupDate,
      totalAmount: Number(reservation.totalAmount),
      giftName: reservation.giftName,
      giftDelivered: reservation.giftDelivered,
      items: reservation.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        productImage: item.productImage,
        quantity: item.quantity,
        price: Number(item.price),
        subtotal: Number(item.price) * item.quantity,
      })),
      pendingCount: reservations.length, // 该客户还有几个待提货预约
    },
  };
}

/**
 * 根据预约号查询预约
 * @param reservationNo 预约号
 * @param storeId 门店ID
 */
export async function findReservationByNo(
  reservationNo: string,
  storeId: number
): Promise<ReservationResult> {
  const reservation = await prisma.reservation.findUnique({
    where: { reservationNo },
    include: {
      items: true,
      store: true,
    },
  });

  if (!reservation) {
    return { success: false, message: '预约不存在' };
  }

  if (reservation.storeId !== storeId) {
    return { success: false, message: '该预约不属于本门店' };
  }

  // 【2026-01-17】支持状态2（已确认）和状态9（待提货）核销
  if (!isPickupableStatus(reservation.status)) {
    const statusLabels: Record<number, string> = {
      [ReservationStatus.PENDING]: '待确认',
      [ReservationStatus.CALLING]: '确认中',
      [ReservationStatus.COMPLETED]: '已完成',
      [ReservationStatus.CANCELLED]: '已取消',
      [ReservationStatus.EXPIRED]: '已过期',
      [ReservationStatus.CALL_FAILED]: '确认失败',
      [ReservationStatus.PENDING_PREPARE]: '待备货',
      [ReservationStatus.PREPARING]: '备货中',
    };
    return {
      success: false,
      message: `预约状态为"${statusLabels[reservation.status] || '未知'}"，无法核销`,
    };
  }

  return {
    success: true,
    message: '找到预约',
    data: {
      id: reservation.id,
      reservationNo: reservation.reservationNo,
      customerName: reservation.customerName,
      customerPhone: reservation.customerPhone,
      pickupDate: reservation.pickupDate,
      totalAmount: Number(reservation.totalAmount),
      giftName: reservation.giftName,
      giftDelivered: reservation.giftDelivered,
      items: reservation.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        productImage: item.productImage,
        quantity: item.quantity,
        price: Number(item.price),
        subtotal: Number(item.price) * item.quantity,
      })),
    },
  };
}

/**
 * 完成核销
 * @param reservationId 预约ID
 * @param staffId 核销人员ID
 * @param paymentMethod 支付方式: cash/wechat/alipay
 * @param deliverGift 是否发放赠品
 * @param couponIds 【2026-01-21】使用的代金券ID列表（可选）
 *
 * 【2026-01-16 利润即时结算】
 * 核销完成时立即计算并结算利润到推销员余额，不需要等待T+2
 * 【2026-01-21 代金券抵扣】
 * 支持使用代金券抵扣实付金额，代金券从推销员余额扣除
 */
export async function completePickup(
  reservationId: number,
  staffId: number,
  paymentMethod: string,
  deliverGift: boolean = true,
  couponIds?: number[]
): Promise<ReservationResult> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { items: true },
  });

  if (!reservation) {
    return { success: false, message: '预约不存在' };
  }

  // 【2026-01-17】支持状态2（已确认）和状态9（待提货）核销
  // 【2026-01-29修复】优化错误提示，区分已核销和其他状态
  if (!isPickupableStatus(reservation.status)) {
    if (reservation.status === ReservationStatus.COMPLETED) {
      return { success: false, message: '该订单已核销完成，无需重复操作' };
    }
    return { success: false, message: '当前状态不可核销' };
  }

  // 【2026-01-17 库存检查移到事务中使用行级锁，见下方事务内的检查】

  // 获取赠品成本（从GiftTier表获取）
  // 【2026-01-29】自购订单不发放赠品（没有利润承担赠品成本）
  let giftCost = 0;
  if (reservation.isSelfPurchase) {
    console.log(`[pickupService] 自购订单${reservation.reservationNo}，跳过赠品发放`);
    // 自购订单giftCost保持为0，不发放赠品
  } else if (reservation.giftTierId) {
    const giftTier = await prisma.giftTier.findUnique({
      where: { id: reservation.giftTierId },
      select: { giftCost: true },
    });
    giftCost = giftTier?.giftCost ? Number(giftTier.giftCost) : 0;
  }

  // 【2026-01-21 拼团到店】获取拼团信息（用于赠品成本扣除）
  // 【改进】每个成员核销时各自承担自己的那份赠品成本，而非最后一人承担全部
  // 【2026-01-29】自购订单不获取拼团赠品
  let groupBuyInfo: Awaited<ReturnType<typeof getGroupBuyByReservation>> = null;
  let groupBuyBonusCost = 0;
  const groupBuyEnabled = await getConfigValue('group_buy_enabled');

  // 【2026-01-29】自购订单不获取拼团赠品
  if (groupBuyEnabled === 'true' && !reservation.isSelfPurchase) {
    try {
      groupBuyInfo = await getGroupBuyByReservation(reservationId);
      if (groupBuyInfo) {
        // 每个成员核销时扣除自己的那份赠品成本（平摊机制）
        groupBuyBonusCost = groupBuyInfo.bonusGiftCost;
        console.log(`[拼团] 成员核销，扣除拼团赠品成本: ${groupBuyBonusCost}元（平摊，总成本${groupBuyInfo.bonusGiftCost * groupBuyInfo.requiredCount}元/${groupBuyInfo.requiredCount}人）`);
      }
    } catch (err) {
      console.error('[拼团] 获取拼团信息失败:', err);
      // 不影响核销流程
    }
  }

  // 确定订单来源（0=总代理, 1=一级推销员, 2=二级推销员）
  let orderSource = 0;
  if (reservation.salespersonLevel === 1) {
    orderSource = 1;
  } else if (reservation.salespersonLevel === 2) {
    orderSource = 2;
  }

  // 计算利润
  let totalMasterProfit = 0;
  let totalLevel1Profit = 0;
  let totalLevel2Profit = 0;

  // 【2026-01-29】自购订单不计算分润
  if (reservation.isSelfPurchase) {
    console.log(`[pickupService] 自购订单${reservation.reservationNo}跳过分润计算，利润归零`);
    // 自购订单利润全部为0，直接跳过计算循环
  } else {
    for (const item of reservation.items) {
    // 【2026-01-22 修复】秒杀商品（snapshotCostPrice为null）不参与利润分配
    // 秒杀商品是特价促销，利润全部归门店，推销员不参与分润
    if (item.isFlashSale || item.snapshotCostPrice === null) {
      console.log(`[pickupService] 秒杀商品跳过利润计算: productId=${item.productId}, price=${item.price}`);
      continue;
    }

    const costPrice = Number(item.snapshotCostPrice);
    const supplyPrice = Number(item.snapshotSupplyPrice || costPrice);
    const level1Price = item.snapshotLevel1Price ? Number(item.snapshotLevel1Price) : null;
    const retailPrice = Number(item.snapshotRetailPrice || item.price);

    const itemProfit = calculateItemProfit(
      orderSource,
      costPrice,
      supplyPrice,
      level1Price,
      retailPrice,
      item.quantity
    );

    totalMasterProfit += itemProfit.masterProfit;
    totalLevel1Profit += itemProfit.level1Profit;
    totalLevel2Profit += itemProfit.level2Profit;
    }
  } // 【2026-01-29】自购判断结束

  // 【2026-01-20 BUG修复】赠品成本由最终销售的推销员承担，而非总代理
  // 【2026-01-21 拼团到店】增加拼团赠品成本扣除
  // 【2026-01-22 BUG修复】级联扣除赠品成本，不足部分由上级承担
  // orderSource: 0=总代理直销, 1=一级推销员, 2=二级推销员
  const totalGiftCost = giftCost + groupBuyBonusCost;
  let uncoveredGiftCost = 0; // 无法由所有推销员利润覆盖的赠品成本
  if (totalGiftCost > 0) {
    let remainingCost = totalGiftCost;

    if (orderSource === 0) {
      // 总代理直销：总代理承担赠品成本
      if (totalMasterProfit >= remainingCost) {
        totalMasterProfit -= remainingCost;
        remainingCost = 0;
      } else {
        remainingCost -= totalMasterProfit;
        totalMasterProfit = 0;
      }
    } else if (orderSource === 1) {
      // 一级推销员销售：先扣一级，不足部分由总代理承担
      if (totalLevel1Profit >= remainingCost) {
        totalLevel1Profit -= remainingCost;
        remainingCost = 0;
      } else {
        remainingCost -= totalLevel1Profit;
        totalLevel1Profit = 0;
        // 不足部分由总代理承担
        if (totalMasterProfit >= remainingCost) {
          totalMasterProfit -= remainingCost;
          remainingCost = 0;
        } else {
          remainingCost -= totalMasterProfit;
          totalMasterProfit = 0;
        }
      }
    } else if (orderSource === 2) {
      // 二级推销员销售：先扣二级，再扣一级，最后扣总代理
      if (totalLevel2Profit >= remainingCost) {
        totalLevel2Profit -= remainingCost;
        remainingCost = 0;
      } else {
        remainingCost -= totalLevel2Profit;
        totalLevel2Profit = 0;
        // 不足部分由一级承担
        if (totalLevel1Profit >= remainingCost) {
          totalLevel1Profit -= remainingCost;
          remainingCost = 0;
        } else {
          remainingCost -= totalLevel1Profit;
          totalLevel1Profit = 0;
          // 一级也不足，由总代理承担
          if (totalMasterProfit >= remainingCost) {
            totalMasterProfit -= remainingCost;
            remainingCost = 0;
          } else {
            remainingCost -= totalMasterProfit;
            totalMasterProfit = 0;
          }
        }
      }
    }

    uncoveredGiftCost = remainingCost;
    // 记录被截断的赠品成本（所有层级利润都不足时由系统承担）
    if (uncoveredGiftCost > 0) {
      console.warn(`[pickupService] 预约${reservationId}赠品成本${totalGiftCost}元超出所有层级利润，系统承担${uncoveredGiftCost}元`);
    }
  }

  // 获取总代理ID
  const masterAgent = await priceService.getMasterAgent();
  const masterAgentId = masterAgent?.id || null;

  // 【2026-01-30修复】验证总代理存在，否则无法正确分润
  if (!masterAgentId) {
    console.error(`[pickupService] 系统错误：总代理不存在，无法完成核销`);
    throw new Error('系统配置错误：请联系管理员设置总代理账户');
  }

  // 确定一级和二级推销员ID
  let level1AgentId: number | null = null;
  let level2AgentId: number | null = null;

  if (orderSource === 1 && reservation.salespersonId) {
    level1AgentId = reservation.salespersonId;
  } else if (orderSource === 2) {
    level1AgentId = reservation.parentSalespersonId || null;
    level2AgentId = reservation.salespersonId || null;
  }

  // 事务：核销 + 扣减库存 + 计算利润 + 即时结算
  // 使用serializable隔离级别+行级锁确保并发安全
  try {
  const result = await prisma.$transaction(async (tx) => {
    // 【2026-01-17 并发安全】使用SELECT FOR UPDATE锁定商品行
    for (const item of reservation.items) {
      const products = await tx.$queryRaw<{ id: number; stock: number; name: string }[]>`
        SELECT id, stock, name FROM products WHERE id = ${item.productId} FOR UPDATE
      `;

      if (!products || products.length === 0) {
        throw new Error(`商品"${item.productName}"不存在`);
      }

      const product = products[0];
      if (product.stock < item.quantity) {
        throw new Error(`商品"${product.name}"库存不足，当前库存${product.stock}，需要${item.quantity}`);
      }
    }

    // 更新预约状态和利润
    await tx.reservation.update({
      where: { id: reservationId },
      data: {
        status: ReservationStatus.COMPLETED,
        completedAt: new Date(),
        completedBy: staffId,
        paymentMethod,
        // 【2026-01-29】自购订单不发放赠品
        giftDelivered: deliverGift && !!reservation.giftName && !reservation.isSelfPurchase,
        // 保存利润分配
        masterProfit: totalMasterProfit,
        level1Profit: totalLevel1Profit,
        level2Profit: totalLevel2Profit,
        // 标记已结算（即时结算）
        settled: true,
        settledAt: new Date(),
      },
    });

    // 扣减库存（解锁+扣减实际库存）+ 增加销量
    for (const item of reservation.items) {
      // 【2026-01-23 P0修复】秒杀商品使用独立库存，跳过主库存扣减
      // 秒杀商品的库存在创建预约时已通过 flashSaleService.updateSoldCount() 更新
      // 核销时不应再扣减 products.stock
      if (item.isFlashSale || item.snapshotCostPrice === null) {
        console.log(`[pickupService] 秒杀商品跳过库存扣减: productId=${item.productId}, quantity=${item.quantity}`);
        // 秒杀商品也增加销量统计
        await tx.product.update({
          where: { id: item.productId },
          data: {
            salesCount: { increment: item.quantity },
          },
        });
        continue;
      }

      // 【2026-01-23 P1修复】砍价商品使用独立库存时，跳过主库存扣减
      // 砍价下单时已根据配置决定扣减独立库存还是主库存
      // 如果使用独立库存，核销时不应再扣减 products.stock
      if (item.isBargain && item.bargainId) {
        // 查询砍价关联的配置，检查是否使用独立库存
        const bargain = await tx.bargain.findUnique({
          where: { id: item.bargainId },
          select: { configId: true, productId: true },
        });

        if (bargain) {
          const bargainConfigItem = await tx.bargainConfigItem.findFirst({
            where: {
              configId: bargain.configId,
              productId: bargain.productId,
            },
            select: { bargainStock: true },
          });

          // 如果使用独立库存（bargainStock > 0），跳过主库存扣减
          if (bargainConfigItem && bargainConfigItem.bargainStock > 0) {
            console.log(`[pickupService] 砍价商品(独立库存)跳过主库存扣减: productId=${item.productId}, quantity=${item.quantity}`);
            // 只更新销量统计
            await tx.product.update({
              where: { id: item.productId },
              data: {
                salesCount: { increment: item.quantity },
              },
            });
            continue;
          }
          // 如果使用主库存，继续正常扣减流程（下单时已锁定库存）
          console.log(`[pickupService] 砍价商品(主库存)正常扣减: productId=${item.productId}, quantity=${item.quantity}`);
        }
      }

      // 【2026-01-22 BUG修复】先查询当前库存，再更新，确保日志记录正确
      const beforeProduct = await tx.product.findUnique({
        where: { id: item.productId },
        select: { stock: true, lockStock: true },
      });

      if (!beforeProduct) {
        console.error(`[pickupService] 商品 ${item.productId} 不存在`);
        continue;
      }

      const beforeStock = beforeProduct.stock;

      // 扣减库存
      // 【2026-01-22 P1修复】使用Math.max防止lockStock变负
      const newLockStock = Math.max(0, beforeProduct.lockStock - item.quantity);
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: { decrement: item.quantity },
          lockStock: newLockStock,
          salesCount: { increment: item.quantity },
        },
      });

      // 记录库存日志（使用先前查询的beforeStock）
      await tx.stockLog.create({
        data: {
          productId: item.productId,
          type: 'OUT',
          quantity: -item.quantity,
          beforeStock: beforeStock,
          afterStock: beforeStock - item.quantity,
          operatorId: staffId,
          remark: `预约核销 ${reservation.reservationNo}`,
        },
      });
    }

    // 【即时结算】使用统一的利润入账执行器
    const profitDistribution: ProfitDistribution = {
      masterProfit: totalMasterProfit,
      level1Profit: totalLevel1Profit,
      level2Profit: totalLevel2Profit,
      masterAgentId,
      level1AgentId,
      level2AgentId,
    };

    await settleAllProfits(
      profitDistribution,
      'RESERVATION',
      reservationId,
      reservation.reservationNo,
      tx
    );

    // 【2026-01-24 P0-02修复】记录赠品成本缺口的审计追踪
    // 当赠品成本超过所有层级利润时，记录系统承担的缺口
    if (uncoveredGiftCost > 0 && masterAgentId) {
      console.log(`[pickupService] 记录赠品成本缺口: 预约${reservationId}, 缺口${uncoveredGiftCost}元`);
      await createTransactionTrace(tx, {
        traceType: TraceType.GIFT_COST,
        agentId: masterAgentId, // 系统承担的成本记录在总代理账户
        amount: -uncoveredGiftCost, // 负数表示支出
        beforeBalance: 0, // 系统承担，不影响实际余额
        afterBalance: 0,
        sourceTable: 'reservations',
        sourceId: reservationId,
        sourceNo: reservation.reservationNo,
        details: {
          type: 'GIFT_COST_SHORTFALL', // 赠品成本缺口
          totalGiftCost: totalGiftCost,
          uncoveredGiftCost: uncoveredGiftCost,
          orderSource: orderSource,
          giftName: reservation.giftName,
          groupBuyBonusCost: groupBuyBonusCost,
        },
        operatorType: OperatorType.SYSTEM,
        remark: `赠品成本缺口（预约号：${reservation.reservationNo}）- 总成本${totalGiftCost}元，系统承担${uncoveredGiftCost}元`,
      });
    }

    // 【2026-01-21 代金券抵扣】处理代金券核销
    let couponDeduction = 0;
    let redeemedCoupons: Array<{ id: number; code: string; amount: number }> = [];
    if (couponIds && couponIds.length > 0 && reservation.salespersonId) {
      // 【2026-01-26】检查预约是否包含特价商品，特价商品订单不能使用代金券
      const itemProductIds = reservation.items.map(item => item.productId);
      const productsWithSpecialFlag = await tx.product.findMany({
        where: { id: { in: itemProductIds } },
        select: { id: true, isSpecialPrice: true },
      });
      const hasSpecialPrice = productsWithSpecialFlag.some(p => p.isSpecialPrice);
      if (hasSpecialPrice) {
        throw new Error('含特价商品的订单不能使用代金券');
      }
      const couponResult = await redeemCouponsForPickup({
        couponIds,
        agentId: reservation.salespersonId,
        orderNo: reservation.reservationNo,
        operatorId: staffId,
      }, tx);

      if (!couponResult.success) {
        throw new Error(couponResult.error || '代金券核销失败');
      }

      couponDeduction = couponResult.totalDeduction;
      redeemedCoupons = couponResult.redeemedCoupons;
    }

    // 【2026-01-19修复】更新推销员销售统计
    // 只有推销员的订单才更新统计（salespersonLevel > 0）
    const totalAmount = Number(reservation.totalAmount);
    if (reservation.salespersonId && reservation.salespersonLevel && reservation.salespersonLevel > 0) {
      // 更新来源推销员的个人销售统计
      await tx.agent.update({
        where: { id: reservation.salespersonId },
        data: {
          totalSales: { increment: totalAmount },
          totalOrderCount: { increment: 1 },
        },
      });

      // 如果是二级推销员的订单，更新一级的团队销售统计
      if (reservation.salespersonLevel === 2 && level1AgentId) {
        await tx.agent.update({
          where: { id: level1AgentId },
          data: {
            teamSales: { increment: totalAmount },        // 累计团队销售额
            monthlyTeamSales: { increment: totalAmount }, // 当月团队销售额
          },
        });
      }

      // 【2026-01-20】更新周销售统计（用于周期奖励）
      await updateWeeklySalesStats(reservation.salespersonId, totalAmount, tx);
    }

    // 更新客户完成记录
    await recordCompletion(reservation.customerPhone);

    // 【2026-01-24 P0-04修复】将审计日志写入移到事务内部，确保事务一致性
    await logReservationAction({
      reservationId,
      action: AuditAction.PICKUP_COMPLETED,
      operatorId: staffId,
      operatorType: 'STAFF',
      details: {
        paymentMethod,
        totalAmount: Number(reservation.totalAmount),
        // 【2026-01-29】自购订单不发放赠品
        giftDelivered: deliverGift && !!reservation.giftName && !reservation.isSelfPurchase,
        giftName: reservation.isSelfPurchase ? null : reservation.giftName,
        profitDistribution: {
          masterProfit: totalMasterProfit,
          level1Profit: totalLevel1Profit,
          level2Profit: totalLevel2Profit,
        },
        couponDeduction,
        redeemedCoupons,
        // 赠品成本详情
        giftCostInfo: {
          totalGiftCost: totalGiftCost,
          giftCost: giftCost,
          groupBuyBonusCost: groupBuyBonusCost,
          uncoveredGiftCost: uncoveredGiftCost,
          orderSource: orderSource,
        },
      },
    }, tx);  // 传入事务客户端

    return { success: true, couponDeduction, redeemedCoupons };
  }, {
    // 设置隔离级别为Serializable，确保最高级别的并发安全
    isolationLevel: 'Serializable',
    // 【2026-01-22 P1修复】延长事务超时到30秒，避免复杂核销操作超时
    timeout: 30000,
  }) as { success: boolean; couponDeduction: number; redeemedCoupons: Array<{ id: number; code: string; amount: number }> };

  // 【2026-01-24 P0-04修复】审计日志已移到事务内部，确保事务一致性

  // 【2026-01-18 春节营销】发放首单成交奖励
  // 在事务外异步处理，避免奖励发放失败影响核销结果
  if (reservation.salespersonId && reservation.salespersonLevel && reservation.salespersonLevel > 0) {
    // 只对推销员的订单发放首单奖励（不是总代理直销）
    processFirstCompleteRewards(reservation.salespersonId).catch(err => {
      console.error(`[春节营销] 首单成交奖励发放失败:`, err);
    });
  }

  // 【2026-01-21 拼团到店】处理拼团成员状态
  let groupBuyResult: { shouldDeliverBonusGift: boolean; bonusGiftName?: string | null } = {
    shouldDeliverBonusGift: false,
  };
  if (groupBuyEnabled === 'true') {
    try {
      groupBuyResult = await markMemberPickedUp(reservationId);
      if (groupBuyResult.shouldDeliverBonusGift) {
        console.log(`[拼团] 最后一人到店，触发赠品发放: ${groupBuyResult.bonusGiftName}`);
      }
    } catch (err) {
      // 拼团处理失败不影响核销结果
      console.error('[拼团] 状态更新失败:', err);
    }
  }

  // 计算实付金额
  const totalAmount = Number(reservation.totalAmount);
  const actualPayment = Math.max(0, totalAmount - result.couponDeduction);

  return {
    success: true,
    message: '核销成功',
    data: {
      reservationNo: reservation.reservationNo,
      totalAmount,
      paymentMethod,
      // 【2026-01-29】自购订单不发放赠品
      giftDelivered: deliverGift && !!reservation.giftName && !reservation.isSelfPurchase,
      giftName: reservation.isSelfPurchase ? null : reservation.giftName,
      // 返回利润信息
      profitSettled: true,
      masterProfit: totalMasterProfit,
      level1Profit: totalLevel1Profit,
      level2Profit: totalLevel2Profit,
      // 【2026-01-21 代金券抵扣】返回代金券信息
      couponDeduction: result.couponDeduction,
      actualPayment,
      redeemedCoupons: result.redeemedCoupons,
      // 【2026-01-21 拼团到店】返回拼团信息
      groupBuy: groupBuyInfo ? {
        code: groupBuyInfo.code,
        status: groupBuyInfo.status,
        requiredCount: groupBuyInfo.requiredCount,
        currentCount: groupBuyInfo.currentCount,
        pickedUpCount: groupBuyInfo.pickedUpCount + 1, // 加上当前核销的这个人
        bonusGiftName: groupBuyInfo.bonusGiftName,
        isLastMember: groupBuyInfo.isLastMember,
        shouldDeliverBonusGift: groupBuyResult.shouldDeliverBonusGift,
      } : null,
    },
  };
  } catch (error: any) {
    // 【2026-01-18 错误信息安全处理】
    console.error('[PickupService] 核销事务失败:', error);

    // 库存不足是业务错误，可以展示给用户
    if (error.message?.includes('库存不足') || error.message?.includes('不存在')) {
      return { success: false, message: error.message };
    }

    // 其他数据库错误隐藏细节，避免暴露敏感信息
    return { success: false, message: '核销失败，请稍后重试' };
  }
}

/**
 * 获取今日核销统计
 */
export async function getTodayPickupStats(storeId: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [completedCount, completedAmount, pendingCount] = await Promise.all([
    // 今日核销数量
    prisma.reservation.count({
      where: {
        storeId,
        status: ReservationStatus.COMPLETED,
        completedAt: { gte: today },
      },
    }),
    // 今日核销金额
    prisma.reservation.aggregate({
      where: {
        storeId,
        status: ReservationStatus.COMPLETED,
        completedAt: { gte: today },
      },
      _sum: { totalAmount: true },
    }),
    // 【2026-01-18修复】待核销数量仅统计状态9（待提货），状态2需要先备货
    prisma.reservation.count({
      where: {
        storeId,
        status: ReservationStatus.PENDING_PICKUP,
      },
    }),
  ]);

  return {
    completedCount,
    completedAmount: completedAmount._sum.totalAmount
      ? Number(completedAmount._sum.totalAmount)
      : 0,
    pendingCount,
  };
}

/**
 * 【2026-01-19】获取按周期统计的核销数据
 * @param period - 统计周期：today, week, month, total
 */
export async function getPickupStatsByPeriod(storeId: number, period: 'today' | 'week' | 'month' | 'total') {
  // 计算日期范围
  const now = new Date();
  let startDate: Date | undefined;

  switch (period) {
    case 'today':
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'total':
      startDate = undefined; // 不限制日期
      break;
  }

  const completedWhere: any = {
    storeId,
    status: ReservationStatus.COMPLETED,
  };

  if (startDate) {
    completedWhere.completedAt = { gte: startDate };
  }

  const completedCount = await prisma.reservation.count({
    where: completedWhere,
  });

  return {
    completedCount,
    period,
  };
}

/**
 * 获取今日已核销列表
 */
export async function getTodayCompletedList(storeId: number, params: {
  page?: number;
  pageSize?: number;
}) {
  const { page = 1, pageSize = 20 } = params;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const where = {
    storeId,
    status: ReservationStatus.COMPLETED,
    completedAt: { gte: today },
  };

  const [total, list] = await Promise.all([
    prisma.reservation.count({ where }),
    prisma.reservation.findMany({
      where,
      include: { items: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { completedAt: 'desc' },
    }),
  ]);

  return {
    total,
    list: list.map(r => ({
      id: r.id,
      reservationNo: r.reservationNo,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      totalAmount: Number(r.totalAmount),
      paymentMethod: r.paymentMethod,
      giftName: r.giftName,
      giftDelivered: r.giftDelivered,
      // 商品总数量（所有item的quantity之和）
      itemCount: r.items.reduce((sum, item) => sum + item.quantity, 0),
      completedAt: r.completedAt,
    })),
    page,
    pageSize,
  };
}

/**
 * 【2026-01-21】获取预约对应推销员的可用代金券
 * 用于门店核销时选择代金券
 */
export async function getReservationCoupons(reservationId: number): Promise<{
  success: boolean;
  data?: {
    agentId: number;
    agentName: string;
    coupons: Array<{
      id: number;
      code: string;
      amount: number;
      sourceDesc: string | null;
      expiredAt: Date;
    }>;
  };
  message?: string;
}> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: {
      salespersonId: true,
      salespersonLevel: true,
    },
  });

  if (!reservation) {
    return { success: false, message: '预约不存在' };
  }

  // 只有推销员的订单才有代金券
  if (!reservation.salespersonId || !reservation.salespersonLevel || reservation.salespersonLevel === 0) {
    return {
      success: true,
      data: {
        agentId: 0,
        agentName: '总代理直销',
        coupons: [],
      },
    };
  }

  // 查询推销员信息
  const agent = await prisma.agent.findUnique({
    where: { id: reservation.salespersonId },
    select: { id: true, name: true },
  });

  const coupons = await getAvailableCouponsForAgent(reservation.salespersonId);

  return {
    success: true,
    data: {
      agentId: reservation.salespersonId,
      agentName: agent?.name || '',
      coupons,
    },
  };
}

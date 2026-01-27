/**
 * 砍价下单服务
 * @module services/bargain/bargainOrderService
 * @since 2026-01-22
 */

import prisma from '../../utils/prisma';
import {
  BargainStatus,
  BargainOrderRequest,
  BargainOrderResult,
  BargainProfitDistribution,
  CostBearerType,
} from './types';
import { updateBargainStats, getCategoryCodeByBargainId } from './bargainAntiAbuseService';

/**
 * 生成预约号
 */
function generateReservationNo(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `MQ${dateStr}${random}`;
}

/**
 * 计算砍价利润分配
 *
 * 规则（已确认：平台全部承担）：
 * - 砍掉的金额全部从总代理利润中扣除
 * - 推销员利润不受影响
 */
export function calculateBargainProfit(params: {
  originalPrice: number;       // 原价（零售价）
  currentPrice: number;        // 砍后价格
  costPrice: number;           // 成本价
  supplyPrice: number;         // 供货价
  subPrice?: number;           // 一级给二级的价
  salespersonLevel?: number;   // 推销员级别
  costBearerType: string;      // 成本承担类型
  agentBearRatio: number;      // 推销员承担比例
}): BargainProfitDistribution {
  const {
    originalPrice,
    currentPrice,
    costPrice,
    supplyPrice,
    subPrice,
    salespersonLevel,
    costBearerType,
    agentBearRatio,
  } = params;

  const totalCut = originalPrice - currentPrice;  // 砍掉的总金额

  let masterProfit = 0;
  let level1Profit = 0;
  let level2Profit = 0;
  let platformCost = 0;
  let agentCost = 0;

  // 根据来源计算原始利润
  if (!salespersonLevel) {
    // 总代理直销：利润 = 砍后价 - 成本价
    masterProfit = currentPrice - costPrice;
    platformCost = totalCut;  // 砍掉的金额全部由平台承担
  } else if (salespersonLevel === 1) {
    // 一级推销员分享
    // 总代理利润 = 供货价 - 成本价
    // 一级利润 = 砍后价 - 供货价
    const originalMasterProfit = supplyPrice - costPrice;
    const originalLevel1Profit = originalPrice - supplyPrice;

    if (costBearerType === CostBearerType.PLATFORM) {
      // 平台承担全部：从总代理利润扣
      masterProfit = originalMasterProfit - totalCut;
      level1Profit = currentPrice - supplyPrice;  // 一级按砍后价计算，但不承担成本
      platformCost = totalCut;
    } else if (costBearerType === CostBearerType.AGENT) {
      // 推销员承担全部
      masterProfit = originalMasterProfit;
      level1Profit = currentPrice - supplyPrice;
      agentCost = totalCut;
    } else {
      // 按比例分摊
      const agentShare = totalCut * (agentBearRatio / 100);
      const platformShare = totalCut - agentShare;
      masterProfit = originalMasterProfit - platformShare;
      level1Profit = currentPrice - supplyPrice;
      platformCost = platformShare;
      agentCost = agentShare;
    }
  } else if (salespersonLevel === 2 && subPrice) {
    // 二级推销员分享
    // 总代理利润 = 供货价 - 成本价
    // 一级利润 = 一级给二级的价 - 供货价
    // 二级利润 = 砍后价 - 一级给二级的价
    const originalMasterProfit = supplyPrice - costPrice;
    const originalLevel1Profit = subPrice - supplyPrice;
    const originalLevel2Profit = originalPrice - subPrice;

    if (costBearerType === CostBearerType.PLATFORM) {
      // 平台承担全部
      masterProfit = originalMasterProfit - totalCut;
      level1Profit = originalLevel1Profit;
      level2Profit = currentPrice - subPrice;
      platformCost = totalCut;
    } else if (costBearerType === CostBearerType.AGENT) {
      // 推销员承担全部（按比例分给一级和二级）
      const totalAgentProfit = originalLevel1Profit + originalLevel2Profit;
      const level1Share = totalAgentProfit > 0 ? (originalLevel1Profit / totalAgentProfit) * totalCut : totalCut / 2;
      const level2Share = totalCut - level1Share;

      masterProfit = originalMasterProfit;
      level1Profit = originalLevel1Profit - level1Share;
      level2Profit = currentPrice - subPrice;
      agentCost = totalCut;
    } else {
      // 按比例分摊
      const agentShare = totalCut * (agentBearRatio / 100);
      const platformShare = totalCut - agentShare;

      masterProfit = originalMasterProfit - platformShare;
      level1Profit = originalLevel1Profit;
      level2Profit = currentPrice - subPrice;
      platformCost = platformShare;
      agentCost = agentShare;
    }
  }

  // 【2026-01-23 R-02修复】利润负数保护
  // 如果利润为负，记录警告并保护为0
  if (masterProfit < 0) {
    console.warn(`[砍价利润警告] 总代理利润为负: 计算值=${masterProfit.toFixed(2)}, 原价=${originalPrice}, 砍后价=${currentPrice}`);
    masterProfit = 0;
  }
  if (level1Profit < 0) {
    console.warn(`[砍价利润警告] 一级推销员利润为负: 计算值=${level1Profit.toFixed(2)}`);
    level1Profit = 0;
  }
  if (level2Profit < 0) {
    console.warn(`[砍价利润警告] 二级推销员利润为负: 计算值=${level2Profit.toFixed(2)}`);
    level2Profit = 0;
  }

  return {
    masterProfit,
    level1Profit,
    level2Profit,
    platformCost,
    agentCost,
  };
}

/**
 * 砍价下单（创建预约）
 * 【2026-01-23 P0-02/P0-03修复】使用行锁防止并发下单，使用条件更新防止库存超卖
 */
export async function createBargainOrder(
  request: BargainOrderRequest
): Promise<BargainOrderResult> {
  const { bargainCode, customerName, customerPhone, pickupDate, storeId } = request;

  // 预先验证门店（在事务外）
  const store = await prisma.warehouse.findUnique({
    where: { id: storeId },
  });
  if (!store || store.status !== 'ACTIVE') {
    return { success: false, message: '门店不存在或已停用' };
  }

  // 生成预约号（在事务外）
  const reservationNo = generateReservationNo();

  try {
    // 【P0-02核心修复】使用事务+行锁确保并发安全
    const result = await prisma.$transaction(async (tx) => {
      // 使用FOR UPDATE锁定砍价记录，防止并发下单
      // 【2026-01-23 P0-05修复】使用正确的数据库列名（snake_case）
      const [bargainRow] = await tx.$queryRaw<any[]>`
        SELECT b.*, p.costPrice as productCostPrice, p.supplyPrice as productSupplyPrice,
               p.stock as productStock, p.name as productName, p.images as productImages,
               c.cost_bearer_type as costBearerType, c.agent_bear_ratio as agentBearRatio
        FROM bargains b
        JOIN products p ON b.product_id = p.id
        JOIN bargain_configs c ON b.config_id = c.id
        WHERE b.code = ${bargainCode}
        FOR UPDATE
      `;

      if (!bargainRow) {
        throw new Error('砍价活动不存在');
      }

      // 验证砍价状态
      if (bargainRow.status !== BargainStatus.SUCCESS) {
        const statusMessages: Record<string, string> = {
          [BargainStatus.BARGAINING]: '砍价尚未完成，请继续邀请好友帮砍',
          [BargainStatus.ORDERED]: '该砍价已下单',
          [BargainStatus.EXPIRED]: '该砍价已过期',
          [BargainStatus.CANCELLED]: '该砍价已取消',
        };
        throw new Error(statusMessages[bargainRow.status] || '砍价状态异常');
      }

      // 验证是否达到底价
      if (!bargainRow.reached_floor) {
        throw new Error('砍价尚未达到底价');
      }

      // 验证发起人
      if (bargainRow.initiator_phone !== customerPhone) {
        throw new Error('只有发起人可以下单');
      }

      // 【关键】检查是否已有预约（防止重复下单）
      if (bargainRow.reservation_id) {
        throw new Error('该砍价已下单');
      }

      // 获取价格信息
      const costPrice = Number(bargainRow.productCostPrice) || 0;
      const supplyPrice = Number(bargainRow.productSupplyPrice) || costPrice;
      const currentPrice = Number(bargainRow.current_price);
      const originalPrice = Number(bargainRow.original_price);
      const quantity = bargainRow.quantity;

      // 获取一级给二级的价
      let subPrice: number | undefined;
      if (bargainRow.salesperson_level === 2 && bargainRow.parent_salesperson_id) {
        const agentPrice = await tx.agentPrice.findUnique({
          where: {
            agentId_productId: {
              agentId: bargainRow.parent_salesperson_id,
              productId: bargainRow.product_id,
            },
          },
        });
        subPrice = agentPrice?.subPrice ? Number(agentPrice.subPrice) : supplyPrice;
      }

      // 计算利润分配
      const profitDistribution = calculateBargainProfit({
        originalPrice,
        currentPrice,
        costPrice,
        supplyPrice,
        subPrice,
        salespersonLevel: bargainRow.salesperson_level || undefined,
        costBearerType: bargainRow.costBearerType,
        agentBearRatio: bargainRow.agentBearRatio,
      });

      // 创建预约单
      const reservation = await tx.reservation.create({
        data: {
          reservationNo,
          customerName,
          customerPhone,
          pickupDate: new Date(pickupDate),
          salespersonId: bargainRow.salesperson_id,
          salespersonLevel: bargainRow.salesperson_level,
          parentSalespersonId: bargainRow.parent_salesperson_id,
          agentId: bargainRow.agent_id,
          storeId,
          totalAmount: currentPrice * quantity,
          status: 0,
          masterProfit: profitDistribution.masterProfit * quantity,
          level1Profit: profitDistribution.level1Profit * quantity,
          level2Profit: profitDistribution.level2Profit * quantity,
        },
      });

      // 创建预约商品明细
      // 【2026-01-23 BUG-2修复】设置 isBargain 和 bargainId 标记砍价商品
      const images = JSON.parse(bargainRow.productImages || '[]');
      await tx.reservationItem.create({
        data: {
          reservationId: reservation.id,
          productId: bargainRow.product_id,
          productName: bargainRow.productName,
          productImage: images[0] || null,
          quantity: quantity,
          price: currentPrice,
          snapshotCostPrice: costPrice,
          snapshotSupplyPrice: supplyPrice,
          snapshotLevel1Price: subPrice || null,
          snapshotRetailPrice: currentPrice,
          isBargain: true,  // 【BUG-2修复】标记为砍价商品
          bargainId: bargainRow.id,  // 【BUG-2修复】关联砍价记录
        },
      });

      // 【P0-03核心修复】使用条件更新确保库存扣减原子性
      const configItem = await tx.bargainConfigItem.findFirst({
        where: {
          configId: bargainRow.config_id,
          productId: bargainRow.product_id,
        },
      });

      if (configItem && configItem.bargainStock > 0) {
        // 使用独立库存：条件更新确保不超卖
        const updateResult = await tx.$executeRaw`
          UPDATE bargain_config_items
          SET sold_count = sold_count + ${quantity}
          WHERE id = ${configItem.id}
          AND (bargain_stock - sold_count) >= ${quantity}
        `;
        if (updateResult === 0) {
          throw new Error('砍价库存不足');
        }
        console.log(`[砍价下单] 使用独立库存: 商品ID=${bargainRow.product_id}, 扣减数量=${quantity}`);
      } else {
        // 使用主库存：条件更新确保不超卖
        const updateResult = await tx.$executeRaw`
          UPDATE products
          SET stock = stock - ${quantity}, lock_stock = lock_stock + ${quantity}
          WHERE id = ${bargainRow.product_id} AND stock >= ${quantity}
        `;
        if (updateResult === 0) {
          throw new Error('商品库存不足');
        }

        // 同时更新 soldCount 用于统计
        if (configItem) {
          await tx.bargainConfigItem.update({
            where: { id: configItem.id },
            data: { soldCount: { increment: quantity } },
          });
        }
        console.log(`[砍价下单] 使用主库存: 商品ID=${bargainRow.product_id}, 扣减数量=${quantity}`);
      }

      // 更新砍价状态
      await tx.bargain.update({
        where: { id: bargainRow.id },
        data: {
          status: BargainStatus.ORDERED,
          reservationId: reservation.id,
          orderedAt: new Date(),
          platformCost: profitDistribution.platformCost * quantity,
          agentCost: profitDistribution.agentCost * quantity,
        },
      });

      // 返回预约和砍价信息用于更新统计
      return {
        reservation,
        bargainInfo: {
          id: bargainRow.id,
          configId: bargainRow.config_id,
          productId: bargainRow.product_id,
          initiatorPhone: bargainRow.initiator_phone,
        },
      };
    });

    // 【2026-01-25 更新用户砍价统计】
    const categoryCode = await getCategoryCodeByBargainId(result.bargainInfo.id);
    await updateBargainStats(
      result.bargainInfo.initiatorPhone,
      result.bargainInfo.configId,
      result.bargainInfo.id,
      result.bargainInfo.productId,
      categoryCode,
      'ORDERED'
    );

    return {
      success: true,
      reservationId: result.reservation.id,
      reservationNo: result.reservation.reservationNo,
      message: '下单成功，请等待门店确认',
    };
  } catch (error: any) {
    const errorMessage = error.message || '下单失败，请稍后重试';
    console.error(`[砍价下单失败] code=${bargainCode}, error=${errorMessage}`);
    return { success: false, message: errorMessage };
  }
}

/**
 * 获取砍价关联的预约信息
 */
export async function getBargainReservation(bargainCode: string): Promise<any | null> {
  const bargain = await prisma.bargain.findUnique({
    where: { code: bargainCode },
    include: {
      config: true,
    },
  });

  if (!bargain || !bargain.reservationId) {
    return null;
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: bargain.reservationId },
    include: {
      store: {
        select: { name: true, address: true, contactPhone: true },
      },
      items: true,
    },
  });

  return reservation;
}

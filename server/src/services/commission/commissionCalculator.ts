/**
 * 分润计算服务
 * 处理订单完成时的分润计算逻辑
 */
import prisma from '../../utils/prisma';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * 计算并创建分润记录
 * 在订单完成时调用
 * 【P0-06修复】使用事务保护分润记录创建和余额更新
 * 【新增】支持两种分润方式：RATE(按比例) 和 PRICE_DIFF(进货差价)
 * 【Task 1.3】支持传入外部事务，实现与订单完成的事务一致性
 */
export async function calculateCommission(orderId: number, externalTx?: any) {
  // 使用外部事务或创建新查询客户端
  const queryClient = externalTx || prisma;

  const order = await queryClient.order.findUnique({
    where: { id: orderId },
    include: {
      agent: {
        include: {
          parent: {
            include: {
              parent: true, // 获取二级上级
            },
          },
        },
      },
      items: {
        include: {
          product: {
            select: {
              retailPrice: true,
              agentPrice: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw new Error('订单不存在');
  }

  // 批发商不参与分润
  if (order.agent.type === 'WHOLESALE') {
    return [];
  }

  const orderAmount = Number(order.totalAmount);

  // 获取分润规则（按金额阈值排序，取最匹配的规则）
  const rule = await queryClient.commissionRule.findFirst({
    where: {
      status: 'ACTIVE',
      minAmount: { lte: orderAmount },
    },
    orderBy: { minAmount: 'desc' },
  });

  if (!rule) {
    console.log('未找到匹配的分润规则');
    return [];
  }

  // 如果传入了外部事务，直接在该事务中执行
  // 否则创建新事务
  if (externalTx) {
    return executeCommissionCalculation(externalTx, orderId, order, orderAmount, rule);
  }

  // 【P0-06修复】使用事务确保分润记录和余额更新的原子性
  return prisma.$transaction(async (tx) => {
    return executeCommissionCalculation(tx, orderId, order, orderAmount, rule);
  });
}

/**
 * 执行分润计算的核心逻辑（内部函数）
 * 【Task 1.3】抽取为独立函数，支持外部事务传入
 */
async function executeCommissionCalculation(
  tx: any,
  orderId: number,
  order: any,
  orderAmount: number,
  rule: any
) {
  const commissions: any[] = [];

  // 检查是否已经计算过分润（幂等性检查）
  const existingCommissions = await tx.commission.findMany({
    where: { orderId },
  });
  if (existingCommissions.length > 0) {
    console.log(`订单${orderId}分润已计算过，跳过`);
    return existingCommissions;
  }

  // 1. 直接分润：给订单代理商的上级
  if (order.agent.parentId && order.agent.parent) {
    // 获取上级代理商的分润方式
    const parentAgent = await tx.agent.findUnique({
      where: { id: order.agent.parentId },
      select: { balance: true, commissionMethod: true, type: true },
    });

    let directAmount = 0;
    let commissionRate = Number(rule.level1Rate);
    let commissionRemark = `订单${order.orderNo}直接分润`;

    // 根据分润方式计算分润金额
    if (parentAgent?.commissionMethod === 'PRICE_DIFF' && parentAgent.type === 'LEVEL1') {
      // 进货差价模式：分润 = Σ(零售价 - 代理价) × 数量
      for (const item of order.items) {
        if (item.product) {
          const retailPrice = Number(item.product.retailPrice || 0);
          const agentPrice = Number(item.product.agentPrice || 0);
          const priceDiff = retailPrice - agentPrice;
          if (priceDiff > 0) {
            directAmount += priceDiff * item.quantity;
          }
        }
      }
      commissionRate = 0; // 进货差价模式不按比例
      commissionRemark = `订单${order.orderNo}直接分润(进货差价)`;
      console.log(`订单${order.orderNo}使用进货差价分润，金额：${directAmount}`);
    } else {
      // 按比例模式（默认）：分润 = 订单金额 × 分润比例
      directAmount = new Decimal(orderAmount).mul(rule.level1Rate).div(100).toNumber();
    }

    if (directAmount > 0) {
      // 【Task 2.2】T+1结算：分润创建时状态为PENDING，次日定时任务结算时才增加余额
      const directCommission = await tx.commission.create({
        data: {
          agentId: order.agent.parentId,
          orderId: orderId,
          amount: directAmount,
          rate: commissionRate,
          type: 'DIRECT',
          status: 'PENDING', // T+1结算：待结算状态
        },
      });

      // 【Task 2.2】移除立即增加余额的逻辑，改由定时任务结算
      // 仅更新累计分润（用于统计展示），余额在结算时更新
      await tx.agent.update({
        where: { id: order.agent.parentId },
        data: {
          totalCommission: { increment: directAmount },
        },
      });

      // 【Task 2.2】资金流水在结算时创建，此处不创建
      console.log(`[T+1结算] 订单${order.orderNo}直接分润￥${directAmount}已记录，待次日结算`);

      commissions.push(directCommission);
    }

    // 2. 间接分润：给订单代理商的上上级（仍使用按比例方式）
    if (order.agent.parent.parentId && order.agent.parent.parent) {
      const indirectAmount = new Decimal(orderAmount).mul(rule.level2Rate).div(100).toNumber();

      if (indirectAmount > 0) {
        // 【Task 2.2】T+1结算：分润创建时状态为PENDING
        const indirectCommission = await tx.commission.create({
          data: {
            agentId: order.agent.parent.parentId,
            orderId: orderId,
            amount: indirectAmount,
            rate: Number(rule.level2Rate),
            type: 'INDIRECT',
            status: 'PENDING', // T+1结算：待结算状态
          },
        });

        // 【Task 2.2】移除立即增加余额的逻辑，改由定时任务结算
        // 仅更新累计分润
        await tx.agent.update({
          where: { id: order.agent.parent.parentId },
          data: {
            totalCommission: { increment: indirectAmount },
          },
        });

        // 【Task 2.2】资金流水在结算时创建
        console.log(`[T+1结算] 订单${order.orderNo}间接分润￥${indirectAmount}已记录，待次日结算`);

        commissions.push(indirectCommission);
      }
    }
  }

  return commissions;
}

/**
 * 回滚订单分润
 * 当订单取消时调用，撤销已产生的分润记录
 * 【优化计划 Task 1.1】
 */
export async function rollbackCommission(orderId: number): Promise<{ count: number; amount: number }> {
  return prisma.$transaction(async (tx) => {
    // 1. 查找该订单的所有未取消的分润记录
    const commissions = await tx.commission.findMany({
      where: {
        orderId,
        status: { not: 'CANCELLED' },
      },
    });

    if (commissions.length === 0) {
      console.log(`订单${orderId}无分润记录需要回滚`);
      return { count: 0, amount: 0 };
    }

    let totalRefundAmount = 0;

    // 2. 逐条处理分润回滚
    for (const commission of commissions) {
      const refundAmount = Number(commission.amount);
      totalRefundAmount += refundAmount;

      // 2.1 获取代理商当前余额
      const agent = await tx.agent.findUnique({
        where: { id: commission.agentId },
        select: { balance: true, totalCommission: true },
      });

      if (!agent) {
        console.error(`代理商${commission.agentId}不存在，跳过该分润回滚`);
        continue;
      }

      const currentBalance = Number(agent.balance);
      const currentTotalCommission = Number(agent.totalCommission);

      // 2.2 更新分润记录状态为CANCELLED
      await tx.commission.update({
        where: { id: commission.id },
        data: {
          status: 'CANCELLED',
        },
      });

      // 2.3 回滚代理商余额和累计分润
      // 注意：余额可能已经被提现，需要处理负数情况
      const newBalance = Math.max(0, currentBalance - refundAmount);
      const newTotalCommission = Math.max(0, currentTotalCommission - refundAmount);

      await tx.agent.update({
        where: { id: commission.agentId },
        data: {
          balance: newBalance,
          totalCommission: newTotalCommission,
        },
      });

      // 2.4 创建回滚资金流水记录
      await tx.fundFlow.create({
        data: {
          agentId: commission.agentId,
          type: 'COMMISSION_REFUND',
          amount: -refundAmount, // 负数表示支出/回滚
          beforeBalance: currentBalance,
          afterBalance: newBalance,
          relatedId: commission.id,
          relatedType: 'COMMISSION',
          remark: `订单取消，分润回滚（${commission.type === 'DIRECT' ? '直接分润' : '间接分润'}）`,
        },
      });

      console.log(`分润回滚: 代理商${commission.agentId}, 金额${refundAmount}, 类型${commission.type}`);
    }

    console.log(`订单${orderId}分润回滚完成: ${commissions.length}条记录, 总金额￥${totalRefundAmount}`);
    return { count: commissions.length, amount: totalRefundAmount };
  });
}

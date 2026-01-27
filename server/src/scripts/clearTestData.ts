/**
 * 数据清理脚本 - 清除所有订单/预约相关数据用于全面测试
 *
 * 执行方式: npx ts-node src/scripts/clearTestData.ts
 *
 * 警告: 此脚本会删除所有预约数据，仅用于测试环境！
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearTestData() {
  console.log('========================================');
  console.log('开始清理测试数据...');
  console.log('========================================');

  try {
    // 使用事务确保数据一致性
    await prisma.$transaction(async (tx) => {

      // ==================== 阶段1：删除预约相关数据 ====================
      console.log('\n--- 阶段1：删除预约相关数据 ---');

      // 1.1 删除预约商品明细
      const deletedItems = await tx.reservationItem.deleteMany({});
      console.log(`[1/12] 删除预约商品明细: ${deletedItems.count} 条`);

      // 1.2 删除预约审计日志
      const deletedAudits = await tx.reservationAudit.deleteMany({});
      console.log(`[2/12] 删除预约审计日志: ${deletedAudits.count} 条`);

      // 1.3 删除备货问题记录
      const deletedIssues = await tx.prepareIssue.deleteMany({});
      console.log(`[3/12] 删除备货问题记录: ${deletedIssues.count} 条`);

      // 1.4 删除拼团成员记录
      const deletedGroupBuyMembers = await tx.groupBuyMember.deleteMany({});
      console.log(`[4/12] 删除拼团成员记录: ${deletedGroupBuyMembers.count} 条`);

      // 1.5 清空砍价记录的预约关联
      const updatedBargains = await tx.bargain.updateMany({
        where: { reservationId: { not: null } },
        data: { reservationId: null }
      });
      console.log(`[5/12] 清空砍价记录预约关联: ${updatedBargains.count} 条`);

      // 1.6 删除预约单
      const deletedReservations = await tx.reservation.deleteMany({});
      console.log(`[6/12] 删除预约单: ${deletedReservations.count} 条`);

      // ==================== 阶段2：删除资金相关数据 ====================
      console.log('\n--- 阶段2：删除资金相关数据 ---');

      // 2.1 删除资金流水（利润类型）
      const deletedFundFlows = await tx.fundFlow.deleteMany({
        where: {
          OR: [
            { type: 'COMMISSION' },
            { type: 'PROFIT' },
            { relatedType: 'RESERVATION' }
          ]
        }
      });
      console.log(`[7/12] 删除资金流水: ${deletedFundFlows.count} 条`);

      // 2.2 删除交易追踪记录
      const deletedTraces = await tx.transactionTrace.deleteMany({
        where: {
          sourceTable: 'reservations'
        }
      });
      console.log(`[8/12] 删除交易追踪: ${deletedTraces.count} 条`);

      // ==================== 阶段3：删除代金券相关数据 ====================
      console.log('\n--- 阶段3：删除代金券相关数据 ---');

      // 3.1 删除所有代金券
      const deletedCoupons = await tx.coupon.deleteMany({});
      console.log(`[9/12] 删除代金券: ${deletedCoupons.count} 条`);

      // ==================== 阶段4：删除统计相关数据 ====================
      console.log('\n--- 阶段4：删除统计相关数据 ---');

      // 4.1 删除周销售统计
      const deletedWeeklyStats = await tx.weeklyStats.deleteMany({});
      console.log(`[10/12] 删除周销售统计: ${deletedWeeklyStats.count} 条`);

      // 4.2 删除推销员活动记录
      const deletedActivities = await tx.agentActivity.deleteMany({});
      console.log(`[11/12] 删除推销员活动记录: ${deletedActivities.count} 条`);

      // 4.3 删除发圈审核记录
      const deletedShareRecords = await tx.shareRecord.deleteMany({});
      console.log(`[12/12] 删除发圈审核记录: ${deletedShareRecords.count} 条`);

    }, { timeout: 60000 }); // 60秒超时

    // ==================== 阶段5：重置计数器（独立事务）====================
    console.log('\n--- 阶段5：重置计数器 ---');

    await prisma.$transaction(async (tx) => {
      // 5.1 重置商品库存
      const resetProducts = await tx.product.updateMany({
        data: {
          lockStock: 0,
          salesCount: 0
        }
      });
      console.log(`[重置] 商品锁定库存和销量: ${resetProducts.count} 个商品`);

      // 5.2 重置推销员财务数据
      const resetAgents = await tx.agent.updateMany({
        data: {
          balance: 0,
          totalCommission: 0,
          totalSales: 0,
          totalOrderCount: 0,
          teamSales: 0,
          monthlyTeamSales: 0,
          validInviteCount: 0,
          currentRewardTier: 0,
          isActivated: false,
          activatedAt: null,
          lastRewardMonth: null
        }
      });
      console.log(`[重置] 推销员财务数据: ${resetAgents.count} 个推销员`);

      // 5.3 重置客户风控数据
      const resetCustomers = await tx.customerRecord.updateMany({
        data: {
          totalOrders: 0,
          completedOrders: 0,
          noShowCount: 0,
          riskLevel: 0,
          isBlocked: false,
          blockedReason: null
        }
      });
      console.log(`[重置] 客户风控数据: ${resetCustomers.count} 个客户`);

    }, { timeout: 30000 });

    console.log('\n========================================');
    console.log('数据清理完成！');
    console.log('========================================');

    // 验证清理结果
    console.log('\n--- 验证清理结果 ---');
    const reservationCount = await prisma.reservation.count();
    const fundFlowCount = await prisma.fundFlow.count({ where: { type: 'COMMISSION' } });
    const couponCount = await prisma.coupon.count();
    const weeklyStatsCount = await prisma.weeklyStats.count();

    console.log(`预约单数量: ${reservationCount}`);
    console.log(`利润流水数量: ${fundFlowCount}`);
    console.log(`代金券数量: ${couponCount}`);
    console.log(`周统计数量: ${weeklyStatsCount}`);

    // 检查商品库存状态
    const productsWithLock = await prisma.product.count({
      where: { lockStock: { gt: 0 } }
    });
    console.log(`仍有锁定库存的商品: ${productsWithLock}`);

    // 检查推销员余额
    const agentsWithBalance = await prisma.agent.count({
      where: { balance: { gt: 0 } }
    });
    console.log(`仍有余额的推销员: ${agentsWithBalance}`);

    if (reservationCount === 0 && fundFlowCount === 0 && couponCount === 0
        && productsWithLock === 0 && agentsWithBalance === 0) {
      console.log('\n✅ 所有数据已成功清理！');
    } else {
      console.log('\n⚠️ 部分数据可能未完全清理，请检查');
    }

  } catch (error) {
    console.error('\n❌ 清理过程中出错:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 执行清理
clearTestData()
  .then(() => {
    console.log('\n脚本执行完毕');
    process.exit(0);
  })
  .catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });

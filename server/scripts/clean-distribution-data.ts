/**
 * 分销功能数据清理脚本
 *
 * 用途：清除所有分销相关的测试数据，为全面测试做准备
 *
 * 清理范围：
 * - 预约相关：reservations, reservation_items, reservation_audits, prepare_issues
 * - 订单相关：orders, order_items, order_confirm_logs, commissions
 * - 推销员关联：agent_prices, agent_activities, coupons, share_records, weekly_stats
 * - 财务相关：fund_flows, reward_records, withdrawals, transaction_traces, balance_snapshots
 * - 营销活动：bargains, bargain_cuts, group_buy_members, price_locks
 * - 审计相关：reconciliation_logs, audit_alerts
 *
 * 保留数据：
 * - Agent记录本身（只重置统计字段）
 * - 商品、分类、仓库等基础数据
 * - 系统用户和配置
 *
 * 执行方式：npx ts-node scripts/clean-distribution-data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanDistributionData() {
  console.log('='.repeat(60));
  console.log('分销功能数据清理脚本');
  console.log('开始时间:', new Date().toISOString());
  console.log('='.repeat(60));

  const stats: Record<string, number> = {};

  try {
    await prisma.$transaction(async (tx) => {
      // ============ Phase 1: 清理末端表 ============
      console.log('\n[Phase 1] 清理末端表...');

      // 1.1 砍价记录 (bargain_cuts)
      const bargainCuts = await tx.$executeRaw`DELETE FROM bargain_cuts`;
      stats['bargain_cuts'] = Number(bargainCuts);
      console.log(`  - bargain_cuts: ${bargainCuts} 条`);

      // 1.2 拼团成员 (group_buy_members)
      const groupBuyMembers = await tx.$executeRaw`DELETE FROM group_buy_members`;
      stats['group_buy_members'] = Number(groupBuyMembers);
      console.log(`  - group_buy_members: ${groupBuyMembers} 条`);

      // 1.3 预约审计 (reservation_audits)
      const reservationAudits = await tx.$executeRaw`DELETE FROM reservation_audits`;
      stats['reservation_audits'] = Number(reservationAudits);
      console.log(`  - reservation_audits: ${reservationAudits} 条`);

      // 1.4 备货问题 (prepare_issues)
      const prepareIssues = await tx.$executeRaw`DELETE FROM prepare_issues`;
      stats['prepare_issues'] = Number(prepareIssues);
      console.log(`  - prepare_issues: ${prepareIssues} 条`);

      // 1.5 预约商品明细 (reservation_items)
      const reservationItems = await tx.$executeRaw`DELETE FROM reservation_items`;
      stats['reservation_items'] = Number(reservationItems);
      console.log(`  - reservation_items: ${reservationItems} 条`);

      // 1.6 订单商品明细 (order_items)
      const orderItems = await tx.$executeRaw`DELETE FROM order_items`;
      stats['order_items'] = Number(orderItems);
      console.log(`  - order_items: ${orderItems} 条`);

      // ============ Phase 2: 清理中间层表 ============
      console.log('\n[Phase 2] 清理中间层表...');

      // 2.1 砍价活动 (bargains)
      const bargains = await tx.$executeRaw`DELETE FROM bargains`;
      stats['bargains'] = Number(bargains);
      console.log(`  - bargains: ${bargains} 条`);

      // 2.2 拼团活动 (group_buys)
      const groupBuys = await tx.$executeRaw`DELETE FROM group_buys`;
      stats['group_buys'] = Number(groupBuys);
      console.log(`  - group_buys: ${groupBuys} 条`);

      // 2.3 锁价记录 (price_locks)
      const priceLocks = await tx.$executeRaw`DELETE FROM price_locks`;
      stats['price_locks'] = Number(priceLocks);
      console.log(`  - price_locks: ${priceLocks} 条`);

      // 2.4 预约单 (reservations)
      const reservations = await tx.$executeRaw`DELETE FROM reservations`;
      stats['reservations'] = Number(reservations);
      console.log(`  - reservations: ${reservations} 条`);

      // 2.5 分润记录 (commissions)
      const commissions = await tx.$executeRaw`DELETE FROM commissions`;
      stats['commissions'] = Number(commissions);
      console.log(`  - commissions: ${commissions} 条`);

      // 2.6 订单确认日志 (order_confirm_logs)
      const orderConfirmLogs = await tx.$executeRaw`DELETE FROM order_confirm_logs`;
      stats['order_confirm_logs'] = Number(orderConfirmLogs);
      console.log(`  - order_confirm_logs: ${orderConfirmLogs} 条`);

      // 2.7 异常工单 (exception_orders)
      const exceptionOrders = await tx.$executeRaw`DELETE FROM exception_orders`;
      stats['exception_orders'] = Number(exceptionOrders);
      console.log(`  - exception_orders: ${exceptionOrders} 条`);

      // 2.8 移库任务 (transfer_tasks)
      const transferTasks = await tx.$executeRaw`DELETE FROM transfer_tasks`;
      stats['transfer_tasks'] = Number(transferTasks);
      console.log(`  - transfer_tasks: ${transferTasks} 条`);

      // ============ Phase 3: 清理订单主表 ============
      console.log('\n[Phase 3] 清理订单主表...');

      // 3.1 订单 (orders)
      const orders = await tx.$executeRaw`DELETE FROM orders`;
      stats['orders'] = Number(orders);
      console.log(`  - orders: ${orders} 条`);

      // ============ Phase 4: 清理推销员关联表 ============
      console.log('\n[Phase 4] 清理推销员关联表...');

      // 4.1 推销员定价 (agent_prices)
      const agentPrices = await tx.$executeRaw`DELETE FROM agent_prices`;
      stats['agent_prices'] = Number(agentPrices);
      console.log(`  - agent_prices: ${agentPrices} 条`);

      // 4.2 活动追踪 (agent_activities)
      const agentActivities = await tx.$executeRaw`DELETE FROM agent_activities`;
      stats['agent_activities'] = Number(agentActivities);
      console.log(`  - agent_activities: ${agentActivities} 条`);

      // 4.3 代金券 (coupons)
      const coupons = await tx.$executeRaw`DELETE FROM coupons`;
      stats['coupons'] = Number(coupons);
      console.log(`  - coupons: ${coupons} 条`);

      // 4.4 发圈记录 (share_records)
      const shareRecords = await tx.$executeRaw`DELETE FROM share_records`;
      stats['share_records'] = Number(shareRecords);
      console.log(`  - share_records: ${shareRecords} 条`);

      // 4.5 周统计 (weekly_stats)
      const weeklyStats = await tx.$executeRaw`DELETE FROM weekly_stats`;
      stats['weekly_stats'] = Number(weeklyStats);
      console.log(`  - weekly_stats: ${weeklyStats} 条`);

      // 4.6 资金流水 (fund_flows)
      const fundFlows = await tx.$executeRaw`DELETE FROM fund_flows`;
      stats['fund_flows'] = Number(fundFlows);
      console.log(`  - fund_flows: ${fundFlows} 条`);

      // 4.7 奖励记录 (reward_records)
      const rewardRecords = await tx.$executeRaw`DELETE FROM reward_records`;
      stats['reward_records'] = Number(rewardRecords);
      console.log(`  - reward_records: ${rewardRecords} 条`);

      // 4.8 提现记录 (withdrawals)
      const withdrawals = await tx.$executeRaw`DELETE FROM withdrawals`;
      stats['withdrawals'] = Number(withdrawals);
      console.log(`  - withdrawals: ${withdrawals} 条`);

      // 4.9 升级申请 (upgrade_applications)
      const upgradeApplications = await tx.$executeRaw`DELETE FROM upgrade_applications`;
      stats['upgrade_applications'] = Number(upgradeApplications);
      console.log(`  - upgrade_applications: ${upgradeApplications} 条`);

      // 4.10 交易追踪 (transaction_traces)
      const transactionTraces = await tx.$executeRaw`DELETE FROM transaction_traces`;
      stats['transaction_traces'] = Number(transactionTraces);
      console.log(`  - transaction_traces: ${transactionTraces} 条`);

      // 4.11 余额快照 (balance_snapshots)
      const balanceSnapshots = await tx.$executeRaw`DELETE FROM balance_snapshots`;
      stats['balance_snapshots'] = Number(balanceSnapshots);
      console.log(`  - balance_snapshots: ${balanceSnapshots} 条`);

      // 4.12 购物车 (cart_items)
      const cartItems = await tx.$executeRaw`DELETE FROM cart_items`;
      stats['cart_items'] = Number(cartItems);
      console.log(`  - cart_items: ${cartItems} 条`);

      // 4.13 锁货申请 (lock_stock_requests)
      const lockStockRequests = await tx.$executeRaw`DELETE FROM lock_stock_requests`;
      stats['lock_stock_requests'] = Number(lockStockRequests);
      console.log(`  - lock_stock_requests: ${lockStockRequests} 条`);

      // 4.14 充值申请 (recharge_requests)
      const rechargeRequests = await tx.$executeRaw`DELETE FROM recharge_requests`;
      stats['recharge_requests'] = Number(rechargeRequests);
      console.log(`  - recharge_requests: ${rechargeRequests} 条`);

      // ============ Phase 5: 清理审计表 ============
      console.log('\n[Phase 5] 清理审计表...');

      // 5.1 对账记录 (reconciliation_logs)
      const reconciliationLogs = await tx.$executeRaw`DELETE FROM reconciliation_logs`;
      stats['reconciliation_logs'] = Number(reconciliationLogs);
      console.log(`  - reconciliation_logs: ${reconciliationLogs} 条`);

      // 5.2 异常告警 (audit_alerts)
      const auditAlerts = await tx.$executeRaw`DELETE FROM audit_alerts`;
      stats['audit_alerts'] = Number(auditAlerts);
      console.log(`  - audit_alerts: ${auditAlerts} 条`);

      // ============ Phase 6: 重置Agent统计字段 ============
      console.log('\n[Phase 6] 重置推销员统计字段...');

      const agentReset = await tx.$executeRaw`
        UPDATE agents SET
          balance = 0.00,
          totalCommission = 0.00,
          totalSales = 0.00,
          totalOrderCount = 0,
          teamSales = 0.00,
          validInviteCount = 0,
          currentRewardTier = 0,
          isActivated = false,
          activatedAt = NULL,
          monthlyTeamSales = 0.00,
          lastRewardMonth = NULL
      `;
      stats['agents_reset'] = Number(agentReset);
      console.log(`  - 重置了 ${agentReset} 个推销员的统计字段`);

      // ============ Phase 7: 重置商品库存锁定 ============
      console.log('\n[Phase 7] 重置商品库存锁定...');

      const productReset = await tx.$executeRaw`
        UPDATE products SET lockStock = 0
      `;
      stats['products_lockstock_reset'] = Number(productReset);
      console.log(`  - 重置了 ${productReset} 个商品的锁定库存`);

      // ============ Phase 8: 重置秒杀商品已售数量 ============
      console.log('\n[Phase 8] 重置秒杀商品已售数量...');

      const flashSaleReset = await tx.$executeRaw`
        UPDATE flash_sale_items SET sold_count = 0
      `;
      stats['flash_sale_items_reset'] = Number(flashSaleReset);
      console.log(`  - 重置了 ${flashSaleReset} 个秒杀商品的已售数量`);

      // ============ Phase 9: 重置砍价商品已售数量 ============
      console.log('\n[Phase 9] 重置砍价商品已售数量...');

      const bargainConfigReset = await tx.$executeRaw`
        UPDATE bargain_config_items SET sold_count = 0
      `;
      stats['bargain_config_items_reset'] = Number(bargainConfigReset);
      console.log(`  - 重置了 ${bargainConfigReset} 个砍价商品的已售数量`);

    }, {
      timeout: 120000, // 2分钟超时
    });

    // ============ 打印清理结果 ============
    console.log('\n' + '='.repeat(60));
    console.log('清理完成！统计结果：');
    console.log('='.repeat(60));

    let totalDeleted = 0;
    for (const [table, count] of Object.entries(stats)) {
      if (count > 0) {
        console.log(`  ${table}: ${count}`);
        if (!table.includes('reset')) {
          totalDeleted += count;
        }
      }
    }
    console.log('-'.repeat(60));
    console.log(`总计删除记录数: ${totalDeleted}`);
    console.log('结束时间:', new Date().toISOString());

  } catch (error) {
    console.error('\n[ERROR] 清理失败，事务已回滚！');
    console.error(error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 验证清理结果
async function verifyCleanup() {
  console.log('\n' + '='.repeat(60));
  console.log('验证清理结果...');
  console.log('='.repeat(60));

  const checks = [
    { name: 'reservations', query: prisma.reservation.count() },
    { name: 'orders', query: prisma.order.count() },
    { name: 'commissions', query: prisma.commission.count() },
    { name: 'coupons', query: prisma.coupon.count() },
    { name: 'fund_flows', query: prisma.fundFlow.count() },
    { name: 'weekly_stats', query: prisma.weeklyStats.count() },
    { name: 'agent_activities', query: prisma.agentActivity.count() },
    { name: 'transaction_traces', query: prisma.transactionTrace.count() },
  ];

  let allClean = true;
  for (const check of checks) {
    const count = await check.query;
    const status = count === 0 ? '✅' : '❌';
    console.log(`  ${status} ${check.name}: ${count}`);
    if (count > 0) allClean = false;
  }

  // 验证Agent统计字段
  const agentsWithBalance = await prisma.agent.count({
    where: {
      OR: [
        { balance: { not: 0 } },
        { totalCommission: { not: 0 } },
        { totalSales: { not: 0 } },
        { totalOrderCount: { not: 0 } },
      ]
    }
  });
  const agentStatus = agentsWithBalance === 0 ? '✅' : '❌';
  console.log(`  ${agentStatus} agents统计字段: ${agentsWithBalance === 0 ? '已重置' : `${agentsWithBalance}个未重置`}`);
  if (agentsWithBalance > 0) allClean = false;

  // 验证商品lockStock
  const productsWithLock = await prisma.product.count({
    where: { lockStock: { not: 0 } }
  });
  const productStatus = productsWithLock === 0 ? '✅' : '❌';
  console.log(`  ${productStatus} products.lockStock: ${productsWithLock === 0 ? '已重置' : `${productsWithLock}个未重置`}`);
  if (productsWithLock > 0) allClean = false;

  console.log('-'.repeat(60));
  if (allClean) {
    console.log('✅ 所有数据已清理完成！');
  } else {
    console.log('❌ 部分数据未清理干净，请检查！');
  }

  await prisma.$disconnect();
}

// 主函数
async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║           蒙庆烟花 - 分销功能数据清理工具                ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('\n警告：此操作将清除所有分销相关数据，不可恢复！');
  console.log('保留数据：推销员账号、商品、仓库、系统配置\n');

  try {
    await cleanDistributionData();
    await verifyCleanup();
  } catch (error) {
    console.error('执行失败:', error);
    process.exit(1);
  }
}

main();

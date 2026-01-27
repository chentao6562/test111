import { Router } from 'express';
import { loginHandler, getMeHandler, sendCodeHandler, phoneLoginHandler } from '../controllers/adminController';
import { smsRateLimiter, loginRateLimiter } from '../middlewares/rateLimit';
import { getCaptcha } from '../controllers/captchaController';
import {
  getAgentList,
  getAgentDetail,
  createAgent,
  updateAgent,
  updateAgentStatus,
  getAgentTeam,
  deleteAgent,
  getAgentStatistics,
  resetAgentPassword,
} from '../controllers/agentController';
import {
  createStaff,
  updateStaff,
  resetStaffPassword,
  deleteStaff,
  getStaffDetail,
} from '../controllers/staffManagementController';
// 【2026-01-17 Order系统清理】已移除 orderController - 系统已升级为预约模式
import {
  getRules,
  createRule,
  updateRule,
  deleteRule,
  getAdminCommissionRecords,
  getCommissionRecordDetail,
  getWithdrawals,
  getWithdrawalDetail,
  reviewWithdrawal,
  completeWithdrawal,
  settleCommissions,
  getCommissionStatistics,
  getUpgradeApplications,
  reviewUpgradeApplication,
  getUpgradeConfig,
  setUpgradeConfig,
} from '../controllers/commissionController';
import {
  getStockList,
  getStockStatistics,
  getStockDetail,
  getStockLogs,
  stockIn,
  stockAdjust,
  setStockWarning,
} from '../controllers/stockController';
import {
  getStatistics as getFinanceStatistics,
  getRechargeListHandler,
  getRechargeDetailHandler,
  reviewRechargeHandler,
  getFundFlowListHandler,
} from '../controllers/financeController';
import {
  getDashboard,
  getHotProductsHandler,
  getRecentOrdersHandler,
  getSalesStatisticsHandler,
  getSalesTrendHandler,
  getCategorySalesHandler,
  getSalesDetailHandler,
  getStockStatisticsHandler as getStockReportHandler,
  getFinanceReportHandler,
  getCommissionStatsHandler,
  getCommissionTrendHandler,
  getCommissionListHandler,
  // 新增：预约报表
  getReservationStatsHandler,
  getReservationTrendHandler,
  getReservationStatusHandler,
  // 新增：销售报表（基于Reservation）
  getReservationSalesStatsHandler,
  getReservationSalesTrendHandler,
  getProductRankingHandler,
  getAgentRankingHandler,
  // 新增：客户报表
  getCustomerStatsHandler,
  getCustomerTrendHandler,
  getRiskDistributionHandler,
} from '../controllers/reportController';
import {
  getSettings,
  updateSettings,
  executeBackup,
  getAuditLogs,
  getAdminList,
  getStaffList,
  getPrintConfig,
  updatePrintConfig,
} from '../controllers/settingController';
import {
  getServiceStatistics,
  getLockStockListHandler,
  getLockStockDetailHandler,
  reviewLockStockHandler,
  getExceptionListHandler,
  getExceptionDetailHandler,
  resolveExceptionHandler,
  getExceptionTypes,
} from '../controllers/serviceController';
// 【2026-01-17 Order系统清理】已移除 orderConfirmController - 系统已升级为预约模式
import {
  adminConfirmPayment,
  adminGetRetailOrderList,
  getPendingTransferOrders,
  adminGetRetailStatistics,
  getRetailOrderDetail,
} from '../controllers/retailController';
import { authAdmin, authAdminWithRoles } from '../middlewares/auth';

const router = Router();

// 【2026-01-23】角色权限常量
// 完整管理权限：ADMIN（管理员）、WAREHOUSE（库管）可访问所有功能
// SERVICE（客服）只能访问：控制台、预约管理、客户风控、客服管理
const FULL_ACCESS_ROLES = ['ADMIN', 'WAREHOUSE'];
const authFullAccess = authAdminWithRoles(FULL_ACCESS_ROLES);

// ============ 认证相关 ============
// 【2026-01-22新增】图形验证码接口（无需认证）
router.get('/captcha', getCaptcha);

// 【2026-01-24新增】短信验证码登录
// 发送短信验证码（60秒限制）
router.post('/auth/send-code', smsRateLimiter, sendCodeHandler);
// 短信验证码登录（每分钟5次限制）
router.post('/auth/phone-login', loginRateLimiter, phoneLoginHandler);

// 管理员密码登录（保留兼容）
router.post('/auth/login', loginHandler);
router.post('/login', loginHandler);

// 获取当前管理员信息（需要认证）
router.get('/auth/me', authAdmin, getMeHandler);
router.get('/me', authAdmin, getMeHandler);

// ============ 代理商管理 ============
// 【注】代理商管理仅ADMIN/WAREHOUSE可访问
// 代理商统计数据（放在 :id 路由前面，避免被匹配）
router.get('/agents/statistics', authFullAccess, getAgentStatistics);

// 代理商列表
router.get('/agents', authFullAccess, getAgentList);

// 代理商详情
router.get('/agents/:id', authFullAccess, getAgentDetail);

// 创建代理商
router.post('/agents', authFullAccess, createAgent);

// 更新代理商
router.put('/agents/:id', authFullAccess, updateAgent);

// 更新代理商状态
router.put('/agents/:id/status', authFullAccess, updateAgentStatus);

// 重置代理商密码
router.put('/agents/:id/password', authFullAccess, resetAgentPassword);

// 获取代理商下级团队
router.get('/agents/:id/team', authFullAccess, getAgentTeam);

// 删除代理商
router.delete('/agents/:id', authFullAccess, deleteAgent);

// 【2026-01-17 Order系统清理】已移除所有订单管理路由 - 系统已升级为预约模式
// 订单功能已被预约模块完全替代，请使用 /reservations/* 相关接口

// ============ 分润管理 ============
// 【注】分润管理仅ADMIN/WAREHOUSE可访问
// 分润统计数据
router.get('/commission/statistics', authFullAccess, getCommissionStatistics);

// 分润规则列表
router.get('/commission/rules', authFullAccess, getRules);

// 创建分润规则
router.post('/commission/rules', authFullAccess, createRule);

// 更新分润规则
router.put('/commission/rules/:id', authFullAccess, updateRule);

// 删除分润规则
router.delete('/commission/rules/:id', authFullAccess, deleteRule);

// 分润记录列表
router.get('/commission/records', authFullAccess, getAdminCommissionRecords);

// 【2026-01-20 新增】分润记录详情
router.get('/commission/records/:id', authFullAccess, getCommissionRecordDetail);

// 批量结算分润
router.post('/commission/settle', authFullAccess, settleCommissions);

// 提现申请列表
router.get('/commission/withdrawals', authFullAccess, getWithdrawals);

// 提现详情（包含代理商分润统计）
router.get('/commission/withdrawals/:id', authFullAccess, getWithdrawalDetail);

// 审核提现申请
router.post('/commission/withdrawals/:id/review', authFullAccess, reviewWithdrawal);
// 【Task 2.1】确认提现打款完成
router.post('/commission/withdrawals/:id/complete', authFullAccess, completeWithdrawal);

// ============ 【2026-01-17】推销员晋升管理 ============
// 【注】晋升管理仅ADMIN/WAREHOUSE可访问
// 晋升申请列表
router.get('/upgrade-applications', authFullAccess, getUpgradeApplications);

// 审核晋升申请
router.post('/upgrade-applications/:id/review', authFullAccess, reviewUpgradeApplication);

// 获取自动晋升配置
router.get('/upgrade-config', authFullAccess, getUpgradeConfig);

// 更新自动晋升配置
router.put('/upgrade-config', authFullAccess, setUpgradeConfig);

// 【2026-01-17】获取推销员定价列表
// 【注】推销员定价仅ADMIN/WAREHOUSE可访问
router.get('/agent-prices', authFullAccess, async (req, res) => {
  try {
    const { agentId, productId, page = 1, pageSize = 20 } = req.query;

    const where: any = {};
    if (agentId) where.agentId = parseInt(agentId as string);
    if (productId) where.productId = parseInt(productId as string);

    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const prisma = (await import('../utils/prisma')).default;

    const [list, total] = await Promise.all([
      prisma.agentPrice.findMany({
        where,
        skip,
        take,
        include: {
          agent: { select: { id: true, name: true, phone: true, type: true } },
          product: { select: { id: true, name: true, images: true, supplyPrice: true, suggestedPrice: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.agentPrice.count({ where }),
    ]);

    res.json({
      code: 0,
      message: 'success',
      data: {
        list: list.map((item: any) => ({
          id: item.id,
          agentId: item.agentId,
          agentName: item.agent?.name,
          agentPhone: item.agent?.phone,
          agentType: item.agent?.type,
          productId: item.productId,
          productName: item.product?.name,
          productImage: item.product?.images,
          supplyPrice: item.product?.supplyPrice ? Number(item.product.supplyPrice) : 0,
          suggestedPrice: item.product?.suggestedPrice ? Number(item.product.suggestedPrice) : null,
          retailPrice: item.retailPrice ? Number(item.retailPrice) : null,
          subPrice: item.subPrice ? Number(item.subPrice) : null,
          updatedAt: item.updatedAt,
        })),
        total,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
        totalPages: Math.ceil(total / parseInt(pageSize as string)),
      },
    });
  } catch (error: any) {
    console.error('获取推销员定价失败:', error);
    res.status(500).json({ code: 500, message: error.message || '获取推销员定价失败' });
  }
});

// ============ 库存管理 ============
// 【注】库存管理仅ADMIN/WAREHOUSE可访问
// 库存统计数据（放在参数路由前面）
router.get('/stock/statistics', authFullAccess, getStockStatistics);

// 库存列表
router.get('/stock', authFullAccess, getStockList);

// 入库操作
router.post('/stock/in', authFullAccess, stockIn);

// 库存调整
router.post('/stock/adjust', authFullAccess, stockAdjust);

// 商品库存详情
router.get('/stock/:productId', authFullAccess, getStockDetail);

// 商品库存变动记录
router.get('/stock/:productId/logs', authFullAccess, getStockLogs);

// 设置预警值
router.put('/stock/:productId/warning', authFullAccess, setStockWarning);

// ============ 财务管理 ============
// 【注】财务管理仅ADMIN/WAREHOUSE可访问
// 财务统计数据
router.get('/finance/statistics', authFullAccess, getFinanceStatistics);

// 加款申请列表
router.get('/finance/recharges', authFullAccess, getRechargeListHandler);

// 加款申请详情
router.get('/finance/recharges/:id', authFullAccess, getRechargeDetailHandler);

// 审核加款申请
router.post('/finance/recharges/:id/review', authFullAccess, reviewRechargeHandler);

// 资金流水列表
router.get('/finance/flows', authFullAccess, getFundFlowListHandler);

// ============ 报表中心 ============
// 控制台首页数据
router.get('/dashboard', authAdmin, getDashboard);

// 热销商品
router.get('/dashboard/hot-products', authAdmin, getHotProductsHandler);

// 最新订单
router.get('/dashboard/recent-orders', authAdmin, getRecentOrdersHandler);

// 销售报表统计
router.get('/reports/sales/statistics', authAdmin, getSalesStatisticsHandler);

// 销售趋势
router.get('/reports/sales/trend', authAdmin, getSalesTrendHandler);

// 品类销售占比
router.get('/reports/sales/categories', authAdmin, getCategorySalesHandler);

// 销售明细列表
router.get('/reports/sales/detail', authAdmin, getSalesDetailHandler);

// 库存报表统计【仅ADMIN/WAREHOUSE可访问】
router.get('/reports/stock', authFullAccess, getStockReportHandler);

// 财务报表统计【仅ADMIN/WAREHOUSE可访问】
router.get('/reports/finance', authFullAccess, getFinanceReportHandler);

// ============ 预约报表 ============
// 预约统计
router.get('/reports/reservation/stats', authAdmin, getReservationStatsHandler);
// 预约趋势
router.get('/reports/reservation/trend', authAdmin, getReservationTrendHandler);
// 预约状态分布
router.get('/reports/reservation/status', authAdmin, getReservationStatusHandler);

// ============ 销售报表（基于Reservation）============
// 销售统计
router.get('/reports/sales/stats', authAdmin, getReservationSalesStatsHandler);
// 销售趋势（基于预约）
router.get('/reports/sales/trend', authAdmin, getReservationSalesTrendHandler);
// 商品销售排行
router.get('/reports/sales/product-ranking', authAdmin, getProductRankingHandler);
// 推销员业绩排行
router.get('/reports/sales/agent-ranking', authAdmin, getAgentRankingHandler);

// ============ 客户报表 ============
// 客户统计
router.get('/reports/customer/stats', authAdmin, getCustomerStatsHandler);
// 客户增长趋势
router.get('/reports/customer/trend', authAdmin, getCustomerTrendHandler);
// 客户风险分布
router.get('/reports/customer/risk-distribution', authAdmin, getRiskDistributionHandler);

// ============ 分润报表（基于Reservation表）============
// 【注】分润报表仅ADMIN/WAREHOUSE可访问
// 分润统计
router.get('/reports/commission/stats', authFullAccess, getCommissionStatsHandler);
// 分润趋势
router.get('/reports/commission/trend', authFullAccess, getCommissionTrendHandler);
// 分润明细列表
router.get('/reports/commission/list', authFullAccess, getCommissionListHandler);

// ============ 系统设置 ============
// 【注】系统设置仅ADMIN/WAREHOUSE可访问
// 获取系统设置
router.get('/settings', authFullAccess, getSettings);

// 更新系统设置
router.put('/settings', authFullAccess, updateSettings);

// 执行数据备份
router.post('/settings/backup', authFullAccess, executeBackup);

// 打印配置
router.get('/settings/print', authFullAccess, getPrintConfig);
router.put('/settings/print', authFullAccess, updatePrintConfig);

// 操作日志列表
router.get('/audit-logs', authFullAccess, getAuditLogs);

// 管理员列表
router.get('/system/admins', authFullAccess, getAdminList);

// 员工列表
router.get('/system/staff', authFullAccess, getStaffList);

// 创建员工账号
router.post('/system/staff', authFullAccess, createStaff);

// 员工详情
router.get('/system/staff/:id', authFullAccess, getStaffDetail);

// 更新员工信息
router.put('/system/staff/:id', authFullAccess, updateStaff);

// 重置员工密码
router.post('/system/staff/:id/reset-password', authFullAccess, resetStaffPassword);

// 删除员工账号（禁用）
router.delete('/system/staff/:id', authFullAccess, deleteStaff);

// ============ 客服管理 ============
// 客服统计数据
router.get('/service/statistics', authAdmin, getServiceStatistics);

// 异常类型列表
router.get('/service/exception-types', authAdmin, getExceptionTypes);

// 锁货申请列表
router.get('/service/lockstock', authAdmin, getLockStockListHandler);

// 锁货申请详情
router.get('/service/lockstock/:id', authAdmin, getLockStockDetailHandler);

// 审核锁货申请
router.post('/service/lockstock/:id/review', authAdmin, reviewLockStockHandler);

// 异常工单列表
router.get('/service/exceptions', authAdmin, getExceptionListHandler);

// 异常工单详情
router.get('/service/exceptions/:id', authAdmin, getExceptionDetailHandler);

// 处理异常工单
router.post('/service/exceptions/:id/resolve', authAdmin, resolveExceptionHandler);

// ============ 门店零售管理 ============
// 零售统计数据
router.get('/retail/statistics', authAdmin, adminGetRetailStatistics);

// 待确认转账订单
router.get('/retail/pending-transfers', authAdmin, getPendingTransferOrders);

// 零售单列表（全部）
router.get('/retail/orders', authAdmin, adminGetRetailOrderList);

// 零售单详情
router.get('/retail/orders/:id', authAdmin, getRetailOrderDetail);

// 确认转账收款
router.post('/retail/orders/:id/confirm', authAdmin, adminConfirmPayment);

// ============ 【2026-01-10】员工提现管理 ============
// 【注】员工提现管理仅ADMIN/WAREHOUSE可访问
import {
  getWithdrawalList as getStaffWithdrawalList,
  getWithdrawalDetail as getStaffWithdrawalDetail,
  reviewWithdrawal as reviewStaffWithdrawal,
  completeWithdrawal as completeStaffWithdrawal,
  getWithdrawalStats as getStaffWithdrawalStats,
} from '../controllers/staffWithdrawalController';

// 员工提现统计
router.get('/staff-withdrawals/stats', authFullAccess, getStaffWithdrawalStats);

// 员工提现列表
router.get('/staff-withdrawals', authFullAccess, getStaffWithdrawalList);

// 员工提现详情
router.get('/staff-withdrawals/:id', authFullAccess, getStaffWithdrawalDetail);

// 审核员工提现
router.post('/staff-withdrawals/:id/review', authFullAccess, reviewStaffWithdrawal);

// 确认员工打款
router.post('/staff-withdrawals/:id/complete', authFullAccess, completeStaffWithdrawal);

// ============ 【2026-01-13】仓库管理 ============
// 【注】仓库管理仅ADMIN/WAREHOUSE可访问
import {
  getAdminWarehouseList,
  getWarehouseDetail,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  setDefaultWarehouse,
  getWarehouseStats,
} from '../controllers/warehouseController';

// 仓库统计
router.get('/warehouses/stats', authFullAccess, getWarehouseStats);

// 仓库列表
router.get('/warehouses', authFullAccess, getAdminWarehouseList);

// 创建仓库
router.post('/warehouses', authFullAccess, createWarehouse);

// 仓库详情
router.get('/warehouses/:id', authFullAccess, getWarehouseDetail);

// 更新仓库
router.put('/warehouses/:id', authFullAccess, updateWarehouse);

// 删除仓库
router.delete('/warehouses/:id', authFullAccess, deleteWarehouse);

// 设置默认仓库
router.post('/warehouses/:id/default', authFullAccess, setDefaultWarehouse);

// ============ 【2026-01-16】预约管理 ============
import {
  getReservationStats,
  getReservationList,
  getReservationDetailHandler,
  adminConfirmReservation,
  adminCancelReservation,
  adminRecordCall,
  adminMarkCallFailed,
  getGiftTierList,
  createGiftTier,
  updateGiftTier,
  deleteGiftTier,
  exportReservations,
  getReservationReport,
} from '../controllers/adminReservationController';

// 预约统计
router.get('/reservations/stats', authAdmin, getReservationStats);

// 【2026-01-16】预约报表（放在 :id 前避免被匹配）
router.get('/reservations/report', authAdmin, getReservationReport);

// 【2026-01-16】预约导出（放在 :id 前避免被匹配）
router.get('/reservations/export', authAdmin, exportReservations);

// 预约列表
router.get('/reservations', authAdmin, getReservationList);

// 预约详情
router.get('/reservations/:id', authAdmin, getReservationDetailHandler);

// 确认预约
router.post('/reservations/:id/confirm', authAdmin, adminConfirmReservation);

// 取消预约
router.post('/reservations/:id/cancel', authAdmin, adminCancelReservation);

// 【2026-01-19新增】记录拨打电话（客服电话确认流程）
router.post('/reservations/:id/call', authAdmin, adminRecordCall);

// 【2026-01-19新增】标记确认失败（客服电话确认流程）
router.post('/reservations/:id/fail', authAdmin, adminMarkCallFailed);

// 【2026-01-17】预约审计日志
import { getReservationAuditLogs } from '../services/auditService';
router.get('/reservations/:id/audit', authAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ code: 400, message: '无效的预约ID' });
    }
    const audits = await getReservationAuditLogs(id);
    res.json({ code: 0, data: audits, message: 'success' });
  } catch (error: any) {
    console.error('[Admin] 获取审计日志失败:', error);
    res.status(500).json({ code: 500, message: error.message || '获取审计日志失败' });
  }
});

// 【注】赠品管理仅ADMIN/WAREHOUSE可访问
// 赠品档位列表
router.get('/gift-tiers', authFullAccess, getGiftTierList);

// 创建赠品档位
router.post('/gift-tiers', authFullAccess, createGiftTier);

// 更新赠品档位
router.put('/gift-tiers/:id', authFullAccess, updateGiftTier);

// 删除赠品档位
router.delete('/gift-tiers/:id', authFullAccess, deleteGiftTier);

// ============ 【2026-01-16】客户风控管理 ============
import {
  getCustomerList,
  getCustomerDetail,
  blockCustomer,
  unblockCustomer,
  getCustomerStats,
  resetCustomerRisk,
  getCustomerReservations,
} from '../controllers/customerController';

// 客户统计
router.get('/customers/stats', authAdmin, getCustomerStats);

// 【2026-01-17新增】客户预约历史（放在 :id 前避免被匹配）
router.get('/customers/reservations', authAdmin, getCustomerReservations);

// 客户列表
router.get('/customers', authAdmin, getCustomerList);

// 客户详情
router.get('/customers/:id', authAdmin, getCustomerDetail);

// 拉黑客户
router.post('/customers/:id/block', authAdmin, blockCustomer);

// 解除黑名单
router.post('/customers/:id/unblock', authAdmin, unblockCustomer);

// 【2026-01-17新增】重置风险等级
router.post('/customers/:id/reset-risk', authAdmin, resetCustomerRisk);

// ============ 【2026-01-17】备货问题管理 ============
import {
  getPrepareIssueList,
  getPrepareIssueDetail,
  resolvePrepareIssue,
  getPrepareIssueStats,
} from '../controllers/prepareIssueController';

// 备货问题统计
router.get('/prepare-issues/stats', authAdmin, getPrepareIssueStats);

// 备货问题列表
router.get('/prepare-issues', authAdmin, getPrepareIssueList);

// 备货问题详情
router.get('/prepare-issues/:id', authAdmin, getPrepareIssueDetail);

// 处理备货问题
router.post('/prepare-issues/:id/resolve', authAdmin, resolvePrepareIssue);

// ============ 【2026-01-18】春节营销活动管理 ============
// 【注】营销活动管理仅ADMIN/WAREHOUSE可访问
import { getAdminCouponStatsHandler } from '../controllers/campaign2026Controller';

// 代金券统计
router.get('/campaign2026/coupons/stats', authFullAccess, getAdminCouponStatsHandler);

// ============ 【2026-01-20】激励配置管理 ============
import masterController from '../controllers/masterController';

// 获取奖励配置
router.get('/reward-configs', authFullAccess, masterController.getRewardConfig);

// 保存奖励配置（支持POST和PUT）
router.post('/reward-configs', authFullAccess, masterController.updateRewardConfig);
router.put('/reward-configs', authFullAccess, masterController.updateRewardConfig);

// ============ 【2026-01-21】拼团管理 ============
// 【注】拼团管理仅ADMIN/WAREHOUSE可访问
import {
  getSystemConfig,
  saveSystemConfig,
  getConfigList,
  createConfig,
  updateConfig,
  deleteConfig,
  getStats,
  getGroupBuyList,
  getGroupBuyDetail,
  cancelGroupBuy,
} from '../controllers/adminGroupBuyController';

// 系统配置
router.get('/group-buy/system-config', authFullAccess, getSystemConfig);
router.post('/group-buy/system-config', authFullAccess, saveSystemConfig);

// 活动配置CRUD
router.get('/group-buy/configs', authFullAccess, getConfigList);
router.post('/group-buy/configs', authFullAccess, createConfig);
router.put('/group-buy/configs/:id', authFullAccess, updateConfig);
router.delete('/group-buy/configs/:id', authFullAccess, deleteConfig);

// 拼团统计
router.get('/group-buy/stats', authFullAccess, getStats);

// 拼团列表
router.get('/group-buy/list', authFullAccess, getGroupBuyList);

// 拼团详情
router.get('/group-buy/:code', authFullAccess, getGroupBuyDetail);

// 取消拼团
router.post('/group-buy/:code/cancel', authFullAccess, cancelGroupBuy);

// ============ 【2026-01-21】锁价管理 ============
// 【注】锁价管理仅ADMIN/WAREHOUSE可访问
import {
  getSystemConfig as getPriceLockSystemConfig,
  saveSystemConfig as savePriceLockSystemConfig,
  getConfigList as getPriceLockConfigList,
  createConfig as createPriceLockConfig,
  updateConfig as updatePriceLockConfig,
  deleteConfig as deletePriceLockConfig,
  getStats as getPriceLockStats,
  getPriceLockList,
} from '../controllers/adminPriceLockController';

// 系统配置
router.get('/price-lock/system-config', authFullAccess, getPriceLockSystemConfig);
router.post('/price-lock/system-config', authFullAccess, savePriceLockSystemConfig);

// 活动配置CRUD
router.get('/price-lock/configs', authFullAccess, getPriceLockConfigList);
router.post('/price-lock/configs', authFullAccess, createPriceLockConfig);
router.put('/price-lock/configs/:id', authFullAccess, updatePriceLockConfig);
router.delete('/price-lock/configs/:id', authFullAccess, deletePriceLockConfig);

// 锁价统计
router.get('/price-lock/stats', authFullAccess, getPriceLockStats);

// 锁价列表
router.get('/price-lock/list', authFullAccess, getPriceLockList);

export default router;

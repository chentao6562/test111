import { Router } from 'express';
import { loginHandler, getMeHandler } from '../controllers/staffController';
import { authStaff } from '../middlewares/auth';
// 【P1-12修复】导入速率限制中间件
import { loginRateLimiter, pickupCodeRateLimiter } from '../middlewares/rateLimit';
// 【2026-01-17 Order系统清理】已移除 warehouseOrderController - 系统已升级为预约模式
// 门店端核销功能请使用 /api/store/* 相关接口（storeController.ts）
import {
  getStockList,
  getStockStatistics,
  getAllStockLogs,
  staffStockIn,
  staffStockAdjust,
  getProductByBarcode,
  submitInventoryCheck,
  batchInventoryCheck,
} from '../controllers/stockController';
// 【已废弃 2026-01-16】移库任务控制器已删除（改为预约模式）
// transferController 相关功能已移除
// 【已废弃 2026-01-16】货管端配送抢单系统已删除（改为预约模式）
// deliveryController 相关功能已移除
// 【2026-01-17 Order系统清理】已移除 pickupController - 系统已升级为预约模式
// 提货核销功能请使用 /api/store/* 相关接口（门店端预约核销）

const router = Router();

// 员工登录（每分钟5次）
router.post('/login', loginRateLimiter, loginHandler);

// 获取当前员工信息（需要认证）
router.get('/me', authStaff(), getMeHandler);
router.get('/profile', authStaff(), getMeHandler); // 别名，兼容前端

// 【2026-01-17 Order系统清理】已移除所有订单管理和提货核销路由
// 系统已升级为预约模式，请使用以下接口：
// - 门店端预约确认: /api/store/reservations/*
// - 门店端提货核销: /api/store/pickup/*

// ========== 库管端库存管理 ==========

// 库存统计数据
router.get('/stock/statistics', authStaff(['WAREHOUSE']), getStockStatistics);

// 库存列表
router.get('/stock', authStaff(['WAREHOUSE']), getStockList);

// 出入库明细
router.get('/stock/logs', authStaff(['WAREHOUSE']), getAllStockLogs);

// 快速入库
router.post('/stock/in', authStaff(['WAREHOUSE']), staffStockIn);

// 库存调整
router.post('/stock/adjust', authStaff(['WAREHOUSE']), staffStockAdjust);

// 条形码/编码查询商品
router.get('/stock/product', authStaff(['WAREHOUSE']), getProductByBarcode);

// 库存盘点
router.post('/stock/inventory-check', authStaff(['WAREHOUSE']), submitInventoryCheck);

// 批量盘点
router.post('/stock/inventory-check/batch', authStaff(['WAREHOUSE']), batchInventoryCheck);

// ========== 【已废弃 2026-01-16】货管端移库任务已删除（改为预约模式） ==========
// transfers 相关路由已移除

// ========== 【已废弃 2026-01-16】货管端收入管理已删除（改为预约模式） ==========
// income 相关路由已移除

// ========== 【已废弃 2026-01-16】货管端配送抢单系统已删除（改为预约模式） ==========
// delivery-pool 相关路由已移除

// ========== 【2026-01-10】员工提现管理 ==========

import {
  getPaymentInfo,
  updatePaymentInfo,
  createWithdrawal,
  getMyWithdrawals,
  getMyWithdrawalStats,
} from '../controllers/staffWithdrawalController';

// 获取收款信息
router.get('/payment-info', authStaff(['LOGISTICS', 'WAREHOUSE']), getPaymentInfo);

// 更新收款信息
router.put('/payment-info', authStaff(['LOGISTICS', 'WAREHOUSE']), updatePaymentInfo);

// 获取我的提现统计
router.get('/withdrawals/stats', authStaff(['LOGISTICS', 'WAREHOUSE']), getMyWithdrawalStats);

// 申请提现
router.post('/withdrawals', authStaff(['LOGISTICS', 'WAREHOUSE']), createWithdrawal);

// 获取我的提现记录
router.get('/withdrawals', authStaff(['LOGISTICS', 'WAREHOUSE']), getMyWithdrawals);

// ========== 【已废弃 2026-01-16】货管端打包抢单系统已删除（改为预约模式） ==========
// transfer-bundles 相关路由已移除

export default router;

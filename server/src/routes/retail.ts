import { Router } from 'express';
import * as retailController from '../controllers/retailController';
import { authStaff } from '../middlewares/auth';

const router = Router();

/**
 * 门店零售路由 - 库管端使用
 * 所有接口需要员工认证（库管角色）
 */

// 创建零售订单
router.post('/orders', authStaff(['WAREHOUSE']), retailController.createRetailOrder);

// 获取零售单列表（库管自己的）
router.get('/orders', authStaff(['WAREHOUSE']), retailController.getRetailOrderList);

// 获取零售统计
router.get('/statistics', authStaff(['WAREHOUSE']), retailController.getRetailStatistics);

// 获取零售单详情
router.get('/orders/:id', authStaff(['WAREHOUSE']), retailController.getRetailOrderDetail);

// 确认收款（现金/扫码）
router.post('/orders/:id/confirm', authStaff(['WAREHOUSE']), retailController.confirmPayment);

// 取消零售单
router.post('/orders/:id/cancel', authStaff(['WAREHOUSE']), retailController.cancelRetailOrder);

// 记录打印
router.post('/orders/:id/print', authStaff(['WAREHOUSE']), retailController.recordPrint);

// 获取小票数据
router.get('/orders/:id/receipt', authStaff(['WAREHOUSE']), retailController.getReceiptData);

export default router;

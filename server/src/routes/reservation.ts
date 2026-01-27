/**
 * 预约路由
 * 【2026-01-16 预约模式升级】客户端预约API
 */

import { Router } from 'express';
import reservationController from '../controllers/reservationController';
import { authOptional } from '../middlewares/auth';

const router = Router();

// 公开接口（无需登录）
// 获取合规提示文案（前端页面必须展示）
router.get('/compliance-notice', reservationController.getComplianceNotice);
// 获取到店礼品档位
router.get('/gift-tiers', reservationController.getGiftTiers);
// 检查客户预约资格
router.get('/check-customer', reservationController.checkCustomer);

// 我的预约列表（通过手机号查询）【重要：必须在/:id之前定义】
router.get('/my', reservationController.getMyReservations);
// 【2026-01-17新增】我的预约统计（个人中心展示）
router.get('/counts', reservationController.getCounts);
// 【2026-01-20新增】推销员的客户预约列表
router.get('/agent-orders', reservationController.getAgentOrders);

// 创建预约（可选登录，登录则记录推销员归属）
// 【2026-01-17修复】添加authOptional中间件以解析推销员token
router.post('/', authOptional, reservationController.create);

// 预约详情【放在/my之后，避免/my被当作id解析】
router.get('/:id', reservationController.getDetail);

// 取消预约
router.delete('/:id', reservationController.cancel);

export default router;

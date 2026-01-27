/**
 * 现金大转盘路由
 * @module routes/spinWheel
 * @since 2026-01-23
 */

import { Router } from 'express';
import auth from '../middlewares/auth';
import * as spinWheelController from '../controllers/spinWheelController';

const router = Router();

// ============ 公开接口 ============

// 获取活动配置
router.get('/config', spinWheelController.getConfig);

// 获取分享页详情
router.get('/detail/:code', spinWheelController.getDetail);

// 发送助力验证码
router.post('/help/send-code', spinWheelController.sendCode);

// 助力
router.post('/help', spinWheelController.help);

// 获取滚动播报
router.get('/notices', spinWheelController.getNotices);

// ============ 需要登录的接口（代理商） ============

// 加入活动
router.post('/join', auth.authAgent, spinWheelController.join);

// 获取我的参与信息
router.get('/my', auth.authAgent, spinWheelController.getMyParticipation);

// 抽奖
router.post('/spin', auth.authAgent, spinWheelController.doSpin);

// 分享获得次数
router.post('/share', auth.authAgent, spinWheelController.share);

// 获取抽奖记录
router.get('/records', auth.authAgent, spinWheelController.getRecords);

// 兑换代金券
router.post('/redeem', auth.authAgent, spinWheelController.redeem);

// 检查兑换资格
router.get('/redeem/check', auth.authAgent, spinWheelController.checkRedeem);

// 获取兑换记录
router.get('/redeems', auth.authAgent, spinWheelController.getRedeems);

export default router;

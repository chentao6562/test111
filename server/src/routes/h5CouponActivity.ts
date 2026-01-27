/**
 * H5前端代金券活动路由
 * 【2026-01-19 活动系统增强】
 * 【2026-01-20修复】改用 authRequired 允许所有登录用户访问
 */
import express from 'express'
import couponActivityController from '../controllers/couponActivityController'
import { authRequired } from '../middlewares/auth'

const router = express.Router()

// 需要登录认证（允许所有登录用户，不限制推销员身份）
router.use(authRequired)

// 获取可领取的活动列表
router.get('/', couponActivityController.getAvailableActivities)

// 领取代金券
router.post('/:id/claim', couponActivityController.claimCoupon)

export default router

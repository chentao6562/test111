/**
 * 管理后台代金券活动路由
 * 【2026-01-19 活动系统增强】
 */
import express from 'express'
import couponActivityController from '../controllers/couponActivityController'
import { authAdmin } from '../middlewares/auth'

const router = express.Router()

// 所有路由需要管理员认证
router.use(authAdmin)

// 活动列表
router.get('/', couponActivityController.getActivityList)

// 活动详情
router.get('/:id', couponActivityController.getActivityDetail)

// 创建活动
router.post('/', couponActivityController.createActivity)

// 更新活动
router.put('/:id', couponActivityController.updateActivity)

// 删除活动
router.delete('/:id', couponActivityController.deleteActivity)

// 切换活动状态
router.put('/:id/status', couponActivityController.toggleActivityStatus)

export default router

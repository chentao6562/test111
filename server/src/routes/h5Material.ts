/**
 * H5素材管理路由
 */

import { Router } from 'express'
import * as h5MaterialController from '../controllers/h5MaterialController'
import * as promotionMaterialController from '../controllers/promotionMaterialController'
import { authAdmin } from '../middlewares/auth'

const router = Router()

// ============ 管理后台路由（需要管理员权限） ============

// 轮播图管理
router.get('/admin/banners', authAdmin, h5MaterialController.getBanners)
router.post('/admin/banners', authAdmin, h5MaterialController.createBanner)
router.put('/admin/banners/:id', authAdmin, h5MaterialController.updateBanner)
router.delete('/admin/banners/:id', authAdmin, h5MaterialController.deleteBanner)

// 推荐商品管理
router.get('/admin/recommend-products', authAdmin, h5MaterialController.getRecommendProducts)
router.post('/admin/recommend-products', authAdmin, h5MaterialController.createRecommendProduct)
router.put('/admin/recommend-products/:id', authAdmin, h5MaterialController.updateRecommendProduct)
router.delete('/admin/recommend-products/:id', authAdmin, h5MaterialController.deleteRecommendProduct)

// 公告通知管理
router.get('/admin/notices', authAdmin, h5MaterialController.getNotices)
router.post('/admin/notices', authAdmin, h5MaterialController.createNotice)
router.put('/admin/notices/:id', authAdmin, h5MaterialController.updateNotice)
router.delete('/admin/notices/:id', authAdmin, h5MaterialController.deleteNotice)

// 推广文案管理
router.get('/admin/promotion-copies', authAdmin, promotionMaterialController.getPromotionCopies)
router.get('/admin/promotion-copies/:id', authAdmin, promotionMaterialController.getCopyById)
router.post('/admin/promotion-copies', authAdmin, promotionMaterialController.createCopy)
router.put('/admin/promotion-copies/:id', authAdmin, promotionMaterialController.updateCopy)
router.delete('/admin/promotion-copies/:id', authAdmin, promotionMaterialController.deleteCopy)

// 品牌素材管理
router.get('/admin/brand-assets', authAdmin, promotionMaterialController.getBrandAssets)
router.get('/admin/brand-assets/:id', authAdmin, promotionMaterialController.getAssetById)
router.post('/admin/brand-assets', authAdmin, promotionMaterialController.createAsset)
router.put('/admin/brand-assets/:id', authAdmin, promotionMaterialController.updateAsset)
router.delete('/admin/brand-assets/:id', authAdmin, promotionMaterialController.deleteAsset)

// ============ H5前端路由（公开接口） ============

// 获取有效轮播图
router.get('/banners', h5MaterialController.getActiveBanners)

// 获取有效推荐商品
router.get('/recommend-products', h5MaterialController.getActiveRecommendProducts)

// 获取有效公告
router.get('/notices', h5MaterialController.getActiveNotices)

// 获取有效推广文案
router.get('/promotion-copies', promotionMaterialController.getActiveCopies)

// 获取有效品牌素材
router.get('/brand-assets', promotionMaterialController.getActiveAssets)

export default router

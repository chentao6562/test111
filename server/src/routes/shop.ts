/**
 * 客户商城路由
 * 【2026-01-17 新增】支持推销员专属链接，客户无需登录即可浏览和预约
 */

import { Router } from 'express';
import * as shopController from '../controllers/shopController';

const router = Router();

// 获取推销员公开信息
router.get('/salesperson/:id', shopController.getSalespersonInfo);

// 获取商品列表（带推销员定价）
router.get('/products', shopController.getProducts);

// 获取商品详情（带推销员定价）
router.get('/products/:id', shopController.getProductDetail);

// 获取分类列表
router.get('/categories', shopController.getCategories);

// 获取赠品档位
router.get('/gift-tiers', shopController.getGiftTiers);

// 获取门店列表
router.get('/stores', shopController.getStores);

// 访客模式创建预约
router.post('/reservations', shopController.createGuestReservation);

export default router;

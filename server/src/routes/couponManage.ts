/**
 * 代金券管理路由
 * 【2026-01-21】
 */

import express from 'express';
import couponManageController from '../controllers/couponManageController';
import { authAdmin, authAgent } from '../middlewares/auth';

// 管理后台路由
const adminRouter = express.Router();
adminRouter.use(authAdmin);

adminRouter.get('/overview', couponManageController.getOverview);
adminRouter.get('/by-source', couponManageController.getStatsBySource);
adminRouter.get('/by-agent', couponManageController.getStatsByAgent);
adminRouter.get('/list', couponManageController.getCouponList);
adminRouter.post('/grant', couponManageController.adminGrant);

// H5端路由（一级给二级发券）
const h5Router = express.Router();
h5Router.use(authAgent);

h5Router.get('/level2-list', couponManageController.getLevel2List);
h5Router.post('/grant', couponManageController.level1Grant);

export { adminRouter, h5Router };

/**
 * 管理后台活动专题页路由
 * 【2026-01-19 活动系统增强】
 */
import express from 'express';
import { authAdmin } from '../middlewares/auth';
import activityPageController from '../controllers/activityPageController';

const router = express.Router();

// 所有路由需要管理员认证
router.use(authAdmin);

// 专题页列表
router.get('/', activityPageController.getPageList);

// 专题页详情
router.get('/:id', activityPageController.getPageDetail);

// 创建专题页
router.post('/', activityPageController.createPage);

// 更新专题页
router.put('/:id', activityPageController.updatePage);

// 删除专题页
router.delete('/:id', activityPageController.deletePage);

// 切换专题页状态
router.put('/:id/status', activityPageController.togglePageStatus);

// 添加区块
router.post('/:id/sections', activityPageController.addSection);

// 更新区块
router.put('/:id/sections/:sectionId', activityPageController.updateSection);

// 删除区块
router.delete('/:id/sections/:sectionId', activityPageController.deleteSection);

// 批量更新区块排序
router.put('/:id/sections-sort', activityPageController.updateSectionSort);

export default router;

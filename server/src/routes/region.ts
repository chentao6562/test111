/**
 * 区域路由
 * @since 2026-01-21
 */
import { Router } from 'express';
import {
  getRegionTree,
  getRegionList,
  getRegionById,
} from '../controllers/regionController';

const router = Router();

// 获取区域树形结构（区县 -> 乡镇/街道）
router.get('/', getRegionTree);

// 获取区域列表（平铺）
router.get('/list', getRegionList);

// 获取区域详情
router.get('/:id', getRegionById);

export default router;

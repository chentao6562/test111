/**
 * BGM管理后台路由
 * @since 2026-01-28
 */

import { Router } from 'express';
import * as bgmController from '../controllers/bgmController';

const router = Router();

// 获取BGM列表
router.get('/', bgmController.getBgmList);

// 创建BGM
router.post('/', bgmController.createBgm);

// 批量更新排序（放在 /:id 前面，避免被匹配为id）
router.put('/sort', bgmController.updateSortOrder);

// 更新BGM
router.put('/:id', bgmController.updateBgm);

// 删除BGM
router.delete('/:id', bgmController.deleteBgm);

export default router;

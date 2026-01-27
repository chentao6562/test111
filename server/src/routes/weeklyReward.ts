/**
 * 周期奖励路由
 * 【2026-01-20】
 */

import { Router } from 'express';
import { authAgent, authAdmin } from '../middlewares/auth';
import {
  getWeeklyProgressHandler,
  getWeeklyStatsHandler,
  getAgentWeeklyListHandler,
  getAgentWeeklyDetailHandler,
  processWeeklyRewardsHandler,
  getNewbieTasksHandler,
} from '../controllers/weeklyRewardController';

const router = Router();

// ==================== 推销员端 API ====================

// 获取本周进度
router.get('/weekly/progress', authAgent, getWeeklyProgressHandler);

// 【2026-01-22】获取新人任务状态
router.get('/weekly/newbie-tasks', authAgent, getNewbieTasksHandler);

// ==================== 管理后台 API ====================

// 获取周奖励统计
router.get('/admin/weekly/stats', authAdmin, getWeeklyStatsHandler);

// 获取推销员周统计列表
router.get('/admin/weekly/agents', authAdmin, getAgentWeeklyListHandler);

// 获取推销员周详情
router.get('/admin/weekly/agents/:agentId', authAdmin, getAgentWeeklyDetailHandler);

// 手动触发周奖励发放（用于测试或补发）
router.post('/admin/weekly/process', authAdmin, processWeeklyRewardsHandler);

export default router;

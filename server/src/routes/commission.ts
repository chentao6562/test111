import { Router } from 'express';
import { authAgent } from '../middlewares/auth';
import { criticalOperationGuard } from '../middlewares/requestSign';
import { withdrawRateLimiter } from '../middlewares/rateLimit';
import {
  getCommissionCenter,
  getCommissionRecords,
  createWithdrawal,
  getAgentWithdrawals,
  getTeamStats,
  getTeamMembers,
  getPromotionData,
  getInviteRecords,
  // 【2026-01-17】晋升相关
  getUpgradeStatus,
  applyUpgrade,
} from '../controllers/commissionController';

const router = Router();

// 所有路由都需要代理商认证
router.use(authAgent);

// ========== 分润中心 ==========

// 获取分润中心数据（余额/累计/本月/待结算）
router.get('/center', getCommissionCenter);

// 获取分润记录列表
router.get('/records', getCommissionRecords);

// 提现申请（关键操作，添加防重放保护和提现速率限制）
router.post('/withdraw', withdrawRateLimiter, criticalOperationGuard, createWithdrawal);

// 获取提现记录
router.get('/withdrawals', getAgentWithdrawals);

// ========== 团队管理 ==========

// 获取团队统计数据
router.get('/team-stats', getTeamStats);

// 获取团队成员列表
router.get('/team-members', getTeamMembers);

// ========== 推广中心 ==========

// 获取推广中心数据（邀请码/已邀请人数）
router.get('/promotion', getPromotionData);

// 【2026-01-09 Phase 9】获取邀请记录列表
router.get('/invite-records', getInviteRecords);

// ========== 【2026-01-17】晋升管理 ==========

// 获取晋升状态概览
router.get('/upgrade/status', getUpgradeStatus);

// 提交晋升申请
router.post('/upgrade/apply', applyUpgrade);

export default router;

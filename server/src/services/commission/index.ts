/**
 * 分润服务模块入口
 *
 * 【2026-01-08 重构说明】
 *
 * 模块结构：
 * - commissionCalculator.ts    分润计算 + 回滚
 * - commissionCenterService.ts 代理商分润中心查询
 * - withdrawalService.ts       提现管理（含completeWithdrawal）
 * - teamService.ts             团队管理
 * - commissionRuleService.ts   规则管理 + T+1结算
 *
 * 关键更新：
 * 1. 分润状态：PENDING（创建时）→ SETTLED（T+1结算后）→ CANCELLED（订单取消）
 * 2. 提现状态：PENDING → APPROVED → COMPLETED（新增完成状态）
 * 3. 支持外部事务：calculateCommission(orderId, externalTx)
 * 4. 分润回滚：rollbackCommission(orderId) - 支持PENDING和SETTLED状态
 *
 * 向后兼容：保持原 commissionService.ts 的所有导出
 */

// 分润计算
export {
  calculateCommission,
  rollbackCommission,
} from './commissionCalculator';

// 分润中心（代理商端）
export {
  getCommissionCenter,
  getCommissionRecords,
  getPromotionData,
  getInviteRecords,
} from './commissionCenterService';

// 提现服务
export {
  createWithdrawal,
  getAgentWithdrawals,
  getWithdrawals,
  getWithdrawalDetail,
  reviewWithdrawal,
  completeWithdrawal,
} from './withdrawalService';

// 团队服务
export {
  getTeamStats,
  getTeamMembers,
  getLevelLabel,
} from './teamService';

// 分润规则管理
export {
  getRules,
  createRule,
  updateRule,
  deleteRule,
  getAdminCommissionRecords,
  settleCommissions,
  settleCommissionsByDate,
  getCommissionStatistics,
  getCommissionRecordDetail,
} from './commissionRuleService';

// 默认导出（保持向后兼容）
import { calculateCommission, rollbackCommission } from './commissionCalculator';
import { getCommissionCenter, getCommissionRecords, getPromotionData, getInviteRecords } from './commissionCenterService';
import { createWithdrawal, getAgentWithdrawals, getWithdrawals, getWithdrawalDetail, reviewWithdrawal, completeWithdrawal } from './withdrawalService';
import { getTeamStats, getTeamMembers } from './teamService';
import { getRules, createRule, updateRule, deleteRule, getAdminCommissionRecords, settleCommissions, settleCommissionsByDate, getCommissionStatistics, getCommissionRecordDetail } from './commissionRuleService';

export default {
  calculateCommission,
  getCommissionCenter,
  getCommissionRecords,
  createWithdrawal,
  getAgentWithdrawals,
  getTeamStats,
  getTeamMembers,
  getPromotionData,
  getInviteRecords,
  getRules,
  createRule,
  updateRule,
  deleteRule,
  getAdminCommissionRecords,
  getWithdrawals,
  getWithdrawalDetail,
  reviewWithdrawal,
  completeWithdrawal,
  settleCommissions,
  settleCommissionsByDate,
  getCommissionStatistics,
  getCommissionRecordDetail,
  rollbackCommission,
};

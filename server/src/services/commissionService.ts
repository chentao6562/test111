/**
 * 分润服务
 *
 * 【重构说明】此文件已拆分为多个子模块：
 * - commission/commissionCalculator.ts - 分润计算
 * - commission/commissionCenterService.ts - 分润中心
 * - commission/withdrawalService.ts - 提现服务
 * - commission/teamService.ts - 团队服务
 * - commission/commissionRuleService.ts - 分润规则管理
 *
 * 此文件保留作为入口，保持向后兼容性
 */

export * from './commission';
export { default } from './commission';

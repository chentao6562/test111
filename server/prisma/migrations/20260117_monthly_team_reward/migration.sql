-- 【2026-01-17】团队奖励月度统计 - 数据库迁移
-- 说明：将团队奖励从即时触发改为月度统计，次月5日发放

-- 1. Agent表新增字段
ALTER TABLE `agents` ADD COLUMN IF NOT EXISTS `monthly_team_sales` DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '当月团队销售额';
ALTER TABLE `agents` ADD COLUMN IF NOT EXISTS `last_reward_month` VARCHAR(7) NULL COMMENT '上次发放团队奖励的月份(YYYY-MM)';

-- 2. 初始化：将当前teamSales作为本月初始值（可选，根据实际情况决定）
-- UPDATE `agents` SET `monthly_team_sales` = `team_sales` WHERE `type` = 'LEVEL1';

-- 3. 添加索引优化查询性能
CREATE INDEX IF NOT EXISTS `idx_agents_monthly_reward` ON `agents` (`type`, `status`, `last_reward_month`);

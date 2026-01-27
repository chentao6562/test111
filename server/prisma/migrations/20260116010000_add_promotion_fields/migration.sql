-- 添加推广体系升级字段
-- 执行日期: 2026-01-16
-- 说明: 为orders表添加推销员利润分配相关字段

-- ============ 订单表添加推广体系字段 ============

-- orderSource
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'orderSource');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `orders` ADD COLUMN `orderSource` TINYINT NOT NULL DEFAULT 0 COMMENT ''订单来源: 0=总代理 1=一级推销员 2=二级推销员''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- sourceAgentId
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'sourceAgentId');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `orders` ADD COLUMN `sourceAgentId` INT NULL COMMENT ''来源推销员ID''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- snapshotCostPrice
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'snapshotCostPrice');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `orders` ADD COLUMN `snapshotCostPrice` DECIMAL(10,2) NULL COMMENT ''成本价快照''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- snapshotSupplyPrice
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'snapshotSupplyPrice');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `orders` ADD COLUMN `snapshotSupplyPrice` DECIMAL(10,2) NULL COMMENT ''供货价快照''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- snapshotLevel1Price
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'snapshotLevel1Price');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `orders` ADD COLUMN `snapshotLevel1Price` DECIMAL(10,2) NULL COMMENT ''一级给二级价快照''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- snapshotRetailPrice
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'snapshotRetailPrice');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `orders` ADD COLUMN `snapshotRetailPrice` DECIMAL(10,2) NULL COMMENT ''零售价快照''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- masterProfit
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'masterProfit');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `orders` ADD COLUMN `masterProfit` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT ''总代理利润''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- level1Profit
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'level1Profit');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `orders` ADD COLUMN `level1Profit` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT ''一级推销员利润''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- level2Profit
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'level2Profit');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `orders` ADD COLUMN `level2Profit` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT ''二级推销员利润''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- level1AgentId
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'level1AgentId');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `orders` ADD COLUMN `level1AgentId` INT NULL COMMENT ''一级推销员ID''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- level2AgentId
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'level2AgentId');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `orders` ADD COLUMN `level2AgentId` INT NULL COMMENT ''二级推销员ID''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- profitSettled
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'profitSettled');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `orders` ADD COLUMN `profitSettled` BOOLEAN NOT NULL DEFAULT false COMMENT ''利润已结算''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- profitSettledAt
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'profitSettledAt');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `orders` ADD COLUMN `profitSettledAt` DATETIME(3) NULL COMMENT ''利润结算时间''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============ 添加索引 ============

-- orderSource索引
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND INDEX_NAME = 'orders_orderSource_idx');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX `orders_orderSource_idx` ON `orders`(`orderSource`)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- sourceAgentId索引
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND INDEX_NAME = 'orders_sourceAgentId_idx');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX `orders_sourceAgentId_idx` ON `orders`(`sourceAgentId`)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============ order_items表添加价格快照字段 ============

-- snapshotCostPrice
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'snapshotCostPrice');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `order_items` ADD COLUMN `snapshotCostPrice` DECIMAL(10,2) NULL COMMENT ''成本价快照''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- snapshotSupplyPrice
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'snapshotSupplyPrice');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `order_items` ADD COLUMN `snapshotSupplyPrice` DECIMAL(10,2) NULL COMMENT ''供货价快照''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- snapshotLevel1Price
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'snapshotLevel1Price');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `order_items` ADD COLUMN `snapshotLevel1Price` DECIMAL(10,2) NULL COMMENT ''一级给二级价快照''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- snapshotRetailPrice
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'snapshotRetailPrice');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `order_items` ADD COLUMN `snapshotRetailPrice` DECIMAL(10,2) NULL COMMENT ''零售价快照''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============ agents表添加推广体系字段 ============

-- isMaster
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agents' AND COLUMN_NAME = 'isMaster');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `agents` ADD COLUMN `isMaster` BOOLEAN NOT NULL DEFAULT false COMMENT ''是否总代理''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- totalSales
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agents' AND COLUMN_NAME = 'totalSales');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `agents` ADD COLUMN `totalSales` DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT ''累计销售额''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- totalOrderCount
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agents' AND COLUMN_NAME = 'totalOrderCount');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `agents` ADD COLUMN `totalOrderCount` INT NOT NULL DEFAULT 0 COMMENT ''累计订单数''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- teamSales
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agents' AND COLUMN_NAME = 'teamSales');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `agents` ADD COLUMN `teamSales` DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT ''团队累计销售额''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- validInviteCount
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agents' AND COLUMN_NAME = 'validInviteCount');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `agents` ADD COLUMN `validInviteCount` INT NOT NULL DEFAULT 0 COMMENT ''有效邀请人数''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- currentRewardTier
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agents' AND COLUMN_NAME = 'currentRewardTier');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `agents` ADD COLUMN `currentRewardTier` INT NOT NULL DEFAULT 0 COMMENT ''当前团队奖励阶梯''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- isActivated
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agents' AND COLUMN_NAME = 'isActivated');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `agents` ADD COLUMN `isActivated` BOOLEAN NOT NULL DEFAULT false COMMENT ''是否已激活''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- activatedAt
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agents' AND COLUMN_NAME = 'activatedAt');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `agents` ADD COLUMN `activatedAt` DATETIME(3) NULL COMMENT ''激活时间''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============ products表添加价格字段 ============

-- costPrice
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'costPrice');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `products` ADD COLUMN `costPrice` DECIMAL(10,2) NULL COMMENT ''成本价''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- supplyPrice
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'supplyPrice');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `products` ADD COLUMN `supplyPrice` DECIMAL(10,2) NULL COMMENT ''供货价''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- suggestedPrice
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'suggestedPrice');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `products` ADD COLUMN `suggestedPrice` DECIMAL(10,2) NULL COMMENT ''建议零售价''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- minRetailPrice
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'minRetailPrice');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `products` ADD COLUMN `minRetailPrice` DECIMAL(10,2) NULL COMMENT ''最低零售价''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- masterRetailPrice
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'masterRetailPrice');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `products` ADD COLUMN `masterRetailPrice` DECIMAL(10,2) NULL COMMENT ''总代理零售价''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============ 创建推销员定价表 ============

CREATE TABLE IF NOT EXISTS `agent_prices` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `agentId` INT NOT NULL,
  `productId` INT NOT NULL,
  `retailPrice` DECIMAL(10,2) NULL COMMENT '我的零售价',
  `subPrice` DECIMAL(10,2) NULL COMMENT '给下级的价格',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `agent_prices_agentId_productId_key`(`agentId`, `productId`),
  INDEX `agent_prices_productId_idx`(`productId`),
  CONSTRAINT `agent_prices_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `agent_prices_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============ 创建奖励配置表 ============

CREATE TABLE IF NOT EXISTS `reward_configs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `configKey` VARCHAR(50) NOT NULL UNIQUE,
  `configValue` VARCHAR(200) NOT NULL,
  `description` VARCHAR(200) NULL,
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `updatedBy` INT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============ 创建团队奖励阶梯表 ============

CREATE TABLE IF NOT EXISTS `team_reward_tiers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `tierLevel` INT NOT NULL UNIQUE,
  `salesThreshold` DECIMAL(12,2) NOT NULL,
  `rewardAmount` DECIMAL(10,2) NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============ 创建奖励记录表 ============

CREATE TABLE IF NOT EXISTS `reward_records` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `agentId` INT NOT NULL,
  `rewardType` TINYINT NOT NULL COMMENT '1=激活奖励 2=团队奖励 3=升级补偿',
  `amount` DECIMAL(10,2) NOT NULL,
  `relatedAgentId` INT NULL,
  `tierLevel` INT NULL,
  `orderId` INT NULL,
  `remark` VARCHAR(200) NULL,
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '0=待发放 1=已发放',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `reward_records_agentId_idx`(`agentId`),
  INDEX `reward_records_rewardType_idx`(`rewardType`),
  CONSTRAINT `reward_records_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============ 创建升级申请表 ============

CREATE TABLE IF NOT EXISTS `upgrade_applications` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `agentId` INT NOT NULL,
  `oldParentId` INT NULL,
  `applySales` DECIMAL(12,2) NULL,
  `applyOrders` INT NULL,
  `applyReason` TEXT NULL,
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '0=待审核 1=通过 2=拒绝',
  `reviewRemark` VARCHAR(500) NULL,
  `reviewedBy` INT NULL,
  `reviewedAt` DATETIME(3) NULL,
  `compensationPaid` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `upgrade_applications_agentId_idx`(`agentId`),
  INDEX `upgrade_applications_status_idx`(`status`),
  CONSTRAINT `upgrade_applications_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============ 初始化奖励配置 ============

INSERT INTO `reward_configs` (`configKey`, `configValue`, `description`)
SELECT 'master_phone', '17678033798', '总代理手机号'
WHERE NOT EXISTS (SELECT 1 FROM `reward_configs` WHERE `configKey` = 'master_phone');

INSERT INTO `reward_configs` (`configKey`, `configValue`, `description`)
SELECT 'activation_threshold', '500', '激活门槛(元)'
WHERE NOT EXISTS (SELECT 1 FROM `reward_configs` WHERE `configKey` = 'activation_threshold');

INSERT INTO `reward_configs` (`configKey`, `configValue`, `description`)
SELECT 'activation_reward', '20', '激活奖励(元)'
WHERE NOT EXISTS (SELECT 1 FROM `reward_configs` WHERE `configKey` = 'activation_reward');

INSERT INTO `reward_configs` (`configKey`, `configValue`, `description`)
SELECT 'upgrade_min_sales', '30000', '升级最低销售额(元)'
WHERE NOT EXISTS (SELECT 1 FROM `reward_configs` WHERE `configKey` = 'upgrade_min_sales');

INSERT INTO `reward_configs` (`configKey`, `configValue`, `description`)
SELECT 'upgrade_min_orders', '50', '升级最低订单数'
WHERE NOT EXISTS (SELECT 1 FROM `reward_configs` WHERE `configKey` = 'upgrade_min_orders');

INSERT INTO `reward_configs` (`configKey`, `configValue`, `description`)
SELECT 'upgrade_min_days', '30', '升级最低注册天数'
WHERE NOT EXISTS (SELECT 1 FROM `reward_configs` WHERE `configKey` = 'upgrade_min_days');

INSERT INTO `reward_configs` (`configKey`, `configValue`, `description`)
SELECT 'upgrade_compensation', '1000', '升级补偿金额(元)'
WHERE NOT EXISTS (SELECT 1 FROM `reward_configs` WHERE `configKey` = 'upgrade_compensation');

INSERT INTO `reward_configs` (`configKey`, `configValue`, `description`)
SELECT 'settlement_days', '2', '结算周期(天,T+N)'
WHERE NOT EXISTS (SELECT 1 FROM `reward_configs` WHERE `configKey` = 'settlement_days');

-- ============ 初始化团队奖励阶梯 ============

INSERT INTO `team_reward_tiers` (`tierLevel`, `salesThreshold`, `rewardAmount`)
SELECT 1, 5000.00, 100.00
WHERE NOT EXISTS (SELECT 1 FROM `team_reward_tiers` WHERE `tierLevel` = 1);

INSERT INTO `team_reward_tiers` (`tierLevel`, `salesThreshold`, `rewardAmount`)
SELECT 2, 15000.00, 300.00
WHERE NOT EXISTS (SELECT 1 FROM `team_reward_tiers` WHERE `tierLevel` = 2);

INSERT INTO `team_reward_tiers` (`tierLevel`, `salesThreshold`, `rewardAmount`)
SELECT 3, 50000.00, 1000.00
WHERE NOT EXISTS (SELECT 1 FROM `team_reward_tiers` WHERE `tierLevel` = 3);

-- ============ 完成 ============

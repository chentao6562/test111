-- 预约模式升级迁移脚本
-- 执行日期: 2026-01-16
-- 说明: 删除锁货模式相关模型和字段，新增预约系统模型

-- ============ 第一部分：删除锁货模式相关表 ============

-- 首先检查外键约束是否存在，如果存在则删除
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'orders'
    AND CONSTRAINT_NAME = 'orders_bundleId_fkey');

SET @drop_fk_sql = IF(@fk_exists > 0, 'ALTER TABLE `orders` DROP FOREIGN KEY `orders_bundleId_fkey`', 'SELECT 1');
PREPARE stmt FROM @drop_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 删除配送池表
DROP TABLE IF EXISTS `delivery_pool`;

-- 删除撮合配置表
DROP TABLE IF EXISTS `transfer_config`;

-- 删除移库打包表
DROP TABLE IF EXISTS `transfer_bundles`;

-- ============ 第二部分：删除订单表中的锁货模式字段 ============

-- 删除 orders 表中的移库相关字段（检查字段是否存在）
-- needTransfer
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'needTransfer');
SET @sql = IF(@col_exists > 0, 'ALTER TABLE `orders` DROP COLUMN `needTransfer`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- transferFee
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'transferFee');
SET @sql = IF(@col_exists > 0, 'ALTER TABLE `orders` DROP COLUMN `transferFee`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- transferFeeConfirmed
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'transferFeeConfirmed');
SET @sql = IF(@col_exists > 0, 'ALTER TABLE `orders` DROP COLUMN `transferFeeConfirmed`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- transferFeeSetAt
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'transferFeeSetAt');
SET @sql = IF(@col_exists > 0, 'ALTER TABLE `orders` DROP COLUMN `transferFeeSetAt`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- transferFeeSetBy
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'transferFeeSetBy');
SET @sql = IF(@col_exists > 0, 'ALTER TABLE `orders` DROP COLUMN `transferFeeSetBy`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- deliveryName
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'deliveryName');
SET @sql = IF(@col_exists > 0, 'ALTER TABLE `orders` DROP COLUMN `deliveryName`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- deliveryPhone
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'deliveryPhone');
SET @sql = IF(@col_exists > 0, 'ALTER TABLE `orders` DROP COLUMN `deliveryPhone`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- deliveryAddress
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'deliveryAddress');
SET @sql = IF(@col_exists > 0, 'ALTER TABLE `orders` DROP COLUMN `deliveryAddress`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- deliveryRemark
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'deliveryRemark');
SET @sql = IF(@col_exists > 0, 'ALTER TABLE `orders` DROP COLUMN `deliveryRemark`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- bundleId
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'bundleId');
SET @sql = IF(@col_exists > 0, 'ALTER TABLE `orders` DROP COLUMN `bundleId`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============ 第三部分：删除商品表中的移库相关字段 ============

-- transferFee
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'transferFee');
SET @sql = IF(@col_exists > 0, 'ALTER TABLE `products` DROP COLUMN `transferFee`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- allowTransfer
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'allowTransfer');
SET @sql = IF(@col_exists > 0, 'ALTER TABLE `products` DROP COLUMN `allowTransfer`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============ 第四部分：创建预约系统相关表 ============

-- 创建客户记录表
CREATE TABLE IF NOT EXISTS `customer_records` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `phone` VARCHAR(20) NOT NULL,
  `name` VARCHAR(50) NULL,
  `totalOrders` INT NOT NULL DEFAULT 0,
  `completedOrders` INT NOT NULL DEFAULT 0,
  `noShowCount` INT NOT NULL DEFAULT 0,
  `riskLevel` TINYINT NOT NULL DEFAULT 0 COMMENT '0=正常 1=有记录 2=高风险 3=黑名单',
  `isBlocked` BOOLEAN NOT NULL DEFAULT false,
  `blockedReason` VARCHAR(200) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `customer_records_phone_key`(`phone`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建赠品档位表
CREATE TABLE IF NOT EXISTS `gift_tiers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `minAmount` DECIMAL(10,2) NOT NULL COMMENT '最低金额门槛',
  `giftName` VARCHAR(200) NOT NULL COMMENT '赠品名称',
  `giftItems` TEXT NULL COMMENT 'JSON格式赠品明细',
  `giftCost` DECIMAL(10,2) NULL COMMENT '赠品成本',
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建预约单表
CREATE TABLE IF NOT EXISTS `reservations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `reservationNo` VARCHAR(32) NOT NULL COMMENT '预约单号',

  -- 客户信息
  `customerName` VARCHAR(50) NOT NULL,
  `customerPhone` VARCHAR(20) NOT NULL,
  `pickupDate` DATE NOT NULL COMMENT '预计提货日期',

  -- 归属信息
  `salespersonId` INT NULL COMMENT '推销员ID（关联agents）',
  `salespersonLevel` TINYINT NULL COMMENT '推销员层级',
  `parentSalespersonId` INT NULL COMMENT '上级推销员ID',
  `agentId` INT NULL COMMENT '代理商ID（兼容旧字段）',
  `storeId` INT NOT NULL COMMENT '门店/仓库ID',

  -- 金额
  `totalAmount` DECIMAL(10,2) NOT NULL COMMENT '预约总金额',

  -- 赠品
  `giftTierId` INT NULL COMMENT '赠品档位ID',
  `giftName` VARCHAR(200) NULL COMMENT '赠品名称',
  `giftDelivered` BOOLEAN NOT NULL DEFAULT false COMMENT '赠品是否已发放',

  -- 状态: 0=待确认 1=确认中 2=已确认 3=已完成 4=已取消 5=已过期 6=确认失败
  `status` TINYINT NOT NULL DEFAULT 0,

  -- 电话确认
  `callCount` TINYINT NOT NULL DEFAULT 0 COMMENT '拨打次数',
  `lastCallAt` DATETIME(3) NULL COMMENT '最后拨打时间',
  `confirmedAt` DATETIME(3) NULL COMMENT '确认时间',
  `confirmedBy` INT NULL COMMENT '确认人员ID',

  -- 核销
  `completedAt` DATETIME(3) NULL COMMENT '完成时间',
  `completedBy` INT NULL COMMENT '核销人员ID',
  `paymentMethod` VARCHAR(20) NULL COMMENT '支付方式',

  -- 利润分配（与订单一致）
  `masterProfit` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `level1Profit` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `level2Profit` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `level1AgentId` INT NULL,
  `level2AgentId` INT NULL,

  -- 结算
  `settled` BOOLEAN NOT NULL DEFAULT false,
  `settledAt` DATETIME(3) NULL,

  -- 风控
  `customerRiskLevel` TINYINT NOT NULL DEFAULT 0,

  `expireAt` DATETIME(3) NULL COMMENT '过期时间',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE INDEX `reservations_reservationNo_key`(`reservationNo`),
  INDEX `reservations_salespersonId_idx`(`salespersonId`),
  INDEX `reservations_status_idx`(`status`),
  INDEX `reservations_storeId_idx`(`storeId`),
  INDEX `reservations_customerPhone_idx`(`customerPhone`),
  CONSTRAINT `reservations_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建预约商品明细表
CREATE TABLE IF NOT EXISTS `reservation_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `reservationId` INT NOT NULL,
  `productId` INT NOT NULL,
  `productName` VARCHAR(200) NOT NULL,
  `productImage` VARCHAR(500) NULL,
  `quantity` INT NOT NULL,
  `price` DECIMAL(10,2) NOT NULL COMMENT '零售价（推销员定价）',

  -- 价格快照（用于利润计算）
  `snapshotCostPrice` DECIMAL(10,2) NULL COMMENT '成本价快照',
  `snapshotSupplyPrice` DECIMAL(10,2) NULL COMMENT '供货价快照',
  `snapshotLevel1Price` DECIMAL(10,2) NULL COMMENT '给二级价快照',
  `snapshotRetailPrice` DECIMAL(10,2) NULL COMMENT '零售价快照',

  PRIMARY KEY (`id`),
  INDEX `reservation_items_reservationId_idx`(`reservationId`),
  INDEX `reservation_items_productId_idx`(`productId`),
  CONSTRAINT `reservation_items_reservationId_fkey` FOREIGN KEY (`reservationId`) REFERENCES `reservations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `reservation_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============ 第五部分：初始化赠品档位数据 ============

-- 先检查是否已有数据
INSERT INTO `gift_tiers` (`minAmount`, `giftName`, `giftItems`, `giftCost`, `isActive`, `sortOrder`, `createdAt`)
SELECT 100.00, '小手持烟花 × 2', '["小手持烟花 × 2"]', 5.00, true, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `gift_tiers` WHERE `minAmount` = 100.00);

INSERT INTO `gift_tiers` (`minAmount`, `giftName`, `giftItems`, `giftCost`, `isActive`, `sortOrder`, `createdAt`)
SELECT 200.00, '仙女棒 × 10 + 摔炮 × 1盒', '["仙女棒 × 10", "摔炮 × 1盒"]', 15.00, true, 2, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `gift_tiers` WHERE `minAmount` = 200.00);

INSERT INTO `gift_tiers` (`minAmount`, `giftName`, `giftItems`, `giftCost`, `isActive`, `sortOrder`, `createdAt`)
SELECT 300.00, '小型喷花 × 1 + 仙女棒 × 10', '["小型喷花 × 1", "仙女棒 × 10"]', 25.00, true, 3, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `gift_tiers` WHERE `minAmount` = 300.00);

INSERT INTO `gift_tiers` (`minAmount`, `giftName`, `giftItems`, `giftCost`, `isActive`, `sortOrder`, `createdAt`)
SELECT 500.00, '中型烟花 × 1 + 小礼包', '["中型烟花 × 1", "小礼包"]', 50.00, true, 4, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `gift_tiers` WHERE `minAmount` = 500.00);

INSERT INTO `gift_tiers` (`minAmount`, `giftName`, `giftItems`, `giftCost`, `isActive`, `sortOrder`, `createdAt`)
SELECT 1000.00, '大型烟花 × 1 + 中礼包', '["大型烟花 × 1", "中礼包"]', 100.00, true, 5, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `gift_tiers` WHERE `minAmount` = 1000.00);

-- ============ 完成 ============
-- 迁移完成后，请执行 npx prisma generate 重新生成客户端

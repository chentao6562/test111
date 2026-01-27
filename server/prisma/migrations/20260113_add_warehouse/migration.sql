-- 【2026-01-13】多仓库支持数据迁移
-- 创建warehouses表、修改system_users和orders表

-- 1. 创建仓库表
CREATE TABLE `warehouses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `province` VARCHAR(50) NOT NULL,
    `city` VARCHAR(50) NOT NULL,
    `district` VARCHAR(50) NULL,
    `address` VARCHAR(255) NOT NULL,
    `latitude` DECIMAL(10, 6) NULL,
    `longitude` DECIMAL(10, 6) NULL,
    `contactName` VARCHAR(50) NULL,
    `contactPhone` VARCHAR(20) NOT NULL,
    `businessHours` VARCHAR(100) NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    `sort` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `warehouses_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. 插入默认仓库（蒙庆烟花总仓）
INSERT INTO `warehouses` (`name`, `code`, `province`, `city`, `district`, `address`, `latitude`, `longitude`, `contactName`, `contactPhone`, `businessHours`, `isDefault`, `status`, `sort`, `createdAt`, `updatedAt`)
VALUES (
    '蒙庆烟花总仓',
    'WH001',
    '内蒙古自治区',
    '呼和浩特市',
    '和林格尔县',
    '盛乐镇姑子板村华门世家1号门面房',
    40.3485,
    111.7287,
    '蒙庆客服',
    '13190531439',
    '08:00-18:00',
    true,
    'ACTIVE',
    0,
    NOW(),
    NOW()
);

-- 3. 员工表添加仓库ID字段
ALTER TABLE `system_users` ADD COLUMN `warehouseId` INTEGER NULL;

-- 4. 员工表添加仓库外键
ALTER TABLE `system_users` ADD CONSTRAINT `system_users_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. 员工表添加仓库索引
CREATE INDEX `system_users_warehouseId_idx` ON `system_users`(`warehouseId`);

-- 6. 订单表添加仓库ID字段
ALTER TABLE `orders` ADD COLUMN `warehouseId` INTEGER NULL;

-- 7. 订单表添加仓库外键
ALTER TABLE `orders` ADD CONSTRAINT `orders_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 8. 订单表添加仓库索引
CREATE INDEX `orders_warehouseId_idx` ON `orders`(`warehouseId`);

-- 9. 将现有库管归属到默认仓库
UPDATE `system_users` SET `warehouseId` = 1 WHERE `role` = 'WAREHOUSE';

-- 10. 将现有订单关联到默认仓库
UPDATE `orders` SET `warehouseId` = 1;

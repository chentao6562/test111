-- CreateTable: 砍价活动配置表
CREATE TABLE `bargain_configs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `start_time` DATETIME(3) NOT NULL,
    `end_time` DATETIME(3) NOT NULL,
    `bargain_hours` INTEGER NOT NULL DEFAULT 24,
    `min_bargain_count` INTEGER NOT NULL DEFAULT 3,
    `max_bargain_count` INTEGER NOT NULL DEFAULT 20,
    `new_user_bonus` DECIMAL(5, 2) NOT NULL DEFAULT 2,
    `cost_bearer_type` VARCHAR(20) NOT NULL DEFAULT 'PLATFORM',
    `agent_bear_ratio` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `bargain_configs_is_active_start_time_end_time_idx`(`is_active`, `start_time`, `end_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: 砍价商品配置表
CREATE TABLE `bargain_config_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `config_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `original_price` DECIMAL(10, 2) NOT NULL,
    `floor_price` DECIMAL(10, 2) NOT NULL,
    `bargain_stock` INTEGER NOT NULL DEFAULT 0,
    `sold_count` INTEGER NOT NULL DEFAULT 0,
    `limit_per_user` INTEGER NOT NULL DEFAULT 1,
    `sort` INTEGER NOT NULL DEFAULT 0,

    INDEX `bargain_config_items_config_id_idx`(`config_id`),
    UNIQUE INDEX `bargain_config_items_config_id_product_id_key`(`config_id`, `product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: 砍价活动表（用户发起的砍价）
CREATE TABLE `bargains` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(20) NOT NULL,
    `initiator_phone` VARCHAR(20) NOT NULL,
    `initiator_name` VARCHAR(50) NULL,
    `salesperson_id` INTEGER NULL,
    `salesperson_level` TINYINT NULL,
    `parent_salesperson_id` INTEGER NULL,
    `agent_id` INTEGER NULL,
    `config_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `original_price` DECIMAL(10, 2) NOT NULL,
    `floor_price` DECIMAL(10, 2) NOT NULL,
    `current_price` DECIMAL(10, 2) NOT NULL,
    `total_cut` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `store_id` INTEGER NOT NULL,
    `cut_count` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(20) NOT NULL DEFAULT 'BARGAINING',
    `reached_floor` BOOLEAN NOT NULL DEFAULT false,
    `reservation_id` INTEGER NULL,
    `platform_cost` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `agent_cost` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `expire_at` DATETIME(3) NOT NULL,
    `ordered_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `bargains_code_key`(`code`),
    UNIQUE INDEX `bargains_reservation_id_key`(`reservation_id`),
    INDEX `bargains_code_idx`(`code`),
    INDEX `bargains_initiator_phone_idx`(`initiator_phone`),
    INDEX `bargains_status_expire_at_idx`(`status`, `expire_at`),
    INDEX `bargains_salesperson_id_idx`(`salesperson_id`),
    INDEX `bargains_config_id_product_id_idx`(`config_id`, `product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: 砍价记录表（每次砍价的详情）
CREATE TABLE `bargain_cuts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bargain_id` INTEGER NOT NULL,
    `helper_phone` VARCHAR(20) NOT NULL,
    `helper_name` VARCHAR(50) NULL,
    `cut_amount` DECIMAL(10, 2) NOT NULL,
    `is_new_user` BOOLEAN NOT NULL DEFAULT false,
    `price_after_cut` DECIMAL(10, 2) NOT NULL,
    `ip_address` VARCHAR(50) NULL,
    `device_id` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `bargain_cuts_bargain_id_idx`(`bargain_id`),
    INDEX `bargain_cuts_helper_phone_idx`(`helper_phone`),
    UNIQUE INDEX `bargain_cuts_bargain_id_helper_phone_key`(`bargain_id`, `helper_phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: 砍价黑名单（防刷）
CREATE TABLE `bargain_blacklists` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(20) NOT NULL,
    `value` VARCHAR(100) NOT NULL,
    `reason` VARCHAR(255) NULL,
    `expire_at` DATETIME(3) NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `bargain_blacklists_type_value_expire_at_idx`(`type`, `value`, `expire_at`),
    UNIQUE INDEX `bargain_blacklists_type_value_key`(`type`, `value`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `bargain_config_items` ADD CONSTRAINT `bargain_config_items_config_id_fkey` FOREIGN KEY (`config_id`) REFERENCES `bargain_configs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bargain_config_items` ADD CONSTRAINT `bargain_config_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bargains` ADD CONSTRAINT `bargains_config_id_fkey` FOREIGN KEY (`config_id`) REFERENCES `bargain_configs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bargains` ADD CONSTRAINT `bargains_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bargains` ADD CONSTRAINT `bargains_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bargain_cuts` ADD CONSTRAINT `bargain_cuts_bargain_id_fkey` FOREIGN KEY (`bargain_id`) REFERENCES `bargains`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

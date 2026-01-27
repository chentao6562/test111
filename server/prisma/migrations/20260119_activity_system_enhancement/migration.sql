-- 活动系统增强迁移
-- 2026-01-19

-- 1. 创建限时秒杀活动表
CREATE TABLE IF NOT EXISTS `flash_sale_activities` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL COMMENT '活动名称',
  `start_time` DATETIME NOT NULL COMMENT '开始时间',
  `end_time` DATETIME NOT NULL COMMENT '结束时间',
  `status` VARCHAR(20) NOT NULL DEFAULT 'DRAFT' COMMENT '状态: DRAFT/ACTIVE/ENDED',
  `banner_image` VARCHAR(500) NULL COMMENT '活动Banner图',
  `description` TEXT NULL COMMENT '活动描述',
  `created_by` INT NOT NULL COMMENT '创建人ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_flash_sale_status_time` (`status`, `start_time`, `end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='限时秒杀活动表';

-- 2. 创建秒杀商品表
CREATE TABLE IF NOT EXISTS `flash_sale_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `activity_id` INT NOT NULL COMMENT '活动ID',
  `product_id` INT NOT NULL COMMENT '商品ID',
  `flash_price` DECIMAL(10, 2) NOT NULL COMMENT '秒杀价',
  `flash_stock` INT NOT NULL COMMENT '秒杀库存',
  `sold_count` INT NOT NULL DEFAULT 0 COMMENT '已售数量',
  `limit_per_user` INT NOT NULL DEFAULT 0 COMMENT '每人限购(0=不限)',
  `sort` INT NOT NULL DEFAULT 0 COMMENT '排序',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_activity_product` (`activity_id`, `product_id`),
  INDEX `idx_flash_sale_activity` (`activity_id`),
  CONSTRAINT `fk_flash_sale_activity` FOREIGN KEY (`activity_id`) REFERENCES `flash_sale_activities` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_flash_sale_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='秒杀商品表';

-- 3. 创建代金券活动表
CREATE TABLE IF NOT EXISTS `coupon_activities` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL COMMENT '活动名称',
  `coupon_amount` DECIMAL(10, 2) NOT NULL COMMENT '券面额',
  `total_count` INT NOT NULL COMMENT '发放总量',
  `issued_count` INT NOT NULL DEFAULT 0 COMMENT '已发放数量',
  `limit_per_user` INT NOT NULL DEFAULT 1 COMMENT '每人限领',
  `start_time` DATETIME NOT NULL COMMENT '开始时间',
  `end_time` DATETIME NOT NULL COMMENT '结束时间',
  `expired_at` DATETIME NOT NULL COMMENT '券过期时间',
  `status` VARCHAR(20) NOT NULL DEFAULT 'DRAFT' COMMENT '状态: DRAFT/ACTIVE/ENDED',
  `created_by` INT NOT NULL COMMENT '创建人ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_coupon_activity_status_time` (`status`, `start_time`, `end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='代金券活动表';

-- 4. 创建活动专题页表
CREATE TABLE IF NOT EXISTS `activity_pages` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL COMMENT '专题名称',
  `slug` VARCHAR(50) NOT NULL COMMENT 'URL标识',
  `banner_image` VARCHAR(500) NULL COMMENT '顶部Banner',
  `description` TEXT NULL COMMENT '描述',
  `start_time` DATETIME NULL COMMENT '开始时间',
  `end_time` DATETIME NULL COMMENT '结束时间',
  `status` VARCHAR(20) NOT NULL DEFAULT 'DRAFT' COMMENT '状态: DRAFT/ACTIVE/INACTIVE',
  `layout` VARCHAR(20) NOT NULL DEFAULT 'GRID' COMMENT '布局: GRID/LIST/WATERFALL',
  `created_by` INT NOT NULL COMMENT '创建人ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_activity_page_slug` (`slug`),
  INDEX `idx_activity_page_status_slug` (`status`, `slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='活动专题页表';

-- 5. 创建专题页区块表
CREATE TABLE IF NOT EXISTS `activity_page_sections` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `page_id` INT NOT NULL COMMENT '专题页ID',
  `title` VARCHAR(100) NULL COMMENT '区块标题',
  `type` VARCHAR(20) NOT NULL COMMENT '区块类型: PRODUCTS/BANNER/TEXT/COUPON',
  `content` TEXT NULL COMMENT 'JSON配置（商品ID列表、图片URL等）',
  `sort` INT NOT NULL DEFAULT 0 COMMENT '排序',
  PRIMARY KEY (`id`),
  INDEX `idx_activity_section_page` (`page_id`),
  CONSTRAINT `fk_activity_section_page` FOREIGN KEY (`page_id`) REFERENCES `activity_pages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='专题页区块表';

-- 6. 扩展赠品档位表
ALTER TABLE `gift_tiers`
  ADD COLUMN `gift_image` VARCHAR(500) NULL COMMENT '赠品图片' AFTER `giftCost`,
  ADD COLUMN `gift_stock` INT NOT NULL DEFAULT 0 COMMENT '赠品库存(0=不限)' AFTER `gift_image`,
  ADD COLUMN `used_count` INT NOT NULL DEFAULT 0 COMMENT '已发放数量' AFTER `gift_stock`,
  ADD COLUMN `start_time` DATETIME NULL COMMENT '活动开始时间' AFTER `used_count`,
  ADD COLUMN `end_time` DATETIME NULL COMMENT '活动结束时间' AFTER `start_time`,
  ADD COLUMN `description` VARCHAR(500) NULL COMMENT '档位描述' AFTER `end_time`,
  ADD COLUMN `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `createdAt`,
  ADD INDEX `idx_gift_tier_active_time` (`isActive`, `start_time`, `end_time`);

-- 【2026-01-18】商品表新增AI营销文案字段
-- 用于存储AI生成的商品卖点、场景等营销内容

-- 添加字段
ALTER TABLE `products` ADD COLUMN `slogan` VARCHAR(100) NULL COMMENT 'AI生成的一句话卖点';
ALTER TABLE `products` ADD COLUMN `selling_points` TEXT NULL COMMENT 'AI生成的结构化卖点（JSON数组）';
ALTER TABLE `products` ADD COLUMN `usage_scenes` VARCHAR(500) NULL COMMENT 'AI生成的适用场景（JSON数组）';
ALTER TABLE `products` ADD COLUMN `ai_copy_updated_at` DATETIME(3) NULL COMMENT 'AI内容最后更新时间';

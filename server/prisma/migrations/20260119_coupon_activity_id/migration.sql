-- 为coupons表添加代金券活动关联字段
-- 2026-01-19

ALTER TABLE `coupons`
  ADD COLUMN `activity_id` INT NULL COMMENT '代金券活动ID' AFTER `sourceDesc`;

CREATE INDEX `idx_coupon_activity` ON `coupons` (`activity_id`);

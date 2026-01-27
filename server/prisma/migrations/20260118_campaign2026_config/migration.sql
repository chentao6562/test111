-- 2026春节营销活动配置
-- 【2026-01-18】

-- ============ 更新赠品档位 ============
-- 先删除旧数据
DELETE FROM gift_tiers;

-- 插入新的赠品档位
INSERT INTO gift_tiers (min_amount, gift_name, gift_cost, is_active, sort_order) VALUES
(200, '18寸仙女棒1盒', 2, true, 1),
(400, '精彩四变色1盒', 5, true, 2),
(600, '迷你加特林1个', 8, true, 3),
(1000, '超级棒棒糖1个', 10, true, 4);

-- ============ 更新晋升条件 ============
-- 晋升销售额门槛：5000元
INSERT INTO reward_configs (config_key, config_value, description) VALUES
('upgrade_sales_threshold', '5000', '晋升销售额门槛')
ON DUPLICATE KEY UPDATE config_value = '5000', description = '晋升销售额门槛';

-- 晋升订单数门槛：20单
INSERT INTO reward_configs (config_key, config_value, description) VALUES
('upgrade_orders_threshold', '20', '晋升订单数门槛')
ON DUPLICATE KEY UPDATE config_value = '20', description = '晋升订单数门槛';

-- 自动晋升门槛
INSERT INTO reward_configs (config_key, config_value, description) VALUES
('auto_upgrade_threshold', '5000', '自动晋升销售额门槛')
ON DUPLICATE KEY UPDATE config_value = '5000', description = '自动晋升销售额门槛';

-- ============ 代金券营销奖励配置 ============
-- 注册奖励
INSERT INTO reward_configs (config_key, config_value, description) VALUES
('coupon_register_bonus', '5', '注册代金券金额')
ON DUPLICATE KEY UPDATE config_value = '5';

-- 首发圈奖励
INSERT INTO reward_configs (config_key, config_value, description) VALUES
('coupon_first_share_bonus', '5', '首发圈代金券金额')
ON DUPLICATE KEY UPDATE config_value = '5';

-- 首预约奖励
INSERT INTO reward_configs (config_key, config_value, description) VALUES
('coupon_first_reservation_bonus', '10', '首预约代金券金额')
ON DUPLICATE KEY UPDATE config_value = '10';

-- 首单成交奖励
INSERT INTO reward_configs (config_key, config_value, description) VALUES
('coupon_first_complete_bonus', '20', '首单成交代金券金额')
ON DUPLICATE KEY UPDATE config_value = '20';

-- 拉新奖励
INSERT INTO reward_configs (config_key, config_value, description) VALUES
('coupon_recruit_bonus', '15', '拉新代金券金额')
ON DUPLICATE KEY UPDATE config_value = '15';

-- 激活再奖
INSERT INTO reward_configs (config_key, config_value, description) VALUES
('coupon_recruit_activate_bonus', '5', '激活再奖代金券金额')
ON DUPLICATE KEY UPDATE config_value = '5';

-- 周销售奖励
INSERT INTO reward_configs (config_key, config_value, description) VALUES
('coupon_week_sales_3', '30', '周销售3单代金券')
ON DUPLICATE KEY UPDATE config_value = '30';

INSERT INTO reward_configs (config_key, config_value, description) VALUES
('coupon_week_sales_5', '80', '周销售5单代金券')
ON DUPLICATE KEY UPDATE config_value = '80';

INSERT INTO reward_configs (config_key, config_value, description) VALUES
('coupon_week_sales_10', '200', '周销售10单代金券')
ON DUPLICATE KEY UPDATE config_value = '200';

-- 周发圈全勤
INSERT INTO reward_configs (config_key, config_value, description) VALUES
('coupon_week_share_full', '20', '周发圈全勤代金券')
ON DUPLICATE KEY UPDATE config_value = '20';

-- 周拉新奖励
INSERT INTO reward_configs (config_key, config_value, description) VALUES
('coupon_week_recruit_3', '50', '周拉新3人代金券')
ON DUPLICATE KEY UPDATE config_value = '50';

-- 代金券过期日期
INSERT INTO reward_configs (config_key, config_value, description) VALUES
('coupon_expire_date', '2026-02-14', '代金券过期日期')
ON DUPLICATE KEY UPDATE config_value = '2026-02-14';

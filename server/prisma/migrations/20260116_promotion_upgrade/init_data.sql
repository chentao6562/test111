-- 【2026-01-16 推广体系升级】数据初始化脚本
-- 执行顺序: 先执行 prisma migrate，再执行此脚本

-- ============================================
-- 1. 创建总代理账号（如果不存在）
-- ============================================

-- 检查是否已有总代理
SET @master_exists = (SELECT COUNT(*) FROM agents WHERE is_master = 1);

-- 如果不存在总代理，则创建
INSERT INTO agents (phone, name, type, is_master, status, invite_code, created_at, updated_at)
SELECT '17678033798', '总代理', 'LEVEL1', 1, 'ACTIVE', 'MASTER', NOW(), NOW()
WHERE @master_exists = 0;

-- 如果已存在总代理但is_master字段为0，则更新
UPDATE agents SET is_master = 1 WHERE phone = '17678033798' AND is_master = 0;

-- ============================================
-- 2. 迁移现有代理商
-- ============================================

-- 一级代理 → 一级推销员（保持type=LEVEL1）
-- 二级/三级代理 → 二级推销员（type改为LEVEL2）
UPDATE agents SET type = 'LEVEL2' WHERE type IN ('LEVEL2', 'LEVEL3') AND is_master = 0;

-- ============================================
-- 3. 初始化商品价格字段
-- ============================================

-- 设置供货价 = 代理价
UPDATE products SET supply_price = agent_price WHERE supply_price IS NULL;

-- 设置建议零售价 = 零售价
UPDATE products SET suggested_price = retail_price WHERE suggested_price IS NULL;

-- 设置最低零售价 = 代理价 * 1.25 (保证最低25%利润空间)
UPDATE products SET min_retail_price = agent_price * 1.25 WHERE min_retail_price IS NULL;

-- 设置总代理零售价 = 零售价
UPDATE products SET master_retail_price = retail_price WHERE master_retail_price IS NULL;

-- 设置成本价 = 代理价（暂时）
UPDATE products SET cost_price = agent_price WHERE cost_price IS NULL;

-- ============================================
-- 4. 初始化推销员统计字段
-- ============================================

-- 更新个人累计销售额
UPDATE agents a SET
  total_sales = COALESCE((
    SELECT SUM(total_amount)
    FROM orders
    WHERE agent_id = a.id AND status = 'completed'
  ), 0),
  total_order_count = COALESCE((
    SELECT COUNT(*)
    FROM orders
    WHERE agent_id = a.id AND status = 'completed'
  ), 0)
WHERE is_master = 0;

-- 更新一级推销员的团队销售额（二级下单金额）
UPDATE agents a SET
  team_sales = COALESCE((
    SELECT SUM(o.total_amount)
    FROM orders o
    INNER JOIN agents sub ON o.agent_id = sub.id
    WHERE sub.parent_id = a.id AND o.status = 'completed'
  ), 0)
WHERE a.type = 'LEVEL1' AND a.is_master = 0;

-- ============================================
-- 5. 初始化奖励配置
-- ============================================

INSERT INTO reward_configs (config_key, config_value, description, updated_at) VALUES
('activation_threshold', '500', '激活门槛（元）：被推荐人累计销售额达到此金额后触发激活奖励', NOW()),
('activation_reward', '20', '激活奖励（元）：被推荐人激活后，推荐人获得的一次性奖励', NOW()),
('upgrade_sales_threshold', '30000', '升级销售额门槛（元）：二级升级为一级需要达到的销售额', NOW()),
('upgrade_orders_threshold', '0', '升级订单数门槛（单）：0表示不限制', NOW()),
('upgrade_days_threshold', '7', '升级注册天数门槛（天）：注册满N天才能申请升级', NOW()),
('upgrade_compensation', '1000', '升级补偿金额（元）：二级升级后原上级获得的补偿', NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- ============================================
-- 6. 初始化团队奖励阶梯
-- ============================================

INSERT INTO team_reward_tiers (tier_level, sales_threshold, reward_amount, is_active, created_at, updated_at) VALUES
(1, 5000, 100, 1, NOW(), NOW()),
(2, 15000, 300, 1, NOW(), NOW()),
(3, 50000, 1000, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  sales_threshold = VALUES(sales_threshold),
  reward_amount = VALUES(reward_amount),
  is_active = 1,
  updated_at = NOW();

-- ============================================
-- 7. 初始化历史订单的利润字段（可选，用于统计）
-- ============================================

-- 对于已完成的历史订单，设置利润为0（因为已经按旧逻辑结算过）
UPDATE orders SET
  order_source = 0,
  master_profit = 0,
  level1_profit = 0,
  level2_profit = 0,
  profit_settled = 1,
  profit_settled_at = NOW()
WHERE status = 'completed' AND order_source IS NULL;

-- ============================================
-- 完成
-- ============================================

SELECT '推广体系升级数据初始化完成' AS result;
SELECT COUNT(*) AS master_count, '总代理账号数量' AS label FROM agents WHERE is_master = 1;
SELECT COUNT(*) AS level1_count, '一级推销员数量' AS label FROM agents WHERE type = 'LEVEL1' AND is_master = 0;
SELECT COUNT(*) AS level2_count, '二级推销员数量' AS label FROM agents WHERE type = 'LEVEL2';
SELECT COUNT(*) AS product_count, '商品数量' AS label FROM products WHERE supply_price IS NOT NULL;
SELECT COUNT(*) AS config_count, '奖励配置数量' AS label FROM reward_configs;
SELECT COUNT(*) AS tier_count, '团队奖励阶梯数量' AS label FROM team_reward_tiers WHERE is_active = 1;

-- ========================================
-- 蒙庆烟花演示数据初始化脚本
-- 创建时间：2026-01-11
-- 用途：为甲方演示准备精美的业务数据
-- ========================================

SET FOREIGN_KEY_CHECKS=0;

-- ========================================
-- 1. 商品分类数据
-- ========================================
INSERT INTO categories (id, name, icon, sortOrder, createdAt, updatedAt) VALUES
(1, '组合烟花', 'gift', 1, NOW(), NOW()),
(2, '喷花类', 'star', 2, NOW(), NOW()),
(3, '旋转升空类', 'rocket', 3, NOW(), NOW()),
(4, '礼花弹', 'crown', 4, NOW(), NOW()),
(5, '造型烟花', 'heart', 5, NOW(), NOW()),
(6, '儿童安全类', 'baby', 6, NOW(), NOW());

-- ========================================
-- 2. 精美商品数据
-- ========================================

-- 组合烟花系列
INSERT INTO products (name, categoryId, description, retailPrice, agentPrice, wholesalePrice, stock, lockStock, minStock, unit, image, barcode, sku, salesCount, allowTransfer, transferFee, status, createdAt, updatedAt) VALUES
('金玉满堂88响组合', 1, '经典88响组合烟花，绚烂夺目，适合开业庆典、婚庆喜宴等大型活动。燃放时长约2分钟，火光冲天，色彩艳丽，寓意吉祥如意、财源广进。', 388.00, 298.00, 268.00, 200, 0, 20, '箱', '烟花图片/u=2312286990,2291693522&fm=253&app=138&f=JPEG.jpg', 'FW001', 'JYMT-88', 0, true, 30.00, 'ACTIVE', NOW(), NOW()),

('龙凤呈祥168响', 1, '高档168响组合礼花，融合传统龙凤图案设计，燃放效果震撼壮观。多层次变化，先喷银柱后绽放彩球，最后菊花绽放，寓意龙腾凤舞、祥瑞安康。', 588.00, 468.00, 428.00, 150, 0, 15, '箱', '烟花图片/qnEhbdMw38LGR3ceJFyz4Tt8AnahYbQcRNJFFK1phR7b496vDQVmtOj-cPABMfP4.jpg', 'FW002', 'LFCX-168', 0, true, 50.00, 'ACTIVE', NOW(), NOW()),

('盛世繁花288响', 1, '顶级288响超大型组合烟花，燃放时长达3-4分钟。七彩变幻，层层递进，包含银柱、金柱、彩珠、笛音、菊花等多种效果，适合大型庆典、跨年活动。', 988.00, 788.00, 728.00, 80, 0, 10, '箱', '烟花图片/_v1g97YImvGGlEmy_Zg440ZAirr5BBSw0oX6Sp0MA_xOEcJR1KDvTAshptWfB8DB.jpg', 'FW003', 'SSFW-288', 0, true, 80.00, 'ACTIVE', NOW(), NOW()),

-- 喷花类系列
('紫气东来冷焰火', 2, '高端冷光喷泉烟花，燃放温度低，安全环保。紫色火焰高达3米，持续时间60秒，适合室内外婚庆、生日派对、浪漫求婚场景。无烟少灰，不会污染环境。', 128.00, 98.00, 88.00, 300, 0, 30, '支', '烟花图片/u=4039402826,2785634471&fm=253&app=138&f=JPEG.jpg', 'FW004', 'ZQDL-CF', 0, true, 10.00, 'ACTIVE', NOW(), NOW()),

('金色年华喷泉', 2, '豪华金色喷泉烟花，高度可达5米，燃放时间90秒。火花密集璀璨，如金色瀑布倾泻而下，适合大型户外活动、开业典礼、周年庆典等隆重场合。', 188.00, 148.00, 138.00, 250, 0, 25, '支', '烟花图片/u=617237994,2911142058&fm=253&app=138&f=JPEG.jpg', 'FW005', 'JSNH-PQ', 0, true, 15.00, 'ACTIVE', NOW(), NOW()),

('彩虹喷泉组合', 2, '七彩渐变喷泉烟花，色彩从红橙黄绿青蓝紫依次变化，如天上彩虹降临人间。燃放高度4米，持续120秒，适合婚礼、生日、聚会等喜庆场合，营造浪漫氛围。', 158.00, 128.00, 118.00, 280, 0, 28, '支', '烟花图片/u=497606185,1382115670&fm=253&app=138&f=JPEG.jpg', 'FW006', 'CHPQ-ZH', 0, true, 12.00, 'ACTIVE', NOW(), NOW()),

-- 旋转升空类系列
('飞天神箭', 3, '经典旋转升空类烟花，点燃后迅速旋转升空，在空中绽放金色火花。升空高度约50米，带有悦耳的哨音，视觉听觉双重享受，适合户外空旷场地燃放。', 68.00, 48.00, 42.00, 500, 0, 50, '支', '烟花图片/u=2153773461,1891142490&fm=253&app=138&f=JPEG.jpg', 'FW007', 'FTSJ-XZ', 0, true, 5.00, 'ACTIVE', NOW(), NOW()),

('彩蝶飞舞', 3, '创意旋转烟花，形似蝴蝶翩翩起舞。旋转时释放彩色火花，形成美丽的光环，旋转时长约30秒，适合儿童观赏（需成人陪同），增添节日欢乐气氛。', 88.00, 68.00, 58.00, 400, 0, 40, '支', '烟花图片/u=2041633049,3244735994&fm=253&app=138&f=JPEG.jpg', 'FW008', 'CDFW-XZ', 0, true, 8.00, 'ACTIVE', NOW(), NOW()),

-- 礼花弹系列
('锦绣中华礼花弹', 4, '专业级3寸礼花弹，升空高度可达100米。空中绽放直径30米的巨大花球，色彩鲜艳夺目，伴有雷鸣般的爆响，气势磅礴。适合大型庆典、跨年倒数、重大节日燃放。', 288.00, 228.00, 208.00, 120, 0, 12, '发', '烟花图片/veer-485580894.jpg', 'FW009', 'JXZH-LHD', 0, true, 25.00, 'ACTIVE', NOW(), NOW()),

('璀璨星空礼花弹', 4, '高档4寸大口径礼花弹，升空高度120米。爆炸后形成满天繁星效果，银白色火花如流星雨般洒落，持续时间长达10秒，营造浪漫梦幻的星空氛围。', 388.00, 308.00, 288.00, 100, 0, 10, '发', '烟花图片/u=3548330523,2060204687&fm=253&app=138&f=JPEG.jpg', 'FW010', 'CCXK-LHD', 0, true, 35.00, 'ACTIVE', NOW(), NOW()),

-- 造型烟花系列
('心形烟花', 5, '创意心形造型烟花，燃放时在空中形成浪漫的红色心形图案，配合玫瑰金色闪光，完美适合求婚、纪念日、情人节等浪漫场合。持续时间约40秒，留下难忘回忆。', 168.00, 138.00, 128.00, 180, 0, 18, '个', '烟花图片/u=1048718087,3147919383&fm=253&app=138&f=JPEG.jpg', 'FW011', 'XXY-ZX', 0, true, 15.00, 'ACTIVE', NOW(), NOW()),

('笑脸烟花', 5, '趣味笑脸造型烟花，燃放时绽放出黄色笑脸图案，充满童趣和欢乐气息。适合儿童生日派对、家庭聚会、亲子活动，为节日增添欢声笑语。燃放时间30秒。', 128.00, 108.00, 98.00, 200, 0, 20, '个', '烟花图片/u=853857468,3445084780&fm=253&app=138&f=JPEG.jpg', 'FW012', 'XLY-ZX', 0, true, 12.00, 'ACTIVE', NOW(), NOW()),

-- 儿童安全类系列
('仙女棒套装', 6, '安全环保仙女棒，采用低温配方，火花温度低不易烫伤。单支燃烧时间60秒，火花细腻柔和，色彩包括金色、银色、彩色等多种选择。适合儿童手持玩耍（需成人监护）。', 38.00, 28.00, 24.00, 1000, 0, 100, '盒/20支', '烟花图片/礼花.jpg', 'FW013', 'XNB-TZ', 0, false, 0.00, 'ACTIVE', NOW(), NOW()),

('小蜜蜂吐珠', 6, '儿童安全吐珠类烟花，燃放时发出"嗞嗞"声响，同时喷射彩色小珠，安全有趣。每个燃放时间约15秒，适合3岁以上儿童在成人监护下玩耍，培养节日氛围感。', 48.00, 38.00, 32.00, 800, 0, 80, '盒/10个', '烟花图片/ScreenShot_2025-12-17_162810_986.png', 'FW014', 'XMF-TZ', 0, false, 0.00, 'ACTIVE', NOW(), NOW());

-- ========================================
-- 3. 首页轮播图数据
-- ========================================
INSERT INTO banners (title, image, link, sortOrder, status, createdAt, updatedAt) VALUES
('2026新春大促', '烟花图片/_v1g97YImvGGlEmy_Zg440ZAirr5BBSw0oX6Sp0MA_xOEcJR1KDvTAshptWfB8DB.jpg', '/pages/products/index?categoryId=1', 1, 'ACTIVE', NOW(), NOW()),
('组合烟花热卖', '烟花图片/qnEhbdMw38LGR3ceJFyz4Tt8AnahYbQcRNJFFK1phR7b496vDQVmtOj-cPABMfP4.jpg', '/pages/products/index?categoryId=1', 2, 'ACTIVE', NOW(), NOW()),
('礼花弹专区', '烟花图片/veer-485580894.jpg', '/pages/products/index?categoryId=4', 3, 'ACTIVE', NOW(), NOW());

-- ========================================
-- 4. 推荐商品数据
-- ========================================
INSERT INTO recommend_products (productId, type, tag, sortOrder, createdAt, updatedAt) VALUES
(1, 'HOT', '热销', 1, NOW(), NOW()),
(2, 'HOT', '热销', 2, NOW(), NOW()),
(3, 'HOT', '热销', 3, NOW(), NOW()),
(9, 'NEW', '新品', 1, NOW(), NOW()),
(10, 'NEW', '新品', 2, NOW(), NOW()),
(11, 'RECOMMEND', '推荐', 1, NOW(), NOW()),
(4, 'RECOMMEND', '推荐', 2, NOW(), NOW());

-- ========================================
-- 5. 代理商演示数据（三级代理体系）
-- ========================================

-- 一级代理（2个）
UPDATE agents SET
  name = '李经理',
  phone = '13800138001',
  type = 'LEVEL1',
  parentId = NULL,
  inviteCode = 'LV1001',
  status = 'ACTIVE',
  balance = 15680.50,
  totalCommission = 28960.00
WHERE id = 1;

INSERT INTO agents (name, phone, password, type, parentId, inviteCode, status, balance, totalCommission, createdAt, updatedAt) VALUES
('王总', '13900139001', '$2b$10$YourHashedPasswordHere', 'LEVEL1', NULL, 'LV1002', 'ACTIVE', 12350.00, 19800.00, NOW(), NOW());

-- 二级代理（4个，每个一级代理有2个下级）
UPDATE agents SET
  name = '张代理',
  phone = '13800138002',
  type = 'LEVEL2',
  parentId = 1,
  inviteCode = 'LV2001',
  status = 'ACTIVE',
  balance = 8560.00,
  totalCommission = 12800.00
WHERE id = 2;

INSERT INTO agents (name, phone, password, type, parentId, inviteCode, status, balance, totalCommission, createdAt, updatedAt) VALUES
('刘经理', '13900139002', '$2b$10$YourHashedPasswordHere', 'LEVEL2', 1, 'LV2002', 'ACTIVE', 6780.00, 9500.00, NOW(), NOW()),
('赵经理', '13900139003', '$2b$10$YourHashedPasswordHere', 'LEVEL2', 2, 'LV2003', 'ACTIVE', 5690.00, 8200.00, NOW(), NOW()),
('孙代理', '13900139004', '$2b$10$YourHashedPasswordHere', 'LEVEL2', 2, 'LV2004', 'ACTIVE', 4320.00, 6700.00, NOW(), NOW());

-- 三级代理（6个）
UPDATE agents SET
  name = '小陈',
  phone = '13800138000',
  type = 'LEVEL3',
  parentId = 2,
  inviteCode = 'LV3001',
  status = 'ACTIVE',
  balance = 2560.00,
  totalCommission = 3890.00
WHERE id = 3;

INSERT INTO agents (name, phone, password, type, parentId, inviteCode, status, balance, totalCommission, createdAt, updatedAt) VALUES
('小杨', '13900139005', '$2b$10$YourHashedPasswordHere', 'LEVEL3', 2, 'LV3002', 'ACTIVE', 1890.00, 2650.00, NOW(), NOW()),
('小吴', '13900139006', '$2b$10$YourHashedPasswordHere', 'LEVEL3', 3, 'LV3003', 'ACTIVE', 3120.00, 4280.00, NOW(), NOW()),
('小周', '13900139007', '$2b$10$YourHashedPasswordHere', 'LEVEL3', 3, 'LV3004', 'ACTIVE', 1560.00, 2190.00, NOW(), NOW()),
('小钱', '13900139008', '$2b$10$YourHashedPasswordHere', 'LEVEL3', 4, 'LV3005', 'ACTIVE', 2340.00, 3450.00, NOW(), NOW()),
('小孙', '13900139009', '$2b$10$YourHashedPasswordHere', 'LEVEL3', 5, 'LV3006', 'ACTIVE', 1680.00, 2310.00, NOW(), NOW());

-- 批发商（2个）
UPDATE agents SET
  name = '华联批发部',
  phone = '13800138003',
  type = 'WHOLESALE',
  parentId = NULL,
  inviteCode = 'WS001',
  status = 'ACTIVE',
  balance = 0.00,
  totalCommission = 0.00
WHERE id = 4;

INSERT INTO agents (name, phone, password, type, parentId, inviteCode, status, balance, totalCommission, createdAt, updatedAt) VALUES
('盛世烟花批发', '13900139010', '$2b$10$YourHashedPasswordHere', 'WHOLESALE', NULL, 'WS002', 'ACTIVE', 0.00, 0.00, NOW(), NOW());

-- ========================================
-- 6. 演示订单数据
-- ========================================

-- 已完成订单（用于展示分润和销售数据）
INSERT INTO orders (orderNo, agentId, status, needTransfer, totalAmount, paidAmount, depositPaid, fullPaid, transferFee, transferFeeConfirmed, pickupCode, pickupDate, warehouseVerifiedAt, remark, createdAt, updatedAt, completedAt) VALUES
('ORD202601110001', 3, 'completed', false, 1064.00, 1064.00, false, true, 0.00, true, '123456', '2026-01-15', '2026-01-11 10:30:00', '春节备货', '2026-01-10 09:00:00', '2026-01-11 10:35:00', '2026-01-11 10:35:00'),
('ORD202601110002', 5, 'completed', false, 1776.00, 1776.00, false, true, 0.00, true, '234567', '2026-01-16', '2026-01-11 11:20:00', '婚庆用', '2026-01-10 14:30:00', '2026-01-11 11:25:00', '2026-01-11 11:25:00'),
('ORD202601110003', 7, 'completed', true, 1632.00, 1632.00, false, true, 80.00, true, '345678', '2026-01-18', '2026-01-11 15:40:00', '移库到分仓', '2026-01-10 16:00:00', '2026-01-11 16:10:00', '2026-01-11 16:10:00');

-- 订单明细
INSERT INTO order_items (orderId, productId, productName, productImage, quantity, price, subtotal, createdAt, updatedAt) VALUES
-- 订单1: 小陈的订单
(1, 1, '金玉满堂88响组合', '烟花图片/u=2312286990,2291693522&fm=253&app=138&f=JPEG.jpg', 2, 298.00, 596.00, '2026-01-10 09:00:00', '2026-01-10 09:00:00'),
(1, 4, '紫气东来冷焰火', '烟花图片/u=4039402826,2785634471&fm=253&app=138&f=JPEG.jpg', 2, 98.00, 196.00, '2026-01-10 09:00:00', '2026-01-10 09:00:00'),
(1, 6, '彩虹喷泉组合', '烟花图片/u=497606185,1382115670&fm=253&app=138&f=JPEG.jpg', 2, 128.00, 256.00, '2026-01-10 09:00:00', '2026-01-10 09:00:00'),
(1, 13, '仙女棒套装', '烟花图片/礼花.jpg', 2, 28.00, 56.00, '2026-01-10 09:00:00', '2026-01-10 09:00:00'),
-- 订单2: 小吴的订单
(2, 2, '龙凤呈祥168响', '烟花图片/qnEhbdMw38LGR3ceJFyz4Tt8AnahYbQcRNJFFK1phR7b496vDQVmtOj-cPABMfP4.jpg', 2, 468.00, 936.00, '2026-01-10 14:30:00', '2026-01-10 14:30:00'),
(2, 5, '金色年华喷泉', '烟花图片/u=617237994,2911142058&fm=253&app=138&f=JPEG.jpg', 3, 148.00, 444.00, '2026-01-10 14:30:00', '2026-01-10 14:30:00'),
(2, 11, '心形烟花', '烟花图片/u=1048718087,3147919383&fm=253&app=138&f=JPEG.jpg', 2, 138.00, 276.00, '2026-01-10 14:30:00', '2026-01-10 14:30:00'),
(2, 14, '小蜜蜂吐珠', '烟花图片/ScreenShot_2025-12-17_162810_986.png', 3, 38.00, 114.00, '2026-01-10 14:30:00', '2026-01-10 14:30:00'),
-- 订单3: 小周的订单（锁货模式）
(3, 3, '盛世繁花288响', '烟花图片/_v1g97YImvGGlEmy_Zg440ZAirr5BBSw0oX6Sp0MA_xOEcJR1KDvTAshptWfB8DB.jpg', 1, 788.00, 788.00, '2026-01-10 16:00:00', '2026-01-10 16:00:00'),
(3, 9, '锦绣中华礼花弹', '烟花图片/veer-485580894.jpg', 2, 228.00, 456.00, '2026-01-10 16:00:00', '2026-01-10 16:00:00'),
(3, 10, '璀璨星空礼花弹', '烟花图片/u=3548330523,2060204687&fm=253&app=138&f=JPEG.jpg', 1, 308.00, 308.00, '2026-01-10 16:00:00', '2026-01-10 16:00:00');

-- 待处理订单（各状态展示）
INSERT INTO orders (orderNo, agentId, status, needTransfer, totalAmount, paidAmount, depositPaid, fullPaid, transferFee, transferFeeConfirmed, contactName, contactPhone, pickupDate, remark, createdAt, updatedAt) VALUES
-- 待付款
('ORD202601110004', 6, 'pending_payment', false, 826.00, 0.00, false, false, 0.00, true, '小杨', '13900139005', '2026-01-20', '元宵节用', '2026-01-11 08:00:00', '2026-01-11 08:00:00'),
-- 待接单
('ORD202601110005', 8, 'pending_accept', false, 1152.00, 1152.00, false, true, 0.00, true, '小钱', '13900139008', '2026-01-22', '开业庆典', '2026-01-11 09:30:00', '2026-01-11 10:15:00'),
-- 备货中
('ORD202601110006', 9, 'preparing', false, 714.00, 714.00, false, true, 0.00, true, '小孙', '13900139009', '2026-01-25', '生日派对', '2026-01-11 11:00:00', '2026-01-11 11:45:00'),
-- 待提货
('ORD202601110007', 10, 'pending_pickup', false, 1344.00, 1344.00, false, true, 0.00, true, '华联批发部', '13800138003', '2026-01-28', '批发订货', '2026-01-11 13:20:00', '2026-01-11 14:30:00');

-- 待处理订单明细
INSERT INTO order_items (orderId, productId, productName, productImage, quantity, price, subtotal, createdAt, updatedAt) VALUES
-- 订单4
(4, 1, '金玉满堂88响组合', '烟花图片/u=2312286990,2291693522&fm=253&app=138&f=JPEG.jpg', 1, 298.00, 298.00, '2026-01-11 08:00:00', '2026-01-11 08:00:00'),
(4, 5, '金色年华喷泉', '烟花图片/u=617237994,2911142058&fm=253&app=138&f=JPEG.jpg', 2, 148.00, 296.00, '2026-01-11 08:00:00', '2026-01-11 08:00:00'),
(4, 7, '飞天神箭', '烟花图片/u=2153773461,1891142490&fm=253&app=138&f=JPEG.jpg', 3, 48.00, 144.00, '2026-01-11 08:00:00', '2026-01-11 08:00:00'),
(4, 13, '仙女棒套装', '烟花图片/礼花.jpg', 3, 28.00, 84.00, '2026-01-11 08:00:00', '2026-01-11 08:00:00'),
-- 订单5
(5, 2, '龙凤呈祥168响', '烟花图片/qnEhbdMw38LGR3ceJFyz4Tt8AnahYbQcRNJFFK1phR7b496vDQVmtOj-cPABMfP4.jpg', 1, 468.00, 468.00, '2026-01-11 09:30:00', '2026-01-11 09:30:00'),
(5, 9, '锦绣中华礼花弹', '烟花图片/veer-485580894.jpg', 2, 228.00, 456.00, '2026-01-11 09:30:00', '2026-01-11 09:30:00'),
(5, 12, '笑脸烟花', '烟花图片/u=853857468,3445084780&fm=253&app=138&f=JPEG.jpg', 2, 108.00, 216.00, '2026-01-11 09:30:00', '2026-01-11 09:30:00'),
-- 订单6
(6, 4, '紫气东来冷焰火', '烟花图片/u=4039402826,2785634471&fm=253&app=138&f=JPEG.jpg', 3, 98.00, 294.00, '2026-01-11 11:00:00', '2026-01-11 11:00:00'),
(6, 6, '彩虹喷泉组合', '烟花图片/u=497606185,1382115670&fm=253&app=138&f=JPEG.jpg', 2, 128.00, 256.00, '2026-01-11 11:00:00', '2026-01-11 11:00:00'),
(6, 8, '彩蝶飞舞', '烟花图片/u=2041633049,3244735994&fm=253&app=138&f=JPEG.jpg', 2, 68.00, 136.00, '2026-01-11 11:00:00', '2026-01-11 11:00:00'),
-- 订单7
(7, 1, '金玉满堂88响组合', '烟花图片/u=2312286990,2291693522&fm=253&app=138&f=JPEG.jpg', 3, 298.00, 894.00, '2026-01-11 13:20:00', '2026-01-11 13:20:00'),
(7, 5, '金色年华喷泉', '烟花图片/u=617237994,2911142058&fm=253&app=138&f=JPEG.jpg', 3, 148.00, 444.00, '2026-01-11 13:20:00', '2026-01-11 13:20:00');

-- 更新商品库存和销量
UPDATE products SET stock = stock - 2, lockStock = lockStock + 2, salesCount = 2 WHERE id = 1; -- 金玉满堂
UPDATE products SET stock = stock - 2, salesCount = 2 WHERE id = 2; -- 龙凤呈祥
UPDATE products SET stock = stock - 1, salesCount = 1 WHERE id = 3; -- 盛世繁花
UPDATE products SET stock = stock - 5, lockStock = lockStock + 3, salesCount = 5 WHERE id = 4; -- 紫气东来
UPDATE products SET stock = stock - 8, lockStock = lockStock + 3, salesCount = 8 WHERE id = 5; -- 金色年华
UPDATE products SET stock = stock - 4, lockStock = lockStock + 2, salesCount = 4 WHERE id = 6; -- 彩虹喷泉
UPDATE products SET stock = stock - 3, lockStock = lockStock + 3, salesCount = 3 WHERE id = 7; -- 飞天神箭
UPDATE products SET stock = stock - 2, lockStock = lockStock + 2, salesCount = 2 WHERE id = 8; -- 彩蝶飞舞
UPDATE products SET stock = stock - 4, lockStock = lockStock + 2, salesCount = 4 WHERE id = 9; -- 锦绣中华
UPDATE products SET stock = stock - 1, salesCount = 1 WHERE id = 10; -- 璀璨星空
UPDATE products SET stock = stock - 2, salesCount = 2 WHERE id = 11; -- 心形烟花
UPDATE products SET stock = stock - 2, lockStock = lockStock + 2, salesCount = 2 WHERE id = 12; -- 笑脸烟花
UPDATE products SET stock = stock - 5, lockStock = lockStock + 3, salesCount = 5 WHERE id = 13; -- 仙女棒
UPDATE products SET stock = stock - 3, salesCount = 3 WHERE id = 14; -- 小蜜蜂

-- ========================================
-- 7. 分润数据（基于已完成订单）
-- ========================================

-- 订单1的分润（小陈→张代理→李经理）
INSERT INTO commissions (agentId, orderId, sourceAgentId, type, rate, amount, status, settledAt, createdAt, updatedAt) VALUES
-- 张代理的直接分润
(2, 1, 3, 'DIRECT', 0.10, 106.40, 'SETTLED', '2026-01-12 02:00:00', '2026-01-11 10:35:00', '2026-01-12 02:00:00'),
-- 李经理的间接分润
(1, 1, 3, 'INDIRECT', 0.02, 21.28, 'SETTLED', '2026-01-12 02:00:00', '2026-01-11 10:35:00', '2026-01-12 02:00:00');

-- 订单2的分润（小吴→刘经理→李经理）
INSERT INTO commissions (agentId, orderId, sourceAgentId, type, rate, amount, status, settledAt, createdAt, updatedAt) VALUES
(3, 2, 5, 'DIRECT', 0.10, 177.60, 'SETTLED', '2026-01-12 02:00:00', '2026-01-11 11:25:00', '2026-01-12 02:00:00'),
(1, 2, 5, 'INDIRECT', 0.02, 35.52, 'SETTLED', '2026-01-12 02:00:00', '2026-01-11 11:25:00', '2026-01-12 02:00:00');

-- 订单3的分润（小周→刘经理→李经理）
INSERT INTO commissions (agentId, orderId, sourceAgentId, type, rate, amount, status, settledAt, createdAt, updatedAt) VALUES
(3, 3, 7, 'DIRECT', 0.15, 232.80, 'SETTLED', '2026-01-12 02:00:00', '2026-01-11 16:10:00', '2026-01-12 02:00:00'),
(1, 3, 7, 'INDIRECT', 0.03, 46.56, 'SETTLED', '2026-01-12 02:00:00', '2026-01-11 16:10:00', '2026-01-12 02:00:00');

-- ========================================
-- 8. 资金流水数据
-- ========================================
INSERT INTO fund_flows (agentId, type, amount, relatedId, relatedType, balance, remark, createdAt) VALUES
-- 张代理分润收入
(2, 'COMMISSION', 106.40, 1, 'ORDER', 8560.00, '订单分润收入', '2026-01-12 02:00:00'),
-- 李经理分润收入
(1, 'COMMISSION', 21.28, 1, 'ORDER', 15680.50, '订单分润收入', '2026-01-12 02:00:00'),
-- 刘经理分润收入
(3, 'COMMISSION', 410.40, NULL, 'ORDER', 6780.00, '订单分润收入', '2026-01-12 02:00:00'),
-- 李经理分润收入
(1, 'COMMISSION', 82.08, NULL, 'ORDER', 15680.50, '订单分润收入', '2026-01-12 02:00:00');

SET FOREIGN_KEY_CHECKS=1;

-- ========================================
-- 数据初始化完成
-- ========================================
SELECT '✅ 演示数据创建成功！' as status,
       '商品: 14个' as products,
       '分类: 6个' as categories,
       '订单: 7个' as orders,
       '代理商: 13个' as agents;

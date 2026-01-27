-- ===============================================
-- 蒙庆烟花系统 - 展示数据初始化脚本
-- ===============================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. 清理现有业务数据（保留系统配置和管理员）
TRUNCATE TABLE order_items;
TRUNCATE TABLE orders;
TRUNCATE TABLE commissions;
TRUNCATE TABLE withdrawals;
TRUNCATE TABLE staff_withdrawals;
TRUNCATE TABLE fund_flows;
TRUNCATE TABLE cart_items;
TRUNCATE TABLE stock_logs;
TRUNCATE TABLE transfer_tasks;
TRUNCATE TABLE banners;
TRUNCATE TABLE recommend_products;
TRUNCATE TABLE h5_banners;
TRUNCATE TABLE h5_recommend_products;

-- 清理所有代理商
TRUNCATE TABLE agents;

-- 清理商品
TRUNCATE TABLE products;

-- 清理分类后重建
TRUNCATE TABLE categories;

SET FOREIGN_KEY_CHECKS = 1;

-- ===============================================
-- 2. 创建分类
-- ===============================================
INSERT INTO categories (id, name, icon, sort, status, createdAt, updatedAt) VALUES
(1, '组合烟花', 'celebration', 1, 'ACTIVE', NOW(), NOW()),
(2, '礼花弹', 'stars', 2, 'ACTIVE', NOW(), NOW()),
(3, '喷花类', 'local_fire_department', 3, 'ACTIVE', NOW(), NOW()),
(4, '仙女棒', 'auto_awesome', 4, 'ACTIVE', NOW(), NOW()),
(5, '鞭炮类', 'volume_up', 5, 'ACTIVE', NOW(), NOW()),
(6, '新春套装', 'redeem', 6, 'ACTIVE', NOW(), NOW());

-- ===============================================
-- 3. 创建商品（使用本地图片）
-- ===============================================
INSERT INTO products (id, name, description, categoryId, retailPrice, agentPrice, wholesalePrice, costPrice, stock, lockStock, minStock, unit, images, status, salesCount, sort, createdAt, updatedAt) VALUES
-- 组合烟花
(1, '七彩祥云 200发豪华组合', '高空礼花弹+地面喷花完美组合，200发连续绽放，七彩效果震撼全场，适合大型庆典、婚庆开业', 1, 888.00, 666.00, 588.00, 400.00, 50, 0, 10, '箱', '["/uploads/fireworks/firework-box-1.jpg"]', 'ACTIVE', 128, 1, NOW(), NOW()),

(2, '烟火王朝 300发顶级组合', '采用进口药粉，300发持续3分钟精彩演出，菊花、柳树、锦冠等多种花型交替绽放', 1, 1288.00, 988.00, 888.00, 600.00, 35, 0, 5, '箱', '["/uploads/fireworks/firework-box-2.jpg"]', 'ACTIVE', 86, 2, NOW(), NOW()),

(3, '老板发财 500发至尊组合', '顶级礼花组合，500发震撼燃放5分钟，金色主题寓意财源滚滚，企业年会首选', 1, 2888.00, 2288.00, 1988.00, 1200.00, 20, 0, 3, '箱', '["/uploads/fireworks/firework-box-3.jpg"]', 'ACTIVE', 45, 3, NOW(), NOW()),

-- 礼花弹
(4, '特战加特林 1688型', '加特林造型礼花筒，连发12响，迷彩外观酷炫，年轻人最爱', 2, 168.00, 128.00, 108.00, 60.00, 100, 0, 20, '支', '["/uploads/fireworks/firework-tube-1.jpg"]', 'ACTIVE', 256, 4, NOW(), NOW()),

(5, '金龙腾飞 礼花弹8发装', '8发高空礼花弹，每发升空30米绽放直径20米，金红双色龙形效果', 2, 288.00, 218.00, 188.00, 120.00, 80, 0, 15, '盒', '["/uploads/fireworks/firework-effect-1.jpg"]', 'ACTIVE', 167, 5, NOW(), NOW()),

(6, '彩虹之巅 12发礼花弹', '12发七彩礼花弹，渐变色彩从红到紫完美过渡，浪漫婚庆必备', 2, 388.00, 298.00, 258.00, 160.00, 60, 0, 10, '盒', '["/uploads/fireworks/firework-effect-2.png"]', 'ACTIVE', 98, 6, NOW(), NOW()),

-- 喷花类
(7, '梦幻喷泉 舞台喷花', '专业舞台喷花，银色火花喷射高度3米，持续30秒，适合婚礼入场', 3, 68.00, 48.00, 38.00, 20.00, 200, 0, 30, '支', '["/uploads/fireworks/firework-display-1.jpg"]', 'ACTIVE', 423, 7, NOW(), NOW()),

(8, '金色年华 手持喷花', '手持安全喷花，金色火花绽放，适合拍照打卡，网红同款', 3, 28.00, 18.00, 15.00, 8.00, 500, 0, 50, '支', '["/uploads/fireworks/firework-combo-1.jpg"]', 'ACTIVE', 1256, 8, NOW(), NOW()),

-- 仙女棒
(9, '星光闪烁 仙女棒50支装', '经典仙女棒，燃烧时间60秒，无烟环保配方，儿童安全款', 4, 38.00, 28.00, 22.00, 12.00, 300, 0, 50, '盒', '["/uploads/fireworks/firework-combo-1.jpg"]', 'ACTIVE', 892, 9, NOW(), NOW()),

(10, '浪漫心形 仙女棒20支装', '心形火花仙女棒，表白神器，燃烧时产生爱心形状火花', 4, 58.00, 42.00, 35.00, 18.00, 200, 0, 30, '盒', '["/uploads/fireworks/firework-combo-1.jpg"]', 'ACTIVE', 567, 10, NOW(), NOW()),

-- 鞭炮类
(11, '开门红 5000响电光炮', '传统红纸电光炮，5000响连续燃放，开业庆典必备', 5, 128.00, 98.00, 85.00, 50.00, 150, 0, 20, '挂', '["/uploads/fireworks/firework-box-3.jpg"]', 'ACTIVE', 345, 11, NOW(), NOW()),

(12, '步步高升 10000响大地红', '万响鞭炮王，燃放时间超长，声势浩大气氛满分', 5, 258.00, 198.00, 168.00, 100.00, 80, 0, 10, '挂', '["/uploads/fireworks/firework-box-1.jpg"]', 'ACTIVE', 189, 12, NOW(), NOW()),

-- 新春套装
(13, '家庭欢乐装 新春套餐A', '包含：200发组合×1、礼花弹×4、喷花×6、仙女棒×2盒，一家人的快乐', 6, 688.00, 528.00, 468.00, 300.00, 40, 0, 8, '套', '["/uploads/fireworks/firework-combo-1.jpg", "/uploads/fireworks/firework-box-1.jpg"]', 'ACTIVE', 234, 13, NOW(), NOW()),

(14, '豪华婚庆装 新春套餐B', '包含：300发组合×2、礼花弹×8、舞台喷花×12、心形仙女棒×5盒，婚礼专属', 6, 2888.00, 2288.00, 1988.00, 1300.00, 25, 0, 5, '套', '["/uploads/fireworks/firework-display-1.jpg", "/uploads/fireworks/firework-effect-1.jpg"]', 'ACTIVE', 78, 14, NOW(), NOW()),

(15, '企业至尊装 新春套餐C', '包含：500发组合×3、礼花弹×20、大地红×5挂、舞台喷花×20，年会盛典首选', 6, 8888.00, 6888.00, 5888.00, 4000.00, 10, 0, 2, '套', '["/uploads/fireworks/firework-box-2.jpg", "/uploads/fireworks/firework-box-3.jpg"]', 'ACTIVE', 23, 15, NOW(), NOW());

-- ===============================================
-- 4. 创建代理商
-- ===============================================
-- 一级代理商
INSERT INTO agents (id, name, phone, password, type, status, balance, totalCommission, inviteCode, parentId, createdAt, updatedAt) VALUES
(1, '张明华', '13800138001', '$2b$10$example.hash.for.demo.only123', 'LEVEL1', 'ACTIVE', 15680.00, 45230.00, 'ZMH001', NULL, DATE_SUB(NOW(), INTERVAL 180 DAY), NOW()),
(2, '李建国', '13800138002', '$2b$10$example.hash.for.demo.only123', 'LEVEL1', 'ACTIVE', 8960.00, 32180.00, 'LJG002', NULL, DATE_SUB(NOW(), INTERVAL 150 DAY), NOW()),
(3, '王秀英', '13800138003', '$2b$10$example.hash.for.demo.only123', 'LEVEL1', 'ACTIVE', 22450.00, 56780.00, 'WXY003', NULL, DATE_SUB(NOW(), INTERVAL 120 DAY), NOW());

-- 二级代理商
INSERT INTO agents (id, name, phone, password, type, status, balance, totalCommission, inviteCode, parentId, createdAt, updatedAt) VALUES
(4, '赵志强', '13800138004', '$2b$10$example.hash.for.demo.only123', 'LEVEL2', 'ACTIVE', 3280.00, 12560.00, 'ZZQ004', 1, DATE_SUB(NOW(), INTERVAL 90 DAY), NOW()),
(5, '刘美玲', '13800138005', '$2b$10$example.hash.for.demo.only123', 'LEVEL2', 'ACTIVE', 4560.00, 18920.00, 'LML005', 1, DATE_SUB(NOW(), INTERVAL 85 DAY), NOW()),
(6, '陈大伟', '13800138006', '$2b$10$example.hash.for.demo.only123', 'LEVEL2', 'ACTIVE', 2890.00, 9680.00, 'CDW006', 2, DATE_SUB(NOW(), INTERVAL 75 DAY), NOW()),
(7, '杨晓燕', '13800138007', '$2b$10$example.hash.for.demo.only123', 'LEVEL2', 'ACTIVE', 5120.00, 21350.00, 'YXY007', 3, DATE_SUB(NOW(), INTERVAL 60 DAY), NOW());

-- 三级代理商
INSERT INTO agents (id, name, phone, password, type, status, balance, totalCommission, inviteCode, parentId, createdAt, updatedAt) VALUES
(8, '周小明', '13800138008', '$2b$10$example.hash.for.demo.only123', 'LEVEL3', 'ACTIVE', 860.00, 3250.00, 'ZXM008', 4, DATE_SUB(NOW(), INTERVAL 45 DAY), NOW()),
(9, '吴丽娟', '13800138009', '$2b$10$example.hash.for.demo.only123', 'LEVEL3', 'ACTIVE', 1280.00, 4680.00, 'WLJ009', 5, DATE_SUB(NOW(), INTERVAL 40 DAY), NOW()),
(10, '郑伟杰', '13800138010', '$2b$10$example.hash.for.demo.only123', 'LEVEL3', 'ACTIVE', 720.00, 2890.00, 'ZWJ010', 6, DATE_SUB(NOW(), INTERVAL 35 DAY), NOW());

-- 批发商
INSERT INTO agents (id, name, phone, password, type, status, balance, totalCommission, inviteCode, parentId, createdAt, updatedAt) VALUES
(11, '鼎盛烟花批发', '13800138011', '$2b$10$example.hash.for.demo.only123', 'WHOLESALE', 'ACTIVE', 0.00, 0.00, 'DSHF11', NULL, DATE_SUB(NOW(), INTERVAL 100 DAY), NOW()),
(12, '顺发烟火商行', '13800138012', '$2b$10$example.hash.for.demo.only123', 'WHOLESALE', 'ACTIVE', 0.00, 0.00, 'SFYH12', NULL, DATE_SUB(NOW(), INTERVAL 80 DAY), NOW());

-- ===============================================
-- 5. 创建订单
-- ===============================================
-- 已完成订单
INSERT INTO orders (id, orderNo, agentId, totalAmount, depositAmount, paidAmount, status, depositPaid, fullPaid, needTransfer, transferFee, transferFeeConfirmed, pickupCode, contactName, contactPhone, remark, createdAt, updatedAt, warehouseVerifiedAt) VALUES
(1, 'MQ20260101001', 4, 2888.00, 1000.00, 2888.00, 'completed', 1, 1, 0, 0.00, 0, '123456', '赵志强', '13800138004', '春节备货', DATE_SUB(NOW(), INTERVAL 10 DAY), NOW(), DATE_SUB(NOW(), INTERVAL 8 DAY)),
(2, 'MQ20260101002', 5, 1576.00, 500.00, 1576.00, 'completed', 1, 1, 0, 0.00, 0, '234567', '刘美玲', '13800138005', '婚庆用品', DATE_SUB(NOW(), INTERVAL 9 DAY), NOW(), DATE_SUB(NOW(), INTERVAL 7 DAY)),
(3, 'MQ20260102001', 8, 688.00, 200.00, 688.00, 'completed', 1, 1, 0, 0.00, 0, '345678', '周小明', '13800138008', '家庭自用', DATE_SUB(NOW(), INTERVAL 8 DAY), NOW(), DATE_SUB(NOW(), INTERVAL 6 DAY)),
(4, 'MQ20260102002', 6, 8888.00, 3000.00, 8888.00, 'completed', 1, 1, 1, 200.00, 1, '456789', '陈大伟', '13800138006', '企业年会订购', DATE_SUB(NOW(), INTERVAL 7 DAY), NOW(), DATE_SUB(NOW(), INTERVAL 5 DAY)),
(5, 'MQ20260103001', 9, 456.00, 200.00, 456.00, 'completed', 1, 1, 0, 0.00, 0, '567890', '吴丽娟', '13800138009', '', DATE_SUB(NOW(), INTERVAL 6 DAY), NOW(), DATE_SUB(NOW(), INTERVAL 4 DAY));

-- 待提货订单
INSERT INTO orders (id, orderNo, agentId, totalAmount, depositAmount, paidAmount, status, depositPaid, fullPaid, needTransfer, transferFee, transferFeeConfirmed, pickupCode, contactName, contactPhone, remark, createdAt, updatedAt) VALUES
(6, 'MQ20260105001', 7, 2888.00, 1000.00, 2888.00, 'pending_pickup', 1, 1, 0, 0.00, 0, '678901', '杨晓燕', '13800138007', '客户急用', DATE_SUB(NOW(), INTERVAL 3 DAY), NOW()),
(7, 'MQ20260105002', 10, 1288.00, 500.00, 1288.00, 'pending_pickup', 1, 1, 0, 0.00, 0, '789012', '郑伟杰', '13800138010', '', DATE_SUB(NOW(), INTERVAL 2 DAY), NOW());

-- 备货中订单
INSERT INTO orders (id, orderNo, agentId, totalAmount, depositAmount, paidAmount, status, depositPaid, fullPaid, needTransfer, transferFee, transferFeeConfirmed, pickupCode, contactName, contactPhone, remark, createdAt, updatedAt) VALUES
(8, 'MQ20260106001', 4, 5776.00, 2000.00, 5776.00, 'preparing', 1, 1, 0, 0.00, 0, NULL, '赵志强', '13800138004', '分批发货', DATE_SUB(NOW(), INTERVAL 1 DAY), NOW()),
(9, 'MQ20260106002', 11, 17664.00, 5000.00, 17664.00, 'preparing', 1, 1, 1, 300.00, 1, NULL, '鼎盛烟花批发', '13800138011', '批发订单', DATE_SUB(NOW(), INTERVAL 1 DAY), NOW());

-- 待付款订单
INSERT INTO orders (id, orderNo, agentId, totalAmount, depositAmount, paidAmount, status, depositPaid, fullPaid, needTransfer, transferFee, transferFeeConfirmed, pickupCode, contactName, contactPhone, remark, createdAt, updatedAt) VALUES
(10, 'MQ20260107001', 5, 1376.00, 500.00, 0.00, 'pending_payment', 0, 0, 0, 0.00, 0, NULL, '刘美玲', '13800138005', '', NOW(), NOW()),
(11, 'MQ20260107002', 8, 888.00, 300.00, 300.00, 'pending_payment', 1, 0, 0, 0.00, 0, NULL, '周小明', '13800138008', '定金已付', NOW(), NOW());

-- 待接单订单
INSERT INTO orders (id, orderNo, agentId, totalAmount, depositAmount, paidAmount, status, depositPaid, fullPaid, needTransfer, transferFee, transferFeeConfirmed, pickupCode, contactName, contactPhone, remark, createdAt, updatedAt) VALUES
(12, 'MQ20260107003', 6, 2576.00, 800.00, 2576.00, 'pending_accept', 1, 1, 0, 0.00, 0, NULL, '陈大伟', '13800138006', '', NOW(), NOW());

-- ===============================================
-- 6. 创建订单商品明细
-- ===============================================
-- 订单1: 500发至尊组合 ×1
INSERT INTO order_items (orderId, productId, productName, productImage, price, quantity) VALUES
(1, 3, '老板发财 500发至尊组合', '/uploads/fireworks/firework-box-3.jpg', 2288.00, 1),
(1, 7, '梦幻喷泉 舞台喷花', '/uploads/fireworks/firework-display-1.jpg', 48.00, 10),
(1, 9, '星光闪烁 仙女棒50支装', '/uploads/fireworks/firework-combo-1.jpg', 28.00, 2);

-- 订单2: 婚庆套装
INSERT INTO order_items (orderId, productId, productName, productImage, price, quantity) VALUES
(2, 2, '烟火王朝 300发顶级组合', '/uploads/fireworks/firework-box-2.jpg', 988.00, 1),
(2, 6, '彩虹之巅 12发礼花弹', '/uploads/fireworks/firework-effect-2.png', 298.00, 2);

-- 订单3: 家庭套装
INSERT INTO order_items (orderId, productId, productName, productImage, price, quantity) VALUES
(3, 13, '家庭欢乐装 新春套餐A', '/uploads/fireworks/firework-combo-1.jpg', 528.00, 1),
(3, 4, '特战加特林 1688型', '/uploads/fireworks/firework-tube-1.jpg', 128.00, 1);

-- 订单4: 企业年会
INSERT INTO order_items (orderId, productId, productName, productImage, price, quantity) VALUES
(4, 15, '企业至尊装 新春套餐C', '/uploads/fireworks/firework-box-2.jpg', 6888.00, 1),
(4, 12, '步步高升 10000响大地红', '/uploads/fireworks/firework-box-1.jpg', 198.00, 10);

-- 订单5
INSERT INTO order_items (orderId, productId, productName, productImage, price, quantity) VALUES
(5, 4, '特战加特林 1688型', '/uploads/fireworks/firework-tube-1.jpg', 128.00, 2),
(5, 8, '金色年华 手持喷花', '/uploads/fireworks/firework-combo-1.jpg', 18.00, 10);

-- 订单6
INSERT INTO order_items (orderId, productId, productName, productImage, price, quantity) VALUES
(6, 14, '豪华婚庆装 新春套餐B', '/uploads/fireworks/firework-display-1.jpg', 2288.00, 1),
(6, 7, '梦幻喷泉 舞台喷花', '/uploads/fireworks/firework-display-1.jpg', 48.00, 10);

-- 订单7
INSERT INTO order_items (orderId, productId, productName, productImage, price, quantity) VALUES
(7, 2, '烟火王朝 300发顶级组合', '/uploads/fireworks/firework-box-2.jpg', 988.00, 1),
(7, 5, '金龙腾飞 礼花弹8发装', '/uploads/fireworks/firework-effect-1.jpg', 218.00, 1);

-- 订单8
INSERT INTO order_items (orderId, productId, productName, productImage, price, quantity) VALUES
(8, 3, '老板发财 500发至尊组合', '/uploads/fireworks/firework-box-3.jpg', 2288.00, 2),
(8, 11, '开门红 5000响电光炮', '/uploads/fireworks/firework-box-3.jpg', 98.00, 10);

-- 订单9: 批发
INSERT INTO order_items (orderId, productId, productName, productImage, price, quantity) VALUES
(9, 1, '七彩祥云 200发豪华组合', '/uploads/fireworks/firework-box-1.jpg', 588.00, 30);

-- 订单10
INSERT INTO order_items (orderId, productId, productName, productImage, price, quantity) VALUES
(10, 1, '七彩祥云 200发豪华组合', '/uploads/fireworks/firework-box-1.jpg', 666.00, 2);

-- 订单11
INSERT INTO order_items (orderId, productId, productName, productImage, price, quantity) VALUES
(11, 1, '七彩祥云 200发豪华组合', '/uploads/fireworks/firework-box-1.jpg', 666.00, 1),
(11, 9, '星光闪烁 仙女棒50支装', '/uploads/fireworks/firework-combo-1.jpg', 28.00, 5);

-- 订单12
INSERT INTO order_items (orderId, productId, productName, productImage, price, quantity) VALUES
(12, 2, '烟火王朝 300发顶级组合', '/uploads/fireworks/firework-box-2.jpg', 988.00, 2),
(12, 7, '梦幻喷泉 舞台喷花', '/uploads/fireworks/firework-display-1.jpg', 48.00, 10);

-- ===============================================
-- 7. 创建分润记录
-- ===============================================
INSERT INTO commissions (orderId, agentId, type, rate, amount, status, settledAt) VALUES
-- 订单1的分润 (赵志强下单，张明华获得直接分润)
(1, 1, 'DIRECT', 15.00, 433.20, 'SETTLED', DATE_SUB(NOW(), INTERVAL 9 DAY)),
-- 订单2的分润 (刘美玲下单，张明华获得直接分润)
(2, 1, 'DIRECT', 15.00, 236.40, 'SETTLED', DATE_SUB(NOW(), INTERVAL 8 DAY)),
-- 订单3的分润 (周小明下单，赵志强获得直接分润，张明华获得间接分润)
(3, 4, 'DIRECT', 10.00, 68.80, 'SETTLED', DATE_SUB(NOW(), INTERVAL 7 DAY)),
(3, 1, 'INDIRECT', 2.00, 13.76, 'SETTLED', DATE_SUB(NOW(), INTERVAL 7 DAY)),
-- 订单4的分润 (陈大伟下单，李建国获得直接分润)
(4, 2, 'DIRECT', 15.00, 1333.20, 'SETTLED', DATE_SUB(NOW(), INTERVAL 6 DAY)),
-- 订单5的分润 (吴丽娟下单，刘美玲获得直接分润，张明华获得间接分润)
(5, 5, 'DIRECT', 10.00, 45.60, 'SETTLED', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(5, 1, 'INDIRECT', 2.00, 9.12, 'SETTLED', DATE_SUB(NOW(), INTERVAL 5 DAY));

-- ===============================================
-- 8. 创建轮播图
-- ===============================================
INSERT INTO banners (id, title, subtitle, imageUrl, linkType, linkValue, sortOrder, status, updatedAt) VALUES
(1, '新春特惠', '烟花盛典 点亮你的夜空', '/uploads/fireworks/firework-lihua.jpg', 'PAGE', '/pages/products/index', 1, 'ACTIVE', NOW()),
(2, '热销组合', '爆款推荐 品质保证', '/uploads/fireworks/firework-spark-1.jpg', 'PAGE', '/pages/products/index?category=1', 2, 'ACTIVE', NOW()),
(3, '婚庆专区', '浪漫婚礼 让爱绽放', '/uploads/fireworks/firework-night-1.jpg', 'PAGE', '/pages/products/index?category=6', 3, 'ACTIVE', NOW()),
(4, '璀璨新春', '烟花盛典 点亮你的夜空', '/uploads/fireworks/firework-golden.jpg', 'PAGE', '/pages/products/index?category=2', 4, 'ACTIVE', NOW()),
(5, '浪漫时刻', '婚庆专属 让爱绽放', '/uploads/fireworks/firework-spark-2.jpg', 'PAGE', '/pages/products/index?category=6', 5, 'ACTIVE', NOW());

-- H5轮播图
INSERT INTO h5_banners (id, title, imageUrl, linkType, linkValue, sort, status, createdBy, updatedAt) VALUES
(1, '新春烟花盛典', '/uploads/fireworks/firework-lihua.jpg', 'PAGE', '/products', 1, 'ACTIVE', 1, NOW()),
(2, '组合烟花特惠', '/uploads/fireworks/firework-spark-1.jpg', 'PAGE', '/products?category=1', 2, 'ACTIVE', 1, NOW()),
(3, '璀璨夜空', '/uploads/fireworks/firework-night-1.jpg', 'PAGE', '/products?category=1', 3, 'ACTIVE', 1, NOW()),
(4, '金色年华', '/uploads/fireworks/firework-golden.jpg', 'PAGE', '/products?category=3', 4, 'ACTIVE', 1, NOW()),
(5, '浪漫烟火', '/uploads/fireworks/firework-spark-2.jpg', 'PAGE', '/products?category=2', 5, 'ACTIVE', 1, NOW());

-- H5公告
INSERT INTO h5_notices (id, title, content, type, status, sort, createdBy, updatedAt) VALUES
(1, '2026新春特惠', '即日起至正月十五，全场烟花爆竹享受超值优惠！组合烟花低至6折起，礼花弹买三送一，还有神秘福袋等你来拿！', 'ACTIVITY', 'ACTIVE', 1, 1, NOW()),
(2, '新春促销活动', '春节大促！全场商品满399元立享15%分润，赶快下单吧！', 'ACTIVITY', 'ACTIVE', 2, 1, NOW()),
(3, 'VIP移库服务上线', '为方便远程代理商，我们推出VIP移库服务！专业货管送货上门，省心省力，详情请咨询客服13190531439', 'NOTICE', 'ACTIVE', 3, 1, NOW()),
(4, '安全燃放提醒', '燃放烟花爆竹请注意：1.选择空旷场地 2.远离易燃物品 3.儿童需成人陪同 4.遵守当地燃放规定。祝您新春快乐！', 'NOTICE', 'ACTIVE', 4, 1, NOW()),
(5, '门店地址', '呼和浩特市和林格尔县盛乐镇姑子板村华门世家1号门面房，欢迎到店选购！营业时间：8:00-22:00', 'NOTICE', 'ACTIVE', 5, 1, NOW());

-- ===============================================
-- 9. 创建推荐商品
-- ===============================================
INSERT INTO recommend_products (id, productId, type, sortOrder, status, updatedAt) VALUES
(1, 1, 'HOT', 1, 'ACTIVE', NOW()),
(2, 3, 'HOT', 2, 'ACTIVE', NOW()),
(3, 4, 'HOT', 3, 'ACTIVE', NOW()),
(4, 5, 'HOT', 4, 'ACTIVE', NOW()),
(5, 6, 'HOT', 5, 'ACTIVE', NOW()),
(6, 13, 'NEW', 1, 'ACTIVE', NOW()),
(7, 14, 'NEW', 2, 'ACTIVE', NOW()),
(8, 15, 'NEW', 3, 'ACTIVE', NOW()),
(9, 7, 'NEW', 4, 'ACTIVE', NOW()),
(10, 8, 'NEW', 5, 'ACTIVE', NOW()),
(11, 9, 'NEW', 6, 'ACTIVE', NOW()),
(12, 10, 'NEW', 7, 'ACTIVE', NOW());

-- H5推荐商品
INSERT INTO h5_recommend_products (id, productId, type, sort, status, createdBy, updatedAt) VALUES
(1, 1, 'HOT', 1, 'ACTIVE', 1, NOW()),
(2, 2, 'HOT', 2, 'ACTIVE', 1, NOW()),
(3, 3, 'HOT', 3, 'ACTIVE', 1, NOW()),
(4, 4, 'HOT', 4, 'ACTIVE', 1, NOW()),
(5, 13, 'RECOMMEND', 1, 'ACTIVE', 1, NOW()),
(6, 14, 'RECOMMEND', 2, 'ACTIVE', 1, NOW()),
(7, 5, 'RECOMMEND', 3, 'ACTIVE', 1, NOW()),
(8, 6, 'RECOMMEND', 4, 'ACTIVE', 1, NOW()),
(9, 7, 'NEW', 1, 'ACTIVE', 1, NOW()),
(10, 8, 'NEW', 2, 'ACTIVE', 1, NOW()),
(11, 9, 'NEW', 3, 'ACTIVE', 1, NOW());

-- ===============================================
-- 完成
-- ===============================================
SELECT '展示数据初始化完成！' as message;
SELECT CONCAT('商品数量: ', COUNT(*)) as info FROM products;
SELECT CONCAT('代理商数量: ', COUNT(*)) as info FROM agents;
SELECT CONCAT('订单数量: ', COUNT(*)) as info FROM orders;

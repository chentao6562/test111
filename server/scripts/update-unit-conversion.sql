-- 更新商品单位换算数据
-- 2026-01-17

-- 娱乐类 - 棒棒糖系列 (unit=个)
-- 小型棒棒糖: 1件=50个
UPDATE products SET purchaseUnit = '件', unitConversion = 50 WHERE id = 1086;  -- 棒棒糖
UPDATE products SET purchaseUnit = '件', unitConversion = 36 WHERE id = 1092;  -- 超级棒棒糖
UPDATE products SET purchaseUnit = '件', unitConversion = 24 WHERE id = 1093;  -- 网红棒棒糖
UPDATE products SET purchaseUnit = '件', unitConversion = 12 WHERE id = 1094;  -- 王者无敌棒棒糖

-- 娱乐类 - 仙女棒系列 (unit=盒)
-- 仙女棒: 1件=42盒
UPDATE products SET purchaseUnit = '件', unitConversion = 42 WHERE id = 1087;  -- 18寸魔法仙女棒
UPDATE products SET purchaseUnit = '件', unitConversion = 42 WHERE id = 1088;  -- 28寸魔法仙女棒
UPDATE products SET purchaseUnit = '件', unitConversion = 36 WHERE id = 1089;  -- 36寸魔法仙女棒

-- 娱乐类 - 变色系列 (unit=盒)
UPDATE products SET purchaseUnit = '件', unitConversion = 36 WHERE id = 1090;  -- 精彩四变色
UPDATE products SET purchaseUnit = '件', unitConversion = 24 WHERE id = 1091;  -- 超级变变变

-- 彩花类 (unit=个/盒)
UPDATE products SET purchaseUnit = '件', unitConversion = 24 WHERE id = 1095;  -- 精灵布布
UPDATE products SET purchaseUnit = '件', unitConversion = 36 WHERE id = 1096;  -- 水母派对
UPDATE products SET purchaseUnit = '件', unitConversion = 36 WHERE id = 1097;  -- 星际水母带接驳器
UPDATE products SET purchaseUnit = '件', unitConversion = 24 WHERE id = 1098;  -- 蘑菇精灵
UPDATE products SET purchaseUnit = '件', unitConversion = 12 WHERE id = 1099;  -- 孔雀开屏
UPDATE products SET purchaseUnit = '件', unitConversion = 6 WHERE id = 1100;   -- 飞天孔雀
UPDATE products SET purchaseUnit = '件', unitConversion = 8 WHERE id = 1101;   -- 星空孔雀
UPDATE products SET purchaseUnit = '件', unitConversion = 12 WHERE id = 1102;  -- 炫彩三分钟
UPDATE products SET purchaseUnit = '件', unitConversion = 10 WHERE id = 1103;  -- 黄金三分钟
UPDATE products SET purchaseUnit = '件', unitConversion = 12 WHERE id = 1104;  -- 卡通系列—西游记

-- 网红加特林类 (unit=个)
UPDATE products SET purchaseUnit = '件', unitConversion = 20 WHERE id = 1105;  -- 迷你加特林
UPDATE products SET purchaseUnit = '件', unitConversion = 12 WHERE id = 1106;  -- 极速英雄加特林
UPDATE products SET purchaseUnit = '件', unitConversion = 12 WHERE id = 1107;  -- 幻影加特林
UPDATE products SET purchaseUnit = '件', unitConversion = 8 WHERE id = 1108;   -- 七彩加特林
UPDATE products SET purchaseUnit = '件', unitConversion = 12 WHERE id = 1109;  -- 悟空加特林

-- 儿童套餐 (unit=礼盒)
-- 礼盒类按个卖，1件=1礼盒
UPDATE products SET purchaseUnit = '件', unitConversion = 1 WHERE id = 1110;   -- 欢乐宝盒

-- 家用礼花 (unit=箱)
-- 大型礼花按箱卖，1件=1箱
UPDATE products SET purchaseUnit = '件', unitConversion = 1 WHERE id = 1111;   -- 20发缤纷溢彩

-- 验证更新
SELECT id, name, unit, purchaseUnit, unitConversion
FROM products
WHERE status = 'ACTIVE'
ORDER BY id;

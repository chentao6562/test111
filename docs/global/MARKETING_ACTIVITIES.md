# 营销活动体系文档

**版本**: v1.1 | **更新**: 2026-01-27 | **状态**: 生产就绪

本文档详细说明蒙庆烟花2026春节营销活动的完整体系，包括砍价、拼团、现金大转盘、限时锁价、闪购秒杀和代金券激励六大核心模块。

---

## 一、活动体系概览

### 1.1 六大营销活动

| 活动类型 | 面向对象 | 核心玩法 | 上线时间 |
|---------|---------|---------|---------|
| 砍价活动 | 客户 | 邀请好友帮砍降价 | 2026-01-22 |
| 拼团到店 | 客户 | 多人成团享赠品 | 2026-01-21 |
| 现金大转盘 | 推销员 | 抽奖积攒碎片兑换 | 2026-01-23 |
| 限时锁价 | 客户 | 锁定当前价格24小时 | 2026-01-21 |
| 闪购秒杀 | 客户 | 限时限量特价商品 | 2026-01-19 |
| 代金券激励 | 推销员 | 多种奖励发放代金券 | 2026-01-18 |

### 1.2 活动目标

- **拉新裂变**：通过砍价、拼团、转盘助力吸引新用户
- **激活推销员**：代金券激励刺激推销员活跃度
- **促进成交**：秒杀、锁价降低决策门槛
- **提升客单价**：拼团赠品、秒杀加购门槛

### 1.3 活动排斥规则总结【2026-01-27新增】

不同商品类型参与营销活动的限制：

| 商品类型 | 砍价 | 拼团 | 锁价 | 秒杀 | 满赠 |
|---------|:----:|:----:|:----:|:----:|:----:|
| 普通商品 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 特价商品 | ❌ | ❌ | ❌ | ❌ | ✅ |
| 套餐 | ❌ | ❌ | ❌ | ❌ | ✅ |

**说明**：
- 特价商品（`isSpecialPrice=true`）本身已是优惠价，不再参与二次优惠
- 套餐作为组合商品，价格体系独立，不参与单品活动
- 满赠活动按金额计算，不受商品类型限制

---

## 二、砍价活动

### 2.1 业务规则

**核心流程**：
1. 客户在砍价商品页选择商品发起砍价
2. 系统生成唯一砍价码和分享链接
3. 客户邀请好友帮忙砍价（每人只能帮砍一次）
4. 每次帮砍随机减少一定金额
5. 砍到底价后可下单购买
6. 未砍到底价也可按当前价下单

**价格规则**：
- 原价(originalPrice)：商品零售价
- 底价(floorPrice)：可砍到的最低价格
- 当前价(currentPrice)：原价 - 累计已砍金额

**砍价金额计算**：
```javascript
// 基础砍价金额 = (原价 - 底价) / 最大砍价次数 × (0.8 ~ 1.2随机系数)
const baseCut = (originalPrice - floorPrice) / maxBargainCount
const cutAmount = baseCut * (0.8 + Math.random() * 0.4)

// 新用户加成
if (isNewUser) {
  cutAmount *= newUserBonus  // 默认2倍
}

// 确保不低于底价
currentPrice = Math.max(floorPrice, currentPrice - cutAmount)
```

### 2.2 配置参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| bargainHours | 砍价有效期（小时） | 24 |
| minBargainCount | 达到底价最少人数 | 3 |
| maxBargainCount | 最多砍价次数 | 20 |
| newUserBonus | 新用户额外加成倍数 | 2 |
| minCartAmount | 采购单最低金额门槛 | 0 |

### 2.3 成本承担配置

| costBearerType | 说明 |
|----------------|------|
| PLATFORM | 平台（总代理）承担全部 |
| SHARED | 推销员和平台按比例承担 |
| AGENT | 推销员承担全部 |

### 2.4 状态流转

```
BARGAINING(砍价中)
    ↓ 砍到底价
SUCCESS(砍价成功)
    ↓ 提交预约
ORDERED(已下单)

BARGAINING → EXPIRED(已过期)  [超过有效期未下单]
BARGAINING → CANCELLED(已取消)  [用户主动取消]
```

### 2.5 风控策略

- 同一用户同一砍价活动只能帮砍一次
- 记录IP地址和设备ID
- 支持黑名单机制（手机号/IP/设备）
- 封禁支持永久或限时

### 2.6 数据表

| 表名 | 用途 |
|------|------|
| bargain_configs | 砍价活动配置 |
| bargain_config_items | 砍价商品配置 |
| bargains | 用户发起的砍价 |
| bargain_cuts | 砍价记录详情 |
| bargain_blacklists | 风控黑名单 |

### 2.7 API端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/bargain/products` | GET | 获取砍价商品列表 |
| `/api/bargain/start` | POST | 发起砍价 |
| `/api/bargain/:code` | GET | 获取砍价详情 |
| `/api/bargain/:code/cut` | POST | 帮好友砍价 |
| `/api/bargain/:code/order` | POST | 砍价商品加入采购单 |
| `/api/bargain/my` | GET | 我的砍价列表 |
| `/api/admin/bargain/configs` | GET/POST | 管理后台配置 |
| `/api/admin/bargain/list` | GET | 砍价数据列表 |

---

## 三、拼团活动

### 3.1 业务规则

**核心流程**：
1. 发起人创建拼团，选择门店和提货日期
2. 系统生成拼团码和分享链接
3. 邀请好友加入拼团（需提交预约）
4. 达到成团人数后拼团成功
5. 所有成员按约定日期到店提货
6. 成团成功可获得额外赠品

**拼团规则**：
- 同一门店、同一提货日期
- 每人预约金额需达到最低门槛
- 成团时间限制（默认24小时）
- 支持顺路拼团（按区域匹配）

### 3.2 配置参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| requiredCount | 成团人数 | 3 |
| minAmount | 单人最低预约金额 | 配置 |
| bonusGiftName | 拼团赠品名称 | 配置 |
| bonusGiftCost | 赠品成本 | 配置 |
| formingHours | 组团有效期（小时） | 24 |

### 3.3 状态流转

```
FORMING(组队中)
    ↓ 人数达标
FULL(已满员)
    ↓ 所有人提货完成
COMPLETED(已完成)

FORMING → EXPIRED(已过期)  [超过有效期未成团]
任意状态 → CANCELLED(已取消)  [管理员取消]
```

### 3.4 顺路拼团

支持按区域（乡镇/街道）匹配附近的拼团：
- 选择区域后显示该区域进行中的拼团
- 加入顺路拼团无需发起人邀请

### 3.5 数据表

| 表名 | 用途 |
|------|------|
| group_buy_configs | 拼团活动配置 |
| group_buys | 拼团活动记录 |
| group_buy_members | 拼团成员 |

### 3.6 API端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/group-buy/start` | POST | 发起拼团 |
| `/api/group-buy/:code` | GET | 获取拼团详情 |
| `/api/group-buy/:code/join` | POST | 加入拼团 |
| `/api/group-buy/nearby` | GET | 获取附近拼团（顺路拼团） |
| `/api/group-buy/my` | GET | 我的拼团列表 |
| `/api/store/group-buy/:code/pickup` | POST | 门店核销拼团成员 |

---

## 四、现金大转盘

### 4.1 业务规则

**核心玩法**：
1. 推销员进入转盘页面，每日有免费抽奖次数
2. 抽奖获得金额碎片（0.01元~小额）
3. 邀请好友助力可获得额外碎片
4. 碎片累计达到门槛可兑换代金券
5. 碎片有过期时间，过期清零

**抽奖规则**：
- 每日免费抽奖次数（默认3次）
- 分享获得额外次数（默认2次）
- 每日最多被助力次数（默认10次）

**助力规则**：
- 新用户助力金额较高（3~5元）
- 老用户助力金额较低（0.01~0.5元）
- 同一用户只能给同一人助力一次

### 4.2 配置参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| prizePool | 奖池配置（JSON） | 配置 |
| redeemThreshold | 兑换门槛 | 100元 |
| freeSpinCount | 每日免费抽奖次数 | 3 |
| shareSpinCount | 分享可获得次数 | 2 |
| maxDailyHelp | 每日最多被助力次数 | 10 |
| newUserHelpMin/Max | 新用户助力金额范围 | 3~5元 |
| oldUserHelpMin/Max | 老用户助力金额范围 | 0.01~0.5元 |
| fragmentExpireDays | 碎片过期天数 | 7天 |

### 4.3 奖池配置示例

```json
[
  {"name": "0.01元", "amount": 0.01, "weight": 50},
  {"name": "0.1元", "amount": 0.1, "weight": 30},
  {"name": "0.5元", "amount": 0.5, "weight": 15},
  {"name": "1元", "amount": 1, "weight": 4},
  {"name": "5元", "amount": 5, "weight": 1}
]
```

### 4.4 状态说明

**参与记录状态**：跟踪用户累计金额、抽奖次数、今日统计

**兑换状态**：
- PENDING: 处理中
- SUCCESS: 兑换成功
- FAILED: 兑换失败

### 4.5 风控策略

- 同一用户只能给同一人助力一次
- 记录IP地址和设备ID
- 支持黑名单机制
- 碎片自动过期清理

### 4.6 数据表

| 表名 | 用途 |
|------|------|
| spin_wheel_configs | 转盘活动配置 |
| spin_wheel_participations | 用户参与记录 |
| spin_wheel_records | 抽奖记录 |
| spin_wheel_helps | 助力记录 |
| spin_wheel_redeems | 兑换记录 |
| spin_wheel_blacklists | 风控黑名单 |

### 4.7 API端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/spin-wheel/info` | GET | 获取活动信息和参与状态 |
| `/api/spin-wheel/spin` | POST | 抽奖 |
| `/api/spin-wheel/:code/help` | POST | 帮好友助力 |
| `/api/spin-wheel/redeem` | POST | 兑换代金券 |
| `/api/spin-wheel/records` | GET | 抽奖/助力记录 |
| `/api/admin/spin-wheel/config` | GET/PUT | 管理后台配置 |
| `/api/admin/spin-wheel/redeems` | GET | 兑换记录管理 |
| `/api/admin/spin-wheel/blacklist` | GET/POST/DELETE | 黑名单管理 |

---

## 五、限时锁价

### 5.1 业务规则

**核心流程**：
1. 客户浏览商品时可锁定当前价格
2. 系统生成锁价码，记录锁定商品和价格
3. 在有效期内按锁定价格下单
4. 过期后锁价失效

**锁价规则**：
- 锁定期限（默认24小时）
- 可设置最低金额门槛
- 一人可同时有多个锁价

### 5.2 配置参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| lockHours | 锁价有效期（小时） | 24 |
| minAmount | 最低金额门槛 | 无 |

### 5.3 状态说明

| 状态 | 说明 |
|------|------|
| ACTIVE | 有效，可使用 |
| USED | 已使用 |
| EXPIRED | 已过期 |

### 5.4 数据表

| 表名 | 用途 |
|------|------|
| price_lock_configs | 锁价活动配置 |
| price_locks | 锁价记录 |

### 5.5 API端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/price-lock/create` | POST | 创建锁价 |
| `/api/price-lock/:code` | GET | 获取锁价详情 |
| `/api/price-lock/my` | GET | 我的锁价列表 |
| `/api/price-lock/:code/use` | POST | 使用锁价下单 |

---

## 六、闪购秒杀

### 6.1 业务规则

**核心流程**：
1. 管理员配置秒杀活动和商品
2. 活动开始后客户可购买秒杀商品
3. 秒杀商品使用独立库存
4. 支持每人限购配置
5. 秒杀商品需搭配常规商品（加购门槛）

**加购门槛**：秒杀商品需要采购单中其他商品金额达到门槛（默认200元）才能提交预约

### 6.2 配置参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| minOrderAmount | 加购门槛金额 | 200元 |
| flashStock | 秒杀专属库存 | 配置 |
| limitPerUser | 每人限购数量 | 0(不限) |

### 6.3 活动状态

| 状态 | 说明 |
|------|------|
| DRAFT | 草稿 |
| ACTIVE | 进行中 |
| ENDED | 已结束 |

### 6.4 数据表

| 表名 | 用途 |
|------|------|
| flash_sale_activities | 秒杀活动 |
| flash_sale_items | 秒杀商品 |

### 6.5 API端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/h5/flash-sale/active` | GET | 获取进行中的秒杀活动 |
| `/api/h5/flash-sale/:id/products` | GET | 获取秒杀商品列表 |
| `/api/admin/flash-sale` | GET/POST | 管理后台活动管理 |
| `/api/admin/flash-sale/:id/items` | GET/POST/PUT/DELETE | 秒杀商品管理 |

---

## 七、代金券激励体系

### 7.1 奖励类型

#### 即时奖励（一次性）

| 奖励类型 | 金额 | 触发条件 |
|---------|------|---------|
| REGISTER | ¥5 | 新推销员注册 |
| FIRST_SHARE | ¥5 | 首次发圈审核通过 |
| FIRST_RESERVATION | ¥10 | 首次有客户预约 |
| FIRST_COMPLETE | ¥20 | 首次有订单完成 |
| RECRUIT | ¥15 | 邀请新推销员注册 |
| RECRUIT_ACTIVATE | ¥20 | 邀请的推销员激活 |

#### 周期奖励（每周可获得）

| 奖励类型 | 金额 | 触发条件 |
|---------|------|---------|
| WEEK_SALES_3 | ¥30 | 周完成3单 |
| WEEK_SALES_5 | ¥80 | 周完成5单 |
| WEEK_SALES_10 | ¥200 | 周完成10单 |
| WEEK_SHARE_FULL | ¥20 | 7天都有发圈审核通过 |
| WEEK_RECRUIT_3 | ¥50 | 本周拉新≥3人 |

### 7.2 代金券规则

- 有效期：2026年2月14日前
- 使用方式：推销员自用，在门店核销
- 核销流程：门店扫描代金券码

### 7.3 代金券核销成本规则

- 核销时从持有推销员的余额中扣除等额金额
- **允许余额变为负数**：如果余额不足，系统仍会完成核销，余额变为负数
- 负余额会在下次分润结算时自动抵扣

### 7.4 发圈打卡机制

1. 推销员上传朋友圈截图
2. 管理员审核（通过/驳回）
3. 审核通过自动更新周统计
4. 满足条件自动发放奖励

### 7.5 数据表

| 表名 | 用途 |
|------|------|
| coupons | 代金券记录 |
| agent_activities | 推销员活动追踪（即时奖励标记） |
| share_records | 发圈记录 |
| weekly_stats | 周统计数据 |
| coupon_activities | 代金券领取活动 |

### 7.6 API端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/campaign2026/coupons` | GET | 我的代金券列表 |
| `/api/campaign2026/stats` | GET | 奖励进度统计 |
| `/api/share-audit/submit` | POST | 提交发圈审核 |
| `/api/share-audit/my` | GET | 我的发圈记录 |
| `/api/weekly-reward/progress` | GET | 周奖励进度 |
| `/api/store/coupon/redeem` | POST | 门店核销代金券 |
| `/api/admin/coupon-stats` | GET | 代金券统计 |
| `/api/admin/share-audit` | GET | 发圈审核列表 |
| `/api/admin/share-audit/:id/review` | POST | 审核发圈 |

---

## 八、定时任务

| 任务 | 执行时间 | 功能 |
|------|---------|------|
| 拼团过期检查 | 每小时 | 标记过期拼团 |
| 锁价过期检查 | 每小时 | 标记过期锁价 |
| 砍价过期检查 | 每小时 | 标记过期砍价 |
| 转盘碎片过期 | 每天凌晨1:00 | 清理过期碎片 |
| 代金券过期检查 | 每天凌晨1:10 | 标记过期代金券 |
| 周奖励统计 | 每周一凌晨2:00 | 计算并发放周期奖励 |

---

## 九、活动专题页

### 9.1 功能说明

支持配置活动专题页，用于集中展示活动商品：
- 自定义URL标识（slug）
- 顶部Banner图
- 多个商品区块
- 支持网格/列表布局

### 9.2 数据表

| 表名 | 用途 |
|------|------|
| activity_pages | 活动专题页 |
| activity_page_sections | 专题页区块 |

### 9.3 API端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/h5/activity-pages/:slug` | GET | 获取专题页内容 |
| `/api/admin/activity-pages` | GET/POST | 管理专题页 |
| `/api/admin/activity-pages/:id/sections` | GET/POST/PUT/DELETE | 管理区块 |

---

## 十、活动中心汇总

### 10.1 H5活动中心页面

提供统一的活动入口，展示：
- 进行中的秒杀活动
- 进行中的砍价活动
- 进行中的拼团活动
- 代金券领取活动
- 大转盘入口
- 发圈打卡入口

### 10.2 API端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/h5/activity-summary` | GET | 活动汇总（无需登录） |

---

## 十一、特价商品【2026-01-26新增】

### 11.1 定义

特价商品是指 `Product.isSpecialPrice = true` 的商品，通常用于清仓、促销等场景。

### 11.2 特价商品特点

- 价格已经是优惠价格，不参与二次折扣
- 在商品列表/详情页有"特价"标签标识
- 利润计算方式与普通商品相同

### 11.3 营销活动限制

| 活动类型 | 是否参与 | 原因 |
|---------|:-------:|------|
| 砍价活动 | ❌ | 已是优惠价，无砍价空间 |
| 拼团活动 | ❌ | 已是优惠价，无拼团赠品 |
| 限时锁价 | ❌ | 价格已固定，无需锁价 |
| 闪购秒杀 | ❌ | 已是特价，无需秒杀 |
| 满赠活动 | ✅ | 按金额计算，不受影响 |

### 11.4 前端实现

```typescript
// 检查商品是否为特价商品
function isSpecialPriceProduct(product: Product): boolean {
  return product.isSpecialPrice === true
}

// 特价商品不显示砍价/拼团等入口
const showBargainButton = !isSpecialPriceProduct(product) && bargainConfig.enabled
```

---

## 十二、套餐系统【2026-01-25新增】

### 12.1 定义

套餐是预先搭配好的商品组合，作为独立商品销售。

### 12.2 价格体系

```
成本价(costPrice)        ← 总代理从门店的进货成本
    ↓
供货价(supplyPrice)      ← 总代理给一级推销员的拿货价
    ↓
subPrice                 ← 一级给二级的拿货价
    ↓
零售价(retailPrice)      ← 客户支付价格
```

### 12.3 营销活动限制

| 活动类型 | 是否参与 | 原因 |
|---------|:-------:|------|
| 砍价活动 | ❌ | 套餐价格固定，不支持砍价 |
| 拼团活动 | ❌ | 套餐不参与拼团 |
| 限时锁价 | ❌ | 套餐有独立定价机制 |
| 闪购秒杀 | ❌ | 套餐不参与秒杀 |
| 满赠活动 | ✅ | 按订单总金额计算 |

### 12.4 拼接图生成

当套餐没有主图时，系统自动生成拼接图：
- 取套餐中前4个商品的主图
- 按2×2网格排列
- 右下角添加价格爆炸贴（显示建议零售价）

**相关文件**: `h5-agent/src/utils/packageThumbnailGenerator.ts`

---

**文档维护**: Claude AI
**最后更新**: 2026-01-27

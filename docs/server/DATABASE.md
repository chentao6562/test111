# 数据库设计文档 v2.0

蒙庆烟花预约系统完整数据库设计

---

## 一、数据库概览

| 属性 | 值 |
|------|-----|
| 数据库类型 | MySQL 8.0 |
| 服务商 | 阿里云RDS |
| ORM框架 | Prisma |
| Schema文件 | `server/prisma/schema.prisma` |
| 迁移目录 | `server/prisma/migrations/` |
| **总表数** | **72个** |

### 表分类统计

| 分类 | 表数量 | 说明 |
|------|--------|------|
| 用户与认证 | 3 | 推销员、系统用户、验证码 |
| 商品与库存 | 5 | 商品、分类、购物车、库存日志 |
| 预约系统 | 7 | 预约单、预约项、赠品、客户记录等 |
| 推销员体系 | 7 | 定价、奖励、返券、层级、统计 |
| 代金券系统 | 5 | 代金券、活动、发圈记录、周统计 |
| 砍价系统 | 5 | 配置、商品项、砍价单、砍刀、黑名单 |
| 拼团系统 | 4 | 配置、拼团单、成员、区域 |
| 大转盘系统 | 6 | 配置、参与、抽奖、助力、兑换、黑名单 |
| 秒杀与活动 | 4 | 秒杀配置、秒杀商品、限时活动 |
| 锁价系统 | 2 | 锁价配置、锁价记录 |
| 分润与财务 | 6 | 分润规则、分润记录、提现、资金流水 |
| 审计追踪 | 4 | 交易追踪、余额快照、对账、告警 |
| 仓库与门店 | 1 | 仓库/门店信息 |
| 系统配置 | 3 | 配置、操作日志、通用记录 |
| 素材管理 | 5 | 轮播图、推荐商品、公告 |
| 兼容模块 | 5 | 旧订单、移库、零售等 |

---

## 二、核心数据表（按业务分类）

### 2.1 用户与认证（3表）

| 表名 | 中文名 | 主要用途 |
|------|--------|---------|
| **agents** | 推销员表 | 三级推销员体系（总代理/一级/二级） |
| **system_users** | 系统用户表 | 管理员/门店员工账号 |
| **sms_codes** | 短信验证码表 | 登录/注册验证码存储 |

### 2.2 商品与库存（5表）

| 表名 | 中文名 | 主要用途 |
|------|--------|---------|
| **categories** | 商品分类表 | 商品分类管理 |
| **products** | 商品表 | 四级价格体系 + 库存管理 |
| **cart_items** | 采购单表 | 临时采购单存储 |
| **stock_logs** | 库存日志表 | 所有库存变动记录 |
| **warehouse** | 仓库/门店表 | 门店信息管理 |

### 2.3 预约系统（7表）

| 表名 | 中文名 | 主要用途 |
|------|--------|---------|
| **reservations** | 预约单表 | 10种状态流转的预约管理 |
| **reservation_items** | 预约商品表 | 预约商品明细 |
| **reservation_confirm_logs** | 确认日志表 | 电话确认流程跟踪 |
| **gift_tiers** | 赠品档位表 | 阶梯赠品配置 |
| **reservation_gifts** | 预约赠品表 | 预约发放的赠品记录 |
| **customer_records** | 客户记录表 | 客户风控信息 |
| **prepare_reminder_logs** | 备货提醒表 | 备货短信发送记录 |

### 2.4 推销员体系（7表）

| 表名 | 中文名 | 主要用途 |
|------|--------|---------|
| **agent_product_prices** | 推销员定价表 | 推销员商品自定义价格 |
| **balance_logs** | 余额流水表 | 推销员余额变动记录 |
| **team_return_coupons** | 团队返券表 | 团队业绩返券记录 |
| **monthly_team_rewards** | 月度奖励表 | 月度团队奖励发放 |
| **agent_activities** | 推销员活动表 | 推销员参与活动记录 |
| **share_records** | 发圈记录表 | 发圈打卡记录（审核） |
| **weekly_stats** | 周统计表 | 推销员周业绩统计 |

### 2.5 代金券系统（5表）

| 表名 | 中文名 | 主要用途 |
|------|--------|---------|
| **coupons** | 代金券表 | 代金券详细信息 |
| **coupon_activities** | 代金券活动表 | H5代金券活动配置 |
| **coupon_activity_records** | 活动参与表 | 用户参与活动记录 |
| **share_records** | 发圈记录表 | 用于周全勤奖励统计 |
| **weekly_stats** | 周统计表 | 周销售/拉新统计 |

### 2.6 砍价系统（5表）

| 表名 | 中文名 | 主要用途 |
|------|--------|---------|
| **bargain_configs** | 砍价活动配置 | 砍价活动基本设置 |
| **bargain_config_items** | 砍价商品配置 | 活动关联商品和砍价规则 |
| **bargains** | 砍价单表 | 用户发起的砍价记录 |
| **bargain_cuts** | 砍刀记录表 | 每次砍价动作记录 |
| **bargain_blacklists** | 砍价黑名单 | 风控黑名单 |

### 2.7 拼团系统（4表）

| 表名 | 中文名 | 主要用途 |
|------|--------|---------|
| **group_buy_configs** | 拼团活动配置 | 拼团规则设置 |
| **group_buys** | 拼团单表 | 拼团订单记录 |
| **group_buy_members** | 拼团成员表 | 参团人员记录 |
| **regions** | 区域表 | 拼团配送区域 |

### 2.8 大转盘系统（6表）

| 表名 | 中文名 | 主要用途 |
|------|--------|---------|
| **spin_wheel_configs** | 转盘配置表 | 转盘活动配置 |
| **spin_wheel_participations** | 转盘参与表 | 用户参与转盘活动 |
| **spin_wheel_records** | 转盘抽奖表 | 抽奖记录 |
| **spin_wheel_helps** | 转盘助力表 | 好友助力记录 |
| **spin_wheel_redeems** | 转盘兑换表 | 奖品兑换记录 |
| **spin_wheel_blacklists** | 转盘黑名单 | 风控黑名单 |

### 2.9 秒杀与活动（4表）

| 表名 | 中文名 | 主要用途 |
|------|--------|---------|
| **flash_sale_activities** | 秒杀活动表 | 秒杀活动配置 |
| **flash_sale_items** | 秒杀商品表 | 秒杀商品配置 |
| **coupon_activities** | 代金券活动表 | H5代金券活动 |
| **agent_activities** | 活动参与表 | 推销员活动参与 |

### 2.10 锁价系统（2表）

| 表名 | 中文名 | 主要用途 |
|------|--------|---------|
| **price_lock_configs** | 锁价活动配置 | 限时锁价活动设置 |
| **price_locks** | 锁价记录表 | 用户锁价记录 |

### 2.11 分润与财务（6表）

| 表名 | 中文名 | 主要用途 |
|------|--------|---------|
| **commission_rules** | 分润规则表 | 分润比例配置（兼容） |
| **commissions** | 分润记录表 | 分润记录（兼容） |
| **balance_logs** | 余额流水表 | 推销员余额变动 |
| **withdrawals** | 提现申请表 | 推销员提现管理 |
| **recharge_requests** | 充值申请表 | 推销员充值审批 |
| **fund_flows** | 资金流水表 | 所有资金变动记录 |

### 2.12 审计追踪（4表）

| 表名 | 中文名 | 主要用途 |
|------|--------|---------|
| **transaction_traces** | 交易追踪表 | 所有交易全链路追踪 |
| **balance_snapshots** | 余额快照表 | 定期余额快照对账 |
| **reconciliation_logs** | 对账记录表 | 日/周/月对账记录 |
| **audit_alerts** | 审计告警表 | 异常告警记录 |

### 2.13 系统配置（3表）

| 表名 | 中文名 | 主要用途 |
|------|--------|---------|
| **configs** | 系统配置表 | Key-Value配置存储 |
| **audit_logs** | 操作日志表 | 用户操作审计 |
| **warehouse** | 仓库/门店表 | 门店配置信息 |

### 2.14 素材管理（5表）

| 表名 | 中文名 | 主要用途 |
|------|--------|---------|
| **h5_banners** | H5轮播图表 | H5页面轮播图 |
| **h5_recommend_products** | H5推荐商品表 | H5推荐商品配置 |
| **h5_notices** | H5公告表 | 系统公告通知 |
| **banners** | 轮播图表 | 通用轮播图 |
| **recommend_products** | 推荐商品表 | 通用推荐商品 |

### 2.15 兼容模块（5表）

| 表名 | 中文名 | 主要用途 |
|------|--------|---------|
| **orders** | 旧订单表 | 兼容旧订单系统 |
| **order_items** | 旧订单明细表 | 兼容旧订单商品 |
| **transfer_tasks** | 移库任务表 | 旧移库系统 |
| **retail_orders** | 零售订单表 | 门店零售单据 |
| **retail_order_items** | 零售明细表 | 零售商品详情 |

---

## 三、核心表详细设计

### 3.1 agents（推销员表）

**用途**: 存储推销员信息，支持三级推销员体系

**核心字段**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | Int | 主键 |
| phone | String(20) | 手机号（唯一） |
| password | String(255) | 密码（bcrypt加密） |
| name | String(50) | 姓名 |
| type | Enum | LEVEL1(一级)/LEVEL2(二级)/WHOLESALE(散客) |
| status | Enum | PENDING/ACTIVE/DISABLED |
| parentId | Int? | 上级推销员ID（自引用） |
| isMaster | Boolean | 是否为总代理 |
| inviteCode | String(10) | 邀请码（唯一） |

**财务字段**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| balance | Decimal(10,2) | 可提现余额 |
| totalProfit | Decimal(10,2) | 累计利润 |
| totalSales | Decimal(10,2) | 累计销售额 |
| totalOrders | Int | 累计订单数 |

**关系**:
- 自引用：parent/children（推销员层级树）
- 一对多：reservations, balanceLogs, withdrawals
- 一对多：agentProductPrices, coupons, bargains, groupBuys
- 一对多：transactionTraces, balanceSnapshots

**索引**:
- UNIQUE: phone, inviteCode
- INDEX: parentId, type, status, isMaster

---

### 3.2 products（商品表）

**用途**: 商品信息管理，四级价格体系

**核心字段**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | Int | 主键 |
| name | String(100) | 商品名称 |
| description | Text? | 商品描述 |
| barcode | String(50)? | 条形码 |
| images | Text | 图片JSON数组 |
| categoryId | Int? | 所属分类 |
| status | Enum | ACTIVE/INACTIVE/DELETED |

**四级价格体系**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| costPrice | Decimal(10,2) | 成本价（总代理进货成本） |
| supplyPrice | Decimal(10,2) | 供货价（总代理给一级的价） |
| retailPrice | Decimal(10,2) | 建议零售价 |
| masterRetailPrice | Decimal(10,2)? | 总代理的零售价（可选覆盖） |

**库存字段**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| stock | Int | 实际库存 |
| lockStock | Int | 锁定库存（预约未提货） |
| minStock | Int | 最低库存预警 |
| salesCount | Int | 累计销量 |

**计算规则**:
```javascript
// 可用库存 = 实际库存 - 锁定库存
availableStock = stock - lockStock

// 价格层级：costPrice ≤ supplyPrice ≤ subPrice ≤ retailPrice
```

---

### 3.3 reservations（预约单表）

**用途**: 预约管理，支持10种状态流转

**核心字段**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | Int | 主键 |
| reservationNo | String(30) | 预约号（唯一） |
| agentId | Int | 推销员ID |
| totalAmount | Decimal(10,2) | 预约总额 |
| depositAmount | Decimal(10,2) | 定金金额（可选） |

**客户信息**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| customerName | String(50) | 客户姓名 |
| customerPhone | String(20) | 客户电话 |
| pickupDate | String(20) | 预约提货日期 |
| remark | String(255)? | 备注 |

**状态管理**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| status | Int | 状态码（0-9） |
| pickupCode | String(10)? | 提货码 |
| confirmedAt | DateTime? | 确认时间 |
| completedAt | DateTime? | 完成时间 |

**10种预约状态**:

| 状态值 | 状态名 | 说明 |
|--------|--------|------|
| 0 | 待确认 | 新预约，等待门店电话确认 |
| 1 | 确认中 | 门店正在联系客户 |
| 2 | 已确认 | 电话确认成功，等待备货 |
| 3 | 已完成 | 到店付款提货完成 |
| 4 | 已取消 | 客户主动取消 |
| 5 | 已过期 | 确认后3天未到店 |
| 6 | 确认失败 | 3次电话未接通 |
| 7 | 待备货 | 提货前一天，系统提醒备货 |
| 8 | 备货中 | 门店正在备货 |
| 9 | 待提货 | 备货完成，等待客户提货 |

**利润分配字段**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| level2Profit | Decimal(10,2)? | 二级推销员利润 |
| level1Profit | Decimal(10,2)? | 一级推销员利润 |
| masterProfit | Decimal(10,2)? | 总代理利润 |
| giftCost | Decimal(10,2)? | 赠品成本 |
| settledAt | DateTime? | 利润结算时间 |

**关系**:
- 多对一：agent（推销员）
- 多对一：warehouse（门店）
- 一对多：items（预约商品）
- 一对多：gifts（赠品记录）
- 一对多：confirmLogs（确认日志）

**状态流转图**:
```
待确认(0) → 确认中(1) → 已确认(2) → 待备货(7) → 备货中(8) → 待提货(9) → 已完成(3)
                 ├─→ 确认失败(6) [3次未接通]
                 └─→ 已取消(4) [客户取消]
                           └─→ 已过期(5) [3天未到店]
```

---

### 3.4 agent_product_prices（推销员定价表）

**用途**: 推销员自定义商品价格

**核心字段**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | Int | 主键 |
| agentId | Int | 推销员ID |
| productId | Int | 商品ID |
| retailPrice | Decimal(10,2) | 自定义零售价 |
| subPrice | Decimal(10,2)? | 给下级的价格（仅一级可设） |
| isCustomized | Boolean | 是否自定义过 |

**定价规则**:
- 总代理：可设置所有价格
- 一级推销员：retailPrice ≥ supplyPrice，subPrice ≥ supplyPrice
- 二级推销员：retailPrice ≥ 一级设置的subPrice

**关系**:
- 多对一：agent, product
- 唯一约束：@@unique([agentId, productId])

---

### 3.5 coupons（代金券表）

**用途**: 代金券详细信息管理

**核心字段**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | Int | 主键 |
| code | String(20) | 代金券码（唯一） |
| agentId | Int | 持有推销员ID |
| amount | Decimal(10,2) | 面额 |
| type | String(50) | 代金券类型 |
| status | Enum | UNUSED/USED/EXPIRED |
| expireAt | DateTime | 过期时间 |
| usedAt | DateTime? | 使用时间 |
| usedBy | String(50)? | 核销门店员工 |

**代金券类型**:

| 类型 | 说明 | 金额 |
|------|------|------|
| REGISTER | 注册奖励 | ¥5 |
| FIRST_RESERVATION | 首预约奖励 | ¥10 |
| FIRST_COMPLETED | 首单成交奖励 | ¥20 |
| REFERRAL | 拉新奖励 | ¥15 |
| WEEKLY_SALES_3 | 周销售3单 | ¥30 |
| WEEKLY_SALES_5 | 周销售5单 | ¥80 |
| WEEKLY_SALES_10 | 周销售10单 | ¥200 |
| WEEKLY_SHARE | 周发圈全勤 | ¥20 |
| WEEKLY_REFERRAL | 周拉新3人 | ¥50 |

**关系**:
- 多对一：agent（持有人）

---

### 3.6 bargain_configs（砍价活动配置表）

**用途**: 砍价活动基本设置

**核心字段**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | Int | 主键 |
| name | String(100) | 活动名称 |
| description | Text? | 活动描述 |
| startTime | DateTime | 开始时间 |
| endTime | DateTime | 结束时间 |
| status | Enum | DRAFT/ACTIVE/PAUSED/ENDED |
| maxCutsPerBargain | Int | 单次砍价最大刀数 |
| bargainDuration | Int | 砍价有效时长（小时） |
| pickupDeadlineDays | Int | 提货截止天数 |

**关系**:
- 一对多：items（砍价商品配置）
- 一对多：bargains（用户砍价记录）

---

### 3.7 bargains（砍价单表）

**用途**: 用户发起的砍价记录

**核心字段**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | Int | 主键 |
| bargainNo | String(30) | 砍价单号（唯一） |
| configId | Int | 活动配置ID |
| itemId | Int | 商品配置ID |
| agentId | Int | 发起人ID |
| productId | Int | 商品ID |
| originalPrice | Decimal(10,2) | 原价 |
| currentPrice | Decimal(10,2) | 当前价格 |
| floorPrice | Decimal(10,2) | 底价 |
| status | Enum | ONGOING/SUCCESS/EXPIRED/PICKED |
| cutCount | Int | 已砍刀数 |
| expireAt | DateTime | 过期时间 |
| successAt | DateTime? | 砍到底价时间 |
| pickupDeadline | DateTime? | 提货截止时间 |
| pickedAt | DateTime? | 提货时间 |

**状态流转**:
```
发起砍价 → ONGOING（进行中）
   ├─→ 砍到底价 → SUCCESS（砍价成功）→ 提货 → PICKED（已提货）
   └─→ 超时未砍完 → EXPIRED（已过期）
```

**关系**:
- 多对一：config, item, agent, product
- 一对多：cuts（砍刀记录）

---

### 3.8 group_buy_configs（拼团活动配置表）

**用途**: 拼团规则设置

**核心字段**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | Int | 主键 |
| name | String(100) | 活动名称 |
| productId | Int | 商品ID |
| originalPrice | Decimal(10,2) | 原价 |
| groupPrice | Decimal(10,2) | 拼团价 |
| minMembers | Int | 成团人数 |
| maxMembers | Int | 最大人数 |
| duration | Int | 拼团时长（小时） |
| startTime | DateTime | 开始时间 |
| endTime | DateTime | 结束时间 |
| status | Enum | DRAFT/ACTIVE/PAUSED/ENDED |
| maxGroupsPerDay | Int? | 每日最大开团数 |
| totalStock | Int | 活动总库存 |
| soldCount | Int | 已售数量 |

**关系**:
- 多对一：product
- 一对多：groupBuys（拼团订单）

---

### 3.9 group_buys（拼团单表）

**用途**: 拼团订单记录

**核心字段**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | Int | 主键 |
| groupNo | String(30) | 拼团单号（唯一） |
| configId | Int | 活动配置ID |
| leaderId | Int | 团长推销员ID |
| status | Enum | FORMING/SUCCESS/FAILED/COMPLETED |
| memberCount | Int | 当前成员数 |
| expireAt | DateTime | 拼团截止时间 |
| successAt | DateTime? | 成团时间 |
| completedAt | DateTime? | 完成时间（全部提货） |

**状态流转**:
```
开团 → FORMING（组团中）
   ├─→ 达到成团人数 → SUCCESS（拼团成功）→ 全部提货 → COMPLETED
   └─→ 超时未成团 → FAILED（拼团失败）
```

**关系**:
- 多对一：config, leader
- 一对多：members（参团成员）

---

### 3.10 spin_wheel_configs（转盘配置表）

**用途**: 转盘活动配置

**核心字段**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | Int | 主键 |
| name | String(100) | 活动名称 |
| startTime | DateTime | 开始时间 |
| endTime | DateTime | 结束时间 |
| status | Enum | DRAFT/ACTIVE/PAUSED/ENDED |
| helpsRequired | Int | 所需助力人数 |
| maxSpinsPerDay | Int | 每日最大抽奖次数 |
| prizes | Json | 奖品配置（概率、库存） |
| totalBudget | Decimal(10,2)? | 活动总预算 |
| spentBudget | Decimal(10,2) | 已消耗预算 |

**prizes字段结构**:
```json
[
  { "name": "1元现金", "amount": 1, "probability": 0.3, "stock": 1000 },
  { "name": "2元现金", "amount": 2, "probability": 0.2, "stock": 500 },
  { "name": "5元现金", "amount": 5, "probability": 0.1, "stock": 200 },
  { "name": "谢谢参与", "amount": 0, "probability": 0.4, "stock": -1 }
]
```

**关系**:
- 一对多：participations（用户参与）
- 一对多：records（抽奖记录）
- 一对多：helps（助力记录）

---

### 3.11 price_lock_configs（锁价活动配置表）

**用途**: 限时锁价活动设置

**核心字段**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | Int | 主键 |
| name | String(100) | 活动名称 |
| productId | Int | 商品ID |
| originalPrice | Decimal(10,2) | 原价 |
| lockPrice | Decimal(10,2) | 锁定价 |
| lockDuration | Int | 锁定时长（小时） |
| startTime | DateTime | 开始时间 |
| endTime | DateTime | 结束时间 |
| status | Enum | DRAFT/ACTIVE/PAUSED/ENDED |
| totalStock | Int | 活动库存 |
| lockedCount | Int | 已锁定数量 |

**关系**:
- 多对一：product
- 一对多：locks（锁价记录）

---

### 3.12 flash_sale_activities（秒杀活动表）

**用途**: 秒杀活动配置

**核心字段**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | Int | 主键 |
| name | String(100) | 活动名称 |
| startTime | DateTime | 开始时间 |
| endTime | DateTime | 结束时间 |
| status | Enum | DRAFT/ACTIVE/PAUSED/ENDED |

**关系**:
- 一对多：items（秒杀商品）

---

### 3.13 transaction_traces（交易追踪表）

**用途**: 所有交易全链路追踪

**核心字段**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | Int | 主键 |
| traceId | String(50) | 追踪ID（唯一） |
| traceType | Enum | 交易类型 |
| agentId | Int | 推销员ID |
| amount | Decimal(10,2) | 交易金额 |
| beforeBalance | Decimal(10,2) | 交易前余额 |
| afterBalance | Decimal(10,2) | 交易后余额 |
| sourceTable | String(50) | 来源表 |
| sourceId | Int | 来源记录ID |
| description | String(255)? | 交易描述 |
| metadata | Json? | 扩展数据 |

**交易类型**:

| 类型 | 说明 |
|------|------|
| PROFIT_SETTLE | 利润结算 |
| COUPON_ISSUE | 代金券发放 |
| COUPON_REDEEM | 代金券核销 |
| RECHARGE | 充值 |
| WITHDRAW | 提现 |
| GIFT_COST | 赠品成本扣除 |
| BALANCE_ADJUST | 人工调账 |

**关系**:
- 多对一：agent

---

### 3.14 balance_snapshots（余额快照表）

**用途**: 定期余额快照对账

**核心字段**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | Int | 主键 |
| agentId | Int | 推销员ID |
| balance | Decimal(10,2) | 快照余额 |
| snapshotType | Enum | DAILY/WEEKLY/MONTHLY/MANUAL |
| expectedBalance | Decimal(10,2)? | 根据流水计算的预期余额 |
| isConsistent | Boolean | 是否一致 |
| discrepancy | Decimal(10,2)? | 差异金额 |
| snapshotAt | DateTime | 快照时间 |

**关系**:
- 多对一：agent

---

### 3.15 audit_alerts（审计告警表）

**用途**: 异常告警记录

**核心字段**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | Int | 主键 |
| alertType | Enum | 告警类型 |
| severity | Enum | LOW/MEDIUM/HIGH/CRITICAL |
| agentId | Int? | 相关推销员ID |
| title | String(100) | 告警标题 |
| description | Text | 告警描述 |
| status | Enum | PENDING/ACKNOWLEDGED/RESOLVED |
| resolvedAt | DateTime? | 解决时间 |
| resolvedBy | String(50)? | 解决人 |
| metadata | Json? | 扩展数据 |

**告警类型**:

| 类型 | 触发条件 | 严重程度 |
|------|---------|---------|
| BALANCE_MISMATCH | 余额与交易记录不一致 | HIGH |
| DUPLICATE_SETTLE | 检测到重复结算 | HIGH |
| NEGATIVE_BALANCE | 余额变为负数 | MEDIUM |
| LARGE_TRANSACTION | 单笔交易超过5000元 | LOW |

---

## 四、表关系图

### 核心业务关系

```
Agent（推销员）
  ├─ parentId → Agent（自引用，层级体系）
  ├─ reservations → Reservation（一对多）
  ├─ agentProductPrices → AgentProductPrice（一对多）
  ├─ coupons → Coupon（一对多）
  ├─ balanceLogs → BalanceLog（一对多）
  ├─ bargains → Bargain（一对多）
  ├─ groupBuys → GroupBuy（一对多）
  └─ transactionTraces → TransactionTrace（一对多）

Reservation（预约单）
  ├─ agentId → Agent（多对一）
  ├─ warehouseId → Warehouse（多对一）
  ├─ items → ReservationItem（一对多）
  ├─ gifts → ReservationGift（一对多）
  └─ confirmLogs → ReservationConfirmLog（一对多）

Product（商品）
  ├─ categoryId → Category（多对一）
  ├─ reservationItems → ReservationItem（一对多）
  ├─ agentProductPrices → AgentProductPrice（一对多）
  ├─ bargainConfigItems → BargainConfigItem（一对多）
  └─ groupBuyConfigs → GroupBuyConfig（一对多）

BargainConfig（砍价活动）
  ├─ items → BargainConfigItem（一对多）
  └─ bargains → Bargain（一对多）

Bargain（砍价单）
  ├─ configId → BargainConfig（多对一）
  ├─ agentId → Agent（多对一）
  └─ cuts → BargainCut（一对多）

GroupBuyConfig（拼团活动）
  ├─ productId → Product（多对一）
  └─ groupBuys → GroupBuy（一对多）

GroupBuy（拼团单）
  ├─ configId → GroupBuyConfig（多对一）
  ├─ leaderId → Agent（多对一）
  └─ members → GroupBuyMember（一对多）

SpinWheelConfig（转盘活动）
  ├─ participations → SpinWheelParticipation（一对多）
  ├─ records → SpinWheelRecord（一对多）
  └─ helps → SpinWheelHelp（一对多）
```

---

## 五、索引策略

### 唯一索引（UNIQUE）

| 表名 | 字段 | 用途 |
|------|------|------|
| agents | phone | 手机号登录 |
| agents | inviteCode | 邀请码唯一性 |
| system_users | username | 用户名登录 |
| reservations | reservationNo | 预约号查询 |
| coupons | code | 代金券码查询 |
| bargains | bargainNo | 砍价单号查询 |
| group_buys | groupNo | 拼团单号查询 |
| transaction_traces | traceId | 交易追踪ID |

### 普通索引（INDEX）

| 表名 | 索引字段 | 查询场景 |
|------|---------|---------|
| agents | parentId | 查询下级推销员 |
| agents | type, status | 按类型状态筛选 |
| reservations | agentId | 查询推销员预约 |
| reservations | status | 按状态筛选预约 |
| reservations | customerPhone | 按客户手机查询 |
| coupons | agentId, status | 查询推销员代金券 |
| bargains | agentId, status | 查询推销员砍价 |
| bargains | configId | 按活动查询 |
| group_buys | configId | 按活动查询 |
| group_buys | leaderId | 查询团长拼团 |
| transaction_traces | agentId | 查询推销员交易 |
| transaction_traces | traceType | 按类型查询 |
| balance_snapshots | agentId, snapshotType | 对账查询 |
| audit_alerts | status, severity | 告警列表查询 |

### 复合唯一索引

| 表名 | 字段组合 | 用途 |
|------|---------|------|
| agent_product_prices | [agentId, productId] | 推销员商品定价唯一 |
| weekly_stats | [agentId, weekStart] | 周统计唯一 |
| spin_wheel_participations | [configId, agentId] | 活动参与唯一 |

---

## 六、数据迁移记录

### 2026-01-22：审计追踪系统

**新增表**:
- `transaction_traces` - 交易追踪表
- `balance_snapshots` - 余额快照表
- `reconciliation_logs` - 对账记录表
- `audit_alerts` - 审计告警表

**核心功能**:
- 每笔交易全链路追踪
- 每日/周/月自动对账
- 余额异常自动告警
- 人工调账审计留痕

### 2026-01-20：营销活动体系

**新增表**:
- `bargain_configs`, `bargain_config_items`, `bargains`, `bargain_cuts`, `bargain_blacklists`
- `group_buy_configs`, `group_buys`, `group_buy_members`
- `spin_wheel_configs`, `spin_wheel_participations`, `spin_wheel_records`, `spin_wheel_helps`, `spin_wheel_redeems`, `spin_wheel_blacklists`
- `price_lock_configs`, `price_locks`
- `flash_sale_activities`, `flash_sale_items`

### 2026-01-15：代金券激励体系

**新增表**:
- `coupons` - 代金券表
- `coupon_activities` - 代金券活动表
- `agent_activities` - 活动参与表
- `share_records` - 发圈记录表
- `weekly_stats` - 周统计表

**修改表** `agents`:
```sql
ALTER TABLE agents ADD COLUMN totalProfit DECIMAL(10,2) DEFAULT 0;
ALTER TABLE agents ADD COLUMN totalSales DECIMAL(10,2) DEFAULT 0;
ALTER TABLE agents ADD COLUMN totalOrders INT DEFAULT 0;
```

### 2026-01-10：预约系统上线

**新增表**:
- `reservations` - 预约单表
- `reservation_items` - 预约商品表
- `reservation_confirm_logs` - 确认日志表
- `gift_tiers` - 赠品档位表
- `reservation_gifts` - 预约赠品表
- `customer_records` - 客户记录表

---

## 七、常见查询示例

### 查询推销员团队业绩

```sql
-- 查询一级推销员的团队销售额（包含自己和所有下级）
SELECT
  a.id, a.name, a.phone, a.type,
  COUNT(DISTINCT r.id) AS totalOrders,
  COALESCE(SUM(r.totalAmount), 0) AS totalSales
FROM agents a
LEFT JOIN reservations r ON r.agentId = a.id AND r.status = 3
WHERE a.parentId = ? OR a.id = ?
GROUP BY a.id
ORDER BY totalSales DESC;
```

### 查询待结算利润

```sql
-- 查询已完成但未结算的预约
SELECT
  r.id, r.reservationNo, r.totalAmount,
  r.level2Profit, r.level1Profit, r.masterProfit,
  a.name AS agentName, a.phone
FROM reservations r
INNER JOIN agents a ON a.id = r.agentId
WHERE r.status = 3 AND r.settledAt IS NULL
ORDER BY r.completedAt;
```

### 查询砍价活动统计

```sql
-- 查询砍价活动参与情况
SELECT
  bc.name AS activityName,
  COUNT(b.id) AS totalBargains,
  COUNT(CASE WHEN b.status = 'SUCCESS' THEN 1 END) AS successCount,
  COUNT(CASE WHEN b.status = 'PICKED' THEN 1 END) AS pickedCount,
  AVG(b.cutCount) AS avgCuts
FROM bargain_configs bc
LEFT JOIN bargains b ON b.configId = bc.id
WHERE bc.status = 'ACTIVE'
GROUP BY bc.id;
```

### 查询代金券使用统计

```sql
-- 按类型统计代金券发放和使用情况
SELECT
  type,
  COUNT(*) AS totalIssued,
  SUM(amount) AS totalAmount,
  COUNT(CASE WHEN status = 'USED' THEN 1 END) AS usedCount,
  SUM(CASE WHEN status = 'USED' THEN amount ELSE 0 END) AS usedAmount
FROM coupons
WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY type
ORDER BY totalAmount DESC;
```

### 查询余额异常告警

```sql
-- 查询待处理的高严重度告警
SELECT
  aa.id, aa.alertType, aa.severity, aa.title,
  aa.description, aa.createdAt,
  a.name AS agentName, a.phone, a.balance
FROM audit_alerts aa
LEFT JOIN agents a ON a.id = aa.agentId
WHERE aa.status = 'PENDING'
  AND aa.severity IN ('HIGH', 'CRITICAL')
ORDER BY aa.severity DESC, aa.createdAt DESC;
```

### 查询交易追踪链路

```sql
-- 查询指定预约的完整资金链路
SELECT
  tt.traceId, tt.traceType, tt.amount,
  tt.beforeBalance, tt.afterBalance,
  tt.description, tt.createdAt,
  a.name AS agentName
FROM transaction_traces tt
INNER JOIN agents a ON a.id = tt.agentId
WHERE tt.sourceTable = 'reservations' AND tt.sourceId = ?
ORDER BY tt.createdAt;
```

---

## 八、数据一致性约束

### 库存一致性

**规则**:
```sql
-- 可用库存必须非负
stock - lockStock >= 0

-- 锁定库存必须非负
lockStock >= 0
```

**检查脚本**:
```sql
SELECT id, name, stock, lockStock, (stock - lockStock) AS available
FROM products
WHERE stock < 0 OR lockStock < 0 OR (stock - lockStock) < 0;
```

### 余额一致性

**规则**:
```sql
-- 推销员余额 = 交易追踪afterBalance的最新值
agent.balance = (SELECT afterBalance FROM transaction_traces
                 WHERE agentId = agent.id
                 ORDER BY createdAt DESC LIMIT 1)
```

**检查脚本**:
```sql
SELECT
  a.id, a.name, a.balance AS currentBalance,
  (SELECT afterBalance FROM transaction_traces
   WHERE agentId = a.id ORDER BY createdAt DESC LIMIT 1) AS traceBalance,
  ABS(a.balance - COALESCE(
    (SELECT afterBalance FROM transaction_traces
     WHERE agentId = a.id ORDER BY createdAt DESC LIMIT 1),
    a.balance)) AS discrepancy
FROM agents a
HAVING discrepancy > 0.01;
```

### 价格层级一致性

**规则**:
```javascript
// 价格必须满足层级关系
costPrice <= supplyPrice <= subPrice <= retailPrice

// 推销员定价必须满足
agent.retailPrice >= (parent ? parent.subPrice : product.supplyPrice)
```

---

## 九、性能优化建议

### 索引优化

**已优化的查询**:
- ✅ 推销员手机号登录（phone UNIQUE索引）
- ✅ 预约号查询（reservationNo UNIQUE索引）
- ✅ 代金券码查询（code UNIQUE索引）
- ✅ 按状态筛选预约（status INDEX）
- ✅ 交易追踪查询（traceId UNIQUE + agentId INDEX）

**待优化的查询**:
- ⚠️ 时间范围报表查询 → 建议添加时间索引
- ⚠️ 营销活动统计 → 考虑物化视图

### 查询优化

**避免N+1问题**:
```typescript
// ✅ 正确：使用include
const reservations = await prisma.reservation.findMany({
  include: {
    agent: true,
    items: { include: { product: true } },
    gifts: true
  }
})
```

### 分页优化

**游标分页**（推荐大数据量）:
```typescript
const reservations = await prisma.reservation.findMany({
  take: 20,
  skip: 1,
  cursor: { id: lastId },
  orderBy: { createdAt: 'desc' }
})
```

---

## 十、定时任务与数据维护

### 定时任务

| 时间 | 任务 | 说明 |
|------|------|------|
| 每小时 | 预约过期检查 | 标记超时未提货预约 |
| 每天9:00 | 备货提醒 | 发送备货提醒短信 |
| 每天2:00 | 余额快照 | 创建所有推销员余额快照 |
| 每天3:00 | 日对账 | 执行日对账任务 |
| 每周一2:00 | 周奖励 | 发放周销售/发圈奖励 |
| 每周一4:00 | 周对账 | 执行周对账任务 |
| 每月1日5:00 | 月对账 | 执行月度对账任务 |
| 每月1日0:00 | 月度团队奖励 | 发放团队业绩奖励 |

### 数据清理

```sql
-- 清理90天前的短信验证码
DELETE FROM sms_codes WHERE createdAt < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- 清理已过期的代金券（保留记录，仅清理180天前）
DELETE FROM coupons WHERE status = 'EXPIRED' AND expireAt < DATE_SUB(NOW(), INTERVAL 180 DAY);
```

---

## 附录：完整表清单（57表）

| # | 表名 | 中文名 | 分类 |
|---|------|--------|------|
| 1 | agents | 推销员表 | 用户与认证 |
| 2 | system_users | 系统用户表 | 用户与认证 |
| 3 | sms_codes | 短信验证码表 | 用户与认证 |
| 4 | categories | 商品分类表 | 商品与库存 |
| 5 | products | 商品表 | 商品与库存 |
| 6 | cart_items | 采购单表 | 商品与库存 |
| 7 | stock_logs | 库存日志表 | 商品与库存 |
| 8 | warehouse | 仓库/门店表 | 商品与库存 |
| 9 | reservations | 预约单表 | 预约系统 |
| 10 | reservation_items | 预约商品表 | 预约系统 |
| 11 | reservation_confirm_logs | 确认日志表 | 预约系统 |
| 12 | gift_tiers | 赠品档位表 | 预约系统 |
| 13 | reservation_gifts | 预约赠品表 | 预约系统 |
| 14 | customer_records | 客户记录表 | 预约系统 |
| 15 | prepare_reminder_logs | 备货提醒表 | 预约系统 |
| 16 | agent_product_prices | 推销员定价表 | 推销员体系 |
| 17 | balance_logs | 余额流水表 | 推销员体系 |
| 18 | team_return_coupons | 团队返券表 | 推销员体系 |
| 19 | monthly_team_rewards | 月度奖励表 | 推销员体系 |
| 20 | agent_activities | 活动参与表 | 推销员体系 |
| 21 | share_records | 发圈记录表 | 推销员体系 |
| 22 | weekly_stats | 周统计表 | 推销员体系 |
| 23 | coupons | 代金券表 | 代金券系统 |
| 24 | coupon_activities | 代金券活动表 | 代金券系统 |
| 25 | coupon_activity_records | 活动参与记录表 | 代金券系统 |
| 26 | bargain_configs | 砍价活动配置 | 砍价系统 |
| 27 | bargain_config_items | 砍价商品配置 | 砍价系统 |
| 28 | bargains | 砍价单表 | 砍价系统 |
| 29 | bargain_cuts | 砍刀记录表 | 砍价系统 |
| 30 | bargain_blacklists | 砍价黑名单 | 砍价系统 |
| 31 | group_buy_configs | 拼团活动配置 | 拼团系统 |
| 32 | group_buys | 拼团单表 | 拼团系统 |
| 33 | group_buy_members | 拼团成员表 | 拼团系统 |
| 34 | regions | 区域表 | 拼团系统 |
| 35 | spin_wheel_configs | 转盘配置表 | 大转盘系统 |
| 36 | spin_wheel_participations | 转盘参与表 | 大转盘系统 |
| 37 | spin_wheel_records | 转盘抽奖表 | 大转盘系统 |
| 38 | spin_wheel_helps | 转盘助力表 | 大转盘系统 |
| 39 | spin_wheel_redeems | 转盘兑换表 | 大转盘系统 |
| 40 | spin_wheel_blacklists | 转盘黑名单 | 大转盘系统 |
| 41 | flash_sale_activities | 秒杀活动表 | 秒杀与活动 |
| 42 | flash_sale_items | 秒杀商品表 | 秒杀与活动 |
| 43 | price_lock_configs | 锁价活动配置 | 锁价系统 |
| 44 | price_locks | 锁价记录表 | 锁价系统 |
| 45 | commission_rules | 分润规则表 | 分润与财务 |
| 46 | commissions | 分润记录表 | 分润与财务 |
| 47 | withdrawals | 提现申请表 | 分润与财务 |
| 48 | recharge_requests | 充值申请表 | 分润与财务 |
| 49 | fund_flows | 资金流水表 | 分润与财务 |
| 50 | transaction_traces | 交易追踪表 | 审计追踪 |
| 51 | balance_snapshots | 余额快照表 | 审计追踪 |
| 52 | reconciliation_logs | 对账记录表 | 审计追踪 |
| 53 | audit_alerts | 审计告警表 | 审计追踪 |
| 54 | configs | 系统配置表 | 系统配置 |
| 55 | audit_logs | 操作日志表 | 系统配置 |
| 56 | h5_banners | H5轮播图表 | 素材管理 |
| 57 | h5_recommend_products | H5推荐商品表 | 素材管理 |

---

**文档维护**: 蒙庆烟花开发团队
**文档版本**: v2.0
**最后更新**: 2026-01-24
**Schema来源**: `server/prisma/schema.prisma`

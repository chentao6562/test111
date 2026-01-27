# 预约系统完整指南

> 本文档详细描述蒙庆烟花预约系统的完整业务流程、规则和技术实现。

**最后更新**: 2026-01-16
**维护者**: Claude AI

---

## 目录

1. [业务模式概述](#一业务模式概述)
2. [预约流程详解](#二预约流程详解)
3. [预约状态流转](#三预约状态流转)
4. [赠品机制](#四赠品机制)
5. [电话确认规则](#五电话确认规则)
6. [客户风控机制](#六客户风控机制)
7. [推广与利润体系](#七推广与利润体系)
8. [数据模型](#八数据模型)
9. [API接口对照表](#九api接口对照表)

---

## 一、业务模式概述

### 1.1 核心理念

**线上免费预约 + 线下全款付款**

- 平台只提供信息预约服务，不收取任何线上费用
- 真正的交易（付款、发货）全部在线下门店完成
- 符合烟花爆竹销售的合规要求

### 1.2 三方角色

| 角色 | 说明 | 主要操作 |
|------|------|---------|
| 客户 | 终端消费者 | 浏览商品、提交预约、到店提货 |
| 推销员 | 分销推广者 | 分享链接、赚取利润 |
| 门店 | 线下销售点 | 电话确认、收款核销、发放赠品 |

### 1.3 门店信息

| 项目 | 内容 |
|------|------|
| 地址 | 呼和浩特市和林格尔县盛乐镇姑子板村华门世家1号门面房 |
| 客服电话 | 13190531439 / 15849390600 |
| 营业时间 | 08:00 - 20:00 |

---

## 二、预约流程详解

### 2.1 完整流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                        预约流程                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ① 客户访问推销员链接                                            │
│       ↓                                                         │
│  ② 浏览商品（显示推销员定价）                                     │
│       ↓                                                         │
│  ③ 选择商品加入预约单                                            │
│       ↓                                                         │
│  ④ 填写预约信息（姓名、电话、提货日期）                           │
│       ↓                                                         │
│  ⑤ 提交预约【无需支付】                                          │
│       ↓                                                         │
│  ⑥ 门店30分钟内电话确认                                          │
│       ↓                                                         │
│  ⑦ 客户到店付全款                                                │
│       ↓                                                         │
│  ⑧ 核销发货 + 发放赠品                                           │
│       ↓                                                         │
│  ⑨ 预约完成                                                      │
│       ↓                                                         │
│  ⑩ 利润即时结算（核销时立即入账）                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 各步骤详解

#### 步骤①: 客户访问推销员链接

- 推销员分享专属链接（含推销员ID）
- 客户通过链接进入小程序或H5页面
- 系统自动记录推销员归属

#### 步骤②: 浏览商品

- 商品价格显示推销员设定的定价
- 不同推销员可以设置不同价格
- 价格 = 推销员供货价 + 推销员利润

#### 步骤③: 加入预约单

- 选择商品数量
- 商品自动添加到预约单（购物车）
- 可随时增减或删除

#### 步骤④: 填写预约信息

- 客户姓名（真实姓名）
- 客户电话（用于门店联系）
- 预计提货日期（1-30天内）

#### 步骤⑤: 提交预约

- 检查客户是否在黑名单
- 计算预约总金额
- 自动匹配赠品档位
- 生成预约单号（格式：MQ2026011600001）
- **完全免费，无需支付任何费用**

#### 步骤⑥: 门店电话确认

- 门店需在30分钟内首次联系客户
- 最多拨打3次
- 确认客户预约意向和到店时间
- 确认成功后设置3天有效期

#### 步骤⑦: 客户到店付款

- 客户凭预约号或手机号到店
- 核对预约信息和商品
- 支付全款（现金/微信/支付宝）

#### 步骤⑧: 核销发货

- 门店员工在系统中核销预约
- 扣减库存
- 发放对应档位的赠品
- 记录支付方式

#### 步骤⑨: 预约完成

- 预约状态变为"已完成"
- 更新客户记录
- 触发利润计算

#### 步骤⑩: 利润即时结算

- **即时结算**：核销完成时立即结算到推销员余额
- 同时创建资金流水记录
- 推销员可随时申请提现
- 【2026-01-16升级】从T+2延迟结算改为即时结算

---

## 三、预约状态流转

### 3.1 状态定义

| 状态值 | 状态名 | 说明 |
|-------|-------|------|
| 0 | 待确认 (PENDING) | 新提交的预约，等待门店电话确认 |
| 1 | 确认中 (CALLING) | 门店正在联系客户 |
| 2 | 已确认 (CONFIRMED) | 电话确认成功，等待客户到店 |
| 3 | 已完成 (COMPLETED) | 客户到店付款提货完成 |
| 4 | 已取消 (CANCELLED) | 客户主动取消 |
| 5 | 已过期 (EXPIRED) | 确认后3天未到店 |
| 6 | 确认失败 (CALL_FAILED) | 3次电话未接通 |

### 3.2 状态流转图

```
                    ┌────────────┐
                    │  待确认(0)  │
                    └─────┬──────┘
                          │ 门店开始拨打
                          ↓
                    ┌────────────┐
        ┌──────────→│  确认中(1)  │←─────────┐
        │           └─────┬──────┘          │
        │                 │                  │
        │    ┌────────────┼────────────┐    │
        │    │            │            │    │
        │    ↓            ↓            ↓    │
   ┌────────────┐  ┌────────────┐  ┌────────────┐
   │确认失败(6) │  │ 已确认(2)  │  │ 已取消(4)  │
   └────────────┘  └─────┬──────┘  └────────────┘
    (3次未接通)          │              (客户取消)
                         │
              ┌──────────┼──────────┐
              │          │          │
              ↓          ↓          ↓
        ┌────────────┐ ┌────────────┐ ┌────────────┐
        │ 已完成(3)  │ │ 已过期(5)  │ │ 已取消(4)  │
        └────────────┘ └────────────┘ └────────────┘
         (到店核销)     (3天未到店)    (客户取消)
```

### 3.3 状态变更触发条件

| 从状态 | 到状态 | 触发条件 |
|-------|-------|---------|
| 待确认 | 确认中 | 门店首次拨打电话 |
| 确认中 | 已确认 | 门店标记确认成功 |
| 确认中 | 确认失败 | 拨打3次未接通 |
| 确认中 | 已取消 | 客户要求取消 |
| 已确认 | 已完成 | 门店核销完成 |
| 已确认 | 已过期 | 确认后3天未到店（定时任务） |
| 已确认 | 已取消 | 客户要求取消 |

---

## 四、赠品机制

### 4.1 赠品档位

| 档位 | 最低金额 | 赠品内容 | 赠品成本 |
|------|---------|---------|---------|
| 1档 | ¥100 | 小手持烟花 × 2 | ¥5 |
| 2档 | ¥200 | 仙女棒 × 10 + 摔炮 × 1盒 | ¥15 |
| 3档 | ¥300 | 小型喷花 × 1 + 仙女棒 × 10 | ¥25 |
| 4档 | ¥500 | 中型烟花 × 1 + 小礼包 | ¥50 |
| 5档 | ¥1000 | 大型烟花 × 1 + 中礼包 | ¥100 |

### 4.2 匹配规则

```javascript
// 按金额降序匹配，取第一个满足条件的档位
function matchGiftTier(amount, giftTiers) {
  const sorted = [...giftTiers].sort((a, b) => b.minAmount - a.minAmount)
  return sorted.find(tier => amount >= tier.minAmount) || null
}

// 示例
// 预约金额 ¥350 → 匹配3档（¥300）→ 赠送"小型喷花×1+仙女棒×10"
// 预约金额 ¥80 → 无匹配 → 无赠品
```

### 4.3 赠品发放时机

- 赠品在**核销时发放**
- 门店员工核销时勾选"已发放赠品"
- 系统记录赠品发放状态

---

## 五、电话确认规则

### 5.1 时间要求

| 规则 | 说明 |
|------|------|
| 首次联系 | 预约提交后30分钟内 |
| 最大拨打次数 | 3次 |
| 拨打间隔 | 每次至少间隔10分钟 |
| 确认有效期 | 确认成功后3天 |

### 5.2 确认流程

```
1. 新预约 → 状态: 待确认(0)
2. 门店点击"开始拨打" → 状态: 确认中(1)
3. 记录拨打次数和时间
4. 确认结果:
   - 成功: 状态 → 已确认(2)，设置过期时间
   - 未接通: 保持确认中(1)，等待下次拨打
   - 3次未接通: 状态 → 确认失败(6)
```

### 5.3 超时处理

| 超时场景 | 处理方式 |
|---------|---------|
| 30分钟未首次联系 | 系统提醒门店，标记超时 |
| 确认后3天未到店 | 自动标记为已过期(5) |

---

## 六、客户风控机制

### 6.1 爽约记录

| 指标 | 说明 |
|------|------|
| 爽约定义 | 已确认的预约过期未到店 |
| 记录方式 | 按客户手机号累计 |
| 重置条件 | 不重置（永久记录） |

### 6.2 风险等级

| 等级 | 爽约次数 | 标识 | 处理 |
|------|---------|------|------|
| 0 | 0次 | 正常 | 无限制 |
| 1 | 1次 | 轻度风险 | 提示门店注意 |
| 2 | 2次 | 中度风险 | 门店电话确认时提醒 |
| 3 | 3次及以上 | 高风险 | **自动加入黑名单** |

### 6.3 黑名单机制

```javascript
// 黑名单客户提交预约时
if (customerRecord.isBlocked) {
  throw new Error('您已被列入黑名单，无法预约')
}

// 爽约时自动检查
if (noShowCount >= 3) {
  customerRecord.isBlocked = true
  customerRecord.riskLevel = 3
}
```

### 6.4 黑名单管理

- 自动拉黑: 爽约3次自动加入
- 手动拉黑: 管理员可手动操作
- 解除拉黑: 仅管理员可操作

---

## 七、推广与利润体系

### 7.1 推销员层级

| 类型 | 说明 | 发展权限 |
|------|------|---------|
| 总代理 | 平台运营方 | 可发展一级推销员 |
| 一级推销员 | 由总代理直接发展 | 可发展二级推销员 |
| 二级推销员 | 由一级推销员发展 | 不可发展下级 |

### 7.2 价格体系

```
总代理成本价（进货价）
    ↓ + 利润
一级推销员供货价
    ↓ + 利润
二级推销员供货价（或直接卖给客户）
    ↓ + 利润
客户支付价格
```

### 7.3 利润计算

**一级推销员利润**:
```
利润 = 客户支付价格 - 一级供货价
```

**二级推销员利润**:
```
二级利润 = 客户支付价格 - 二级供货价
一级利润 = 二级供货价 - 一级供货价
```

**示例**:
```
商品: 烟花套装A
- 总代理成本价: ¥50
- 一级供货价: ¥70
- 二级供货价: ¥85（由一级设置）
- 客户支付价: ¥100

如果客户通过一级购买:
- 一级利润 = 100 - 70 = ¥30

如果客户通过二级购买:
- 二级利润 = 100 - 85 = ¥15
- 一级利润 = 85 - 70 = ¥15
```

### 7.4 利润即时结算

| 时机 | 说明 |
|------|------|
| 计算时机 | 预约核销完成时 |
| 结算方式 | **即时结算**（核销时立即入账） |
| 入账方式 | 直接增加推销员余额，同时创建资金流水 |
| 提现规则 | 最低100元，需管理员审核 |

> **【2026-01-16升级】** 从T+2延迟结算改为即时结算，提升推销员体验

---

## 八、数据模型

### 8.1 预约单 (Reservation)

```prisma
model Reservation {
  id              Int       @id @default(autoincrement())
  reservationNo   String    @unique  // 预约号 MQ2026011600001
  customerName    String               // 客户姓名
  customerPhone   String               // 客户电话
  pickupDate      DateTime             // 预约到店日期
  storeId         Int                  // 门店ID
  agentId         Int?                 // 推销员ID
  totalAmount     Decimal              // 预约金额
  giftTierId      Int?                 // 赠品档位ID
  giftName        String?              // 赠品名称
  giftDelivered   Boolean @default(false)  // 赠品是否已发放
  status          Int      @default(0)     // 状态 0-6
  callCount       Int      @default(0)     // 拨打次数
  lastCallAt      DateTime?            // 最后拨打时间
  confirmedAt     DateTime?            // 确认时间
  expireAt        DateTime?            // 过期时间
  completedAt     DateTime?            // 核销时间
  paymentMethod   String?              // 支付方式 cash/wechat/alipay
  staffId         Int?                 // 核销员工ID
  remark          String?              // 备注
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  items           ReservationItem[]
  store           Warehouse @relation(...)
  agent           Agent?    @relation(...)
  staff           SystemUser? @relation(...)
  giftTier        GiftTier? @relation(...)
}
```

### 8.2 预约商品明细 (ReservationItem)

```prisma
model ReservationItem {
  id            Int         @id @default(autoincrement())
  reservationId Int
  productId     Int
  productName   String      // 商品名称快照
  productImage  String?     // 商品图片快照
  quantity      Int         // 数量
  price         Decimal     // 单价（推销员定价）
  subtotal      Decimal     // 小计

  reservation   Reservation @relation(...)
  product       Product     @relation(...)
}
```

### 8.3 赠品档位 (GiftTier)

```prisma
model GiftTier {
  id         Int      @id @default(autoincrement())
  minAmount  Decimal  // 最低金额阈值
  giftName   String   // 赠品名称
  giftCost   Decimal  // 赠品成本
  isActive   Boolean  @default(true)  // 是否启用
  sortOrder  Int      @default(0)     // 排序
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  reservations Reservation[]
}
```

### 8.4 客户记录 (CustomerRecord)

```prisma
model CustomerRecord {
  id           Int      @id @default(autoincrement())
  phone        String   @unique  // 客户手机号
  name         String?          // 客户姓名
  noShowCount  Int      @default(0)  // 爽约次数
  riskLevel    Int      @default(0)  // 风险等级 0-3
  isBlocked    Boolean  @default(false)  // 是否黑名单
  blockedAt    DateTime?        // 拉黑时间
  blockedBy    Int?             // 拉黑操作人
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

---

## 九、API接口对照表

### 9.1 客户端API

| 端点 | 方法 | 说明 |
|------|------|------|
| /api/reservations | POST | 创建预约 |
| /api/reservations/my | GET | 我的预约列表 |
| /api/reservations/:id | GET | 预约详情 |
| /api/reservations/:id/cancel | PUT | 取消预约 |
| /api/gift-tiers | GET | 获取赠品档位 |

### 9.2 门店端API

| 端点 | 方法 | 说明 |
|------|------|------|
| /api/store/reservations/stats | GET | 预约统计 |
| /api/store/reservations | GET | 预约列表 |
| /api/store/reservations/pending | GET | 待确认列表 |
| /api/store/reservations/:id | GET | 预约详情 |
| /api/store/reservations/:id/call | POST | 记录拨打电话 |
| /api/store/reservations/:id/confirm | POST | 确认预约 |
| /api/store/reservations/:id/fail | POST | 标记确认失败 |
| /api/store/pickup/search | GET | 搜索待核销预约 |
| /api/store/pickup/complete | POST | 完成核销 |
| /api/store/pickup/today-stats | GET | 今日核销统计 |

### 9.3 管理后台API

| 端点 | 方法 | 说明 |
|------|------|------|
| /api/admin/reservations/stats | GET | 预约统计 |
| /api/admin/reservations | GET | 预约列表 |
| /api/admin/reservations/:id | GET | 预约详情 |
| /api/admin/reservations/:id/confirm | POST | 管理员确认 |
| /api/admin/reservations/:id/cancel | POST | 管理员取消 |
| /api/admin/gift-tiers | GET | 赠品档位列表 |
| /api/admin/gift-tiers | POST | 新增赠品档位 |
| /api/admin/gift-tiers/:id | PUT | 编辑赠品档位 |
| /api/admin/gift-tiers/:id | DELETE | 删除赠品档位 |
| /api/admin/customers | GET | 客户列表 |
| /api/admin/customers/:phone | GET | 客户详情 |
| /api/admin/customers/:phone/block | POST | 加入黑名单 |
| /api/admin/customers/:phone/unblock | POST | 解除黑名单 |

---

## 附录

### A. 预约号生成规则

```javascript
// 格式: MQ + 年月日 + 5位序号
// 示例: MQ2026011600001

function generateReservationNo() {
  const date = new Date()
  const dateStr = format(date, 'yyyyMMdd')
  const sequence = await getNextSequence('reservation', dateStr)
  return `MQ${dateStr}${String(sequence).padStart(5, '0')}`
}
```

### B. 定时任务

| 任务 | 执行时间 | 说明 |
|------|---------|------|
| 预约过期检查 | 每小时 | 标记已确认超过3天的预约为过期 |
| 确认超时提醒 | 每30分钟 | 提醒门店处理超时未确认的预约 |
| 备货提醒 | 每日09:00 | 将明天提货的预约状态改为"待备货"并通知门店 |

> 注：利润结算已改为**即时结算**（核销时立即入账），不再使用定时任务

### C. 错误码

| 错误码 | 说明 |
|-------|------|
| CUSTOMER_BLOCKED | 客户在黑名单中 |
| RESERVATION_NOT_FOUND | 预约不存在 |
| INVALID_STATUS | 预约状态不允许此操作 |
| STOCK_INSUFFICIENT | 库存不足 |
| CONFIRM_EXPIRED | 确认时间已过期 |

---

*本文档由 Claude AI 维护，每次预约系统功能更新后请同步更新本文档。*

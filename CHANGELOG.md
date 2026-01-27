# 蒙庆烟花系统 - 更新日志

本文件记录系统的详细更新历史。简要概述请查看 [CLAUDE.md](./CLAUDE.md)。

---

## 2026-01-16 预约模式升级

### 变更概述
彻底取消锁货模式，改为线上免费预约+到店全款付款模式。平台只提供信息预约服务，真正的交易在线下门店完成，符合烟花爆竹销售合规要求。

### 核心变更对照

| 模块 | 变更前 | 变更后 |
|------|--------|--------|
| 角色体系 | 代理商（LEVEL1/2/3/WHOLESALE） | 推销员（总代理/一级/二级） |
| 价格体系 | 固定三价（零售/代理/批发） | 自由定价（供货价→推销员定价→客户） |
| 收益模式 | 按比例分润（10%/15%） | 差价利润（售价-拿货价） |
| 订单模式 | 下单付款 + 自提/锁货 | 线上免费预约 + 到店付款 |
| 结算周期 | T+1 | T+2 |
| 锁货模式 | 支持 | 彻底取消 |
| 预定金/定金 | 支持 | 不收取任何线上费用 |
| 赠品机制 | 无 | 预约有礼（阶梯赠品） |
| 电话确认 | 无 | 门店电话确认机制 |
| 客户风控 | 无 | 爽约管理机制 |

### 预约流程

```
① 通过推销员链接访问
    ↓
② 浏览商品（显示推销员设置的零售价）
    ↓
③ 选择商品、规格、数量
    ↓
④ 填写预约信息（姓名、手机号、预约日期）
    ↓
⑤ 确认预约（显示赠品信息）
    ↓
⑥ 提交预约【无需支付任何费用】
    ↓
⑦ 门店30分钟内电话确认
    ↓
⑧ 预约生效，等待提货
    ↓
⑨ 到店付全款、领商品+赠品
    ↓
⑩ 订单完成，T+2推销员利润结算
```

### 预约单状态流转

```
pending（待确认）
    ↓ 门店拨打电话
calling（确认中）
    ├─→ confirmed（已确认）─→ completed（已完成）→ settled（已结算）
    ├─→ expired（已过期，3天未提货）
    └─→ failed（确认失败，3次未接通）
```

| 状态值 | 状态名 | 说明 |
|-------|-------|------|
| 0 | 待确认 (PENDING) | 新预约，等待门店电话确认 |
| 1 | 确认中 (CALLING) | 门店正在联系客户 |
| 2 | 已确认 (CONFIRMED) | 电话确认成功，等待到店 |
| 3 | 已完成 (COMPLETED) | 到店付款提货完成 |
| 4 | 已取消 (CANCELLED) | 客户或管理员取消 |
| 5 | 已过期 (EXPIRED) | 确认后3天未到店 |
| 6 | 确认失败 (CALL_FAILED) | 3次电话未接通 |

### 门店电话确认流程

1. 收到新预约通知（目标30分钟内首次联系）
2. 拨打客户电话
   - 接通 → 确认商品、数量、价格、提货时间
   - 未接 → 30分钟后再次拨打
   - 第2次未接 → 2小时后拨打
   - 第3次未接 → 标记「确认失败」
3. 确认成功后告知赠品和提货信息
4. 系统自动发送确认短信

### 赠品档位（预约有礼）

| 预约金额 | 赠品内容 | 赠品成本 |
|---------|---------|---------|
| 满 ¥100 | 小手持烟花 × 2 | ¥5 |
| 满 ¥200 | 仙女棒 × 10 + 摔炮 × 1盒 | ¥15 |
| 满 ¥300 | 小型喷花 × 1 + 仙女棒 × 10 | ¥25 |
| 满 ¥500 | 中型烟花 × 1 + 小礼包 | ¥50 |
| 满 ¥1000 | 大型烟花 × 1 + 中礼包 | ¥100 |

**赠品规则**:
- 按最高档位发放，不累加
- 仅限线上预约客户，直接到店无赠品
- 赠品在到店提货时由门店发放
- 赠品成本由平台/总代理承担

### 爽约管理机制

**爽约定义**:
- 电话确认后3天内未到店 = 爽约
- 未接电话确认失败 ≠ 爽约
- 电话确认时取消 ≠ 爽约

**爽约处理**:
| 爽约次数 | 处理方式 |
|---------|---------|
| 第1次 | 记录爽约，发送提醒短信 |
| 第2次 | 标记高风险，不享受赠品 |
| 第3次 | 加入黑名单，禁止线上预约 |

### 新增数据库模型

```prisma
model Reservation {
  id              Int       @id @default(autoincrement())
  reservationNo   String    @unique @db.VarChar(32)  // 预约号 MQ2026011600001

  // 客户信息
  customerName    String    @db.VarChar(50)
  customerPhone   String    @db.VarChar(20)
  pickupDate      DateTime  @db.Date

  // 归属信息
  salespersonId   Int?
  salespersonLevel Int?     @db.TinyInt
  parentSalespersonId Int?
  agentId         Int?
  storeId         Int

  // 金额
  totalAmount     Decimal   @db.Decimal(10, 2)

  // 赠品
  giftTierId      Int?
  giftName        String?   @db.VarChar(200)
  giftDelivered   Boolean   @default(false)

  // 状态：0=待确认 1=确认中 2=已确认 3=已完成 4=已取消 5=已过期 6=确认失败
  status          Int       @default(0) @db.TinyInt

  // 电话确认
  callCount       Int       @default(0) @db.TinyInt
  lastCallAt      DateTime?
  confirmedAt     DateTime?
  confirmedBy     Int?

  // 核销
  completedAt     DateTime?
  completedBy     Int?
  paymentMethod   String?   @db.VarChar(20)

  // 结算
  settled         Boolean   @default(false)
  settledAt       DateTime?

  // 风控
  customerRiskLevel Int     @default(0) @db.TinyInt

  expireAt        DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // 关联
  items           ReservationItem[]
  store           Warehouse @relation(fields: [storeId], references: [id])

  @@index([salespersonId])
  @@index([status])
  @@index([storeId])
  @@index([customerPhone])
  @@map("reservations")
}

model ReservationItem {
  id              Int       @id @default(autoincrement())
  reservationId   Int
  productId       Int
  productName     String    @db.VarChar(200)
  productImage    String?   @db.VarChar(500)
  quantity        Int
  price           Decimal   @db.Decimal(10, 2)

  // 价格快照（用于利润计算）
  snapshotCostPrice   Decimal? @db.Decimal(10, 2)
  snapshotSupplyPrice Decimal? @db.Decimal(10, 2)
  snapshotLevel1Price Decimal? @db.Decimal(10, 2)
  snapshotRetailPrice Decimal? @db.Decimal(10, 2)

  reservation     Reservation @relation(fields: [reservationId], references: [id])
  product         Product     @relation(fields: [productId], references: [id])

  @@map("reservation_items")
}

model GiftTier {
  id          Int       @id @default(autoincrement())
  minAmount   Decimal   @db.Decimal(10, 2)
  giftName    String    @db.VarChar(200)
  giftItems   String?   @db.Text  // JSON格式
  giftCost    Decimal?  @db.Decimal(10, 2)
  isActive    Boolean   @default(true)
  sortOrder   Int       @default(0)
  createdAt   DateTime  @default(now())

  @@map("gift_tiers")
}

model CustomerRecord {
  id              Int       @id @default(autoincrement())
  phone           String    @unique @db.VarChar(20)
  name            String?   @db.VarChar(50)
  totalOrders     Int       @default(0)
  completedOrders Int       @default(0)
  noShowCount     Int       @default(0)
  riskLevel       Int       @default(0) @db.TinyInt  // 0=正常 1=有记录 2=高风险 3=黑名单
  isBlocked       Boolean   @default(false)
  blockedReason   String?   @db.VarChar(200)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@map("customer_records")
}
```

### 新增API端点

**客户端预约API**
| 端点 | 方法 | 说明 |
|------|------|------|
| /api/reservations | POST | 创建预约 |
| /api/reservations/:id | GET | 预约详情 |
| /api/reservations/my | GET | 我的预约列表 |
| /api/reservations/:id | DELETE | 取消预约（未确认前） |

**门店端API**
| 端点 | 方法 | 说明 |
|------|------|------|
| /api/store/reservations/stats | GET | 预约统计 |
| /api/store/reservations/pending | GET | 待确认预约列表 |
| /api/store/reservations/:id/call | POST | 记录拨打电话 |
| /api/store/reservations/:id/confirm | POST | 确认预约 |
| /api/store/reservations/:id/fail | POST | 标记确认失败 |
| /api/store/pickup/search | GET | 按手机号/预约号查询 |
| /api/store/pickup/complete | POST | 完成核销 |
| /api/store/pickup/stats | GET | 今日核销统计 |
| /api/store/pickup/completed | GET | 已核销列表 |

**管理后台API**
| 端点 | 方法 | 说明 |
|------|------|------|
| /api/admin/reservations/stats | GET | 预约统计 |
| /api/admin/reservations | GET | 预约列表 |
| /api/admin/reservations/:id | GET | 预约详情 |
| /api/admin/reservations/:id/confirm | POST | 管理员确认预约 |
| /api/admin/reservations/:id/cancel | POST | 管理员取消预约 |
| /api/admin/gift-tiers | GET | 赠品档位列表 |
| /api/admin/gift-tiers | POST | 创建赠品档位 |
| /api/admin/gift-tiers/:id | PUT | 更新赠品档位 |
| /api/admin/gift-tiers/:id | DELETE | 删除赠品档位 |

### 关键文件清单

**后端服务**
| 文件 | 说明 |
|------|------|
| `server/src/services/reservation/index.ts` | 模块导出入口 |
| `server/src/services/reservation/types.ts` | 类型定义 |
| `server/src/services/reservation/reservationService.ts` | 预约创建、查询、取消 |
| `server/src/services/reservation/confirmService.ts` | 电话确认流程 |
| `server/src/services/reservation/pickupService.ts` | 门店核销 |
| `server/src/services/reservation/giftService.ts` | 赠品计算与发放 |
| `server/src/services/reservation/customerService.ts` | 客户风控 |
| `server/src/services/reservation/expiryService.ts` | 过期处理 |
| `server/src/controllers/storeController.ts` | 门店端控制器 |
| `server/src/controllers/adminReservationController.ts` | 管理后台控制器 |
| `server/src/routes/store.ts` | 门店端路由 |
| `server/src/routes/admin.ts` | 管理后台路由（新增预约部分） |

**前端页面**
| 文件 | 说明 |
|------|------|
| `miniprogram-agent/pages/checkout/` | 客户端预约页（改造） |
| `miniprogram-agent/pages/reservations/` | 客户端预约列表和详情 |
| `miniprogram-warehouse/pages/reservations/index` | 门店端-预约列表 |
| `miniprogram-warehouse/pages/reservations/confirm` | 门店端-电话确认工作台 |
| `miniprogram-warehouse/pages/reservations/pickup` | 门店端-核销提货 |
| `miniprogram-warehouse/pages/reservations/detail` | 门店端-预约详情 |
| `admin/src/pages/reservations/index.vue` | 管理后台-预约管理 |

### 实施阶段记录

| 阶段 | 内容 | 状态 | 完成日期 |
|------|------|------|---------|
| Phase 1 | 清理锁货模式代码 | ✅ | 2026-01-16 |
| Phase 2 | 新增预约数据库模型 | ✅ | 2026-01-16 |
| Phase 3 | 实现预约服务（6个服务模块） | ✅ | 2026-01-16 |
| Phase 4 | 整合推销员体系 | ⏳ | - |
| Phase 5-6 | 门店端小程序改造 | ⏳ | - |
| Phase 7 | 门店端API与页面 | ✅ | 2026-01-16 |
| Phase 8 | 管理后台预约管理 | ✅ | 2026-01-16 |
| Phase 9 | 部署测试 | ✅ | 2026-01-16 |

### 文档体系重构（2026-01-16）

根据预约模式升级，对整个文档体系进行了重构：

**重构内容**：
| 文档 | 操作 | 说明 |
|------|------|------|
| CLAUDE.md | 重写 | 控制在517行，移除所有锁货/移库内容 |
| docs/store/STORE-GUIDE.md | 新建 | 门店端开发手册（原库管端） |
| docs/agent/AGENT_MINIPROGRAM_MANUAL.md | 更新 | 改为预约模式，移除VIP移库 |
| docs/admin/ADMIN-GUIDE.md | 更新 | 新增预约管理，移除移库管理 |
| docs/global/RESERVATION-GUIDE.md | 新建 | 预约系统完整指南 |
| docs/archived/ | 归档 | 货管端文档移入归档目录 |

**归档的文档**：
- `docs/logistics/LOGISTICS_MINIPROGRAM_MANUAL.md` → `docs/archived/logistics/`
- `docs/logistics/JS-BRIDGE-GUIDE.md` → `docs/archived/logistics/`

**彻底移除的内容**：
- 锁货模式、移库相关说明
- 旧订单(Order)模型文档（代码保留用于历史数据）
- 货管端(miniprogram-logistics/h5-logistics)相关说明
- VIP移库、撮合打包等功能说明

**更新的术语**：
| 旧术语 | 新术语 |
|-------|-------|
| 代理商 | 推销员 |
| 库管端 | 门店端 |
| 订单 | 预约 |
| 订货单 | 预约单 |
| 分润 | 利润 |

---

### 测试记录（2026-01-16）

**API测试结果**：
```
# 管理后台API
✅ GET /api/admin/reservations/stats - 预约统计
✅ GET /api/admin/reservations - 预约列表
✅ GET /api/admin/reservations/:id - 预约详情
✅ GET /api/admin/gift-tiers - 赠品档位列表

# 门店端API
✅ GET /api/store/reservations/stats - 预约统计
✅ GET /api/store/reservations/pending - 待确认列表

# 完整流程测试
✅ 创建预约 MQ2026011600001
✅ 记录电话拨打 callCount: 1
✅ 确认预约 status: CONFIRMED
✅ 完成核销 status: COMPLETED, paymentMethod: wechat
✅ 统计更新 todayComplete: 1
```

**编译测试结果**：
```
✅ server: npm run build - TypeScript编译成功
✅ admin: npm run build - Vue构建成功
```

**修复的问题**：
1. `storeController.ts`: 修正 getPendingStats/getTodayPickupStats 返回值映射
2. `adminReservationController.ts`: 移除 Prisma include 中不存在的 product 嵌套
3. `admin/pages/reservations/index.vue`: 修正 import 路径（@/api/request, @/composables/useFormatter）

---

## 2026-01-13 支付流程简化

### 变更概述
移除锁货模式订单收款时的移库费检查逻辑，简化支付流程。

### 变更原因
原逻辑要求锁货模式订单必须先设置移库费并确认后才能收款，但实际业务中：
1. 商品移库费可能未设置（为null），导致移库费计算为0
2. 增加了不必要的人工确认环节，降低效率

### 变更内容

| 项目 | 修改前 | 修改后 |
|------|-------|-------|
| 锁货订单收款 | 检查移库费是否设置 → 检查移库费是否确认 → 检查全款 | 只检查全款 |
| 移库费确认 | 必须确认 | 自动确认/无需确认 |
| 支付流程 | 3步检查 | 1步检查 |

### 修改文件
- `server/src/services/order/orderOperations.ts` - `updatePayment()` 函数

### 代码变更
```typescript
// 修改前（第300-317行）
if (order.status === 'pending_payment') {
  if (order.needTransfer) {
    if (Number(order.transferFee) <= 0) {
      throw new Error('移库费未设置，请联系客服');
    }
    if (!order.transferFeeConfirmed) {
      throw new Error('移库费未确认，请先确认移库费后再支付');
    }
  }
  if (!fullPaid) {
    throw new Error('订单必须全款支付才能进入后续流程');
  }
  newStatus = 'pending_accept';
}

// 修改后
if (order.status === 'pending_payment') {
  // 锁货模式移库费已在订单创建时自动计算，无需人工确认
  if (!fullPaid) {
    throw new Error('订单必须全款支付才能进入后续流程');
  }
  newStatus = 'pending_accept';
}
```

### 测试结果
- ✅ 自提模式订单收款正常
- ✅ 锁货模式订单收款正常（移库费为0时也可收款）
- ✅ 全款检查仍然有效

---

## 2026-01-13 多仓库管理系统

### 业务模式
| 订单类型 | 仓库分配 | 提货地点 | 核销人 |
|---------|---------|---------|-------|
| 自提模式 | 自动分配默认仓库（总仓） | 总仓 | 库管 |
| 锁货模式 | 管理员手动指定前置仓 | 前置仓 | 货管 |

### 功能清单
| 功能 | 状态 | 说明 |
|------|------|------|
| 仓库CRUD | ✅ | 创建、编辑、删除、设置默认 |
| 员工仓库关联 | ✅ | 库管/货管绑定所属仓库 |
| 订单自动分配 | ✅ | 新订单自动关联默认仓库 |
| 管理员指定仓库 | ✅ | 锁货模式订单可手动修改 |
| 订单仓库筛选 | ✅ | 管理后台按仓库筛选订单 |
| 库管端订单过滤 | ✅ | 只显示本仓库订单 |
| 跨仓库核销拦截 | ✅ | 拒绝其他仓库订单核销 |

### 关键API
| 端点 | 方法 | 说明 |
|------|------|------|
| /api/admin/warehouses | GET/POST | 仓库列表/创建 |
| /api/admin/warehouses/:id | PUT/DELETE | 编辑/删除仓库 |
| /api/admin/warehouses/:id/default | PUT | 设为默认仓库 |
| /api/admin/orders/:id/warehouse | PUT | 指定订单提货仓库 |
| /api/admin/orders?warehouseId=N | GET | 按仓库筛选订单 |

### 关键文件
| 文件 | 说明 |
|------|------|
| `server/src/controllers/warehouseController.ts` | 仓库管理API |
| `server/src/services/order/orderOperations.ts` | 订单创建自动分配仓库 |
| `server/src/services/pickup/pickupSelfService.ts` | 核销仓库校验 |
| `admin/src/pages/warehouse/index.vue` | 仓库管理页面 |
| `admin/src/pages/orders/index.vue` | 订单列表仓库筛选 |

---

## 2026-01-12 货管端H5升级

### 升级内容
8项新功能全部完成，100%对齐小程序：
1. 抢单大厅（可抢订单列表+抢单操作）
2. 移库任务（我的任务列表+状态管理）
3. 提货核销（扫码/手输验证+确认提货）
4. 收入统计（今日/本月/累计收入）
5. 收入明细（详细流水记录）
6. 提现申请（填写金额+收款信息）
7. 提现记录（历史提现列表+状态）
8. 收款信息（支付宝/微信/银行卡配置）

### 测试结果
- 13/13项功能测试通过
- 16个API接口100%真实数据
- 访问地址: http://39.104.58.26:8083

---

## 2026-01-11 移库费系统

### 核心变更
- 商品级自动定价：每个商品可设置独立移库费
- 订单撮合打包：多个订单打包成一个任务分配给货管

### 撮合规则
- 最低打包费用：500元（可配置）
- 单包最大订单数：5单（可配置）
- 最长等待时间：24小时（超时强制打包）

### 关键文件
- `server/src/services/transferBundleService.ts`
- `admin/src/pages/transfer/`
- 数据表: `transfer_bundles`, `transfer_config`, `products.transfer_fee`

---

## 2026-01-11 库管端UI优化

- 付款状态显示优化（统一为已付款/未付款两种状态）
- 金额验证逻辑修复
- 浮点数精度问题修复

---

## 2026-01-11 安全测试

- 98个测试用例100%通过
- 涵盖：认证、授权、输入验证、SQL注入、XSS、CSRF等

---

## 2026-01-11 阿里云短信上线

- 签名：台风创意文化
- 登录模板：SMS_500655304
- 注册模板：SMS_500535284
- 60秒发送间隔限制

---

## 2026-01-11 货管端上线前测试

- 20个接口100%通过
- 涵盖：登录、任务列表、抢单、核销、提现等

---

## 2026-01-11 业务逻辑简化

- 取消定金支付选项
- 统一全款要求
- 简化支付流程

---

## 2026-01-10 更新记录

### 货管端BUG修复
- TabBar导航修复
- 术语合规（配送→移库）

### 新增API
- 员工提现统计 `/api/staff/withdrawals/stats`
- 库存盘点 `/api/staff/stock/inventory-check`

### 数据库变更
- `products.barcode` - 商品条形码
- `products.sku` - 商品编码

---

## 2026-01-10 UI优化记录

### 代理商小程序
- 5项UI修复
- 商品详情页图片显示优化
- 订单列表状态显示优化

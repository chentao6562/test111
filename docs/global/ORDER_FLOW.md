# 订单流程详细文档

本文档详细说明蒙庆烟花系统的订单流程，包括自提模式和移库模式的完整业务流程。

---

## 一、订单流程概述

蒙庆烟花系统支持两种订单模式：

1. **自提模式** (`needTransfer=false`): 代理商到店提货
2. **移库模式** (`needTransfer=true`): 货管移库到代理商指定分仓

**重要变更（2026-01-11）**: 取消定金支付选项，所有订单必须全款支付才能进入后续流程。

---

## 二、自提模式完整流程

### 2.1 流程图

```
下单 → 待付款 → 客服确认收款(必须全款) → 待接单 → 备货中 → 待提货 → 库管核销 → 完成
                                                    ↓
                                              生成pickupCode
```

### 2.2 阶段详细说明

#### 阶段1：下单（pending_payment）

**触发条件**: 代理商在购物车/商品详情页点击"提交订单"

**关键操作**:
1. 生成订单号（yyyyMMddHHmmssXXX格式）
2. 锁定商品库存（lockStock += 数量）
3. 设置 `needTransfer=false`
4. 计算订单金额（根据代理商类型选择对应价格）

**代码位置**: `server/src/services/order/orderOperations.ts` - `create()`

**前端页面**:
- 小程序：`miniprogram-agent/pages/checkout/index.js`
- H5：`h5-agent/src/views/Checkout.vue`

#### 阶段2：待付款（pending_payment）

**业务规则**:
- 代理商需要联系客服线下支付
- **必须全款**（2026-01-11起取消定金支付）
- 客服在管理后台确认收款

**管理后台操作**:
- 路径：`/orders` → 订单详情 → "确认收款"按钮
- 输入实际收款金额
- 后端验证：`amount >= totalAmount`（必须全款）
- 确认后订单状态变为 `pending_accept`

**代码位置**: `server/src/services/order/orderOperations.ts` - `updatePayment()`

**API端点**: `POST /api/admin/orders/:id/confirm-payment`

#### 阶段3：待接单（pending_accept）

**触发条件**: 客服确认收到全款

**库管端操作**:
- 查看"待接单"Tab
- 点击"接单"按钮
- 订单状态变为 `preparing`

**代码位置**: `server/src/services/order/orderStateManager.ts` - `acceptOrder()`

**API端点**: `POST /api/staff/orders/:id/accept`

**前端页面**:
- 小程序：`miniprogram-warehouse/pages/workbench/index.js`
- H5：`h5-warehouse/src/views/Workbench.vue`

#### 阶段4：备货中（preparing）

**库管端操作**:
1. 根据订单明细准备商品
2. 核对商品数量、规格
3. 完成备货后点击"完成备货"按钮

**系统自动操作**:
- 生成6位提货码（pickupCode）
- 订单状态变为 `pending_pickup`

**代码位置**: `server/src/services/order/orderStateManager.ts` - `completePreparation()`

**API端点**: `POST /api/staff/orders/:id/complete-preparation`

#### 阶段5：待提货（pending_pickup）

**业务规则**:
- 代理商凭提货码到店提货
- 提货码每60秒自动刷新（防截图盗用）
- 库管扫码或手动输入提货码核销

**代理商端显示**:
- 订单详情页展示提货二维码
- 提货码文本显示（可复制）
- 倒计时显示（60秒）
- 到期自动刷新二维码

**前端页面**:
- 小程序：`miniprogram-agent/pages/orders/detail.js`
- H5：`h5-agent/src/views/OrderDetail.vue`

#### 阶段6：库管核销（完成）

**库管端操作**:

##### 步骤1：验证提货码
```javascript
POST /api/staff/pickup/verify
{
  "pickupCode": "123456"  // 6位提货码
}

// 返回订单信息 + 支付状态
{
  "order": { ... },
  "paymentStatus": "FULL_PAID"  // 2026-01-11起必须全款
}
```

##### 步骤2：确认提货
```javascript
POST /api/staff/pickup/confirm
{
  "orderId": 123
}

// 系统自动操作：
// 1. 扣减库存: stock -= 数量, lockStock -= 数量
// 2. 增加销量: salesCount += 数量
// 3. 订单状态变为 completed
// 4. 触发分润计算
```

**代码位置**:
- 验证：`server/src/services/pickupQRService.ts` - `verifyPickupCode()`
- 核销：`server/src/services/pickupQRService.ts` - `confirmPickup()`

**前端页面**:
- 小程序：`miniprogram-warehouse/pages/pickup/index.js`
- H5：`h5-warehouse/src/views/Pickup.vue`

**历史订单兼容**:
- 2026-01-11前的订单可能存在未全款情况
- 使用 `POST /api/staff/pickup/confirm-with-payment` 接口收款并核销
- 新订单不再需要此接口

#### 阶段7：已完成（completed）

**系统自动触发**:

1. **库存变动**:
   - `stock -= 数量`
   - `lockStock -= 数量`
   - `salesCount += 数量`

2. **分润计算**:
   - 触发 `calculateCommission(orderId, tx)`
   - 创建分润记录（状态：PENDING）
   - 记录到 `commissions` 表

3. **操作日志**:
   - 记录核销操作到 `audit_logs`

**代码位置**: `server/src/services/order/orderStateManager.ts` - `confirmPickup()`

---

## 三、移库模式完整流程（2026-01-11重构）

### 3.1 流程图

```
下单 → 待付款 → 全款支付 → 待接单 → 备货中 → 待移库 → 撮合打包 → 货管抢包 → 移库中 → 待提货 → 货管核销 → 完成
  ↓                                             ↓           ↓           ↓
自动计算                                   生成pickupCode  创建打包    货管接单
移库费                                     +transferCode
(商品移库费×数量)
```

### 3.2 新旧流程对比

#### 旧流程（2026-01-11前）- 客服协商

```
下单 → 待付款 → 客服设置移库费 → 代理商确认移库费 → 全款支付 → 待接单 → ...
```

**特点**:
- 移库费需要客服手动设置
- 代理商需要确认移库费
- 确认后才能支付全款

**兼容处理**: 2026-01-11前创建的订单仍显示移库费确认弹窗

#### 新流程（2026-01-11起）- 自动计算

```
下单(自动计算移库费) → 全款支付 → 待接单 → ...
```

**特点**:
- 移库费在下单时自动计算
- `transferFeeConfirmed` 自动设为 true
- 无需代理商确认（产品定价）

### 3.3 阶段详细说明

#### 阶段1：下单并自动计算移库费（pending_payment）

**关键操作**:
1. 代理商在结算页开启"VIP移库服务"开关
2. 系统设置 `needTransfer=true`
3. **自动计算移库费**: `transferFee = Σ(商品.transferFee × 购买数量)`
4. **自动确认**: `transferFeeConfirmed = true`
5. 订单总金额 = 商品金额 + 移库费

**移库费计算规则**:
```javascript
// 每个商品独立设置 transferFee 字段（元/件）
// 示例：
商品A: transferFee = 50元/件, 购买2件 → 100元
商品B: transferFee = 30元/件, 购买5件 → 150元
订单移库费 = 100 + 150 = 250元
```

**不支持移库的商品**:
- `allowTransfer=false` 的商品无法选择移库模式
- 前端自动隐藏"VIP移库服务"开关

**代码位置**: `server/src/services/order/orderOperations.ts` - `create()`

**前端页面**:
- 小程序：`miniprogram-agent/pages/checkout/index.js`
- H5：`h5-agent/src/views/Checkout.vue`

#### 阶段2-4：与自提模式相同

- 待付款 → 客服确认全款
- 待接单 → 库管接单
- 备货中 → 库管备货

#### 阶段5：待移库（pending_transfer）

**触发条件**: 库管完成备货

**系统自动操作**:
1. 生成6位提货码（pickupCode）- 客户提货用
2. 生成8位移库码（transferCode）- 货管移库用
3. 订单状态变为 `pending_transfer`
4. **订单进入撮合池**，等待撮合打包

**代码位置**: `server/src/services/order/orderStateManager.ts` - `completePreparation()`

#### 阶段6：撮合打包（自动/手动触发）

**撮合算法**:

```
待移库订单 → 撮合算法 → 创建打包 → 货管抢包 → 分配任务
    ↓              ↓           ↓
  入池等待     贪心算法       打包池
            (达到阈值/超时)
```

**撮合规则**（可配置）:

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| 最低打包费用 | 500元 | 打包总移库费达到阈值时触发 |
| 单包最大订单数 | 5单 | 单个打包最多包含订单数 |
| 最长等待时间 | 24小时 | 超时强制打包（避免订单长期等待）|
| 自动撮合开关 | 启用 | 是否启用自动撮合 |

**触发方式**:

1. **自动触发**（定时任务）:
   - 每小时检查一次待撮合订单
   - 达到阈值时自动创建打包

2. **手动触发**（管理后台）:
   - 路径：`/transfer` → "订单打包"Tab → "触发撮合"按钮
   - 立即执行撮合算法

**撮合算法（贪心算法）**:
```
1. 按移库费降序排列待撮合订单
2. 从最高费用订单开始，尝试打包
3. 每个打包的总费用 ≥ 最低打包费用
4. 每个打包的订单数 ≤ 单包最大订单数
5. 创建打包记录（TransferBundle）
6. 打包内所有订单状态保持 pending_transfer（等待货管抢包）
```

**创建打包**:
- 生成打包编号：`TB2026011100001`（格式：TB + yyyyMMdd + 序号）
- 设置打包状态：`PENDING`
- 计算打包总移库费：`totalFee = Σ(订单移库费)`
- 关联订单：建立 `TransferBundle` ↔ `Order` 关系

**代码位置**: `server/src/services/transferBundleService.ts` - `matchOrdersToBundle()`

**API端点**: `POST /api/admin/transfer/bundles/match`

#### 阶段7：货管抢包（DISPATCHED）

**货管端操作**:

##### 步骤1：查看抢单池
- 显示所有 `status=PENDING` 的打包
- 展示打包编号、订单数、总移库费

**前端页面**:
- 小程序：`miniprogram-logistics/pages/tasks/index.js`
- H5：`h5-logistics/src/views/Tasks.vue`

##### 步骤2：抢打包
```javascript
POST /api/staff/transfer-bundles/:id/grab

// 系统操作：
// 1. 验证货管接单状态（is_available=true）
// 2. 设置打包状态: PENDING → DISPATCHED
// 3. 记录货管ID: logisticsId = 当前货管
// 4. 更新打包内所有订单状态: pending_transfer → transferring
// 5. 记录接单时间: dispatchedAt = NOW()
```

**代码位置**: `server/src/services/transferBundleService.ts` - `grabBundle()`

**API端点**: `POST /api/staff/transfer-bundles/:id/grab`

#### 阶段8：移库中（transferring）

**业务场景**:
- 货管到库管处提货（使用移库码 transferCode）
- 库管验证移库码并确认交接
- 货管运输到代理商指定分仓

**库管交接流程**:

##### 步骤1：库管验证移库码
```javascript
POST /api/staff/pickup/verify-transfer
{
  "transferCode": "12345678"  // 8位移库码
}

// 返回订单信息和货管信息
```

##### 步骤2：库管确认交接
```javascript
POST /api/staff/pickup/confirm-transfer
{
  "orderId": 123
}

// 系统操作：
// 1. 记录交接时间: warehouseVerifiedAt = NOW()
// 2. 订单保持 transferring 状态（等待货管核销）
```

**代码位置**:
- 验证：`server/src/services/pickupQRService.ts` - `verifyTransferCode()`
- 交接：`server/src/services/pickupQRService.ts` - `confirmTransferHandover()`

**前端页面**:
- 小程序：`miniprogram-warehouse/pages/pickup/index.js`（"锁货交接"Tab）
- H5：`h5-warehouse/src/views/Pickup.vue`

#### 阶段9：待提货（pending_pickup）

**触发条件**: 货管运输到代理商分仓后，通知代理商提货

**业务规则**:
- 代理商凭提货码（6位 pickupCode）到分仓提货
- 货管扫码或手动输入提货码核销

#### 阶段10：货管核销（完成）

**货管端操作**:

##### 步骤1：验证提货码
```javascript
POST /api/staff/logistics/verify-pickup
{
  "pickupCode": "123456"  // 6位提货码
}

// 返回订单信息
// 验证条件：
// 1. 订单必须是移库模式（needTransfer=true）
// 2. 订单必须是待提货状态（pending_pickup）
// 3. 订单必须已全款（fullPaid=true）
```

##### 步骤2：确认提货
```javascript
POST /api/staff/logistics/confirm-pickup
{
  "orderId": 123
}

// 系统自动操作（与自提模式相同）：
// 1. 扣减库存
// 2. 增加销量
// 3. 订单状态变为 completed
// 4. 触发分润计算
// 5. 记录货管收入（transferFee）
// 6. 更新打包状态（所有订单完成后 bundle → COMPLETED）
```

**代码位置**:
- 验证：`server/src/services/pickupQRService.ts` - `logisticsVerifyCustomerCode()`
- 核销：`server/src/services/pickupQRService.ts` - `logisticsConfirmPickup()`

**前端页面**:
- 小程序：`miniprogram-logistics/pages/pickup/index.js`
- H5：`h5-logistics/src/views/Pickup.vue`

**货管收入记录**:
- 记录到 `system_users.balance`
- 可提现最低金额：100元
- 支持提现申请（需管理员审核）

---

## 四、订单状态流转图

### 4.1 状态常量定义

```javascript
const ORDER_STATUS = {
  pending_confirm: '待确认',    // 二/三级代理需上级确认（预留，暂未实现）
  pending_payment: '待付款',
  pending_accept: '待接单',
  preparing: '备货中',
  pending_transfer: '待移库',   // 锁货模式专有
  transferring: '移库中',       // 锁货模式专有
  pending_pickup: '待提货',
  completed: '已完成',
  cancelled: '已取消'
};
```

### 4.2 状态流转规则

#### 自提模式状态流转

```
pending_payment → pending_accept → preparing → pending_pickup → completed
       ↓                                                             ↑
   cancelled ←─────────────────────────────────────────────────────┘
```

**可取消节点**:
- `pending_payment`（待付款）
- `pending_accept`（待接单）

**不可取消节点**:
- `preparing`（备货中）及之后状态

#### 移库模式状态流转

```
pending_payment → pending_accept → preparing → pending_transfer → transferring → pending_pickup → completed
       ↓                                              ↓                ↓                              ↑
   cancelled ←────────────────────────────────────────┴────────────────┘                              │
                                                                                                       │
                                                    （撮合打包）（货管抢包）（货管核销）────────────────┘
```

**可取消节点**:
- `pending_payment`（待付款）
- `pending_accept`（待接单）
- `pending_transfer`（待移库，打包前）

**不可取消节点**:
- `transferring`（移库中）及之后状态

### 4.3 支付状态

**【2026-01-11简化】取消定金状态，只有已付款/未付款两种状态**

| 状态 | 显示颜色 | 判断条件 |
|------|----------|----------|
| 未付款 | 灰色 | `fullPaid=false` 或 `paidAmount < totalAmount` |
| 已付款 | 绿色 | `fullPaid=true` 或 `paidAmount >= totalAmount` |

**字段说明**:
- `fullPaid`: Boolean，是否已全款（推荐使用）
- `paidAmount`: Decimal，已付金额
- `totalAmount`: Decimal，订单总金额
- `depositPaid`: Boolean，已弃用（2026-01-11起新订单始终为false）
- `depositAmount`: Decimal，已弃用（2026-01-11起新订单不设置）

---

## 五、核心代码位置索引

### 5.1 订单服务

| 功能 | 文件 | 函数 |
|------|------|------|
| 创建订单 | `server/src/services/order/orderOperations.ts` | `create()` |
| 确认收款 | `server/src/services/order/orderOperations.ts` | `updatePayment()` |
| 设置移库费（旧） | `server/src/services/order/orderOperations.ts` | `setTransferFee()` |
| 接单 | `server/src/services/order/orderStateManager.ts` | `acceptOrder()` |
| 完成备货 | `server/src/services/order/orderStateManager.ts` | `completePreparation()` |
| 确认提货 | `server/src/services/order/orderStateManager.ts` | `confirmPickup()` |
| 取消订单 | `server/src/services/order/orderOperations.ts` | `cancel()` |

### 5.2 提货核销服务

| 功能 | 文件 | 函数 |
|------|------|------|
| 生成提货二维码 | `server/src/utils/qrcode.ts` | `generatePickupQRCode()` |
| 验证提货码（自提） | `server/src/services/pickupQRService.ts` | `verifyPickupCode()` |
| 确认提货（自提） | `server/src/services/pickupQRService.ts` | `confirmPickup()` |
| 收款并核销（兼容） | `server/src/services/pickupQRService.ts` | `confirmPickupWithPayment()` |
| 验证移库码 | `server/src/services/pickupQRService.ts` | `verifyTransferCode()` |
| 库管交接 | `server/src/services/pickupQRService.ts` | `confirmTransferHandover()` |
| 货管验证提货码 | `server/src/services/pickupQRService.ts` | `logisticsVerifyCustomerCode()` |
| 货管核销 | `server/src/services/pickupQRService.ts` | `logisticsConfirmPickup()` |

### 5.3 移库撮合服务

| 功能 | 文件 | 函数 |
|------|------|------|
| 撮合算法 | `server/src/services/transferBundleService.ts` | `matchOrdersToBundle()` |
| 创建打包 | `server/src/services/transferBundleService.ts` | `createBundle()` |
| 货管抢包 | `server/src/services/transferBundleService.ts` | `grabBundle()` |
| 完成移库 | `server/src/services/transferBundleService.ts` | `completeTransfer()` |
| 获取撮合配置 | `server/src/services/transferBundleService.ts` | `getConfig()` |
| 更新撮合配置 | `server/src/services/transferBundleService.ts` | `updateConfig()` |

### 5.4 库存服务

| 功能 | 文件 | 函数 |
|------|------|------|
| 锁定库存 | `server/src/services/stock/stockLocking.ts` | `lockStockBatch()` |
| 释放库存 | `server/src/services/stock/stockLocking.ts` | `unlockStockBatch()` |
| 扣减库存 | `server/src/services/stock/stockLocking.ts` | `deductStockBatch()` |
| 库存校验 | `server/src/services/stock/stockValidation.ts` | `checkStockAvailability()` |

### 5.5 分润服务

| 功能 | 文件 | 函数 |
|------|------|------|
| 分润计算 | `server/src/services/commission/commissionCalculator.ts` | `calculateCommission()` |
| 分润回滚 | `server/src/services/commission/commissionCalculator.ts` | `rollbackCommission()` |
| T+1结算 | `server/src/services/commission/commissionRuleService.ts` | `settleCommissions()` |
| 提现申请 | `server/src/services/commission/withdrawalService.ts` | `createWithdrawal()` |

---

## 六、常见问题FAQ

### Q1: 订单创建后能否修改移库模式？

**A**: 不可以。订单创建时 `needTransfer` 字段确定后不能修改。如需更改，请取消订单重新下单。

### Q2: 移库费如何计算？

**A**: 2026-01-11起自动计算：
```
移库费 = Σ(商品.transferFee × 购买数量)
```
商品的 `transferFee` 由管理员在商品管理中设置。

### Q3: 订单在什么状态下可以取消？

**A**:
- 自提模式：`pending_payment`、`pending_accept` 可取消
- 移库模式：`pending_payment`、`pending_accept`、`pending_transfer`（打包前）可取消
- 其他状态不可取消

### Q4: 提货码有效期多长？

**A**:
- 提货码（pickupCode）：60秒自动刷新
- 移库码（transferCode）：60秒自动刷新
- 刷新后旧码失效，新码生效

### Q5: 货管如何获得移库收入？

**A**:
1. 货管抢包后，打包内所有订单的移库费归该货管
2. 核销完成后，移库费自动增加到货管账户余额
3. 货管可申请提现（最低100元）

### Q6: 如果订单取消，库存和分润如何处理？

**A**:
- **库存**: 自动释放锁定库存（`lockStock -= 数量`）
- **分润**: 如已创建分润记录，自动回滚（`CANCELLED`）；如已结算，扣减余额

### Q7: 撮合打包的触发时机是什么？

**A**:
- **自动触发**: 定时任务每小时检查，达到阈值（总费用≥500元或订单数≥5单）时自动打包
- **手动触发**: 管理后台点击"触发撮合"按钮立即执行
- **超时强制**: 订单在撮合池等待超过24小时，强制打包（避免长期等待）

### Q8: 2026-01-11前的旧订单如何处理？

**A**:
- **移库费确认**: 旧订单仍显示移库费确认弹窗
- **支付逻辑**: 兼容定金+尾款模式，库管核销时可能需要收取尾款
- **判断标准**: `new Date(order.createdAt) < new Date('2026-01-11')` 为旧订单

---

## 七、参考资源

- **数据库设计**: [DATABASE.md](./DATABASE.md)
- **API参考**: [API_REFERENCE.md](./API_REFERENCE.md)
- **开发规范**: [CLAUDE.md](../CLAUDE.md)
- **更新日志**: [CHANGELOG.md](../CHANGELOG.md)

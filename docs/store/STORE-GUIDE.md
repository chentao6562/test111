# 门店端开发手册

> 本文档为门店端H5(h5-warehouse)的完整开发指南。

**最后更新**: 2026-01-24
**版本**: v2.0
**维护者**: Claude AI

---

## 一、项目概述

### 1.1 功能定位
门店端是门店员工使用的H5应用，主要负责：
- **预约确认**：电话联系客户确认预约
- **备货管理**：提货前一天备货准备
- **预约核销**：客户到店后核销提货
- **代金券核销**：扫码核销推销员代金券【2026-01-18新增】
- **库存管理**：入库、调整、盘点
- **工作统计**：查看工作数据

### 1.2 技术栈
| 技术 | 说明 |
|------|------|
| H5框架 | Vue 3.5 + TypeScript |
| UI组件库 | TDesign Mobile Vue |
| 网络请求 | Axios封装 |
| 状态管理 | Pinia |

### 1.3 目录结构
```
h5-warehouse/
├── src/
│   ├── views/                # 页面组件
│   │   ├── Login.vue         # 登录页
│   │   ├── Workbench.vue     # 工作台（预约列表）
│   │   ├── Reservations.vue  # 预约管理（多Tab）
│   │   ├── ReservationDetail.vue  # 预约详情
│   │   ├── ReservationConfirm.vue # 电话确认页
│   │   ├── Prepare.vue       # 备货列表页【2026-01-17新增】
│   │   ├── PrepareDetail.vue # 备货详情页【2026-01-17新增】
│   │   ├── PickupReservation.vue  # 预约核销页
│   │   ├── Pickup.vue        # 订单核销页
│   │   ├── CouponRedeem.vue  # 代金券核销【2026-01-18新增】
│   │   ├── Stock.vue         # 库存管理
│   │   └── My.vue            # 个人中心
│   ├── components/           # 公共组件
│   │   └── QRScanner.vue     # 扫码组件
│   ├── api/                  # API接口
│   ├── stores/               # Pinia状态
│   ├── utils/                # 工具函数
│   │   └── bridge.ts         # JS Bridge
│   └── router/               # 路由配置
├── package.json
└── vite.config.ts
```

---

## 二、页面功能详解

### 2.1 登录页 (`pages/login/index`)

**功能**：员工账号密码登录

**API调用**：
```javascript
POST /api/staff/login
Body: { username, password }
Response: { token, userInfo: { id, username, name, phone, role } }
```

**登录后存储**：
- `warehouse_token` - JWT令牌
- `warehouse_user` - 用户信息对象

---

### 2.2 工作台 (`pages/workbench/index`)

**功能**：预约管理核心页面

**Tab分类**：
| Tab | 说明 |
|-----|------|
| 全部 | 全部预约 (status=-1) |
| 待确认 | 新预约等待电话确认 (status=0) |
| 待备货 | 明日提货需备货 (status=7)【2026-01-17新增】|
| 备货中 | 正在备货 (status=8)【2026-01-17新增】|
| 待提货 | 备货完成等待提货 (status=9)【2026-01-17新增】|
| 已完成 | 核销完成 (status=3) |

**API调用**：
```javascript
// 获取预约统计
GET /api/store/reservations/stats
Response: { pending, calling, confirmed, completed, todayCompleted }

// 获取预约列表
GET /api/store/reservations?status={status}&page={page}
Response: { list: [...], total, page, pageSize }
```

---

### 2.3 预约详情 (`pages/reservations/detail`)

**功能**：查看预约详细信息

**显示内容**：
- 客户信息（姓名、电话）
- 预约商品列表
- 预约金额
- 赠品信息
- 预约状态
- 操作按钮

**API调用**：
```javascript
GET /api/store/reservations/:id
Response: {
  id, reservationNo, customerName, customerPhone,
  pickupDate, totalAmount, status, giftName,
  items: [{ productName, quantity, price }]
}
```

---

### 2.4 电话确认页 (`pages/reservations/confirm`)

**功能**：门店员工电话确认预约

**确认流程**：
1. 点击"开始拨打"记录拨打
2. 拨打客户电话
3. 确认成功或失败

**API调用**：
```javascript
// 记录拨打电话
POST /api/store/reservations/:id/call
Response: { callCount, lastCallAt }

// 确认预约成功
POST /api/store/reservations/:id/confirm
Response: { status: 2, expireAt }

// 标记确认失败
POST /api/store/reservations/:id/fail
Body: { reason } // 可选
Response: { status: 6 }
```

**确认规则**：
- 30分钟内首次拨打
- 最多拨打3次
- 3次未接通自动标记失败
- 确认成功后设置3天有效期

---

### 2.5 核销页 (`pages/reservations/pickup`)

**功能**：客户到店核销提货

**核销流程**：
1. 搜索预约（手机号/预约号）
2. 确认客户信息和商品
3. 收款并发放赠品
4. 完成核销

**API调用**：
```javascript
// 搜索待核销预约
GET /api/store/pickup/search?phone={phone}
GET /api/store/pickup/search?reservationNo={no}
Response: {
  id, reservationNo, customerName, customerPhone,
  totalAmount, giftName, items: [...]
}

// 完成核销
POST /api/store/pickup/complete
Body: {
  reservationId: 1,
  paymentMethod: "wechat",  // cash/wechat/alipay
  deliverGift: true
}
Response: { status: 3, completedAt }

// 今日核销统计
GET /api/store/pickup/today-stats
Response: { count, totalAmount }
```

---

### 2.6 备货管理（2026-01-17新增）

#### 2.6.1 备货列表页 (`pages/prepare/index`)

**功能**：查看待备货、备货中、待提货的预约

**Tab分类**：
| Tab | 状态值 | 说明 |
|-----|-------|------|
| 待备货 | 7 | 明天提货，需要备货 |
| 备货中 | 8 | 正在备货 |
| 待提货 | 9 | 备货完成，等待客户提货 |

**API调用**：
```javascript
// 获取待备货列表
GET /api/store/prepare/pending
Response: [{ id, reservationNo, customerName, pickupDate, items, ... }]

// 获取备货中列表
GET /api/store/prepare/preparing
Response: [{ id, reservationNo, progress, ... }]
```

#### 2.6.2 备货详情页 (`pages/prepare/detail`)

**功能**：逐个商品备货，生成提货码

**备货流程**：
1. 查看商品清单
2. 逐个勾选已备好的商品
3. 全部备好后点击"完成备货"
4. 系统生成8位提货码
5. 通知客户凭码提货

**API调用**：
```javascript
// 开始备货
POST /api/store/prepare/:id/start
Response: { success, message }

// 更新单个商品备货状态
POST /api/store/prepare/:id/item
Body: { productId, prepared: true }
Response: { totalItems, preparedItems, progressPercent }

// 批量更新备货状态
POST /api/store/prepare/:id/batch
Body: { productIds: [1,2,3], prepared: true }

// 完成备货（生成提货码）
POST /api/store/prepare/:id/complete
Response: { success, pickupCode: "AB123456" }

// 上报备货问题
POST /api/store/prepare/:id/issue
Body: { issueType: "SHORTAGE|DAMAGE|NOT_FOUND|OTHER", description }
```

**备货进度显示**：
- 环形进度条显示备货百分比
- 商品列表显示已备货状态
- 支持单个确认或全选确认

---

### 2.7 库存管理 (`pages/stock/index`)

**功能**：商品库存管理

**API调用**：
```javascript
// 库存统计
GET /api/staff/stock/statistics
Response: { totalStock, warningCount, outOfStockCount }

// 库存列表
GET /api/staff/stock?page={page}&keyword={keyword}
Response: { items: [...], total }

// 入库
POST /api/staff/stock/in
Body: { productId, quantity, remark }

// 库存调整
POST /api/staff/stock/adjust
Body: { productId, adjustQuantity, reason }

// 条形码查询
GET /api/staff/stock/product?code={code}

// 库存盘点
POST /api/staff/stock/inventory-check
Body: { productId, actualStock, remark }
```

---

### 2.8 个人中心 (`pages/my/index`)

**功能**：个人信息和工作统计

**API调用**：
```javascript
GET /api/staff/stats?period={period}
// period: today | week | month | total
Response: { confirmed, completed, stockIn }
```

---

### 2.9 代金券核销【2026-01-18新增】(`/coupon-redeem`)

**功能**：门店员工扫码核销推销员的代金券

**核销流程**：
1. 点击进入代金券核销页面
2. 扫描推销员出示的代金券二维码
3. 显示代金券信息（金额、持有人、有效期）
4. 确认核销
5. 从推销员余额扣除对应金额

**API调用**：
```javascript
// 验证代金券
GET /api/store/coupon/verify?code={code}
Response: {
  id, code, amount, type, status,
  agentId, agentName, agentPhone,
  expireAt
}

// 核销代金券
POST /api/store/coupon/redeem
Body: { couponCode }
Response: { success, message, amount }

// 今日核销统计
GET /api/store/coupon/today-stats
Response: { count, totalAmount }
```

**业务规则**：
- 代金券只能核销一次
- 核销时从推销员余额扣除等额金额
- 允许推销员余额变为负数（下次分润时补齐）
- 过期代金券不可核销
- 核销后代金券状态变为USED

**代金券状态**：
| 状态 | 说明 |
|------|------|
| UNUSED | 未使用 |
| USED | 已使用 |
| EXPIRED | 已过期 |

---

## 三、预约状态说明

| 状态值 | 状态名 | 门店端操作 |
|-------|-------|----------|
| 0 | 待确认 | 拨打电话确认 |
| 1 | 确认中 | 继续拨打或标记失败 |
| 2 | 已确认 | 等待明天自动转为待备货 |
| 3 | 已完成 | 无操作（已核销） |
| 4 | 已取消 | 无操作 |
| 5 | 已过期 | 无操作 |
| 6 | 确认失败 | 无操作 |
| 7 | 待备货 | 开始备货【2026-01-17新增】|
| 8 | 备货中 | 继续备货/完成备货【2026-01-17新增】|
| 9 | 待提货 | 凭提货码核销【2026-01-17新增】|

### 状态流转图（2026-01-17更新）
```
客户预约 → 待确认(0)
              │
              ↓ 门店拨打电话
         确认中(1) ──→ 确认失败(6)
              │
              ↓ 确认成功
         已确认(2)
              │
              ↓ 定时任务（提货前一天9:00）
         待备货(7)
              │
              ↓ 开始备货
         备货中(8)
              │
              ↓ 完成备货（生成提货码）
         待提货(9)
              │
              ↓ 凭提货码核销
         已完成(3)
```

---

## 四、API接口汇总

### 4.1 认证相关
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/staff/login | 员工登录 |
| GET | /api/staff/me | 获取当前用户信息 |

### 4.2 预约管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/store/reservations/stats | 预约统计 |
| GET | /api/store/reservations | 预约列表 |
| GET | /api/store/reservations/pending | 待确认列表 |
| GET | /api/store/reservations/:id | 预约详情 |
| POST | /api/store/reservations/:id/call | 记录拨打 |
| POST | /api/store/reservations/:id/confirm | 确认预约 |
| POST | /api/store/reservations/:id/fail | 标记失败 |

### 4.3 备货管理【2026-01-17新增】
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/store/prepare/pending | 待备货列表 |
| GET | /api/store/prepare/preparing | 备货中列表 |
| GET | /api/store/prepare/:id/progress | 备货进度 |
| POST | /api/store/prepare/:id/start | 开始备货 |
| POST | /api/store/prepare/:id/item | 单品备货确认 |
| POST | /api/store/prepare/:id/batch | 批量备货确认 |
| POST | /api/store/prepare/:id/complete | 完成备货 |
| POST | /api/store/prepare/:id/issue | 上报问题 |

### 4.4 核销管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/store/pickup/search | 搜索待核销 |
| POST | /api/store/pickup/verify-code | 提货码验证【2026-01-17新增】|
| POST | /api/store/pickup/complete | 完成核销 |
| GET | /api/store/pickup/today-stats | 今日统计 |

### 4.5 库存管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/staff/stock/statistics | 库存统计 |
| GET | /api/staff/stock | 库存列表 |
| POST | /api/staff/stock/in | 入库 |
| POST | /api/staff/stock/adjust | 调整库存 |
| GET | /api/staff/stock/product | 条形码查询 |
| POST | /api/staff/stock/inventory-check | 盘点 |

### 4.6 代金券核销【2026-01-18新增】
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/store/coupon/verify | 验证代金券 |
| POST | /api/store/coupon/redeem | 核销代金券 |
| GET | /api/store/coupon/today-stats | 今日核销统计 |

---

## 五、开发规范

### 5.1 代码规范
```typescript
// 使用async/await处理异步
const loadData = async () => {
  try {
    const res = await api.getReservations()
    list.value = res.data.list
  } catch (error) {
    Toast({ message: '加载失败', theme: 'error' })
  }
}
```

### 5.2 Toast使用
```typescript
import { Toast } from 'tdesign-mobile-vue'

// 显示loading
Toast({ message: '加载中...', theme: 'loading', duration: 0 })

// 显示成功
Toast({ message: '操作成功', theme: 'success' })
```

### 5.3 路由跳转
```typescript
import { useRouter } from 'vue-router'

const router = useRouter()

// 页面跳转
router.push('/workbench')

// 带参数跳转
router.push({ path: '/reservation/detail', query: { id: '123' } })
```

---

## 六、业务术语

| 术语 | 说明 |
|------|------|
| 预约单 | 客户线上提交的预约信息 |
| 电话确认 | 门店拨打电话确认客户预约意向 |
| 核销 | 客户到店付款提货的过程 |
| 爽约 | 客户确认预约后未到店 |

---

## 七、后端控制器架构【2026-01-17更新】

门店端API的控制器已拆分为4个模块，便于维护：

```
server/src/controllers/store/
├── index.ts              # 模块导出（保持向后兼容）
├── listController.ts     # 预约列表：stats, pending, list, detail
├── confirmController.ts  # 电话确认：call, confirm, fail
├── pickupController.ts   # 核销：search, complete, today-stats
└── prepareController.ts  # 备货：pending, preparing, start, complete
```

### 利润结算统一服务
核销时的利润入账逻辑已抽取为独立服务：

```typescript
// server/src/services/profit/settlementExecutor.ts
import { settleAllProfits, ProfitDistribution } from '../profit/settlementExecutor';

// 使用示例（在事务中调用）
await settleAllProfits(distribution, 'RESERVATION', reservationId, reservationNo, tx);
```

---

## 八、更新日志

### 2026-01-24（文档更新）
- [更新] 文档版本升级为v2.0
- [补充] 代金券核销功能文档
- [补充] 代金券API接口汇总
- [更新] 目录结构添加CouponRedeem.vue

### 2026-01-18（代金券核销）
- [新增] 代金券核销页面 `/coupon-redeem`
- [新增] 扫码核销推销员代金券功能
- [新增] 代金券验证和核销API

### 2026-01-17（代码重构）
- [重构] 门店控制器拆分为4个模块
  - listController: 预约列表管理
  - confirmController: 电话确认流程
  - pickupController: 核销流程
  - prepareController: 备货流程
- [新增] 利润结算统一服务 settlementExecutor
- [新增] 列表查询构建器 listQueryBuilder
- [新增] 前端公共库 shared/（状态常量、格式化函数）

### 2026-01-17（备货功能升级）
- [新增] 备货管理功能
  - 待备货/备货中/待提货三个状态
  - 备货详情页（商品勾选、进度条、问题上报）
  - 完成备货生成8位提货码
- [新增] 提货码核销
  - 核销页支持提货码验证
  - 优先显示提货码输入框
- [新增] 定时任务
  - 每天9:00将明日提货的"已确认"转为"待备货"
- [移除] 小程序版本（miniprogram-warehouse），仅保留H5版本
- [更新] 文档改为H5版本说明

### 2026-01-16
- [重构] 从库管端改造为门店端
- [新增] 预约确认功能（电话确认流程）
- [新增] 预约核销功能（到店提货）
- [移除] 锁货交接相关功能
- [更新] API接口为门店端预约API

---

*本文档由AI维护，每次门店端开发完成后请更新相关章节。*

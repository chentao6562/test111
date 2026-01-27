# API参考文档

**版本**: v2.0 | **更新**: 2026-01-25

| 环境 | 基础URL |
|------|---------|
| **生产环境** | `http://39.104.113.121/api` |
| 测试环境 | `http://39.104.58.26/api` |

---

## 📋 API分类索引

| 分类 | 端点数 | 说明 |
|------|--------|------|
| [认证API](#认证api) | 4 | 登录、验证码 |
| [商品API](#商品api) | 8 | 商品、分类 |
| [订单API](#订单api) | 15 | 订单管理 |
| [库管API](#库管api) | 12 | 接单、核销、库存 |
| [货管API](#货管api) | 18 | 移库任务、抢单、提现 |
| [分润API](#分润api) | 7 | 分润、提现 |
| [砍价活动API](#砍价活动api) | 22 | 砍价发起、帮砍、下单 |
| [拼团活动API](#拼团活动api) | 15 | 开团、参团、管理 |
| [大转盘活动API](#大转盘活动api) | 25 | 抽奖、助力、兑换 |
| [锁价活动API](#锁价活动api) | 6 | 锁价创建、验证 |
| [秒杀活动API](#秒杀活动api) | 9 | 秒杀管理 |
| [代金券API](#代金券api) | 12 | 代金券发放、核销 |
| [审计追踪API](#审计追踪api) | 12 | 资金追踪、对账 |
| [管理后台API](#管理后台api) | 25+ | 全部管理功能 |
| [移库管理API](#移库管理api) | 12 | 撮合打包 |

**总计**: 200+ API端点

---

## 🔐 认证方式

所有需要认证的API使用JWT Token：

```http
Authorization: Bearer <token>
```

### Token类型
- **代理商**: `type: 'agent'`
- **员工**: `type: 'staff'`
- **管理员**: `type: 'admin'`

---

## 🔒 统一错误码

| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 200 | - | 成功 |
| 400 | INVALID_PARAMS | 请求参数错误 |
| 400 | DUPLICATE_REQUEST | 重复请求 |
| 400 | ACTIVITY_ENDED | 活动已结束 |
| 400 | INSUFFICIENT_STOCK | 库存不足 |
| 400 | LIMIT_EXCEEDED | 超出限制 |
| 401 | UNAUTHORIZED | 未认证或Token无效 |
| 403 | FORBIDDEN | 无权限 |
| 403 | BLACKLISTED | 用户在黑名单中 |
| 404 | NOT_FOUND | 资源不存在 |
| 429 | RATE_LIMITED | 请求过于频繁 |
| 500 | INTERNAL_ERROR | 服务器错误 |

---

## 📡 认证API

### 发送验证码
```http
POST /api/auth/send-code
Content-Type: application/json

{
  "phone": "13800138000",
  "type": "LOGIN" | "REGISTER"
}
```

**响应**:
```json
{
  "success": true,
  "message": "验证码已发送"
}
```

**限流**: 60秒间隔，每日10条

---

### 手机号登录
```http
POST /api/auth/phone-login
Content-Type: application/json

{
  "phone": "13800138000",
  "code": "123456",
  "inviteCode": "ABC123" // 可选
}
```

**响应**:
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "name": "张三",
    "phone": "138****8000",
    "type": "LEVEL1"
  }
}
```

---

### 员工登录
```http
POST /api/staff/login
Content-Type: application/json

{
  "username": "warehouse01",
  "password": "123456"
}
```

---

### 管理员登录
```http
POST /api/admin/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

---

## 🛍️ 商品API

### 获取商品列表
```http
GET /api/products?page=1&limit=20&categoryId=1&search=烟花
```

**查询参数**:
- `page`: 页码
- `limit`: 每页数量
- `categoryId`: 分类ID（可选）
- `search`: 搜索关键词（可选）

**响应**:
```json
{
  "products": [
    {
      "id": 1,
      "name": "金玉满堂88响",
      "images": "uploads/products/xxx.jpg",
      "retailPrice": 188,
      "agentPrice": 158,
      "wholesalePrice": 138,
      "stock": 100,
      "salesCount": 50,
      "transferFee": 50,
      "allowTransfer": true
    }
  ],
  "total": 100,
  "page": 1,
  "totalPages": 5
}
```

---

### 获取商品详情
```http
GET /api/products/:id
```

---

### 获取分类列表
```http
GET /api/categories
```

---

## 📦 订单API

### 创建订单
```http
POST /api/orders
Authorization: Bearer <agent-token>
Content-Type: application/json

{
  "items": [
    {
      "productId": 1,
      "quantity": 2,
      "price": 158
    }
  ],
  "contactName": "张三",
  "contactPhone": "13800138000",
  "pickupDate": "2026-01-15",
  "remark": "备注",
  "needTransfer": true,
  "deliveryName": "李四",
  "deliveryPhone": "13900139000",
  "deliveryAddress": "XX市XX区XX街道",
  "deliveryRemark": "移库备注"
}
```

**响应**:
```json
{
  "id": 123,
  "orderNo": "OD202601120001",
  "totalAmount": 366,
  "transferFee": 100,
  "status": "pending_payment"
}
```

---

### 获取订单列表
```http
GET /api/orders?status=pending_payment&page=1
```

---

### 获取订单详情
```http
GET /api/orders/:id
```

**响应**:
```json
{
  "id": 123,
  "orderNo": "OD202601120001",
  "status": "pending_payment",
  "totalAmount": 366,
  "paidAmount": 0,
  "fullPaid": false,
  "needTransfer": true,
  "transferFee": 100,
  "transferFeeConfirmed": true,
  "pickupCode": null,
  "transferCode": null,
  "items": [...],
  "agent": {...},
  "createdAt": "2026-01-12T10:00:00Z"
}
```

---

### 获取提货二维码
```http
GET /api/orders/:id/pickup-qrcode
Authorization: Bearer <agent-token>
```

**响应**:
```json
{
  "qrcode": "data:image/png;base64,...",
  "pickupCode": "123456",
  "expiresAt": "2026-01-12T10:01:00Z"
}
```

**说明**: 二维码60秒有效，防截图盗用

---

### 确认移库费（旧订单兼容）
```http
POST /api/orders/:id/confirm-transfer-fee
Authorization: Bearer <agent-token>
```

---

### 拒绝移库费（旧订单兼容）
```http
POST /api/orders/:id/reject-transfer-fee
Authorization: Bearer <agent-token>
```

---

## 📋 库管API

### 获取订单列表
```http
GET /api/staff/orders?status=pending_accept&page=1
Authorization: Bearer <staff-token>
```

---

### 接单
```http
POST /api/staff/orders/:id/accept
Authorization: Bearer <staff-token>
```

---

### 完成备货
```http
POST /api/staff/orders/:id/complete-preparation
Authorization: Bearer <staff-token>
```

**说明**: 生成pickupCode和transferCode（如需移库）

---

### 验证提货码
```http
POST /api/staff/pickup/verify
Authorization: Bearer <staff-token>
Content-Type: application/json

{
  "pickupCode": "123456"
}
```

**响应**:
```json
{
  "order": {
    "id": 123,
    "orderNo": "OD202601120001",
    "totalAmount": 366,
    "paidAmount": 366,
    "fullPaid": true,
    "needCollection": false
  }
}
```

---

### 确认提货
```http
POST /api/staff/pickup/confirm
Authorization: Bearer <staff-token>
Content-Type: application/json

{
  "orderId": 123
}
```

**说明**: 2026-01-11后所有订单必须全款，直接核销

---

### 收款并确认（兼容历史订单）
```http
POST /api/staff/pickup/confirm-with-payment
Authorization: Bearer <staff-token>
Content-Type: application/json

{
  "orderId": 123,
  "collectedAmount": 100
}
```

---

### 验证移库码
```http
POST /api/staff/pickup/verify-transfer
Authorization: Bearer <staff-token>
Content-Type: application/json

{
  "transferCode": "654321"
}
```

---

### 确认交接
```http
POST /api/staff/pickup/confirm-transfer
Authorization: Bearer <staff-token>
Content-Type: application/json

{
  "orderId": 123
}
```

---

### 条形码查询商品
```http
GET /api/staff/stock/product?code=6901234567890
Authorization: Bearer <staff-token>
```

**查询方式**: 条形码/SKU/商品ID/商品名称

---

### 库存盘点
```http
POST /api/staff/stock/inventory-check
Authorization: Bearer <staff-token>
Content-Type: application/json

{
  "productId": 1,
  "actualStock": 95,
  "remark": "年终盘点"
}
```

**响应**:
```json
{
  "adjusted": true,
  "difference": -5,
  "type": "INVENTORY_LOSS"
}
```

---

### 批量盘点
```http
POST /api/staff/stock/inventory-check/batch
Authorization: Bearer <staff-token>
Content-Type: application/json

{
  "items": [
    {
      "productId": 1,
      "actualStock": 95,
      "remark": "盘点"
    },
    {
      "productId": 2,
      "actualStock": 105,
      "remark": "盘点"
    }
  ]
}
```

---

## 🚚 货管API

### 获取移库任务列表
```http
GET /api/staff/transfers?status=pending&page=1
Authorization: Bearer <staff-token>
```

---

### 获取任务统计
```http
GET /api/staff/transfers/stats
Authorization: Bearer <staff-token>
```

---

### 接受任务
```http
PUT /api/staff/transfers/:id/accept
Authorization: Bearer <staff-token>
```

---

### 完成移库
```http
PUT /api/staff/transfers/:id/complete
Authorization: Bearer <staff-token>
```

---

### 验证客户提货码（货管端）
```http
POST /api/staff/logistics/verify-pickup
Authorization: Bearer <staff-token>
Content-Type: application/json

{
  "pickupCode": "123456"
}
```

---

### 确认提货（货管端）
```http
POST /api/staff/logistics/confirm-pickup
Authorization: Bearer <staff-token>
Content-Type: application/json

{
  "orderId": 123
}
```

---

### 获取可抢订单列表
```http
GET /api/staff/delivery-pool
Authorization: Bearer <staff-token>
```

---

### 抢单
```http
POST /api/staff/delivery-pool/:id/grab
Authorization: Bearer <staff-token>
```

---

### 获取移库统计
```http
GET /api/staff/delivery-stats
Authorization: Bearer <staff-token>
```

---

### 设置接单状态
```http
PUT /api/staff/availability
Authorization: Bearer <staff-token>
Content-Type: application/json

{
  "available": true
}
```

---

### 获取收入统计
```http
GET /api/staff/income
Authorization: Bearer <staff-token>
```

**响应**:
```json
{
  "monthlyIncome": 1500,
  "totalIncome": 5000,
  "balance": 1200
}
```

---

### 获取收入明细
```http
GET /api/staff/income/records?page=1
Authorization: Bearer <staff-token>
```

---

### 获取收款信息
```http
GET /api/staff/payment-info
Authorization: Bearer <staff-token>
```

---

### 更新收款信息
```http
PUT /api/staff/payment-info
Authorization: Bearer <staff-token>
Content-Type: application/json

{
  "paymentMethod": "BANK_CARD",
  "bankName": "中国工商银行",
  "accountName": "张三",
  "accountNumber": "6222****1234"
}
```

---

### 申请提现
```http
POST /api/staff/withdrawals
Authorization: Bearer <staff-token>
Content-Type: application/json

{
  "amount": 500
}
```

---

### 获取提现记录
```http
GET /api/staff/withdrawals?page=1
Authorization: Bearer <staff-token>
```

---

### 获取提现统计
```http
GET /api/staff/withdrawals/stats
Authorization: Bearer <staff-token>
```

---

### 获取可抢打包
```http
GET /api/staff/transfer-bundles
Authorization: Bearer <staff-token>
```

---

### 抢打包
```http
POST /api/staff/transfer-bundles/:id/grab
Authorization: Bearer <staff-token>
```

---

### 获取已抢打包
```http
GET /api/staff/my-bundles
Authorization: Bearer <staff-token>
```

---

## 💰 分润API

### 获取分润中心数据
```http
GET /api/commission/center
Authorization: Bearer <agent-token>
```

**响应**:
```json
{
  "balance": 1000,
  "totalCommission": 5000,
  "monthCommission": 800,
  "pendingCommission": 200
}
```

---

### 获取分润记录
```http
GET /api/commission/records?type=DIRECT&page=1
Authorization: Bearer <agent-token>
```

---

### 申请提现
```http
POST /api/commission/withdraw
Authorization: Bearer <agent-token>
Content-Type: application/json

{
  "amount": 500
}
```

---

### 获取提现记录
```http
GET /api/commission/withdrawals?page=1
Authorization: Bearer <agent-token>
```

---

### 获取推广数据
```http
GET /api/commission/promotion
Authorization: Bearer <agent-token>
```

---

### 获取邀请记录
```http
GET /api/commission/invite-records?page=1
Authorization: Bearer <agent-token>
```

---

### 获取团队统计
```http
GET /api/commission/team
Authorization: Bearer <agent-token>
```

---

## 🔪 砍价活动API

> **基础路径**: `/api/bargain` (H5端) / `/api/admin/bargain` (管理后台)

### H5端接口

#### 获取砍价活动配置
```http
GET /api/bargain/config
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "新春砍价活动",
    "startTime": "2026-01-20T00:00:00Z",
    "endTime": "2026-02-14T23:59:59Z",
    "minHelpCount": 5,
    "maxHelpCount": 20,
    "minCutAmount": 1,
    "maxCutAmount": 50,
    "helpCooldown": 24,
    "status": "ACTIVE",
    "rules": ["每人每天最多帮砍3次", "砍价有效期48小时"]
  }
}
```

---

#### 获取砍价商品列表
```http
GET /api/bargain/products?page=1&limit=20
```

**响应**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "productId": 100,
        "productName": "豪华烟花组合",
        "productImage": "uploads/products/xxx.jpg",
        "originalPrice": 888,
        "floorPrice": 388,
        "stock": 50
      }
    ],
    "total": 10,
    "page": 1,
    "pageSize": 20
  }
}
```

---

#### 获取砍价详情（分享页面用）
```http
GET /api/bargain/detail/:code
```

**响应**:
```json
{
  "success": true,
  "data": {
    "code": "BG20260122001",
    "status": "IN_PROGRESS",
    "currentPrice": 588,
    "floorPrice": 388,
    "originalPrice": 888,
    "helpCount": 8,
    "minHelpCount": 15,
    "expireAt": "2026-01-24T10:00:00Z",
    "product": {
      "id": 100,
      "name": "豪华烟花组合",
      "image": "uploads/products/xxx.jpg"
    },
    "cuts": [
      {
        "nickname": "张**",
        "avatar": "...",
        "cutAmount": 25,
        "createdAt": "2026-01-22T12:00:00Z"
      }
    ]
  }
}
```

---

#### 发送帮砍验证码
```http
POST /api/bargain/help-cut/send-code
Content-Type: application/json

{
  "phone": "13800138000",
  "bargainCode": "BG20260122001"
}
```

---

#### 帮砍（需要短信验证码）
```http
POST /api/bargain/help-cut
Content-Type: application/json

{
  "bargainCode": "BG20260122001",
  "phone": "13800138000",
  "code": "123456",
  "nickname": "热心网友"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "cutAmount": 25.5,
    "currentPrice": 562.5,
    "isFloor": false,
    "message": "恭喜砍掉25.5元！"
  }
}
```

---

#### 获取采购单门槛状态（需登录）
```http
GET /api/bargain/eligibility
Authorization: Bearer <agent-token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "cartAmount": 200,
    "threshold": 100,
    "eligible": true
  }
}
```

---

#### 发起砍价（需登录）
```http
POST /api/bargain/create
Authorization: Bearer <agent-token>
Content-Type: application/json

{
  "configItemId": 1
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "code": "BG20260122001",
    "shareUrl": "http://xxx/bargain/BG20260122001",
    "expireAt": "2026-01-24T10:00:00Z"
  }
}
```

---

#### 获取我的砍价列表（需登录）
```http
GET /api/bargain/my?status=IN_PROGRESS&page=1
Authorization: Bearer <agent-token>
```

---

#### 取消砍价（需登录）
```http
DELETE /api/bargain/:code/cancel
Authorization: Bearer <agent-token>
```

---

#### 砍价成功后下单（需登录）
```http
POST /api/bargain/:code/order
Authorization: Bearer <agent-token>
Content-Type: application/json

{
  "contactName": "张三",
  "contactPhone": "13800138000",
  "pickupDate": "2026-02-01"
}
```

---

#### 获取砍价关联的预约信息（需登录）
```http
GET /api/bargain/:code/reservation
Authorization: Bearer <agent-token>
```

---

#### 砍价商品加入采购单（需登录）
```http
POST /api/bargain/:code/add-to-cart
Authorization: Bearer <agent-token>
```

---

#### 从采购单移除砍价商品（需登录）
```http
DELETE /api/bargain/:code/remove-from-cart
Authorization: Bearer <agent-token>
```

---

### 管理后台接口

#### 创建砍价活动
```http
POST /api/admin/bargain/config
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "新春砍价活动",
  "startTime": "2026-01-20T00:00:00Z",
  "endTime": "2026-02-14T23:59:59Z",
  "minHelpCount": 5,
  "maxHelpCount": 20,
  "minCutAmount": 1,
  "maxCutAmount": 50,
  "helpCooldown": 24,
  "rules": ["规则说明..."],
  "items": [
    {
      "productId": 100,
      "floorPrice": 388,
      "stock": 50
    }
  ]
}
```

---

#### 获取活动列表
```http
GET /api/admin/bargain/configs?page=1&status=ACTIVE
Authorization: Bearer <admin-token>
```

---

#### 获取活动详情
```http
GET /api/admin/bargain/config/:id
Authorization: Bearer <admin-token>
```

---

#### 更新活动
```http
PUT /api/admin/bargain/config/:id
Authorization: Bearer <admin-token>
```

---

#### 删除活动
```http
DELETE /api/admin/bargain/config/:id
Authorization: Bearer <admin-token>
```

---

#### 启用/禁用活动
```http
POST /api/admin/bargain/config/:id/toggle
Authorization: Bearer <admin-token>
```

---

#### 获取砍价统计
```http
GET /api/admin/bargain/stats
Authorization: Bearer <admin-token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "totalBargains": 1500,
    "successBargains": 800,
    "totalOrders": 650,
    "totalGmv": 258000,
    "conversionRate": 53.33,
    "avgCutAmount": 320
  }
}
```

---

#### 获取砍价列表
```http
GET /api/admin/bargain/list?status=SUCCESS&page=1
Authorization: Bearer <admin-token>
```

---

#### 获取砍价详情
```http
GET /api/admin/bargain/:id
Authorization: Bearer <admin-token>
```

---

#### 获取黑名单列表
```http
GET /api/admin/bargain/blacklist?page=1
Authorization: Bearer <admin-token>
```

---

#### 添加黑名单
```http
POST /api/admin/bargain/blacklist
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "phone": "13800138000",
  "reason": "恶意刷砍价"
}
```

---

#### 移除黑名单
```http
DELETE /api/admin/bargain/blacklist/:id
Authorization: Bearer <admin-token>
```

---

## 👥 拼团活动API

> **基础路径**: `/api/group-buy` (H5端) / `/api/store/group-buy` (门店端)

### H5端接口

#### 获取拼团配置
```http
GET /api/group-buy/config
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "新春拼团",
    "minMembers": 3,
    "maxMembers": 5,
    "duration": 48,
    "status": "ACTIVE",
    "bonusGift": {
      "id": 10,
      "name": "精美礼品",
      "image": "..."
    },
    "rules": ["满3人成团", "团长额外获得礼品"]
  }
}
```

---

#### 获取拼团详情
```http
GET /api/group-buy/detail/:code
```

**响应**:
```json
{
  "success": true,
  "data": {
    "code": "GB20260122001",
    "status": "IN_PROGRESS",
    "currentMembers": 2,
    "minMembers": 3,
    "maxMembers": 5,
    "expireAt": "2026-01-24T10:00:00Z",
    "leader": {
      "nickname": "团长小明",
      "avatar": "..."
    },
    "members": [
      {
        "nickname": "成员A",
        "avatar": "...",
        "joinedAt": "2026-01-22T12:00:00Z"
      }
    ]
  }
}
```

---

#### 发起拼团（需登录）
```http
POST /api/group-buy/create
Authorization: Bearer <agent-token>
Content-Type: application/json

{
  "configId": 1,
  "reservationId": 100
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "code": "GB20260122001",
    "shareUrl": "http://xxx/group-buy/GB20260122001",
    "expireAt": "2026-01-24T10:00:00Z"
  }
}
```

---

#### 加入拼团（需登录）
```http
POST /api/group-buy/join
Authorization: Bearer <agent-token>
Content-Type: application/json

{
  "groupBuyCode": "GB20260122001",
  "reservationId": 101
}
```

---

#### 获取我的拼团列表（需登录）
```http
GET /api/group-buy/my?status=IN_PROGRESS&page=1
Authorization: Bearer <agent-token>
```

---

#### 获取同区域可加入的拼团（顺路拼团）
```http
GET /api/group-buy/nearby?area=和林格尔县
Authorization: Bearer <agent-token>
```

---

#### 退出拼团（需登录）
```http
DELETE /api/group-buy/:code/quit
Authorization: Bearer <agent-token>
```

---

### 门店端接口

#### 查询预约关联的拼团
```http
GET /api/store/group-buy/:reservationId
Authorization: Bearer <staff-token>
```

---

#### 发放拼团赠品
```http
POST /api/store/group-buy/deliver-bonus
Authorization: Bearer <staff-token>
Content-Type: application/json

{
  "groupBuyId": 1,
  "agentId": 100
}
```

---

#### 获取待发放拼团赠品列表
```http
GET /api/store/group-buy/pending-bonus?page=1
Authorization: Bearer <staff-token>
```

---

## 🎡 大转盘活动API

> **基础路径**: `/api/spin-wheel` (H5端) / `/api/admin/spin-wheel` (管理后台)

### H5端接口

#### 获取活动配置
```http
GET /api/spin-wheel/config
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "新春现金大转盘",
    "startTime": "2026-01-20T00:00:00Z",
    "endTime": "2026-02-14T23:59:59Z",
    "status": "ACTIVE",
    "prizes": [
      {"id": 1, "name": "10元现金", "amount": 10, "probability": 10},
      {"id": 2, "name": "5元现金", "amount": 5, "probability": 20},
      {"id": 3, "name": "2元现金", "amount": 2, "probability": 30},
      {"id": 4, "name": "1元现金", "amount": 1, "probability": 25},
      {"id": 5, "name": "谢谢参与", "amount": 0, "probability": 15}
    ],
    "rules": ["每次助力获得1次抽奖机会", "奖金满50元可兑换代金券"]
  }
}
```

---

#### 获取分享页详情
```http
GET /api/spin-wheel/detail/:code
```

---

#### 发送助力验证码
```http
POST /api/spin-wheel/help/send-code
Content-Type: application/json

{
  "phone": "13800138000",
  "participationCode": "SW20260122001"
}
```

---

#### 助力
```http
POST /api/spin-wheel/help
Content-Type: application/json

{
  "participationCode": "SW20260122001",
  "phone": "13800138000",
  "code": "123456"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "message": "助力成功！您的好友获得1次抽奖机会"
  }
}
```

---

#### 获取滚动播报
```http
GET /api/spin-wheel/notices?limit=10
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "nickname": "张**",
      "prize": "10元现金",
      "time": "刚刚"
    }
  ]
}
```

---

#### 加入活动（需登录）
```http
POST /api/spin-wheel/join
Authorization: Bearer <agent-token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "code": "SW20260122001",
    "shareUrl": "http://xxx/spin-wheel/SW20260122001",
    "spinCount": 1
  }
}
```

---

#### 获取我的参与信息（需登录）
```http
GET /api/spin-wheel/my
Authorization: Bearer <agent-token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "code": "SW20260122001",
    "spinCount": 5,
    "totalWinAmount": 28,
    "helpCount": 4,
    "canRedeem": false,
    "redeemThreshold": 50
  }
}
```

---

#### 抽奖（需登录）
```http
POST /api/spin-wheel/spin
Authorization: Bearer <agent-token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "prizeIndex": 2,
    "prizeName": "2元现金",
    "amount": 2,
    "remainingSpins": 4,
    "totalWinAmount": 30
  }
}
```

---

#### 分享获得次数（需登录）
```http
POST /api/spin-wheel/share
Authorization: Bearer <agent-token>
```

---

#### 获取抽奖记录（需登录）
```http
GET /api/spin-wheel/records?page=1
Authorization: Bearer <agent-token>
```

---

#### 兑换代金券（需登录）
```http
POST /api/spin-wheel/redeem
Authorization: Bearer <agent-token>
Content-Type: application/json

{
  "amount": 50
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "couponId": 123,
    "couponAmount": 50,
    "remainingAmount": 0
  }
}
```

---

#### 检查兑换资格（需登录）
```http
GET /api/spin-wheel/redeem/check
Authorization: Bearer <agent-token>
```

---

#### 获取兑换记录（需登录）
```http
GET /api/spin-wheel/redeems?page=1
Authorization: Bearer <agent-token>
```

---

### 管理后台接口

#### 创建大转盘活动
```http
POST /api/admin/spin-wheel/config
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "新春现金大转盘",
  "startTime": "2026-01-20T00:00:00Z",
  "endTime": "2026-02-14T23:59:59Z",
  "prizes": [...],
  "redeemThreshold": 50,
  "maxSpinsPerDay": 10,
  "rules": ["..."]
}
```

---

#### 获取活动列表
```http
GET /api/admin/spin-wheel/configs?page=1
Authorization: Bearer <admin-token>
```

---

#### 获取活动详情
```http
GET /api/admin/spin-wheel/config/:id
Authorization: Bearer <admin-token>
```

---

#### 更新活动
```http
PUT /api/admin/spin-wheel/config/:id
Authorization: Bearer <admin-token>
```

---

#### 删除活动
```http
DELETE /api/admin/spin-wheel/config/:id
Authorization: Bearer <admin-token>
```

---

#### 启用/禁用活动
```http
POST /api/admin/spin-wheel/config/:id/toggle
Authorization: Bearer <admin-token>
```

---

#### 获取统计数据
```http
GET /api/admin/spin-wheel/stats
Authorization: Bearer <admin-token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "totalParticipants": 5000,
    "totalSpins": 25000,
    "totalHelpCount": 15000,
    "totalWinAmount": 38000,
    "totalRedeemed": 25000,
    "conversionRate": 65.79
  }
}
```

---

#### 获取参与列表
```http
GET /api/admin/spin-wheel/participations?page=1
Authorization: Bearer <admin-token>
```

---

#### 获取参与详情
```http
GET /api/admin/spin-wheel/participation/:id
Authorization: Bearer <admin-token>
```

---

#### 获取兑换列表
```http
GET /api/admin/spin-wheel/redeems?status=SUCCESS&page=1
Authorization: Bearer <admin-token>
```

---

#### 获取兑换详情
```http
GET /api/admin/spin-wheel/redeem/:id
Authorization: Bearer <admin-token>
```

---

#### 重试失败的兑换
```http
POST /api/admin/spin-wheel/redeem/:id/retry
Authorization: Bearer <admin-token>
```

---

#### 获取黑名单列表
```http
GET /api/admin/spin-wheel/blacklist?page=1
Authorization: Bearer <admin-token>
```

---

#### 添加黑名单
```http
POST /api/admin/spin-wheel/blacklist
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "phone": "13800138000",
  "reason": "恶意刷助力"
}
```

---

#### 移除黑名单
```http
DELETE /api/admin/spin-wheel/blacklist/:id
Authorization: Bearer <admin-token>
```

---

## 🔒 锁价活动API

> **基础路径**: `/api/price-lock`

#### 获取锁价配置
```http
GET /api/price-lock/config
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "春节锁价",
    "duration": 72,
    "maxLockCount": 3,
    "status": "ACTIVE",
    "rules": ["锁定后72小时内有效", "每人最多锁定3次"]
  }
}
```

---

#### 创建锁价
```http
POST /api/price-lock/create
Authorization: Bearer <agent-token>
Content-Type: application/json

{
  "productId": 100,
  "quantity": 2,
  "price": 188
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "code": "PL20260122001",
    "expireAt": "2026-01-25T10:00:00Z",
    "product": {
      "id": 100,
      "name": "豪华烟花组合"
    },
    "lockedPrice": 188,
    "quantity": 2
  }
}
```

---

#### 获取当前有效的锁价
```http
GET /api/price-lock/active
Authorization: Bearer <agent-token>
```

---

#### 获取我的锁价列表
```http
GET /api/price-lock/my?page=1
Authorization: Bearer <agent-token>
```

---

#### 验证锁价码
```http
POST /api/price-lock/validate
Content-Type: application/json

{
  "code": "PL20260122001"
}
```

---

#### 获取锁价详情
```http
GET /api/price-lock/:code
```

---

## ⚡ 秒杀活动API

> **基础路径**: `/api/admin/flash-sale` (管理后台)

#### 获取活动列表
```http
GET /api/admin/flash-sale/activities?page=1&status=ACTIVE
Authorization: Bearer <admin-token>
```

---

#### 获取活动详情
```http
GET /api/admin/flash-sale/activities/:id
Authorization: Bearer <admin-token>
```

---

#### 创建活动
```http
POST /api/admin/flash-sale/activities
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "限时秒杀",
  "startTime": "2026-01-25T10:00:00Z",
  "endTime": "2026-01-25T12:00:00Z",
  "items": [
    {
      "productId": 100,
      "flashPrice": 99,
      "stock": 50,
      "limitPerUser": 1
    }
  ]
}
```

---

#### 更新活动
```http
PUT /api/admin/flash-sale/activities/:id
Authorization: Bearer <admin-token>
```

---

#### 删除活动
```http
DELETE /api/admin/flash-sale/activities/:id
Authorization: Bearer <admin-token>
```

---

#### 更新活动状态
```http
PUT /api/admin/flash-sale/activities/:id/status
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "status": "ACTIVE"
}
```

---

#### 添加秒杀商品
```http
POST /api/admin/flash-sale/activities/:id/items
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "productId": 101,
  "flashPrice": 59,
  "stock": 30,
  "limitPerUser": 2
}
```

---

#### 更新秒杀商品
```http
PUT /api/admin/flash-sale/activities/:id/items/:itemId
Authorization: Bearer <admin-token>
```

---

#### 删除秒杀商品
```http
DELETE /api/admin/flash-sale/activities/:id/items/:itemId
Authorization: Bearer <admin-token>
```

---

## 🎫 代金券API

> **基础路径**:
> - `/api/campaign2026` (推销员端)
> - `/api/coupon-activity` (H5领券)
> - `/api/admin/coupon-activity` (管理后台活动)
> - `/api/admin/coupon-manage` (管理后台统计)
> - `/api/store` (门店核销)

### 推销员端接口

#### 获取我的代金券列表
```http
GET /api/campaign2026/coupons?status=UNUSED&page=1
Authorization: Bearer <agent-token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "amount": 20,
        "source": "FIRST_ORDER",
        "sourceName": "首单成交奖励",
        "status": "UNUSED",
        "expireAt": "2026-02-14T23:59:59Z",
        "qrcode": "..."
      }
    ],
    "total": 5,
    "page": 1
  }
}
```

---

#### 获取我的代金券统计
```http
GET /api/campaign2026/coupons/stats
Authorization: Bearer <agent-token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "totalAmount": 150,
    "usedAmount": 50,
    "unusedAmount": 100,
    "expiredAmount": 0,
    "couponCount": 8
  }
}
```

---

### H5领券接口

#### 获取可领取的活动列表
```http
GET /api/coupon-activity
Authorization: Bearer <token>
```

---

#### 领取代金券
```http
POST /api/coupon-activity/:id/claim
Authorization: Bearer <token>
```

---

### 一级给二级发券

#### 获取可发券的二级列表
```http
GET /api/coupon-manage/level2-list
Authorization: Bearer <agent-token>
```

---

#### 一级给二级发券
```http
POST /api/coupon-manage/grant
Authorization: Bearer <agent-token>
Content-Type: application/json

{
  "targetAgentId": 100,
  "amount": 10,
  "reason": "激励发券"
}
```

---

### 门店核销接口

#### 验证代金券
```http
GET /api/store/coupon/verify?code=COUPON123
Authorization: Bearer <staff-token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "amount": 20,
    "agent": {
      "id": 100,
      "name": "张三",
      "phone": "138****8000"
    },
    "status": "UNUSED",
    "expireAt": "2026-02-14T23:59:59Z"
  }
}
```

---

#### 核销代金券
```http
POST /api/store/coupon/redeem
Authorization: Bearer <staff-token>
Content-Type: application/json

{
  "couponId": 1
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "redeemAmount": 20,
    "message": "核销成功"
  }
}
```

---

### 管理后台活动接口

#### 获取活动列表
```http
GET /api/admin/coupon-activity?page=1
Authorization: Bearer <admin-token>
```

---

#### 获取活动详情
```http
GET /api/admin/coupon-activity/:id
Authorization: Bearer <admin-token>
```

---

#### 创建活动
```http
POST /api/admin/coupon-activity
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "新用户领券",
  "amount": 10,
  "totalCount": 1000,
  "limitPerUser": 1,
  "startTime": "2026-01-20T00:00:00Z",
  "endTime": "2026-02-14T23:59:59Z"
}
```

---

#### 更新活动
```http
PUT /api/admin/coupon-activity/:id
Authorization: Bearer <admin-token>
```

---

#### 删除活动
```http
DELETE /api/admin/coupon-activity/:id
Authorization: Bearer <admin-token>
```

---

#### 切换活动状态
```http
PUT /api/admin/coupon-activity/:id/status
Authorization: Bearer <admin-token>
```

---

### 管理后台统计接口

#### 获取代金券概览
```http
GET /api/admin/coupon-manage/overview
Authorization: Bearer <admin-token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "totalIssued": 50000,
    "totalUsed": 25000,
    "totalExpired": 5000,
    "totalPending": 20000,
    "issuedAmount": 500000,
    "usedAmount": 250000
  }
}
```

---

#### 按来源统计
```http
GET /api/admin/coupon-manage/by-source
Authorization: Bearer <admin-token>
```

---

#### 按推销员统计
```http
GET /api/admin/coupon-manage/by-agent?page=1
Authorization: Bearer <admin-token>
```

---

#### 获取代金券列表
```http
GET /api/admin/coupon-manage/list?status=UNUSED&page=1
Authorization: Bearer <admin-token>
```

---

#### 管理员发券
```http
POST /api/admin/coupon-manage/grant
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "agentId": 100,
  "amount": 50,
  "reason": "客诉补偿"
}
```

---

## 📊 审计追踪API

> **基础路径**: `/api/admin/audit`
> **权限要求**: 管理员认证

### 概览

#### 获取审计概览
```http
GET /api/admin/audit/overview
Authorization: Bearer <admin-token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "todayTransactions": 1250,
    "todayAmount": 158000,
    "pendingAlerts": 3,
    "lastReconciliation": "2026-01-24T03:00:00Z",
    "reconciliationStatus": "SUCCESS"
  }
}
```

---

### 交易追踪

#### 获取推销员资金链路
```http
GET /api/admin/audit/agent/:agentId/traces?startTime=2026-01-01&endTime=2026-01-24&type=PROFIT_SETTLE&page=1
Authorization: Bearer <admin-token>
```

**查询参数**:
- `startTime`: 开始时间
- `endTime`: 结束时间
- `type`: 交易类型（可选）
- `page`: 页码

**响应**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "traceId": "TRC20260124001",
        "traceType": "PROFIT_SETTLE",
        "amount": 150,
        "beforeBalance": 500,
        "afterBalance": 650,
        "sourceTable": "reservation",
        "sourceId": 100,
        "description": "预约#100利润结算",
        "createdAt": "2026-01-24T10:00:00Z"
      }
    ],
    "total": 50,
    "page": 1
  }
}
```

---

#### 获取预约资金追溯
```http
GET /api/admin/audit/reservation/:reservationId/trace
Authorization: Bearer <admin-token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "reservation": {
      "id": 100,
      "orderNo": "RV20260124001",
      "totalAmount": 888,
      "status": "COMPLETED"
    },
    "settlements": [
      {
        "agentId": 1,
        "agentName": "总代理",
        "amount": 100,
        "type": "MASTER_PROFIT",
        "traceId": "TRC20260124001"
      },
      {
        "agentId": 10,
        "agentName": "一级推销员A",
        "amount": 80,
        "type": "LEVEL1_PROFIT",
        "traceId": "TRC20260124002"
      }
    ],
    "giftCost": {
      "amount": 10,
      "giftName": "迷你加特林",
      "deductedFrom": "一级推销员A"
    }
  }
}
```

---

#### 获取交易详情
```http
GET /api/admin/audit/trace/:traceId
Authorization: Bearer <admin-token>
```

---

### 告警管理

#### 获取告警列表
```http
GET /api/admin/audit/alerts?severity=HIGH&status=PENDING&page=1
Authorization: Bearer <admin-token>
```

**查询参数**:
- `severity`: 严重程度（LOW/MEDIUM/HIGH）
- `status`: 状态（PENDING/RESOLVED/IGNORED）
- `page`: 页码

**响应**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "alertType": "BALANCE_MISMATCH",
        "severity": "HIGH",
        "agentId": 100,
        "title": "余额不一致",
        "description": "推销员#100余额与交易记录不一致，差异: -50元",
        "status": "PENDING",
        "createdAt": "2026-01-24T03:00:00Z"
      }
    ],
    "total": 3,
    "page": 1
  }
}
```

---

#### 处理告警
```http
POST /api/admin/audit/alerts/:alertId/resolve
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "action": "RESOLVED",
  "remark": "已核实，进行调账处理"
}
```

---

### 余额调账

#### 人工调账
```http
POST /api/admin/audit/agent/:agentId/adjust
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "amount": 50,
  "reason": "系统BUG补偿",
  "relatedAlertId": 1
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "traceId": "TRC20260124003",
    "beforeBalance": 500,
    "afterBalance": 550,
    "adjustAmount": 50
  }
}
```

---

### 余额快照

#### 获取快照列表
```http
GET /api/admin/audit/snapshots?agentId=100&date=2026-01-24&page=1
Authorization: Bearer <admin-token>
```

---

#### 创建单个推销员快照
```http
POST /api/admin/audit/agent/:agentId/snapshot
Authorization: Bearer <admin-token>
```

---

#### 批量创建快照
```http
POST /api/admin/audit/snapshots/batch
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "snapshotType": "MANUAL"
}
```

---

### 对账

#### 手动对账
```http
POST /api/admin/audit/reconciliation
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "reconcileType": "DAILY",
  "startTime": "2026-01-23T00:00:00Z",
  "endTime": "2026-01-24T00:00:00Z"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "reconcileId": 1,
    "totalAgents": 500,
    "consistentCount": 495,
    "discrepancyCount": 5,
    "status": "COMPLETED",
    "discrepancies": [
      {
        "agentId": 100,
        "expectedBalance": 550,
        "actualBalance": 500,
        "discrepancy": -50
      }
    ]
  }
}
```

---

#### 获取对账记录
```http
GET /api/admin/audit/reconciliation/logs?page=1
Authorization: Bearer <admin-token>
```

---

## 🔧 管理后台API

### 订单管理

#### 确认收款
```http
POST /api/admin/orders/:id/confirm-payment
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "paidAmount": 366,
  "paymentMethod": "CASH"
}
```

---

#### 设置移库费（旧流程）
```http
PUT /api/admin/orders/:id/transfer-fee
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "transferFee": 100
}
```

---

### 财务管理

#### 获取财务统计
```http
GET /api/admin/finance/statistics
Authorization: Bearer <admin-token>
```

---

#### 审核代理商提现
```http
POST /api/admin/commission/withdrawals/:id/review
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "status": "APPROVED" | "REJECTED",
  "remark": "审核备注"
}
```

---

#### 确认代理商打款
```http
POST /api/admin/commission/withdrawals/:id/complete
Authorization: Bearer <admin-token>
```

---

#### 获取员工提现列表
```http
GET /api/admin/staff-withdrawals?status=PENDING&page=1
Authorization: Bearer <admin-token>
```

---

#### 审核员工提现
```http
POST /api/admin/staff-withdrawals/:id/review
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "status": "APPROVED" | "REJECTED",
  "remark": "审核备注"
}
```

---

#### 确认员工打款
```http
POST /api/admin/staff-withdrawals/:id/complete
Authorization: Bearer <admin-token>
```

---

## 🚛 移库管理API

### 获取撮合配置
```http
GET /api/admin/transfer/config
Authorization: Bearer <admin-token>
```

**响应**:
```json
{
  "minBundleFee": 500,
  "maxOrdersPerBundle": 5,
  "maxWaitHours": 24,
  "autoMatchEnabled": true
}
```

---

### 更新撮合配置
```http
PUT /api/admin/transfer/config
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "minBundleFee": 600,
  "maxOrdersPerBundle": 6
}
```

---

### 获取打包统计
```http
GET /api/admin/transfer/bundles/stats
Authorization: Bearer <admin-token>
```

---

### 获取打包列表
```http
GET /api/admin/transfer/bundles?status=PENDING&page=1
Authorization: Bearer <admin-token>
```

---

### 手动创建打包
```http
POST /api/admin/transfer/bundles
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "orderIds": [1, 2, 3]
}
```

---

### 触发撮合算法
```http
POST /api/admin/transfer/bundles/match
Authorization: Bearer <admin-token>
```

---

### 获取待撮合订单
```http
GET /api/admin/transfer/pending-orders
Authorization: Bearer <admin-token>
```

---

### 获取移库任务列表
```http
GET /api/admin/transfer/tasks?status=DISPATCHED&page=1
Authorization: Bearer <admin-token>
```

---

### 设置商品移库费
```http
PUT /api/admin/products/:id/transfer
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "transferFee": 50,
  "allowTransfer": true
}
```

---

### 批量设置移库费
```http
PUT /api/admin/products/batch-transfer
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "productIds": [1, 2, 3],
  "transferFee": 50,
  "allowTransfer": true
}
```

---

## 📝 最佳实践

### 1. 错误处理
```typescript
try {
  const { data } = await api.post('/api/orders', orderData)
} catch (error) {
  if (error.response?.status === 401) {
    // Token过期，重新登录
  } else if (error.response?.status === 400) {
    // 参数错误，显示错误信息
    console.error(error.response.data.message)
  }
}
```

### 2. Token刷新
```typescript
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      router.push('/login')
    }
    return Promise.reject(error)
  }
)
```

### 3. 分页处理
```typescript
const loadMore = async () => {
  const { data } = await api.get('/api/products', {
    params: { page: page + 1, limit: 20 }
  })
  products.value.push(...data.products)
  page.value++
}
```

### 4. 营销活动通用模式
```typescript
// 活动状态检查
const checkActivityStatus = (activity) => {
  const now = new Date()
  if (now < new Date(activity.startTime)) return 'NOT_STARTED'
  if (now > new Date(activity.endTime)) return 'ENDED'
  if (activity.status !== 'ACTIVE') return 'DISABLED'
  return 'ACTIVE'
}

// 黑名单检查
const isBlacklisted = async (phone, activityType) => {
  try {
    await api.post(`/api/${activityType}/check-blacklist`, { phone })
    return false
  } catch (error) {
    if (error.response?.data?.code === 'BLACKLISTED') return true
    throw error
  }
}
```

---

**最后更新**: 2026-01-24
**维护**: 蒙庆烟花开发团队

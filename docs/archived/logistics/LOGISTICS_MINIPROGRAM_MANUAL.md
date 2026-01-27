# 货管端小程序开发手册

> 本手册为货管端小程序(miniprogram-logistics)的完整开发文档，供后续AI开发者参考。
> 最后更新：2026-01-11

---

## 一、概述

### 1.1 功能定位
货管端是蒙庆烟花系统中负责**VIP移库服务**的小程序，主要功能：
- 从抢单大厅抢取移库订单
- 将商品从总仓移至代理商指定分仓
- 完成客户提货核销
- 管理移库收入和提现

### 1.2 用户角色
- **使用者**：货物管理员（LOGISTICS角色）
- **区别于**：库管员（WAREHOUSE角色）使用库管端

### 1.3 业务场景
```
代理商下单(VIP移库) → 客服设置移库费 → 代理商确认 → 库管备货
→ 进入抢单池 → 货管抢单 → 货管移库 → 客户到分仓提货 → 货管核销
```

---

## 二、目录结构

```
miniprogram-logistics/
├── app.js                      # 全局状态管理
├── app.json                    # 页面和TabBar配置
├── app.wxss                    # 全局样式
├── utils/
│   ├── request.js              # HTTP请求封装
│   └── format.js               # 格式化工具
├── pages/
│   ├── login/                  # 登录页
│   │   ├── index.js
│   │   ├── index.wxml
│   │   ├── index.wxss
│   │   └── index.json
│   ├── tasks/                  # 任务管理
│   │   ├── index.*             # 任务列表（含抢单大厅）
│   │   └── detail.*            # 任务详情
│   ├── pickup/                 # 提货核销
│   │   └── index.*
│   ├── income/                 # 收入统计
│   │   └── index.*
│   ├── my/                     # 个人中心
│   │   └── index.*
│   └── withdraw/               # 提现功能
│       ├── index.*             # 提现申请
│       └── records.*           # 提现记录
└── images/                     # 静态资源
```

---

## 三、核心文件说明

### 3.1 app.js - 全局状态管理

```javascript
// 关键配置
globalData: {
  baseUrl: 'http://39.104.58.26/api',  // API基础地址
  userInfo: null,                       // 用户信息
  token: null,                          // JWT Token
  tasksTab: ''                          // 任务页Tab状态（用于跨页传参）
}

// 核心方法
checkLogin()      // 检查登录状态，返回boolean
setLoginInfo()    // 保存登录信息到Storage
clearLoginInfo()  // 清除登录信息（退出登录用）
```

**存储键名**：
- Token: `logistics_token`
- 用户信息: `logistics_user`

### 3.2 app.json - 页面配置

```json
{
  "pages": [
    "pages/login/index",      // 登录页（首页）
    "pages/tasks/index",      // 任务列表
    "pages/tasks/detail",     // 任务详情
    "pages/pickup/index",     // 提货核销
    "pages/income/index",     // 收入统计
    "pages/my/index",         // 个人中心
    "pages/withdraw/index",   // 提现申请
    "pages/withdraw/records"  // 提现记录
  ],
  "tabBar": {
    "list": [
      { "pagePath": "pages/tasks/index", "text": "任务" },
      { "pagePath": "pages/pickup/index", "text": "核销" },
      { "pagePath": "pages/income/index", "text": "收入" },
      { "pagePath": "pages/my/index", "text": "我的" }
    ]
  }
}
```

### 3.3 utils/request.js - HTTP请求封装

```javascript
// 导出方法
get(url, params, options)    // GET请求
post(url, data, options)     // POST请求
put(url, data, options)      // PUT请求
delete(url, data, options)   // DELETE请求

// 自动处理
- Bearer Token添加到Authorization头
- 401响应自动跳转登录页
- 统一错误处理
```

---

## 四、页面详细文档

### 4.1 登录页 (pages/login/index)

#### 功能
- 员工账号密码登录
- 角色验证（仅LOGISTICS可登录）
- 记住账号功能

#### 数据结构
```javascript
data: {
  username: '',        // 用户名
  password: '',        // 密码
  remember: false,     // 记住账号
  agreed: false,       // 用户协议勾选
  loading: false       // 登录中状态
}
```

#### API接口
| 方法 | 端点 | 说明 |
|------|------|------|
| POST | /staff/login | 员工登录 |

#### 登录流程
```javascript
1. 验证表单（用户名、密码、协议勾选）
2. 调用 POST /staff/login
3. 验证角色 === 'LOGISTICS'
4. 保存Token和用户信息
5. 使用 wx.switchTab 跳转到任务列表
```

#### 关键代码
```javascript
// 登录成功后跳转
wx.switchTab({ url: '/pages/tasks/index' })  // 必须用switchTab

// 记住账号
wx.setStorageSync('logistics_remember_account', username)
```

---

### 4.2 任务列表页 (pages/tasks/index)

#### 功能
- 四Tab切换：抢单大厅、待移库、已接单、已完成
- 抢单大厅订单列表和抢单功能
- 任务列表展示和筛选
- 统计数据展示

#### 数据结构
```javascript
data: {
  currentTab: 'GRAB',              // 当前Tab: GRAB/PENDING/ACCEPTED/COMPLETED
  tabs: [...],                     // Tab配置
  tasks: [],                       // 任务列表
  deliveryPool: [],                // 抢单池订单
  stats: {
    available: 0,                  // 可抢订单数
    todayGrabbed: 0,               // 今日已抢
    pending: 0,                    // 待移库
    accepted: 0,                   // 已接单
    completed: 0                   // 已完成
  },
  loading: false,
  isAvailable: true                // 接单状态开关
}
```

#### API接口
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | /staff/transfers | 获取任务列表 |
| GET | /staff/transfers/stats | 获取任务统计 |
| GET | /staff/delivery-pool | 获取可抢订单 |
| POST | /staff/delivery-pool/:id/grab | 抢单 |
| GET | /staff/delivery-stats | 获取抢单统计 |
| PUT | /staff/availability | 设置接单状态 |

#### 业务逻辑

**抢单大厅 vs 待移库的区别**：
| 数据源 | 表 | 状态 | 场景 |
|--------|-----|------|------|
| 抢单大厅 | delivery_pool | WAITING | 库管备货完成后进入，货管抢单 |
| 待移库 | transfer_tasks | PENDING | 管理员指派，无需抢单 |

**抢单流程**：
```
delivery_pool(WAITING)
  → POST /staff/delivery-pool/:id/grab
  → transfer_tasks(ACCEPTED) + 订单(transferring)
```

**Tab切换逻辑**：
```javascript
onTabChange(e) {
  const tab = e.currentTarget.dataset.tab
  this.setData({ currentTab: tab })

  if (tab === 'GRAB') {
    this.loadDeliveryPool()  // 加载抢单池
  } else {
    this.loadTasks()         // 加载任务列表
  }
}
```

---

### 4.3 任务详情页 (pages/tasks/detail)

#### 功能
- 显示任务完整信息
- 接受任务/完成任务操作
- 拨打代理商/库管电话
- 打开导航

#### 数据结构
```javascript
data: {
  task: null,                    // 任务数据
  loading: true,
  actionLoading: false,
  warehouseStaff: null,          // 配货库管信息
  statusMap: {
    PENDING: { text: '待确认', class: 'pending' },
    ACCEPTED: { text: '已接单', class: 'accepted' },
    COMPLETED: { text: '已完成', class: 'completed' },
    CANCELLED: { text: '已取消', class: 'cancelled' }
  },
  timeline: []                   // 时间线节点
}
```

#### API接口
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | /staff/transfers/:id | 获取任务详情 |
| PUT | /staff/transfers/:id/accept | 接受任务 |
| PUT | /staff/transfers/:id/complete | 完成任务 |

#### 任务数据结构（API返回）
```javascript
{
  id: 1,
  status: 'ACCEPTED',
  fee: 50.00,                    // 移库费
  createdAt: '2026-01-10T10:00:00',
  acceptedAt: '2026-01-10T11:00:00',
  completedAt: null,
  order: {
    orderNo: 'ORD202601100001',
    totalAmount: 1500.00,
    deliveryAddress: '代理商分仓地址',
    agent: {
      name: '张三',
      phone: '13800138000'
    },
    warehouseStaff: {            // 配货库管
      name: '李四',
      phone: '13900139000'
    },
    items: [...]
  }
}
```

#### 联系功能
```javascript
// 拨打代理商电话
callAgent() {
  const phone = this.data.task?.order?.agent?.phone
  if (phone) {
    wx.makePhoneCall({ phoneNumber: phone })
  }
}

// 拨打库管电话
callWarehouse() {
  const phone = this.data.warehouseStaff?.phone
  if (phone) {
    wx.makePhoneCall({ phoneNumber: phone })
  }
}
```

---

### 4.4 提货核销页 (pages/pickup/index)

#### 功能
- 扫码验证客户提货码
- 手动输入提货码
- 确认核销

#### 数据结构
```javascript
data: {
  pickupCode: '',                // 输入的提货码
  verifiedOrder: null,           // 验证后的订单信息
  showConfirmDialog: false,      // 确认弹窗
  loading: false,
  verifying: false,
  todayCount: 0                  // 今日核销数
}
```

#### API接口
| 方法 | 端点 | 说明 |
|------|------|------|
| POST | /staff/logistics/verify-pickup | 验证提货码 |
| POST | /staff/logistics/confirm-pickup | 确认核销 |

#### 核销条件检查
```javascript
// 后端会验证以下条件：
1. 订单存在且提货码匹配
2. needTransfer === true（锁货模式）
3. fullPaid === true（已全款）
4. status === 'pending_pickup'（待提货状态）
```

#### 核销流程
```javascript
1. 扫码/输入提货码（6位或8位）
2. POST /staff/logistics/verify-pickup
3. 显示订单信息确认弹窗
4. 点击确认 → POST /staff/logistics/confirm-pickup
5. 订单状态变为 completed
6. 触发库存扣减和分润计算
```

---

### 4.5 收入统计页 (pages/income/index)

#### 功能
- 收入概览（总收入、本月、待结算、余额）
- 收入明细列表
- 月份筛选
- 类型筛选

#### 数据结构
```javascript
data: {
  stats: {
    totalIncome: '0.00',         // 累计收入
    monthlyIncome: '0.00',       // 本月收入
    pendingIncome: '0.00',       // 待结算
    balance: '0.00'              // 可提现余额
  },
  records: [],                   // 收入明细
  currentMonth: '2026-01',       // 当前筛选月份
  currentType: 'all',            // 当前筛选类型
  page: 1,
  hasMore: true,
  loading: false
}
```

#### API接口
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | /staff/income | 获取收入统计 |
| GET | /staff/income/records | 获取收入明细 |

#### 收入类型
```javascript
const incomeTypes = [
  { value: 'all', label: '全部' },
  { value: 'TRANSFER', label: '移库任务' },
  { value: 'BONUS', label: '奖励' }
]
```

#### 注意事项
```javascript
// API返回字段兼容（历史问题）
const monthIncome = result.data.monthlyIncome || result.data.monthIncome || 0
```

---

### 4.6 个人中心页 (pages/my/index)

#### 功能
- 用户信息展示
- 统计数据卡片
- 快捷入口导航
- 联系客服
- 退出登录

#### 数据结构
```javascript
data: {
  userInfo: {
    name: '货管员',
    role: '货物管理员',
    username: '',
    avatar: ''
  },
  stats: {
    pendingTasks: 0,             // 待接单
    inProgressTasks: 0,          // 进行中
    totalTasks: 0,               // 累计任务
    monthIncome: '0.00',         // 本月收入
    completionRate: 0            // 完成率
  },
  version: 'v1.0.0'
}
```

#### API接口
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | /staff/transfers/stats | 获取任务统计 |
| GET | /staff/income | 获取收入统计 |

#### 快捷入口跳转
```javascript
// 跳转待办任务
viewPendingTasks() {
  app.globalData.tasksTab = 'PENDING'  // 存储Tab参数
  wx.switchTab({ url: '/pages/tasks/index' })
}

// 跳转进行中任务
viewInProgressTasks() {
  app.globalData.tasksTab = 'ACCEPTED'
  wx.switchTab({ url: '/pages/tasks/index' })
}

// 跳转提现（非TabBar页面）
goToWithdraw() {
  wx.navigateTo({ url: '/pages/withdraw/index' })
}
```

#### 头像占位符（无需图片）
```html
<view class="avatar-placeholder" wx:if="{{!userInfo.avatar}}">
  <text>{{userInfo.name[0] || '货'}}</text>
</view>
```

---

### 4.7 提现申请页 (pages/withdraw/index)

#### 功能
- 查看可提现余额
- 设置/修改收款信息
- 提交提现申请

#### 数据结构
```javascript
data: {
  balance: '0.00',               // 可提现余额
  amount: '',                    // 提现金额
  paymentInfo: {
    type: 'bank',                // 收款方式：bank/alipay/wechat
    accountName: '',             // 账户名
    accountNo: '',               // 账号
    bankName: ''                 // 银行名称
  },
  showPaymentForm: false,        // 收款信息编辑弹窗
  loading: false,
  submitting: false
}
```

#### API接口
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | /staff/payment-info | 获取收款信息 |
| PUT | /staff/payment-info | 更新收款信息 |
| POST | /staff/withdrawals | 申请提现 |
| GET | /staff/income | 获取余额 |

#### 提现规则
- 最低提现金额：100元
- 提现后余额立即扣减
- 状态流程：PENDING → APPROVED → COMPLETED

#### 收款方式
```javascript
const paymentTypes = [
  { value: 'bank', label: '银行卡' },
  { value: 'alipay', label: '支付宝' },
  { value: 'wechat', label: '微信' }
]
```

---

### 4.8 提现记录页 (pages/withdraw/records)

#### 功能
- 提现记录列表
- 提现统计
- 状态筛选

#### 数据结构
```javascript
data: {
  records: [],                   // 提现记录
  stats: {
    totalCount: 0,               // 总申请数
    pendingCount: 0,             // 待处理
    totalAmount: '0.00'          // 总金额
  },
  statusFilter: 'all',           // 状态筛选
  page: 1,
  hasMore: true,
  loading: false
}
```

#### API接口
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | /staff/withdrawals | 获取提现记录 |
| GET | /staff/withdrawals/stats | 获取提现统计 |

#### 提现状态
```javascript
const statusMap = {
  PENDING: { text: '审核中', color: '#FF9800' },
  APPROVED: { text: '待打款', color: '#2196F3' },
  REJECTED: { text: '已拒绝', color: '#F44336' },
  COMPLETED: { text: '已完成', color: '#4CAF50' }
}
```

---

## 五、API端点汇总

### 5.1 认证接口（2个）
| 方法 | 端点 | 说明 | 请求体 | 响应 |
|------|------|------|--------|------|
| POST | /staff/login | 员工登录 | `{username, password}` | `{token, user}` |
| GET | /staff/me | 获取当前用户 | - | `{user}` |

### 5.2 移库任务接口（5个）
| 方法 | 端点 | 说明 | 参数 | 响应 |
|------|------|------|------|------|
| GET | /staff/transfers | 任务列表 | `?status=PENDING` | `{list, total}` |
| GET | /staff/transfers/stats | 任务统计 | - | `{pending, accepted, completed}` |
| GET | /staff/transfers/:id | 任务详情 | - | `{task}` |
| PUT | /staff/transfers/:id/accept | 接受任务 | - | `{success}` |
| PUT | /staff/transfers/:id/complete | 完成任务 | - | `{success}` |

### 5.3 抢单系统接口（6个）
| 方法 | 端点 | 说明 | 参数 | 响应 |
|------|------|------|------|------|
| GET | /staff/delivery-pool | 可抢订单列表 | - | `{list}` |
| POST | /staff/delivery-pool/:id/grab | 抢单 | - | `{success, task}` |
| GET | /staff/delivery-stats | 抢单统计 | - | `{todayGrabbed, available}` |
| PUT | /staff/availability | 接单状态开关 | `{available: boolean}` | `{success}` |
| GET | /staff/income | 收入统计 | - | `{totalIncome, monthlyIncome, balance}` |
| GET | /staff/income/records | 收入明细 | `?month=&type=&page=` | `{list, total}` |

### 5.4 提货核销接口（2个）
| 方法 | 端点 | 说明 | 请求体 | 响应 |
|------|------|------|--------|------|
| POST | /staff/logistics/verify-pickup | 验证提货码 | `{pickupCode}` | `{order}` |
| POST | /staff/logistics/confirm-pickup | 确认核销 | `{orderId}` | `{success}` |

### 5.5 员工提现接口（5个）
| 方法 | 端点 | 说明 | 请求体/参数 | 响应 |
|------|------|------|------------|------|
| GET | /staff/payment-info | 获取收款信息 | - | `{paymentInfo}` |
| PUT | /staff/payment-info | 更新收款信息 | `{type, accountName, accountNo, bankName}` | `{success}` |
| GET | /staff/withdrawals | 提现记录 | `?status=&page=` | `{list, total}` |
| POST | /staff/withdrawals | 申请提现 | `{amount}` | `{success, withdrawal}` |
| GET | /staff/withdrawals/stats | 提现统计 | - | `{totalCount, pendingCount, totalAmount}` |

---

## 六、业务流程图

### 6.1 抢单流程
```
┌─────────────────────────────────────────────────────────────┐
│                        订单创建                              │
│  代理商下单(VIP移库) → 客服设置移库费 → 代理商确认           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                        库管备货                              │
│  库管接单 → 备货 → 完成备货 → 生成pickupCode+transferCode    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    进入抢单池                                │
│  订单状态: pending_transfer → delivery_pool(WAITING)        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      货管抢单                                │
│  POST /staff/delivery-pool/:id/grab                         │
│  → transfer_tasks(ACCEPTED)                                 │
│  → 订单状态: transferring                                   │
│  → delivery_pool(GRABBED)                                   │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 任务状态流转
```
┌──────────┐     accept      ┌──────────┐    complete    ┌──────────┐
│ PENDING  │ ─────────────→ │ ACCEPTED │ ─────────────→ │COMPLETED │
│ (待移库) │                 │ (移库中) │                │ (已完成) │
└──────────┘                 └──────────┘                └──────────┘
     ↑                            ↑
     │                            │
  指派任务                     抢单成功
 (管理后台)                   (抢单大厅)
```

### 6.3 提货核销流程
```
┌─────────────────────────────────────────────────────────────┐
│                     货管到达分仓                             │
│              完成移库 → 订单状态: pending_pickup             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     客户到分仓提货                           │
│              出示提货二维码(pickupCode)                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      货管核销                                │
│  1. 扫码/输入提货码                                         │
│  2. POST /staff/logistics/verify-pickup 验证                │
│  3. 显示订单确认弹窗                                        │
│  4. POST /staff/logistics/confirm-pickup 确认               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      核销完成                                │
│  订单状态: completed                                        │
│  库存扣减 + 分润计算                                        │
└─────────────────────────────────────────────────────────────┘
```

### 6.4 提现流程
```
┌──────────┐    申请     ┌──────────┐   审核通过   ┌──────────┐  确认打款  ┌──────────┐
│  可提现  │ ────────→  │ PENDING  │ ──────────→ │ APPROVED │ ────────→ │COMPLETED │
│   余额   │            │ (审核中) │             │ (待打款) │           │ (已完成) │
└──────────┘            └──────────┘             └──────────┘           └──────────┘
     │                       │
     │                       │ 审核拒绝
     │                       ↓
     │                  ┌──────────┐
     │←──── 余额退回 ───│ REJECTED │
                        │ (已拒绝) │
                        └──────────┘
```

---

## 七、开发规范

### 7.1 术语规范（强制）

| 禁用词汇 | 正确表达 | 说明 |
|---------|---------|------|
| 配送 | **移库** | 全部使用"移库" |
| 运输 | **移库** | - |
| 送货 | **移库** | - |
| 快递 | **移库** | - |
| 配送员 | **货管员** | - |
| 配送费 | **移库费** | - |
| 待配送 | **待移库** | 订单状态 |
| 配送中 | **移库中** | 订单状态 |

### 7.2 TabBar页面导航规则

**四个TabBar页面**：tasks、pickup、income、my

**跳转规则**：
```javascript
// ✅ 正确：使用 switchTab
wx.switchTab({ url: '/pages/tasks/index' })
wx.switchTab({ url: '/pages/income/index' })

// ❌ 错误：navigateTo 无法打开TabBar页面
wx.navigateTo({ url: '/pages/tasks/index' })  // 会失败！
wx.redirectTo({ url: '/pages/my/index' })     // 会失败！
```

**非TabBar页面**：login、tasks/detail、withdraw/index、withdraw/records
```javascript
// 非TabBar页面使用 navigateTo
wx.navigateTo({ url: '/pages/withdraw/index' })
wx.navigateTo({ url: '/pages/tasks/detail?id=1' })
```

### 7.3 跨TabBar传参

TabBar页面不支持URL参数，使用globalData传递：
```javascript
// 发送方（如my页面）
app.globalData.tasksTab = 'PENDING'
wx.switchTab({ url: '/pages/tasks/index' })

// 接收方（tasks页面）
onShow() {
  const tab = app.globalData.tasksTab
  if (tab) {
    this.setData({ currentTab: tab })
    app.globalData.tasksTab = ''  // 用完清空
  }
}
```

### 7.4 错误处理规范

```javascript
// 统一错误处理模式
try {
  const result = await get('/staff/transfers')
  if (result.code === 0) {
    // 成功处理
  } else {
    wx.showToast({ title: result.message || '操作失败', icon: 'none' })
  }
} catch (error) {
  console.error('请求失败:', error)
  wx.showToast({ title: '网络错误', icon: 'none' })
}
```

### 7.5 头像处理规范

不使用外部图片URL，使用文字占位符：
```html
<!-- ✅ 正确 -->
<view class="avatar-placeholder" wx:if="{{!userInfo.avatar}}">
  <text>{{userInfo.name[0] || '货'}}</text>
</view>

<!-- ❌ 错误：引用可能不存在的图片 -->
<image src="/images/default-avatar.png" />
```

### 7.6 收入字段兼容

API返回字段可能是 `monthlyIncome` 或 `monthIncome`：
```javascript
// 兼容两种字段名
const monthIncome = result.data.monthlyIncome || result.data.monthIncome || 0
```

---

## 八、常见问题与修复记录

### 8.1 "我的"页面打不开

**原因**：引用不存在的图片资源
**修复**：使用文字占位符替代头像图片

### 8.2 登录后页面不跳转

**原因**：使用 `navigateTo` 跳转TabBar页面
**修复**：改用 `wx.switchTab`

### 8.3 抢单返回400错误

**原因**：delivery_pool记录与订单状态不一致
**修复**：数据库清理孤儿记录
```sql
DELETE FROM delivery_pool WHERE order_id NOT IN (SELECT id FROM orders);
```

### 8.4 本月收入显示0

**原因**：API返回字段名不匹配
**修复**：兼容 `monthlyIncome` 和 `monthIncome`

### 8.5 快捷入口跳转失败

**原因**：TabBar页面不支持URL参数
**修复**：使用 `globalData` 传递Tab参数

---

## 九、更新日志

### 2026-01-11
- 创建货管端开发手册

### 2026-01-10
- 修复TabBar页面导航问题
- 修复头像占位符问题
- 修复收入字段兼容问题
- 术语统一为"移库"（不用"配送"）
- 新增联系库管功能
- 新增提现统计API

### 2026-01-09
- 完成提现功能开发
- 完成收入统计功能
- 完成个人中心功能

---

## 十、相关文档

- [CLAUDE.md](../CLAUDE.md) - 项目开发规范
- [AGENT_MINIPROGRAM_MANUAL.md](./AGENT_MINIPROGRAM_MANUAL.md) - 代理商端手册
- [WAREHOUSE-GUIDE.md](./WAREHOUSE-GUIDE.md) - 库管端手册

---

> **开发者注意**：开发货管端功能前，请务必阅读本手册，特别是"开发规范"部分。

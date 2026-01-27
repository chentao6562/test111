# 蒙庆烟花管理后台功能说明文档

> 本文档为后期其他大模型快速了解管理后台功能提供参考

## 一、技术架构

| 技术 | 版本/说明 |
|------|----------|
| 框架 | Vue 3 + TypeScript |
| UI组件库 | TDesign Vue v1.8.0 |
| 构建工具 | Vite |
| 状态管理 | Pinia |
| 路由 | Vue Router 4 |
| 图表 | ECharts |
| HTTP请求 | Axios |

## 二、目录结构

```
admin/src/
├── api/              # API接口定义（19个模块）
├── assets/           # 静态资源（CSS变量、图片）
├── components/       # 公共组件（10个）
├── composables/      # 组合式函数（5个）
├── layouts/          # 布局组件
├── pages/            # 页面模块（20个）
├── router/           # 路由配置
├── stores/           # Pinia状态管理
└── utils/            # 工具函数
```

## 三、页面模块详解（20个）

### 3.1 控制台 `/dashboard`

**文件**: `pages/dashboard/index.vue`

**功能**:
- 今日销售额统计卡片
- 本月订单量统计
- 库存预警/缺货数量
- 新增代理商数量
- 近7/30日销售趋势图表（ECharts）
- 热销商品排行榜

**使用组件**: `PageHeader`, `StatCard`, `EmptyState`

---

### 3.2 业务流程说明 `/docs`

**文件**: `pages/docs/index.vue`

**功能**: 展示系统业务流程说明文档

---

### 3.3 分类管理 `/categories`

**文件**: `pages/categories/index.vue`

**功能**:
- 商品分类CRUD操作
- 分类排序
- 分类图标选择

**API**: `api/category.ts`

---

### 3.4 商品管理 `/products`

**文件**: `pages/products/index.vue`

**功能**:
- 商品列表展示（分页、搜索、筛选）
- 新增商品（名称、分类、三种价格、库存、图片）
- 编辑商品
- 商品上下架
- 图片上传

**三种价格**:
- `retailPrice`: 零售价
- `agentPrice`: 代理价
- `wholesalePrice`: 批发价

**API**: `api/product.ts`, `api/upload.ts`

---

### 3.5 代理商管理 `/agents`

**文件**: `pages/agents/index.vue`

**功能**:
- 代理商列表（搜索、类型/状态筛选）
- 新增代理商（姓名、电话、类型、上级）
- 编辑代理商信息
- 修改上级（自动更新代理商类型）
- 启用/禁用账号
- 代理商详情弹窗（基本信息、订单统计、分润统计、团队成员）

**代理商类型**:
- `LEVEL1`: 一级代理
- `LEVEL2`: 二级代理
- `LEVEL3`: 三级代理
- `WHOLESALE`: 批发商

**API**: `api/agent.ts`

---

### 3.6 订单管理 `/orders`

**文件**: `pages/orders/index.vue`

**功能**:
- 订单列表（多条件筛选：状态/时间/代理商/订单号）
- **订单类型标识**：到店（绿色）/ 移库（橙色）
- **支付状态标识**：未支付 / 定金（橙色）/ 全款（绿色）
- 订单详情弹窗（含移库任务信息）
- **确认收款**：输入收款金额，支持定金/全款
- **设置移库费**：锁货订单专用，代理商确认后生效
- 取消订单（释放库存、回滚分润）

**订单状态**:
| 状态值 | 显示名称 | 说明 |
|--------|----------|------|
| `pending_payment` | 待付款 | 等待客服确认收款 |
| `pending_accept` | 待接单 | 库管待接单 |
| `preparing` | 备货中 | 库管备货 |
| `pending_transfer` | 待移库 | 锁货模式专有，等待货管接单 |
| `transferring` | 移库中 | 货管运送中 |
| `pending_pickup` | 待提货 | 等待客户提货 |
| `completed` | 已完成 | 订单完成 |
| `cancelled` | 已取消 | 已取消 |

**移库费协商流程（锁货模式）**:
```
1. 代理商下单选择移库服务 → 显示"移库费待客服确定"
2. 客服电话协商后设置移库费 → PUT /api/admin/orders/:id/transfer-fee
3. 代理商在小程序确认移库费 → POST /api/orders/:id/confirm-transfer-fee
4. 代理商付全款（商品款+移库费）→ 进入待接单
5. 拒绝移库费则订单取消并释放库存
```

**API**: `api/order.ts`

**关键函数**:
```typescript
// 确认收款
confirmPayment(id: number, amount: number, remark?: string)

// 设置移库费
setTransferFee(id: number, transferFee: number, remark?: string)
```

---

### 3.7 分润配置 `/commission`

**文件**: `pages/commission/index.vue`

**功能**:
- 分润规则配置（按订单金额区间设置比例）
- 分润记录列表
- 分润统计

**分润比例**:
| 订单金额 | 一级代理 | 二级代理 |
|---------|---------|---------|
| < ¥399 | 10% | 2% |
| ≥ ¥399 | 15% | 3% |

**API**: `api/commission.ts`

---

### 3.8 库存管理 `/stock`

**文件**: `pages/stock/index.vue`

**功能**:
- 库存列表（商品搜索、状态筛选）
- 库存状态标签：正常 / 预警（橙色）/ 缺货（红色）
- 快速入库
- 库存调整（支持正负数）
- 预警阈值设置
- 库存出入明细日志

**库存计算**:
- 可用库存 = `stock`（实际库存）- `lockStock`（锁定库存）

**库存盘点（库管端功能）**:
- 扫码/输入条形码、SKU、商品名称查询商品
- 输入实际库存数量，自动计算盘盈盘亏
- 盘盈（绿色）：实际 > 系统，自动增加库存
- 盘亏（红色）：实际 < 系统，自动减少库存
- 记录写入库存日志（类型：INVENTORY_PROFIT / INVENTORY_LOSS）

**API**: `api/stock.ts`

---

### 3.9 财务管理 `/finance`

**文件**: `pages/finance/index.vue`

**功能**:
- 财务概览统计卡片（待审批数量、今日流水、累计提现等）
- **加款审批Tab**: 代理商加款申请列表、通过/拒绝
- **代理商提现Tab**: 三阶段审批（待审核→已通过→确认打款）
- **员工提现Tab**: 货管提现申请审批（显示收款信息）
- **资金流水Tab**: 所有资金变动记录
- **提现历史Tab**: 累计提现统计，点击卡片可跳转
- **数据核对Tab**: 代理商余额汇总、数据一致性检查

**提现状态流转**:
```
申请(PENDING) → 审核通过(APPROVED) → 确认打款(COMPLETED)
                    ↓
               拒绝(REJECTED) → 自动退回余额
```

**统计卡片交互**:
- 待审批加款/提现卡片：点击跳转对应Tab
- 累计提现卡片：点击跳转提现历史Tab
- 有待处理项时卡片高亮显示（脉冲动画）

**API**: `api/finance.ts`, `api/staffWithdrawal.ts`, `api/commission.ts`

---

### 3.10 报表中心 `/reports`

**文件**: `pages/reports/index.vue`

**功能**:
- 销售报表（日度/周度/月度）
- 库存报表（汇总、预警商品）
- 财务报表（收支汇总、分润统计）
- **CSV导出**

**API**: `api/report.ts`

---

### 3.11 客服管理 `/service`

**文件**: `pages/service/index.vue`

**功能**: 客服相关配置

**API**: `api/service.ts`

---

### 3.12 员工管理 `/staff`

**文件**: `pages/staff/index.vue`

**功能**:
- 员工列表（库管/货管账号）
- 新增员工（用户名、密码、姓名、电话、角色）
- 编辑员工
- 重置密码
- 禁用/启用账号

**员工角色**:
- `WAREHOUSE`: 库管
- `LOGISTICS`: 货管

**API**: `api/staff.ts`

---

### 3.13 操作日志 `/audit-logs`

**文件**: `pages/audit-logs/index.vue`

**功能**:
- 操作日志列表
- 多条件筛选（用户类型/操作类型/模块/时间）

**筛选维度**:
- 用户类型: admin / agent / staff
- 操作类型: create / update / delete / login / reset_password
- 模块: staff / agent / order / product / stock / commission / finance / system

**API**: `api/auditLog.ts`

---

### 3.14 首页轮播图 `/banners`

**文件**: `pages/banners/index.vue`

**功能**: 代理商小程序首页轮播图管理（CRUD、排序）

**API**: `api/banner.ts`

---

### 3.15 首页推荐商品 `/recommends`

**文件**: `pages/recommends/index.vue`

**功能**: 配置代理商小程序首页推荐商品、角标、排序

**API**: `api/recommend.ts`

---

### 3.16 H5轮播图 `/h5-banners`

**文件**: `pages/h5-banners/index.vue`

**功能**: H5页面轮播图管理

**API**: `api/h5Material.ts`

---

### 3.17 H5推荐商品 `/h5-recommend`

**文件**: `pages/h5-recommend/index.vue`

**功能**: H5页面推荐商品管理（热销/新品/精选）

**API**: `api/h5Material.ts`

---

### 3.18 H5公告通知 `/h5-notices`

**文件**: `pages/h5-notices/index.vue`

**功能**: H5系统公告管理（CRUD、定时生效）

**API**: `api/h5Material.ts`

---

### 3.19 系统设置 `/settings`

**文件**: `pages/settings/index.vue`

**功能**: 公司信息、联系方式、Logo等系统配置

**API**: `api/settings.ts`

---

### 3.20 登录 `/login`

**文件**: `pages/login/index.vue`

**功能**: 管理员登录

**API**: `api/auth.ts`

---

## 四、API模块详解（19个）

| 文件 | 功能 | 主要接口 |
|------|------|---------|
| `auth.ts` | 管理员认证 | `login`, `logout` |
| `agent.ts` | 代理商管理 | `getList`, `create`, `update`, `getDetail` |
| `auditLog.ts` | 操作日志 | `getAuditLogs` |
| `banner.ts` | 轮播图管理 | `getList`, `create`, `update`, `delete` |
| `category.ts` | 分类管理 | `getList`, `create`, `update`, `delete` |
| `commission.ts` | 分润管理 | `getRecords`, `getRules`, `updateRules` |
| `finance.ts` | 财务管理 | `getStatistics`, `getFlows`, `reviewWithdrawal` |
| `h5Material.ts` | H5素材管理 | `getBanners`, `getRecommends`, `getNotices` |
| `order.ts` | 订单管理 | `getList`, `getDetail`, `confirmPayment`, `setTransferFee` |
| `product.ts` | 商品管理 | `getList`, `create`, `update`, `updateStatus` |
| `recommend.ts` | 推荐商品 | `getList`, `create`, `update`, `delete` |
| `report.ts` | 报表数据 | `getSalesReport`, `getStockReport` |
| `request.ts` | Axios封装 | 请求拦截、响应拦截、Token处理 |
| `service.ts` | 客服管理 | 客服相关接口 |
| `settings.ts` | 系统设置 | `getConfig`, `updateConfig`, `getPublicConfig` |
| `staff.ts` | 员工管理 | `getList`, `create`, `update`, `resetPassword` |
| `staffWithdrawal.ts` | 员工提现 | `getList`, `review`, `complete` |
| `stock.ts` | 库存管理 | `getList`, `stockIn`, `adjust`, `getLogs` |
| `upload.ts` | 文件上传 | `uploadImage` |

---

## 五、公共组件详解（10个）

### 5.1 StatCard 统计卡片

**文件**: `components/StatCard.vue`

**Props**:
| 属性 | 类型 | 说明 |
|------|------|------|
| `label` | string | 标签文字 |
| `value` | string/number | 数值 |
| `icon` | string | TDesign图标名 |
| `theme` | string | 主题色（primary/warning/success/info） |
| `prefix` | string | 前缀（如¥） |
| `suffix` | string | 后缀（如笔） |
| `trend` | number | 趋势百分比 |
| `highlight` | boolean | 是否高亮（有脉冲动画） |
| `clickable` | boolean | 是否可点击 |
| `loading` | boolean | 加载状态 |

**使用示例**:
```vue
<StatCard
  label="今日销售额"
  :value="12345"
  prefix="¥"
  icon="money-circle"
  theme="primary"
  :trend="15.2"
  trend-label="同比"
/>
```

---

### 5.2 PageHeader 页面头部

**文件**: `components/PageHeader.vue`

**Props**:
| 属性 | 类型 | 说明 |
|------|------|------|
| `title` | string | 页面标题 |
| `subtitle` | string | 副标题 |

**Slots**:
- `actions`: 右侧操作区域

**使用示例**:
```vue
<PageHeader title="订单管理" subtitle="管理所有订单">
  <template #actions>
    <t-button theme="primary">导出</t-button>
  </template>
</PageHeader>
```

---

### 5.3 TableCard 表格卡片

**文件**: `components/TableCard.vue`

**Props**:
| 属性 | 类型 | 说明 |
|------|------|------|
| `title` | string | 卡片标题 |

**Slots**:
- `header`: 自定义头部
- `default`: 表格内容

---

### 5.4 FilterCard 筛选卡片

**文件**: `components/FilterCard.vue`

**功能**: 包裹筛选表单，提供统一样式

---

### 5.5 StatusTag 状态标签

**文件**: `components/StatusTag.vue`

**支持两种使用模式**:

**模式1: type + text（直接传入）**
```vue
<StatusTag type="success" text="已完成" />
<StatusTag type="warning" text="移库" />
```

**模式2: status + statusMap（映射表）**
```vue
<StatusTag :status="order.status" :statusMap="ORDER_STATUS_MAP" />
```

**Props**:
| 属性 | 类型 | 说明 |
|------|------|------|
| `type` | string | 主题色（primary/success/warning/danger/default） |
| `text` | string | 显示文本 |
| `status` | string | 状态值 |
| `statusMap` | object | 状态映射表 |
| `size` | string | 尺寸（small/medium/large） |
| `variant` | string | 样式变体（dark/light/outline） |

---

### 5.6 AmountText 金额文本

**文件**: `components/AmountText.vue`

**功能**: 格式化显示金额，支持颜色主题

---

### 5.7 ProductCell 商品单元格

**文件**: `components/ProductCell.vue`

**功能**: 表格中商品信息展示（图片+名称+规格）

---

### 5.8 EmptyState 空状态

**文件**: `components/EmptyState.vue`

**Props**:
| 属性 | 类型 | 说明 |
|------|------|------|
| `type` | string | 类型（data/search/error） |
| `title` | string | 标题 |
| `description` | string | 描述 |
| `size` | string | 尺寸 |

**使用示例**:
```vue
<t-table>
  <template #empty>
    <EmptyState
      :type="hasFilter ? 'search' : 'data'"
      :title="hasFilter ? '未找到匹配结果' : '暂无数据'"
    />
  </template>
</t-table>
```

---

### 5.9 OrderFlowIndicator 订单流程指示器

**文件**: `components/OrderFlowIndicator.vue`

**功能**: 展示订单状态流转进度

---

### 5.10 CategoryIcons 分类图标

**文件**: `components/CategoryIcons.vue`

**功能**: 分类图标选择器

---

## 六、Composables 组合式函数（5个）

### 6.1 usePagination 分页

**文件**: `composables/usePagination.ts`

**返回值**:
```typescript
{
  pagination: {
    current: number
    pageSize: number
    total: number
  },
  handlePageChange: (pageInfo) => void,
  resetPagination: () => void
}
```

---

### 6.2 useFormatter 格式化

**文件**: `composables/useFormatter.ts`

**方法**:
| 方法 | 说明 |
|------|------|
| `formatMoney(value)` | 格式化金额 |
| `formatDate(date)` | 格式化日期 |
| `formatPhone(phone)` | 脱敏手机号 |

---

### 6.3 useTableActions 表格操作

**文件**: `composables/useTableActions.ts`

**功能**: 封装表格CRUD操作逻辑

---

### 6.4 useFormDialog 表单弹窗

**文件**: `composables/useFormDialog.ts`

**返回值**:
```typescript
{
  visible: boolean
  isEdit: boolean
  formData: object
  openDialog: (data?) => void
  closeDialog: () => void
  resetForm: () => void
}
```

---

### 6.5 index.ts 导出入口

**文件**: `composables/index.ts`

**功能**: 统一导出所有composables

---

## 七、布局组件

### AdminLayout 管理后台布局

**文件**: `layouts/AdminLayout.vue`

**功能**:
- 响应式侧边栏（桌面展开、平板收起、移动端抽屉）
- Logo区域（支持自定义Logo）
- 导航菜单（支持子菜单展开/收起）
- 顶部栏（面包屑、用户菜单）
- 内容区域

**响应式断点**:
| 断点 | 行为 |
|------|------|
| ≥1024px | 侧边栏展开 |
| 768-1024px | 侧边栏收起 |
| <768px | 抽屉式侧边栏 |

**导航菜单结构**:
```
├── 控制台
├── 业务流程说明
├── 商品管理
│   ├── 分类管理
│   └── 商品列表
├── 代理商管理
│   └── 代理商列表
├── 订单管理
│   └── 订单列表
├── 分润配置
├── 库存管理
├── 财务管理
├── 报表中心
├── 客服管理
├── 小程序内容
│   ├── 首页轮播图
│   └── 首页推荐商品
├── H5素材管理
│   ├── H5轮播图
│   ├── H5推荐商品
│   └── H5公告通知
└── 系统设置
    ├── 系统配置
    ├── 员工管理
    └── 操作日志
```

---

## 八、路由配置

**文件**: `router/index.ts`

**路由守卫**:
1. 检查登录状态（localStorage中的admin_token）
2. 未登录跳转登录页
3. 已登录访问登录页跳转控制台

---

## 九、状态管理

### user store

**文件**: `stores/user.ts`

**状态**:
- `token`: JWT令牌
- `username`: 用户名
- `userInfo`: 用户信息

**方法**:
- `login(credentials)`: 登录
- `logout()`: 登出

---

## 十、样式系统

### CSS变量

**文件**: `assets/styles/variables.css`

**主要变量**:
```css
--color-primary: #e53734;        /* 主题红色 */
--color-bg-page: #f5f5f5;        /* 页面背景 */
--color-sidebar-bg: #1f1515;     /* 侧边栏背景（深红色） */
--sidebar-width: 220px;          /* 侧边栏宽度 */
--header-height: 64px;           /* 头部高度 */
```

---

## 十一、开发注意事项

### 11.1 新增页面流程

1. 在 `pages/` 下创建页面目录和 `index.vue`
2. 在 `router/index.ts` 添加路由配置
3. 在 `layouts/AdminLayout.vue` 添加导航菜单项
4. 在 `api/` 下创建对应的API模块

### 11.2 组件使用规范

- 统计卡片使用 `StatCard`
- 页面头部使用 `PageHeader`
- 表格容器使用 `TableCard`
- 筛选区域使用 `FilterCard`
- 状态标签使用 `StatusTag`
- 空状态使用 `EmptyState`

### 11.3 API请求规范

所有API请求通过 `api/request.ts` 统一处理：
- 自动附加Token
- 统一错误处理
- 响应数据解包

```typescript
// 标准响应格式
{
  code: 0,           // 0成功，非0失败
  message: string,
  data: T
}
```

---

## 十二、访问地址

| 环境 | 地址 |
|------|------|
| 开发环境 | http://localhost:5173 |
| 生产环境 | http://39.104.58.26:9090 |

---

## 十三、测试账号

| 角色 | 账号 | 密码 |
|------|------|------|
| 管理员 | admin | admin123 |

---

## 更新日志

### 2026-01-11（最新）

#### 功能更新
- **阿里云短信服务上线**：登录/注册验证码通过阿里云短信发送，签名"台风创意文化"
- **库存盘点功能**：库管端支持扫码/输入条形码查询商品，自动计算盘盈盘亏
- **货管提现功能**：货管可申请提现移库费收入，管理后台审批
- **移库费协商流程**：客服设置移库费 → 代理商确认 → 付全款 → 进入待接单
- **抢单池机制**：锁货订单备货完成后自动进入抢单池，货管可抢单

#### BUG修复
- 修复 StatusTag 组件支持两种使用模式（type+text / status+statusMap）
- 修复商品图片无法显示问题（使用Base64占位图替代缺失的placeholder.png）
- 修复订单详情弹窗内容不完整问题（添加TransferTask接口定义）
- 优化订单详情加载错误处理（添加detailLoading状态）
- 添加XSS安全注释（v-html使用场景说明）

#### 新增API接口
| 接口 | 说明 |
|------|------|
| `GET /api/staff/stock/product` | 条形码/编码查询商品 |
| `POST /api/staff/stock/inventory-check` | 库存盘点 |
| `POST /api/staff/stock/inventory-check/batch` | 批量盘点 |
| `GET /api/staff/withdrawals/stats` | 员工提现统计 |
| `POST /api/admin/staff-withdrawals/:id/review` | 审核员工提现 |
| `POST /api/admin/staff-withdrawals/:id/complete` | 确认员工打款 |

### 2026-01-10
- 货管端TabBar导航修复（使用wx.switchTab）
- 术语合规修正（配送→移库）
- 库管端库存盘点UI优化

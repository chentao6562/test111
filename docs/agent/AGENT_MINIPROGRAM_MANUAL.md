# 推销员端开发手册（小程序/H5）

> 本文档是推销员端（小程序及H5版本）的完整技术手册，供所有后续参与开发工作的AI和开发者参考。

**最后更新**: 2026-01-27
**版本**: 3.1.0
**维护者**: Claude AI

---

## 术语规范（2026-01-17更新）

| 旧术语 | 新术语 | 说明 |
|--------|--------|------|
| 代理商 | 推销员 | 统一使用"推销员" |
| 批发商 | 普通用户 | WHOLESALE类型不显示标签 |
| 一级代理 | 一级推销员 | LEVEL1类型 |
| 二级代理 | 二级推销员 | LEVEL2类型 |
| 订货单 | 采购单 | TabBar和路由标题 |
| 结算 | 预约确认 | 提交预约页面 |
| 立即下单 | 立即预约 | 按钮文案 |
| 我的订单 | 我的预约 | 路由标题 |
| 订单详情 | 预约详情 | 路由标题 |

---

## 目录

1. [项目概述](#一项目概述)
2. [技术架构](#二技术架构)
3. [目录结构](#三目录结构)
4. [页面清单](#四页面清单)
5. [核心功能模块](#五核心功能模块)
6. [推销员类型与权限](#六推销员类型与权限)
7. [API接口对接](#七api接口对接)
8. [工具函数库](#八工具函数库)
9. [组件使用规范](#九组件使用规范)
10. [样式规范](#十样式规范)
11. [业务流程图](#十一业务流程图)
12. [常见问题与修复记录](#十二常见问题与修复记录)
13. [开发规范](#十三开发规范)
14. [更新日志](#十四更新日志)
15. [砍价活动模块](#十五砍价活动模块)
16. [拼团活动模块](#十六拼团活动模块)
17. [现金大转盘模块](#十七现金大转盘模块)
18. [限时锁价模块](#十八限时锁价模块)
19. [活动中心模块](#十九活动中心模块)
20. [发圈打卡模块](#二十发圈打卡模块)
21. [团队返券功能](#二十一团队返券功能)
22. [套餐模块详解](#二十二套餐模块详解)

---

## 一、项目概述

### 1.1 产品定位

推销员端是蒙庆烟花预约系统的客户端（包含小程序和H5两个版本），面向终端客户提供在线商品浏览和预约服务。客户通过推销员分享的链接访问，提交预约后到店付款提货。

### 1.2 业务模式

**核心模式**: 线上免费预约 + 到店全款付款

- **线上只做信息预约**，不收取任何费用
- **真正的交易**（付款、发货）在线下门店完成
- **预约有礼**：阶梯赠品机制
- **门店确认**：30分钟内电话确认

### 1.3 门店信息

| 项目 | 内容 |
|------|------|
| 地址 | 呼和浩特市和林格尔县盛乐镇姑子板村华门世家1号门面房 |
| 客服电话 | 13190531439 / 15849390600 |
| 坐标 | 纬度 40.3485, 经度 111.7287 |

---

## 二、技术架构

### 2.1 技术栈

| 层级 | 技术选型 |
|------|---------|
| 框架 | 微信小程序原生框架 |
| UI组件库 | TDesign 微信小程序版 |
| 网络请求 | wx.request 封装 |
| 状态管理 | 页面data + app.globalData |
| 图片处理 | 服务端URL + HTTPS转换 |

### 2.2 后端API

| 环境 | 基础URL |
|------|---------|
| **生产环境** | https://39.104.113.121/api |
| 测试环境 | https://39.104.58.26/api |

| 属性 | 值 |
|------|-----|
| 认证方式 | JWT Bearer Token |
| Token存储 | wx.setStorageSync('token') |

### 2.3 TDesign组件注册

在 `app.json` 中全局注册的组件：

```json
{
  "usingComponents": {
    "t-button": "tdesign-miniprogram/button/button",
    "t-input": "tdesign-miniprogram/input/input",
    "t-cell": "tdesign-miniprogram/cell/cell",
    "t-checkbox": "tdesign-miniprogram/checkbox/checkbox",
    "t-icon": "tdesign-miniprogram/icon/icon",
    "t-toast": "tdesign-miniprogram/toast/toast",
    "t-message": "tdesign-miniprogram/message/message",
    "t-tabs": "tdesign-miniprogram/tabs/tabs",
    "t-tab-panel": "tdesign-miniprogram/tab-panel/tab-panel",
    "t-search": "tdesign-miniprogram/search/search",
    "t-image": "tdesign-miniprogram/image/image",
    "t-loading": "tdesign-miniprogram/loading/loading",
    "t-tag": "tdesign-miniprogram/tag/tag",
    "t-empty": "tdesign-miniprogram/empty/empty",
    "t-stepper": "tdesign-miniprogram/stepper/stepper"
  }
}
```

---

## 三、目录结构

```
miniprogram-agent/
├── app.js                    # 应用入口，全局逻辑
├── app.json                  # 应用配置
├── app.wxss                  # 全局样式
├── sitemap.json              # 站点地图
├── project.config.json       # 项目配置
│
├── images/                   # 图片资源
│   ├── tab/                  # TabBar图标
│   │   ├── home.png
│   │   ├── home-active.png
│   │   ├── category.png
│   │   ├── category-active.png
│   │   ├── cart.png
│   │   ├── cart-active.png
│   │   ├── my.png
│   │   └── my-active.png
│   ├── placeholder.png       # 商品占位图
│   └── share-cover.png       # 分享封面图
│
├── utils/                    # 工具函数
│   ├── request.js            # 网络请求封装
│   ├── auth.js               # 认证相关
│   └── format.js             # 格式化工具
│
├── pages/                    # 页面目录
│   ├── index/                # 首页
│   ├── category/             # 分类页
│   ├── product/              # 商品详情
│   ├── cart/                 # 预约单（原订货单）
│   ├── checkout/             # 预约结算页
│   ├── reservations/         # 预约管理【2026-01-16新增】
│   │   ├── index.*           # 预约列表
│   │   └── detail.*          # 预约详情
│   ├── my/                   # 个人中心
│   ├── login/                # 登录页
│   ├── commission/           # 分润中心
│   ├── team/                 # 我的团队
│   └── promotion/            # 推广中心
│
└── custom-tab-bar/           # 自定义TabBar（如有）
```

---

## 四、页面清单

### 4.1 TabBar页面

| 页面路径 | 名称 | 功能说明 |
|---------|------|---------|
| pages/index/index | 首页 | 轮播图、推荐商品、快捷入口 |
| pages/category/index | 分类 | 商品分类浏览、搜索 |
| pages/cart/index | 预约单 | 商品管理、提货日期选择 |
| pages/my/index | 我的 | 个人中心、预约入口、功能菜单 |

### 4.2 普通页面（基础功能）

| 页面路径 | 名称 | 功能说明 |
|---------|------|---------|
| /login | 登录 | 手机号验证码登录、邀请码绑定 |
| /product/:id | 商品详情 | 商品信息、加入预约单 |
| /checkout | 预约结算 | 填写预约信息、提交预约 |
| /reservations | 预约列表 | 状态筛选、预约卡片 |
| /reservations/:id | 预约详情 | 预约状态、赠品信息 |
| /commission | 分润中心 | 余额、分润记录、提现 |
| /team | 我的团队 | 团队统计、成员列表 |
| /team-grant | 团队返券 | 一级给二级发券【2026-01-21】 |
| /promotion | 推广中心 | 邀请码、推广海报、邀请记录 |
| /invite-records | 邀请记录 | 邀请历史详情【2026-01-17】 |
| /pricing | 定价管理 | 推销员自定义价格【2026-01-17】 |
| /promotion-material | 推广资料 | 推广素材下载【2026-01-17】 |
| /customer-orders | 客户预约 | 查看客户订单【2026-01-20】 |
| /agent-recruit | 推销员招募 | 盈利展示页【2026-01-20】 |

### 4.3 营销活动页面【2026-01-22新增】

| 页面路径 | 名称 | 功能说明 |
|---------|------|---------|
| /bargain-products | 砍价活动 | 砍价商品列表 |
| /bargain/:code | 砍价详情 | 砍价进度、邀请好友砍价 |
| /bargain/:code/help | 帮好友砍价 | 帮助好友砍一刀 |
| /my-bargains | 我的砍价 | 砍价记录列表 |
| /group-buy/:code | 拼团详情 | 拼团进度、参团 |
| /my-group-buys | 我的拼团 | 拼团记录列表 |
| /spin-wheel | 现金大转盘 | 转盘抽奖 |
| /spin-wheel/help/:code | 帮好友助力 | 助力好友获得抽奖机会 |
| /my-price-locks | 我的锁价 | 锁价记录列表 |
| /flash-sale | 限时秒杀 | 秒杀商品列表【2026-01-18】 |
| /gift-activity | 满赠活动 | 满赠活动详情【2026-01-18】 |

### 4.4 代金券与活动页面

| 页面路径 | 名称 | 功能说明 |
|---------|------|---------|
| /coupons | 我的代金券 | 代金券列表【2026-01-18】 |
| /coupon-center | 领券中心 | 领取代金券【2026-01-19】 |
| /activity-center | 活动中心 | 所有活动入口【2026-01-20】 |
| /activity/:slug | 活动专题 | 活动专题页【2026-01-19】 |
| /share-upload | 发圈打卡 | 上传朋友圈截图【2026-01-20】 |
| /my-shares | 我的发圈 | 发圈记录列表【2026-01-20】 |
| /free-fireworks | 免费拿烟花 | 活动介绍页【2026-01-24】 |

### 4.5 套餐相关页面【2026-01-25新增】

| 页面路径 | 名称 | 功能说明 |
|---------|------|---------|
| /packages | 套餐列表 | 套餐分类浏览，横向滑动切换分类 |
| /packages/:id | 套餐详情 | 套餐内容展示、包含商品列表 |
| /packages/:id/price | 套餐定价 | 推销员设置套餐零售价 |
| /packages/:id/checkout | 套餐预约 | 提交套餐预约单 |

---

## 五、核心功能模块

### 5.1 用户认证模块

**文件位置**: `pages/login/index.js`, `utils/auth.js`

**功能清单**:
- 手机号输入与格式验证 (11位手机号)
- 验证码发送 (60秒倒计时)
- 验证码登录
- 邀请码绑定上级 (新用户注册时)
- Token本地存储

**关键代码**:
```javascript
// auth.js
function sendCode(phone) {
  return post('/auth/send-code', { phone })
}

function phoneLogin(phone, code, inviteCode) {
  const data = { phone, code }
  if (inviteCode) data.inviteCode = inviteCode
  return post('/auth/phone-login', data)
}

function validatePhone(phone) {
  return /^1[3-9]\d{9}$/.test(phone)
}

function validateCode(code) {
  return /^\d{6}$/.test(code)
}
```

### 5.2 商品浏览模块

**文件位置**: `pages/index/index.js`, `pages/category/index.js`, `pages/product/detail.js`

**功能清单**:
- 轮播图展示 (Banner)
- 商品分类导航
- 热销推荐商品
- 商品列表分页加载
- 商品搜索
- 添加到预约单

**关键API**:
| 接口 | 方法 | 说明 |
|------|------|------|
| /banners | GET | 获取轮播图 |
| /categories | GET | 获取分类列表 |
| /products | GET | 获取商品列表 |
| /products/:id | GET | 获取商品详情 |
| /recommends | GET | 获取推荐商品 |

### 5.3 预约单模块

**文件位置**: `pages/cart/index.js`

**功能清单**:
- 预约单商品列表
- 单选/全选操作
- 增减商品数量 (实时同步API)
- 删除商品 (单个/批量)
- 预计提货日期选择 (1-30天)
- 金额计算与赠品预览
- 跳转预约结算页

**关键API**:
| 接口 | 方法 | 说明 |
|------|------|------|
| /cart | GET | 获取预约单列表 |
| /cart | POST | 添加商品到预约单 |
| /cart/:id | PUT | 更新商品数量 |
| /cart/:id | DELETE | 删除预约单项 |
| /cart/batch-delete | POST | 批量删除 |
| /cart/count | GET | 获取预约单数量 |

### 5.4 预约模块【2026-01-16重构】

**文件位置**: `pages/checkout/index.js`, `pages/reservations/index.js`, `pages/reservations/detail.js`

**功能清单**:
- 预约结算页：填写姓名、电话、选择提货日期
- 预约列表：状态Tab筛选
- 预约详情：状态时间线、赠品信息

**预约状态常量**:
```javascript
const RESERVATION_STATUS = {
  PENDING: 0,      // 待确认
  CALLING: 1,      // 确认中
  CONFIRMED: 2,    // 已确认
  COMPLETED: 3,    // 已完成
  CANCELLED: 4,    // 已取消
  EXPIRED: 5,      // 已过期
  CALL_FAILED: 6,  // 确认失败
}

const statusLabels = {
  0: '待确认',
  1: '确认中',
  2: '已确认',
  3: '已完成',
  4: '已取消',
  5: '已过期',
  6: '确认失败'
}
```

**关键API**:
| 接口 | 方法 | 说明 |
|------|------|------|
| /reservations | POST | 创建预约 |
| /reservations/my | GET | 获取我的预约列表 |
| /reservations/:id | GET | 获取预约详情 |
| /reservations/:id/cancel | PUT | 取消预约 |
| /gift-tiers | GET | 获取赠品档位 |

### 5.5 赠品机制【2026-01-16新增】

**赠品档位**:
| 预约金额 | 赠品内容 |
|---------|---------|
| ≥¥100 | 小手持烟花 × 2 |
| ≥¥200 | 仙女棒 × 10 + 摔炮 × 1盒 |
| ≥¥300 | 小型喷花 × 1 + 仙女棒 × 10 |
| ≥¥500 | 中型烟花 × 1 + 小礼包 |
| ≥¥1000 | 大型烟花 × 1 + 中礼包 |

**前端展示逻辑**:
```javascript
// 根据预约金额匹配赠品
function matchGiftTier(amount, giftTiers) {
  if (!giftTiers || giftTiers.length === 0) return null
  // 按金额降序排列后匹配
  const sorted = [...giftTiers].sort((a, b) => b.minAmount - a.minAmount)
  return sorted.find(tier => amount >= tier.minAmount) || null
}
```

### 5.6 分润中心模块

**文件位置**: `pages/commission/index.js`

**功能清单**:
- 分润数据概览 (可提现余额、累计分润、本月分润、待结算)
- 分润记录列表 (直接分润/间接分润筛选)
- 提现记录列表
- 提现申请 (最低100元)

**关键API**:
| 接口 | 方法 | 说明 |
|------|------|------|
| /commission/center | GET | 分润中心数据 |
| /commission/records | GET | 分润记录列表 |
| /commission/withdraw | POST | 申请提现 |
| /commission/withdrawals | GET | 提现记录 |

### 5.7 推广中心模块

**文件位置**: `pages/promotion/index.js`

**功能清单**:
- 邀请码展示
- 复制邀请码
- 已邀请人数统计
- 邀请记录弹窗列表
- 推广海报生成 (Canvas绘制)
- 复制推广链接
- 分享给好友

**关键API**:
| 接口 | 方法 | 说明 |
|------|------|------|
| /commission/promotion | GET | 推广数据 |
| /commission/invite-records | GET | 邀请记录列表 |

### 5.8 团队管理模块

**文件位置**: `pages/team/index.js`

**功能清单**:
- 团队统计 (团队业绩、个人业绩、团队人数)
- 成员列表 (搜索、筛选、排序)
- 成员信息卡片

**关键API**:
| 接口 | 方法 | 说明 |
|------|------|------|
| /commission/team-stats | GET | 团队统计 |
| /commission/team-members | GET | 团队成员列表 |

### 5.9 个人中心模块

**文件位置**: `pages/my/index.js`

**功能清单**:
- 用户信息展示 (头像、姓名、类型徽章)
- 统计卡片 (余额、积分)
- 预约状态入口
- 快捷功能入口 (推广、团队、分润、客服等)
- 退出登录

### 5.10 套餐功能模块【2026-01-25新增】

**文件位置**: `views/packages/`, `utils/packageThumbnailGenerator.ts`

**功能清单**:
- 套餐列表展示（按定位横向导航：引流款/爆款/利润款）
- 套餐详情页面（包含商品列表、价格信息）
- 套餐定价管理（推销员设置零售价和给下级的价）
- 套餐预约流程（与普通商品类似）
- 拼接图自动生成（无主图时自动生成商品拼接图+价格爆炸贴）

#### 套餐定位分类

| 定位 | 英文代码 | 说明 |
|------|---------|------|
| 引流款 | ENTRY | 低价吸引客户，主打性价比 |
| 爆款 | HOT | 销量担当，适合大多数客户 |
| 利润款 | PROFIT | 高毛利，提升推销员收益 |

#### 套餐四级价格体系

与单品一致的价格层级：
```
成本价(costPrice) ≤ 供货价(supplyPrice) ≤ 给二级价(subPrice) ≤ 零售价(retailPrice)
```

| 角色 | 可设置价格 | 拿货价基准 |
|------|-----------|-----------|
| 总代理 | 成本价、供货价、建议零售价 | 成本价 |
| 一级推销员 | 零售价、给二级的价 | 供货价 |
| 二级推销员 | 零售价 | 一级设置的subPrice |

#### 库存策略

| 策略 | 英文代码 | 说明 |
|------|---------|------|
| 按组成商品计算 | COMPONENT | 可用库存 = min(各商品库存/各商品数量) |
| 独立库存 | INDEPENDENT | 套餐独立维护库存数量 |

#### 拼接图自动生成

**触发条件**: 套餐无主图时，前端自动生成展示用拼接图

**生成规则**:
- 取套餐内前4个商品的图片拼接成2×2网格
- 右上角添加价格爆炸贴（显示建议零售价）
- 生成的图片仅用于前端展示，不上传服务器

**技术实现**:
```typescript
// utils/packageThumbnailGenerator.ts
export async function generatePackageThumbnail(
  items: PackageItem[],
  price: number
): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = 400
  canvas.height = 400
  const ctx = canvas.getContext('2d')!

  // 绘制商品图片网格
  const images = items.slice(0, 4).map(item => item.product.image)
  // ... 绘制逻辑

  // 绘制价格爆炸贴
  drawPriceTag(ctx, price)

  return canvas.toDataURL('image/jpeg', 0.8)
}
```

#### 关键API

| 接口 | 方法 | 说明 |
|------|------|------|
| GET /packages | GET | 获取套餐列表（支持positioning筛选） |
| GET /packages/:id | GET | 获取套餐详情（含商品列表） |
| PUT /packages/:id/price | PUT | 推销员设置套餐价格 |
| POST /packages/:id/reserve | POST | 创建套餐预约 |

#### 套餐数据结构

```typescript
interface Package {
  id: number
  code: string             // 套餐编码 (PKG001)
  name: string             // 套餐名称
  positioning: 'ENTRY' | 'HOT' | 'PROFIT'  // 定位
  description: string      // 套餐描述
  images: string[]         // 图片数组（可为空，为空时自动生成拼接图）
  costPrice: number        // 成本价
  supplyPrice: number      // 供货价
  suggestedPrice: number   // 建议零售价
  masterRetailPrice: number // 总代理零售价
  retailPrice: number      // 当前用户看到的零售价
  agentPrice: number       // 当前用户的拿货价
  grossMargin: number      // 毛利率
  sceneTags: string[]      // 场景标签
  targetAudience: string   // 目标人群
  stockStrategy: 'COMPONENT' | 'INDEPENDENT'  // 库存策略
  availableStock: number   // 可用库存
  items: PackageItem[]     // 包含的商品
}

interface PackageItem {
  productId: number
  productName: string
  productImage: string
  quantity: number         // 商品数量
  snapshotCostPrice: number    // 成本价快照
  snapshotSupplyPrice: number  // 供货价快照
  snapshotRetailPrice: number  // 零售价快照
}
```

#### 套餐预约流程

```
套餐列表 → 选择套餐 → 套餐详情 → 立即预约
    ↓          ↓          ↓          ↓
 横向分类    查看包含商品  推销员可定价  填写客户信息
```

**与普通商品预约的差异**:
- 套餐不加入购物车，直接从详情页进入预约
- 预约提交后，系统自动将套餐拆分为商品明细入预约单
- 套餐商品的库存按策略计算并锁定

---

## 六、推销员类型与权限

### 6.1 推销员类型定义

| 类型代码 | 显示名称 | 说明 |
|---------|---------|------|
| LEVEL1 | 一级推销员 | 最高级推销员，由平台直接发展 |
| LEVEL2 | 二级推销员 | 由一级推销员发展 |

### 6.2 利润计算方式

推销员利润 = 客户支付价格 - 推销员供货价

```javascript
// 示例：商品零售价100元，一级推销员供货价70元
// 客户通过一级推销员链接预约，支付100元
// 一级推销员利润 = 100 - 70 = 30元

// 示例：二级推销员供货价80元（由一级设置）
// 客户通过二级推销员链接预约，支付100元
// 二级推销员利润 = 100 - 80 = 20元
// 一级推销员利润 = 80 - 70 = 10元
```

### 6.3 类型判断逻辑

```javascript
// 获取类型显示文本
getAgentTypeText(type) {
  const typeMap = {
    'LEVEL1': '一级推销员',
    'LEVEL2': '二级推销员'
  }
  return typeMap[type] || '推销员'
}
```

---

## 七、API接口对接

### 7.1 请求封装

**文件位置**: `utils/request.js`

```javascript
const app = getApp()

function request(options) {
  return new Promise((resolve, reject) => {
    const { url, method = 'GET', data, header = {}, showLoading = true } = options

    if (showLoading) {
      wx.showLoading({ title: '加载中...', mask: true })
    }

    const token = app.globalData.token

    wx.request({
      url: `${app.globalData.baseUrl}${url}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...header
      },
      success(res) {
        if (showLoading) wx.hideLoading()
        const { data: result } = res

        // 业务成功
        if (result.code === 0) {
          resolve(result)
          return
        }

        // Token失效
        if (result.code === 401) {
          app.clearLoginInfo()
          wx.redirectTo({ url: '/pages/login/index' })
          reject(new Error('登录已过期'))
          return
        }

        // 业务错误
        wx.showToast({ title: result.message || '请求失败', icon: 'none' })
        reject(new Error(result.message))
      },
      fail(err) {
        if (showLoading) wx.hideLoading()
        wx.showToast({ title: '网络连接失败', icon: 'none' })
        reject(err)
      }
    })
  })
}

// 图片URL处理
function getImageUrl(url) {
  if (!url) return '/images/placeholder.png'
  if (url.startsWith('http://') || url.startsWith('https://')) {
    if (url.startsWith('http://')) {
      return url.replace('http://', 'https://')
    }
    return url
  }
  if (url.startsWith('/images/')) return url
  const baseUrl = app?.globalData?.imageBaseUrl || 'https://39.104.58.26'
  return `${baseUrl}${url}`
}

module.exports = {
  request,
  getImageUrl,
  get(url, data, options = {}) {
    return request({ url, method: 'GET', data, ...options })
  },
  post(url, data, options = {}) {
    return request({ url, method: 'POST', data, ...options })
  },
  put(url, data, options = {}) {
    return request({ url, method: 'PUT', data, ...options })
  },
  delete(url, data, options = {}) {
    return request({ url, method: 'DELETE', data, ...options })
  }
}
```

### 7.2 响应格式

```javascript
// 成功响应
{
  "code": 0,
  "message": "success",
  "data": { ... }
}

// 分页响应
{
  "code": 0,
  "data": {
    "list": [...],
    "total": 100,
    "page": 1,
    "pageSize": 10,
    "totalPages": 10
  }
}

// 错误响应
{
  "code": 400,
  "message": "错误信息"
}
```

---

## 八、工具函数库

### 8.1 格式化工具

**文件位置**: `utils/format.js`

```javascript
// 格式化金额
function formatAmount(amount, options = {}) {
  const { prefix = '', suffix = '', decimals = 2 } = options
  if (amount === null || amount === undefined) return '-'
  const num = Number(amount)
  if (isNaN(num)) return '-'
  return `${prefix}${num.toFixed(decimals)}${suffix}`
}

// 格式化价格（带人民币符号）
function formatPrice(price) {
  return formatAmount(price, { prefix: '¥' })
}

// 格式化日期时间
function formatTime(dateStr, options = {}) {
  if (!dateStr) return '-'
  const { showTime = true, showSeconds = false } = options
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '-'

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  if (!showTime) return `${year}-${month}-${day}`

  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  if (showSeconds) {
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

// 格式化手机号（隐藏中间4位）
function formatPhone(phone) {
  if (!phone) return '-'
  if (phone.length !== 11) return phone
  return `${phone.slice(0, 3)}****${phone.slice(7)}`
}

// 解析图片JSON（兼容多种格式）
function parseImages(imagesJson) {
  if (!imagesJson) return []
  if (Array.isArray(imagesJson)) return imagesJson
  if (typeof imagesJson === 'string') {
    try {
      const parsed = JSON.parse(imagesJson)
      return Array.isArray(parsed) ? parsed : [imagesJson]
    } catch {
      return [imagesJson]
    }
  }
  return []
}

// 获取第一张图片
function getFirstImage(imagesJson, placeholder = '/images/placeholder.png') {
  const images = parseImages(imagesJson)
  return images[0] || placeholder
}
```

---

## 九、组件使用规范

### 9.1 图片组件

**推荐**: 使用原生 `image` 组件而非 `t-image`

```xml
<!-- 推荐写法 -->
<image
  class="product-image"
  src="{{item.image}}"
  mode="aspectFill"
  lazy-load
/>

<!-- 正方形图片样式 -->
<view class="image-wrapper">
  <image class="square-image" src="{{src}}" mode="aspectFill" />
</view>
```

```css
.image-wrapper {
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 100%;
}
.square-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
```

### 9.2 Toast提示

```javascript
import Toast from 'tdesign-miniprogram/toast/index'

Toast({
  context: this,
  selector: '#t-toast',
  message: '操作成功',
  icon: 'check-circle',
  duration: 1500
})
```

```xml
<t-toast id="t-toast" />
```

### 9.3 图标使用

```xml
<t-icon name="wallet" size="36rpx" color="#E53935" />
<t-icon name="star-filled" size="36rpx" color="#FFD700" />
<t-icon name="gift" size="36rpx" color="#4CAF50" />
```

**常用图标名称**:
- wallet: 钱包
- star-filled: 实心星星
- gift: 礼物
- check-circle: 勾选圆圈
- chevron-right: 右箭头
- share: 分享
- usergroup: 用户组
- service: 客服
- poweroff: 关机/退出

---

## 十、样式规范

### 10.1 主题色

```css
/* 主色调 */
--primary-color: #E53935;
--primary-dark: #C62828;
--primary-light: #FFCDD2;

/* 辅助色 */
--gold-color: #FFD700;
--green-color: #4CAF50;
--orange-color: #FF9800;

/* 文字色 */
--text-primary: #333333;
--text-secondary: #666666;
--text-placeholder: #999999;

/* 背景色 */
--bg-page: #FFF8F8;
--bg-card: #FFFFFF;
--bg-light: #FAFAFA;
```

### 10.2 间距规范

```css
--padding-xs: 8rpx;
--padding-sm: 16rpx;
--padding-md: 24rpx;
--padding-lg: 32rpx;
--padding-xl: 48rpx;

--radius-sm: 8rpx;
--radius-md: 16rpx;
--radius-lg: 24rpx;
--radius-full: 50%;
```

### 10.3 字体规范

```css
--font-xs: 20rpx;
--font-sm: 24rpx;
--font-base: 28rpx;
--font-md: 32rpx;
--font-lg: 36rpx;
--font-xl: 44rpx;
--font-xxl: 56rpx;
```

---

## 十一、业务流程图

### 11.1 登录流程

```
用户打开小程序
      ↓
检查本地Token → 有效 → 进入首页
      ↓ 无效
跳转登录页
      ↓
输入手机号 → 发送验证码
      ↓
输入验证码 + 勾选协议
      ↓
调用登录API → 成功 → 保存Token → 进入首页
```

### 11.2 预约流程【2026-01-16】

```
通过推销员链接访问 → 浏览商品（显示推销员定价）
      ↓
商品详情 → 加入预约单
      ↓
预约单页 → 选择商品 → 设置提货日期
      ↓
预约结算页 → 填写姓名、电话
      ↓
提交预约【无需支付】
      ↓
门店30分钟内电话确认
      ↓
到店付全款 → 领商品+赠品 → 完成
```

### 11.3 预约状态流转【2026-01-16】

```
待确认(0) → 确认中(1) → 已确认(2) → 已完成(3)
               ├─→ 确认失败(6)
               └─→ 已取消(4)
                         ├─→ 已过期(5)
```

**状态说明**:
| 状态 | 客户端显示 | 说明 |
|------|-----------|------|
| 待确认 | 等待门店确认 | 新提交的预约，等待门店电话确认 |
| 确认中 | 门店正在联系您 | 门店已开始拨打电话 |
| 已确认 | 预约成功 | 电话确认成功，请按时到店 |
| 已完成 | 已完成 | 到店付款提货完成 |
| 已取消 | 已取消 | 客户主动取消 |
| 已过期 | 已过期 | 确认后3天未到店 |
| 确认失败 | 确认失败 | 3次电话未接通 |

---

## 十二、常见问题与修复记录

### 12.1 图片显示问题

**问题**: `t-image` 组件在小程序中兼容性问题

**解决**: 使用原生 `image` 组件替代

**修复日期**: 2026-01-10

### 12.2 用户类型判断错误

**问题**: 前端使用 `agentType` 字段，后端返回 `type` 字段

**解决**: 统一使用 `type` 字段

**修复日期**: 2026-01-11

### 12.3 TabBar页面跳转

**问题**: 使用 `wx.navigateTo` 跳转TabBar页面失败

**解决**: TabBar页面必须使用 `wx.switchTab` 跳转

### 12.4 图片JSON解析

**问题**: 商品图片字段格式不统一（JSON数组/字符串路径）

**解决**: 使用 `parseImages()` 函数兼容处理

### 12.5 HTTP转HTTPS

**问题**: 微信小程序要求使用HTTPS协议

**解决**: `getImageUrl()` 函数自动将HTTP转换为HTTPS

---

## 十三、开发规范

### 13.1 文件命名

- 页面文件夹使用小写字母
- 组件文件使用小写字母加中划线
- 工具函数使用驼峰命名

### 13.2 代码规范

```javascript
// 使用async/await处理异步
async loadData() {
  try {
    const res = await get('/api/data')
    this.setData({ data: res.data })
  } catch (error) {
    console.error('加载失败:', error)
    wx.showToast({ title: '加载失败', icon: 'none' })
  }
}
```

### 13.3 登录检查

每个需要登录的页面在 `onLoad` 中必须检查登录状态：

```javascript
onLoad() {
  if (!app.checkLogin()) {
    wx.redirectTo({ url: '/pages/login/index' })
    return
  }
  // 继续加载页面数据
}
```

### 13.4 业务术语合规

| 禁用词汇 | 合规表达 |
|---------|---------|
| 用户/客户 | 顾客 |
| 购物车 | 预约单 |
| 订单 | 预约 |
| 发货 | 备货 |
| 收货 | 提货 |

---

## 十四、更新日志

### 2026-01-27【套餐功能完善】

**新增模块**
- 套餐模块详解（第22章）
- 套餐列表页面 `/packages`
- 套餐详情页面 `/packages/:id`
- 套餐预约页面 `/packages/:id/checkout`

**功能说明**
- 套餐三种定位：引流款(ENTRY)、爆款(HOT)、利润款(PROFIT)
- 四级价格体系与单品一致
- 两种库存策略：按组成商品计算(COMPONENT)、独立库存(INDEPENDENT)
- 无主图时自动生成拼接图+价格爆炸贴
- 推销员可设置套餐零售价和给下级的价

---

### 2026-01-24【营销活动体系完善】

**新增模块**
- 砍价活动模块（4个页面）
- 拼团活动模块（2个页面）
- 现金大转盘模块（2个页面）
- 限时锁价模块（1个页面）
- 活动中心模块（3个页面）
- 发圈打卡模块（2个页面）
- 团队返券功能
- 过年烟花免费拿活动页

**文档更新**
- 新增7个模块的完整文档
- 更新页面清单（38个路由）
- 新增营销活动API接口文档

### 2026-01-21【拼团与锁价】

**拼团到店**
- 新增拼团详情页 `/group-buy/:code`
- 新增我的拼团页 `/my-group-buys`

**限时锁价**
- 新增我的锁价页 `/my-price-locks`

**团队返券**
- 新增团队返券页 `/team-grant`

### 2026-01-20【活动系统增强】

**活动中心**
- 新增活动中心页 `/activity-center`
- 新增活动专题页 `/activity/:slug`

**发圈打卡**
- 新增发圈上传页 `/share-upload`
- 新增我的发圈页 `/my-shares`

**客户管理**
- 新增客户预约页 `/customer-orders`
- 新增推销员招募页 `/agent-recruit`

### 2026-01-18【代金券系统】

**代金券**
- 新增我的代金券页 `/coupons`
- 新增领券中心页 `/coupon-center`

**秒杀活动**
- 新增限时秒杀页 `/flash-sale`
- 新增满赠活动页 `/gift-activity`

### 2026-01-17【定价与推广】

**定价管理**
- 新增定价管理页 `/pricing`
- 新增邀请记录页 `/invite-records`
- 新增推广资料页 `/promotion-material`

### 2026-01-16【重大升级】

**预约模式升级**
- 业务模式从订货改为预约（线上免费预约+到店付款）
- 移除VIP移库相关功能
- 新增预约列表页面 `/reservations`
- 新增预约详情页面 `/reservations/:id`
- 新增赠品档位展示功能

---

## 十五、砍价活动模块

### 15.1 模块概述

砍价活动是一种社交裂变营销方式，用户发起砍价后邀请好友帮砍，达到底价后可到店提货。

**页面清单**:
| 路由 | 组件 | 说明 |
|------|------|------|
| /bargain-products | BargainProducts.vue | 砍价商品列表 |
| /bargain/:code | BargainDetail.vue | 砍价详情页 |
| /bargain/:code/help | BargainHelp.vue | 帮好友砍价 |
| /my-bargains | MyBargains.vue | 我的砍价列表 |

### 15.2 业务流程

```
发起砍价 → 分享给好友 → 好友帮砍 → 砍到底价 → 到店提货
    ↓           ↓           ↓          ↓
 创建砍价单   获取分享码   砍价金额计算  设置提货截止日期
```

### 15.3 砍价状态

| 状态 | 说明 | 前端显示 |
|------|------|---------|
| ONGOING | 进行中 | 显示当前价格、剩余时间 |
| SUCCESS | 砍价成功 | 显示提货截止日期 |
| EXPIRED | 已过期 | 显示"已过期" |
| PICKED | 已提货 | 显示"已完成" |

### 15.4 关键API

| 接口 | 方法 | 说明 |
|------|------|------|
| GET /bargain/configs | GET | 获取活动列表 |
| GET /bargain/my | GET | 我的砍价列表 |
| POST /bargain/start | POST | 发起砍价 |
| GET /bargain/:code | GET | 砍价详情 |
| POST /bargain/:code/cut | POST | 帮砍一刀 |
| POST /bargain/:code/pickup | POST | 确认提货 |

### 15.5 前端实现要点

```typescript
// 砍价详情页核心逻辑
const bargainInfo = ref<BargainInfo | null>(null)
const cutRecords = ref<CutRecord[]>([])
const shareCode = computed(() => bargainInfo.value?.bargainNo)

// 分享给好友
const shareToFriend = () => {
  const shareUrl = `${window.location.origin}/bargain/${shareCode.value}/help`
  // 复制链接或调用分享API
}

// 倒计时计算
const countdown = computed(() => {
  if (!bargainInfo.value?.expireAt) return null
  const diff = new Date(bargainInfo.value.expireAt).getTime() - Date.now()
  return diff > 0 ? formatCountdown(diff) : null
})
```

---

## 十六、拼团活动模块

### 16.1 模块概述

拼团活动允许用户开团或参团，达到成团人数后即可享受优惠价格到店提货。

**页面清单**:
| 路由 | 组件 | 说明 |
|------|------|------|
| /group-buy/:code | GroupBuyDetail.vue | 拼团详情 |
| /my-group-buys | MyGroupBuys.vue | 我的拼团 |

### 16.2 业务流程

```
开团/参团 → 邀请好友参团 → 达到成团人数 → 成团成功 → 到店提货
    ↓            ↓              ↓            ↓
 创建拼团单    获取分享码     自动成团     生成提货码
```

### 16.3 拼团状态

| 状态 | 说明 | 前端显示 |
|------|------|---------|
| FORMING | 组团中 | 显示已参团人数、剩余时间 |
| SUCCESS | 拼团成功 | 显示提货信息 |
| FAILED | 拼团失败 | 显示"未成团" |
| COMPLETED | 已完成 | 显示"已提货" |

### 16.4 关键API

| 接口 | 方法 | 说明 |
|------|------|------|
| GET /group-buy/configs | GET | 获取活动列表 |
| GET /group-buy/my | GET | 我的拼团列表 |
| POST /group-buy/start | POST | 开团 |
| POST /group-buy/join | POST | 参团 |
| GET /group-buy/:code | GET | 拼团详情 |

---

## 十七、现金大转盘模块

### 17.1 模块概述

现金大转盘是一种助力抽奖活动，用户邀请好友助力获得抽奖机会，可抽取现金奖励。

**页面清单**:
| 路由 | 组件 | 说明 |
|------|------|------|
| /spin-wheel | SpinWheel.vue | 转盘抽奖页 |
| /spin-wheel/help/:code | SpinWheelHelp.vue | 帮好友助力 |

### 17.2 业务流程

```
参与活动 → 邀请好友助力 → 获得抽奖机会 → 抽奖 → 兑换奖励
    ↓           ↓             ↓          ↓        ↓
 注册参与    分享助力码     助力计数     随机奖品   入账余额
```

### 17.3 关键API

| 接口 | 方法 | 说明 |
|------|------|------|
| GET /spin-wheel/active | GET | 获取当前活动 |
| GET /spin-wheel/my-participation | GET | 我的参与信息 |
| POST /spin-wheel/participate | POST | 参与活动 |
| POST /spin-wheel/help | POST | 帮助好友助力 |
| POST /spin-wheel/spin | POST | 抽奖 |
| GET /spin-wheel/records | GET | 抽奖记录 |
| POST /spin-wheel/redeem | POST | 兑换奖励 |

### 17.4 前端实现要点

```typescript
// 转盘动画
const spinWheel = async () => {
  if (spinning.value) return
  spinning.value = true

  // 调用API获取结果
  const res = await post('/spin-wheel/spin')
  const prizeIndex = res.data.prizeIndex

  // 计算旋转角度
  const baseRotation = 360 * 5 // 旋转5圈
  const prizeAngle = (prizeIndex / prizes.length) * 360
  const targetRotation = baseRotation + (360 - prizeAngle)

  // 执行动画
  wheelRotation.value = targetRotation

  setTimeout(() => {
    spinning.value = false
    showPrizeResult(res.data)
  }, 4000)
}
```

---

## 十八、限时锁价模块

### 18.1 模块概述

限时锁价允许用户锁定商品当前价格，在锁定期内可按锁定价购买。

**页面清单**:
| 路由 | 组件 | 说明 |
|------|------|------|
| /my-price-locks | MyPriceLocks.vue | 我的锁价列表 |

### 18.2 业务流程

```
商品详情页 → 点击锁价 → 锁定价格 → 在锁定期内预约 → 按锁定价结算
```

### 18.3 锁价状态

| 状态 | 说明 | 前端显示 |
|------|------|---------|
| ACTIVE | 锁价中 | 显示剩余时间、锁定价格 |
| USED | 已使用 | 显示"已使用" |
| EXPIRED | 已过期 | 显示"已过期" |

### 18.4 关键API

| 接口 | 方法 | 说明 |
|------|------|------|
| GET /price-lock/active | GET | 获取锁价活动 |
| POST /price-lock/lock | POST | 锁定价格 |
| GET /price-lock/my | GET | 我的锁价列表 |

---

## 十九、活动中心模块

### 19.1 模块概述

活动中心是所有营销活动的聚合入口，展示当前进行中的各类活动。

**页面清单**:
| 路由 | 组件 | 说明 |
|------|------|------|
| /activity-center | ActivityCenter.vue | 活动中心首页 |
| /coupon-center | CouponCenter.vue | 领券中心 |
| /activity/:slug | ActivityPage.vue | 活动专题页 |

### 19.2 活动类型

| 类型 | 入口 | 说明 |
|------|------|------|
| 砍价活动 | /bargain-products | 邀请好友砍价 |
| 拼团活动 | /group-buy/:code | 邀请好友拼团 |
| 现金转盘 | /spin-wheel | 助力抽现金 |
| 限时秒杀 | /flash-sale | 限时优惠价 |
| 代金券 | /coupon-center | 领取代金券 |
| 发圈打卡 | /share-upload | 发圈赚奖励 |

### 19.3 关键API

| 接口 | 方法 | 说明 |
|------|------|------|
| GET /activities/active | GET | 获取进行中活动 |
| GET /coupon-activity/available | GET | 可领取的代金券 |
| POST /coupon-activity/:id/claim | POST | 领取代金券 |

---

## 二十、发圈打卡模块

### 20.1 模块概述

发圈打卡功能鼓励推销员在朋友圈推广，上传截图后可获得代金券奖励。

**页面清单**:
| 路由 | 组件 | 说明 |
|------|------|------|
| /share-upload | ShareUpload.vue | 发圈上传页 |
| /my-shares | MyShares.vue | 我的发圈记录 |

### 20.2 业务流程

```
发布朋友圈 → 截图上传 → 后台审核 → 审核通过 → 发放代金券
```

### 20.3 审核状态

| 状态 | 说明 | 前端显示 |
|------|------|---------|
| PENDING | 待审核 | 显示"审核中" |
| APPROVED | 已通过 | 显示"已通过"，展示奖励 |
| REJECTED | 已拒绝 | 显示"已拒绝"，展示原因 |

### 20.4 关键API

| 接口 | 方法 | 说明 |
|------|------|------|
| POST /share-records/upload | POST | 上传发圈截图 |
| GET /share-records/my | GET | 我的发圈记录 |
| GET /share-records/stats | GET | 发圈统计 |

### 20.5 图片上传实现

```typescript
// 上传发圈截图
const uploadShare = async (file: File) => {
  const formData = new FormData()
  formData.append('image', file)
  formData.append('remark', remark.value)

  const res = await post('/share-records/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })

  if (res.code === 0) {
    showToast('上传成功，等待审核')
    router.push('/my-shares')
  }
}
```

---

## 二十一、团队返券功能

### 21.1 功能概述

团队返券允许一级推销员给自己的二级推销员发放代金券，用于激励团队。

**页面**: `/team-grant` - TeamGrant.vue

### 21.2 业务规则

- 仅一级推销员可使用此功能
- 发放的代金券从一级推销员余额扣除
- 二级推销员收到后可在门店使用
- 单次发放金额限制：5-100元

### 21.3 关键API

| 接口 | 方法 | 说明 |
|------|------|------|
| GET /team/grantable-members | GET | 可发券的下级列表 |
| POST /team/grant-coupon | POST | 发放代金券 |
| GET /team/grant-records | GET | 发放记录 |

### 21.4 前端实现

```typescript
// 团队返券页核心逻辑
const members = ref<TeamMember[]>([])
const selectedMember = ref<number | null>(null)
const grantAmount = ref(10)

const grantCoupon = async () => {
  if (!selectedMember.value) {
    showToast('请选择下级')
    return
  }

  const res = await post('/team/grant-coupon', {
    memberId: selectedMember.value,
    amount: grantAmount.value
  })

  if (res.code === 0) {
    showToast('发放成功')
    loadMembers()
  }
}
```

---

## 二十二、套餐模块详解

### 22.1 业务背景

套餐功能是v1.0版本的重要新增功能，允许管理员将多个商品组合成套餐销售。套餐具有以下业务优势：
- **提高客单价**: 组合销售促进客户购买更多商品
- **简化选择**: 客户无需逐一挑选，直接选择适合的套餐
- **差异化定价**: 推销员可针对套餐设置独立价格

### 22.2 页面路由

| 路由 | 组件文件 | 功能 |
|------|---------|------|
| /packages | PackageList.vue | 套餐列表，横向Tab切换定位分类 |
| /packages/:id | PackageDetail.vue | 套餐详情，展示商品列表和价格 |
| /packages/:id/checkout | PackageCheckout.vue | 套餐预约页，填写客户信息 |

### 22.3 组件层级

```
PackageList.vue
├── 分类Tab栏（ENTRY/HOT/PROFIT）
├── 套餐卡片列表
│   ├── 套餐图片（主图或拼接图）
│   ├── 套餐名称
│   ├── 场景标签
│   ├── 价格显示
│   └── 立即预约按钮
└── 加载更多

PackageDetail.vue
├── 轮播图区域
├── 价格信息区
│   ├── 零售价
│   ├── 建议零售价（划线价）
│   └── 毛利率标签
├── 套餐描述
├── 包含商品列表
│   ├── 商品图片
│   ├── 商品名称
│   └── 数量×N
├── 定价按钮（推销员可见）
└── 立即预约按钮

PackageCheckout.vue
├── 套餐信息卡片
├── 客户信息表单
│   ├── 姓名
│   ├── 电话
│   └── 提货日期
├── 金额统计
│   ├── 套餐价格
│   └── 赠品信息
└── 提交预约按钮
```

### 22.4 价格显示规则

**重要**: 价格显示必须使用 `priceUtils.ts` 中的统一函数：

```typescript
import { getDisplayPrice, getOriginalPrice } from '@/utils/priceUtils'

// 获取显示价格（根据用户类型自动返回对应价格）
const displayPrice = getDisplayPrice(packageData)

// 获取原价（划线价）
const originalPrice = getOriginalPrice(packageData)
```

**用户类型与价格对应**:
| 用户类型 | 显示价格 | 拿货价 |
|---------|---------|-------|
| 游客 | masterRetailPrice | - |
| 一级推销员 | 自定义retailPrice或masterRetailPrice | supplyPrice |
| 二级推销员 | 自定义retailPrice或上级subPrice | 上级subPrice |

### 22.5 与营销活动的关系

**互斥规则**: 套餐与以下活动互斥
- 砍价活动：套餐不能参与砍价
- 拼团活动：套餐不能开团/参团
- 锁价活动：套餐不能锁价

**可叠加规则**:
- 赠品机制：套餐预约金额计入赠品门槛
- 代金券：核销时可使用代金券抵扣

### 22.6 常见问题

**Q: 套餐库存不足怎么显示？**
A: 当按COMPONENT策略计算的可用库存为0时，显示"已售罄"，禁用预约按钮。

**Q: 套餐商品价格变动后，套餐价格会变吗？**
A: 不会。套餐创建时会快照商品价格，后续商品价格变动不影响已创建的套餐。

**Q: 二级推销员如何获得套餐的拿货价？**
A: 需要一级推销员先设置套餐的subPrice，否则二级无法看到该套餐。

---

## 附录：测试账号

| 角色 | 账号 | 验证码 |
|------|------|--------|
| 一级推销员 | 13800138001 | 123456 |
| 二级推销员 | 13800138002 | 123456 |
| 测试客户 | 13800138000 | 123456 |

---

> **文档维护说明**
>
> 所有后续参与代理商小程序开发工作的AI和开发者，请在完成功能开发或问题修复后，及时更新本文档的相关章节和更新日志。

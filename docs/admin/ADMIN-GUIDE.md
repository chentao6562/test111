# 管理后台开发手册

**版本**: v3.0 | **更新**: 2026-01-24 | **状态**: 生产就绪

---

## 快速导航

| 章节 | 内容 |
|------|------|
| [技术栈](#技术栈) | Vue 3 + TDesign + Vite |
| [项目结构](#项目结构) | 目录组织和文件说明 |
| [功能模块](#功能模块) | 基础功能模块（17个） |
| [营销活动管理](#营销活动管理) | 砍价/拼团/转盘/锁价等（8个新模块） |
| [开发规范](#开发规范) | 代码规范和最佳实践 |
| [常见问题](#常见问题) | FAQ和解决方案 |

### 模块统计

| 类别 | 模块数 | 说明 |
|------|--------|------|
| 基础功能 | 17 | 预约/商品/推销员/库存/财务等 |
| 营销活动 | 8 | 砍价/拼团/转盘/锁价/代金券等 |
| 推销员激励 | 3 | 发圈审核/周期奖励/激励配置 |
| **总计** | **46个路由** | |

---

## 技术栈

```json
{
  "framework": "Vue 3.5.13",
  "ui": "TDesign Vue Next 1.11.0",
  "build": "Vite 6.0.7",
  "router": "Vue Router 4.5.0",
  "state": "Pinia 2.3.0",
  "http": "Axios 1.8.0",
  "language": "TypeScript 5.7.3"
}
```

---

## 项目结构

```
admin/
├── src/
│   ├── api/                  # API调用封装
│   │   ├── index.ts         # Axios实例和拦截器
│   │   ├── auth.ts          # 认证API
│   │   ├── reservation.ts   # 预约API【2026-01-16新增】
│   │   ├── product.ts       # 商品API
│   │   └── ...              # 其他模块API
│   ├── pages/               # 页面组件
│   ├── components/          # 公共组件
│   ├── stores/              # Pinia状态管理
│   ├── router/              # 路由配置
│   ├── utils/               # 工具函数
│   └── layouts/             # 布局组件
├── public/                  # 静态资源
└── dist/                    # 构建输出
```

---

## 功能模块

### 1. 控制台 (`/dashboard`)

**页面**: `pages/dashboard/index.vue`

**功能**:
- 数据概览卡片（今日预约、今日核销、待确认、库存预警）
- 趋势图表（近7天预约/核销）
- 快捷入口

**API**:
- `GET /api/admin/dashboard/stats` - 获取统计数据

---

### 2. 预约管理 (`/reservations`)【2026-01-16新增】

**页面**: `pages/reservations/index.vue`

**功能清单**:
| 功能 | 说明 |
|------|------|
| 预约列表 | 搜索、状态筛选、时间筛选、分页 |
| 预约详情 | 客户信息、商品明细、赠品信息、状态时间线 |
| 确认预约 | 管理员强制确认（跳过电话确认） |
| 取消预约 | 管理员取消预约 |
| 导出Excel | 导出预约数据 |

**核心API**:
- `GET /api/admin/reservations` - 获取列表
- `GET /api/admin/reservations/:id` - 获取详情
- `POST /api/admin/reservations/:id/confirm` - 确认预约
- `POST /api/admin/reservations/:id/cancel` - 取消预约
- `GET /api/admin/reservations/stats` - 获取统计

**预约状态**:
```typescript
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

**状态标签样式**:
```vue
<t-tag v-if="status === 0" theme="warning">待确认</t-tag>
<t-tag v-else-if="status === 1" theme="primary">确认中</t-tag>
<t-tag v-else-if="status === 2" theme="success">已确认</t-tag>
<t-tag v-else-if="status === 3" theme="success" variant="light">已完成</t-tag>
<t-tag v-else-if="status === 4" theme="default">已取消</t-tag>
<t-tag v-else-if="status === 5" theme="default">已过期</t-tag>
<t-tag v-else-if="status === 6" theme="danger">确认失败</t-tag>
```

---

### 3. 赠品档位管理 (`/gift-tiers`)【2026-01-16新增】

**页面**: `pages/gift-tiers/index.vue`

**功能清单**:
| 功能 | 说明 |
|------|------|
| 档位列表 | 显示所有赠品档位 |
| 新增档位 | 设置金额阈值、赠品名称、赠品成本 |
| 编辑档位 | 修改档位信息 |
| 启用/禁用 | 切换档位状态 |
| 排序 | 调整档位显示顺序 |

**核心API**:
- `GET /api/admin/gift-tiers` - 获取列表
- `POST /api/admin/gift-tiers` - 新增档位
- `PUT /api/admin/gift-tiers/:id` - 编辑档位
- `DELETE /api/admin/gift-tiers/:id` - 删除档位

**默认赠品档位**:
| 最低金额 | 赠品名称 | 赠品成本 |
|---------|---------|---------|
| 100 | 小手持烟花 × 2 | 5 |
| 200 | 仙女棒 × 10 + 摔炮 × 1盒 | 15 |
| 300 | 小型喷花 × 1 + 仙女棒 × 10 | 25 |
| 500 | 中型烟花 × 1 + 小礼包 | 50 |
| 1000 | 大型烟花 × 1 + 中礼包 | 100 |

---

### 4. 推销员管理 (`/agents`)

**页面**: `pages/agents/index.vue`

**功能清单**:
| 功能 | 说明 |
|------|------|
| 推销员列表 | 搜索、筛选（类型/状态）、分页 |
| 新增推销员 | 弹窗表单（姓名、电话、类型、上级） |
| 编辑推销员 | 修改信息 |
| 启用/禁用 | 切换账号状态 |
| 推销员详情 | 基本信息、预约统计、利润统计、团队成员 |
| 定价管理 | 设置推销员的商品供货价 |

**核心API**:
- `GET /api/admin/agents` - 获取列表
- `POST /api/admin/agents` - 新增
- `PUT /api/admin/agents/:id` - 编辑
- `DELETE /api/admin/agents/:id` - 删除
- `GET /api/admin/agents/:id` - 详情
- `GET /api/admin/agents/:id/prices` - 获取定价
- `PUT /api/admin/agents/:id/prices` - 设置定价

**推销员类型**:
```typescript
const AGENT_TYPES = {
  LEVEL1: '一级推销员',
  LEVEL2: '二级推销员'
}
```

---

### 5. 商品管理 (`/products`)

**页面**: `pages/products/index.vue`

**功能清单**:
| 功能 | 说明 |
|------|------|
| 商品列表 | 搜索、分类筛选、状态筛选 |
| 新增商品 | 商品信息、零售价、图片、库存 |
| 编辑商品 | 修改信息 |
| 上下架 | 切换商品状态 |

**核心API**:
- `GET /api/admin/products` - 获取列表
- `POST /api/admin/products` - 新增
- `PUT /api/admin/products/:id` - 编辑
- `DELETE /api/admin/products/:id` - 删除

---

### 6. 分类管理 (`/categories`)

**页面**: `pages/categories/index.vue`

**功能**: CRUD、排序

**API**:
- `GET /api/admin/categories`
- `POST /api/admin/categories`
- `PUT /api/admin/categories/:id`
- `DELETE /api/admin/categories/:id`

---

### 7. 库存管理 (`/stock`)

**页面**: `pages/stock/index.vue`

**功能清单**:
| 功能 | 说明 |
|------|------|
| 库存列表 | 预警标识 |
| 库存入库 | 选择商品、数量、备注 |
| 库存调整 | 正/负数调整 |
| 预警设置 | 设置商品预警阈值 |
| 库存日志 | 出入库记录 |

**API**:
- `GET /api/admin/stock`
- `POST /api/admin/stock/in`
- `POST /api/admin/stock/adjust`
- `GET /api/admin/stock/logs`

---

### 8. 仓库/门店管理 (`/warehouses`)

**页面**: `pages/warehouses/index.vue`

**功能清单**:
| 功能 | 说明 |
|------|------|
| 门店列表 | 门店信息列表 |
| 新增门店 | 名称、编码、地址、联系方式 |
| 编辑门店 | 修改信息 |
| 设为默认 | 设置默认门店 |
| 启用/禁用 | 切换门店状态 |

**API**:
- `GET /api/admin/warehouses`
- `POST /api/admin/warehouses`
- `PUT /api/admin/warehouses/:id`
- `PUT /api/admin/warehouses/:id/default`
- `DELETE /api/admin/warehouses/:id`

---

### 9. 财务管理 (`/finance`)

**页面**: `pages/finance/index.vue`

**功能清单**:
| 功能 | 说明 |
|------|------|
| 财务概览 | 今日营收、待审批提现 |
| 推销员提现 | 三阶段审批（待审核→已通过→确认打款）|
| 员工提现 | 门店员工提现申请审批 |
| 资金流水 | 多条件筛选 |

**提现审批流程**:
```
1. 申请提现 → PENDING（立即扣减余额）
2. 管理员审核 → APPROVED / REJECTED（拒绝退回余额）
3. 确认打款 → COMPLETED
```

**API**:
- `GET /api/admin/commission/withdrawals` - 推销员提现列表
- `POST /api/admin/commission/withdrawals/:id/review` - 审核
- `POST /api/admin/commission/withdrawals/:id/complete` - 确认打款
- `GET /api/admin/staff-withdrawals` - 员工提现列表
- `POST /api/admin/staff-withdrawals/:id/review` - 审核员工提现

---

### 10. 分润管理 (`/commission`)

**页面**: `pages/commission/index.vue`

**功能清单**:
- 分润记录（状态筛选：待结算/已结算/已取消）
- 分润统计

**分润说明**:
- 推销员利润 = 客户支付价格 - 推销员供货价
- T+2结算：预约完成后2天自动结算到推销员余额

**API**:
- `GET /api/admin/commission/records`
- `GET /api/admin/commission/stats`

---

### 11. 员工管理 (`/staff`)

**页面**: `pages/staff/index.vue`

**功能清单**:
| 功能 | 说明 |
|------|------|
| 员工列表 | 门店员工账号列表 |
| 新增员工 | 用户名、密码、姓名、电话、所属门店 |
| 编辑员工 | 修改信息、状态 |
| 重置密码 | 管理员重置密码 |
| 禁用/启用 | 切换账号状态 |

**API**:
- `GET /api/admin/staff`
- `POST /api/admin/staff`
- `PUT /api/admin/staff/:id`
- `POST /api/admin/staff/:id/reset-password`

---

### 12. 客户风控 (`/customers`)【2026-01-16新增】

**页面**: `pages/customers/index.vue`

**功能清单**:
| 功能 | 说明 |
|------|------|
| 客户列表 | 按爽约次数、风险等级筛选 |
| 客户详情 | 预约历史、爽约记录 |
| 加入黑名单 | 手动拉黑客户 |
| 解除黑名单 | 恢复客户预约权限 |

**API**:
- `GET /api/admin/customers` - 客户列表
- `GET /api/admin/customers/:phone` - 客户详情
- `POST /api/admin/customers/:phone/block` - 加入黑名单
- `POST /api/admin/customers/:phone/unblock` - 解除黑名单

**风险等级**:
| 等级 | 说明 |
|------|------|
| 0 | 正常 |
| 1 | 轻度风险（1次爽约） |
| 2 | 中度风险（2次爽约） |
| 3 | 高风险（3次及以上爽约，自动黑名单） |

---

### 13. H5素材管理

#### 轮播图 (`/h5-banners`)
- CRUD操作
- 图片上传
- 排序

#### 推荐商品 (`/h5-recommends`)
- 热销/新品/精选推荐商品配置
- 排序

#### 公告通知 (`/h5-notices`)
- CRUD操作
- 定时生效

---

### 14. 小程序内容管理

#### 首页轮播图 (`/banners`)
- 代理商小程序首页轮播图管理

#### 首页推荐商品 (`/recommends`)
- 配置推荐商品
- 角标设置
- 排序

---

### 15. 操作日志 (`/audit-logs`)

**功能**:
- 日志列表
- 筛选（用户类型/操作类型/模块/时间）

**API**:
- `GET /api/admin/audit-logs`

---

### 16. 系统设置 (`/settings`)

**功能**:
- 公司信息
- 联系方式
- 门店地址

---

### 17. 报表功能 (`/reports`)

**功能清单**:
| 报表类型 | 说明 |
|---------|------|
| 预约报表 | 日/周/月预约数据 |
| 核销报表 | 核销率、营收统计 |
| 库存报表 | 库存汇总、预警商品 |
| 财务报表 | 收支汇总、利润统计 |
| CSV导出 | 导出报表数据 |

---

## 营销活动管理

### 18. 砍价活动管理【2026-01-22新增】

#### 18.1 砍价配置 (`/bargain-config`)

**页面**: `pages/bargain-config/index.vue`

**功能清单**:
| 功能 | 说明 |
|------|------|
| 活动列表 | 显示所有砍价活动 |
| 新增活动 | 名称、时间、规则配置 |
| 添加商品 | 选择商品、设置原价/底价/砍刀数 |
| 活动状态 | 上线/暂停/结束 |
| 活动统计 | 参与人数、成功率 |

**核心API**:
- `GET /api/admin/bargain/configs` - 活动列表
- `POST /api/admin/bargain/configs` - 创建活动
- `PUT /api/admin/bargain/configs/:id` - 编辑活动
- `POST /api/admin/bargain/configs/:id/items` - 添加商品
- `PUT /api/admin/bargain/configs/:id/status` - 修改状态

**砍价规则配置**:
```typescript
interface BargainConfig {
  name: string              // 活动名称
  startTime: Date           // 开始时间
  endTime: Date             // 结束时间
  maxCutsPerBargain: number // 单次砍价最大刀数（默认20）
  bargainDuration: number   // 砍价有效时长（小时，默认24）
  pickupDeadlineDays: number // 提货截止天数（默认3）
}
```

#### 18.2 砍价数据 (`/bargain-list`)

**页面**: `pages/bargain-list/index.vue`

**功能清单**:
| 功能 | 说明 |
|------|------|
| 砍价列表 | 所有用户的砍价记录 |
| 状态筛选 | 进行中/成功/已过期/已提货 |
| 砍价详情 | 砍刀记录、用户信息 |
| 数据导出 | 导出砍价数据 |

**核心API**:
- `GET /api/admin/bargain/list` - 砍价列表
- `GET /api/admin/bargain/:id` - 砍价详情
- `GET /api/admin/bargain/:id/cuts` - 砍刀记录

---

### 19. 拼团活动管理【2026-01-21新增】

#### 19.1 拼团配置 (`/group-buy-config`)

**页面**: `pages/group-buy-config/index.vue`

**功能清单**:
| 功能 | 说明 |
|------|------|
| 活动列表 | 显示所有拼团活动 |
| 新增活动 | 商品、价格、人数、时间 |
| 活动状态 | 上线/暂停/结束 |
| 库存管理 | 设置活动库存 |

**核心API**:
- `GET /api/admin/group-buy/configs` - 活动列表
- `POST /api/admin/group-buy/configs` - 创建活动
- `PUT /api/admin/group-buy/configs/:id` - 编辑活动
- `PUT /api/admin/group-buy/configs/:id/status` - 修改状态

**拼团规则配置**:
```typescript
interface GroupBuyConfig {
  productId: number         // 商品ID
  originalPrice: number     // 原价
  groupPrice: number        // 拼团价
  minMembers: number        // 成团人数（默认3）
  maxMembers: number        // 最大人数（默认10）
  duration: number          // 拼团时长（小时，默认24）
  totalStock: number        // 活动库存
}
```

#### 19.2 拼团列表 (`/group-buy-list`)

**页面**: `pages/group-buy-list/index.vue`

**功能清单**:
| 功能 | 说明 |
|------|------|
| 拼团列表 | 所有拼团订单 |
| 状态筛选 | 组团中/成功/失败/已完成 |
| 成员详情 | 查看参团成员 |
| 数据导出 | 导出拼团数据 |

**核心API**:
- `GET /api/admin/group-buy/list` - 拼团列表
- `GET /api/admin/group-buy/:id` - 拼团详情
- `GET /api/admin/group-buy/:id/members` - 参团成员

---

### 20. 大转盘活动管理【2026-01-23新增】

#### 20.1 大转盘配置 (`/spin-wheel-config`)

**页面**: `pages/spin-wheel-config/index.vue`

**功能清单**:
| 功能 | 说明 |
|------|------|
| 活动列表 | 显示所有转盘活动 |
| 新增活动 | 名称、时间、预算配置 |
| 奖品配置 | 设置奖品、概率、库存 |
| 助力规则 | 配置助力人数要求 |
| 活动状态 | 上线/暂停/结束 |

**核心API**:
- `GET /api/admin/spin-wheel/configs` - 活动列表
- `POST /api/admin/spin-wheel/configs` - 创建活动
- `PUT /api/admin/spin-wheel/configs/:id` - 编辑活动
- `PUT /api/admin/spin-wheel/configs/:id/prizes` - 配置奖品

**奖品配置结构**:
```typescript
interface SpinWheelPrize {
  name: string        // 奖品名称
  amount: number      // 金额（元）
  probability: number // 中奖概率（0-1）
  stock: number       // 库存（-1为无限）
}
```

#### 20.2 兑换管理 (`/spin-wheel-redeem`)

**页面**: `pages/spin-wheel-redeem/index.vue`

**功能清单**:
| 功能 | 说明 |
|------|------|
| 兑换列表 | 所有兑换申请 |
| 状态筛选 | 待审核/已通过/已拒绝 |
| 审核兑换 | 通过/拒绝兑换申请 |
| 批量处理 | 批量审核 |

**核心API**:
- `GET /api/admin/spin-wheel/redeems` - 兑换列表
- `POST /api/admin/spin-wheel/redeems/:id/review` - 审核兑换

#### 20.3 风控黑名单 (`/spin-wheel-blacklist`)

**页面**: `pages/spin-wheel-blacklist/index.vue`

**功能清单**:
| 功能 | 说明 |
|------|------|
| 黑名单列表 | 被拉黑的用户 |
| 添加黑名单 | 手动拉黑用户 |
| 解除黑名单 | 移出黑名单 |
| 拉黑原因 | 查看/编辑原因 |

**核心API**:
- `GET /api/admin/spin-wheel/blacklist` - 黑名单列表
- `POST /api/admin/spin-wheel/blacklist` - 添加黑名单
- `DELETE /api/admin/spin-wheel/blacklist/:id` - 解除黑名单

#### 20.4 转盘数据分析 (`/spin-wheel-stats`)

**页面**: `pages/spin-wheel-stats/index.vue`

**功能清单**:
| 功能 | 说明 |
|------|------|
| 参与统计 | 参与人数、助力人数 |
| 抽奖统计 | 抽奖次数、中奖分布 |
| 预算消耗 | 已消耗预算、剩余预算 |
| 趋势图表 | 每日参与/中奖趋势 |

**核心API**:
- `GET /api/admin/spin-wheel/stats` - 统计数据
- `GET /api/admin/spin-wheel/stats/trend` - 趋势数据

---

### 21. 锁价活动管理【2026-01-21新增】

**页面**: `pages/price-lock-config/index.vue`

**功能清单**:
| 功能 | 说明 |
|------|------|
| 活动列表 | 显示所有锁价活动 |
| 新增活动 | 商品、原价、锁价、时长 |
| 活动状态 | 上线/暂停/结束 |
| 锁价记录 | 查看用户锁价记录 |
| 库存管理 | 设置锁价库存 |

**核心API**:
- `GET /api/admin/price-lock/configs` - 活动列表
- `POST /api/admin/price-lock/configs` - 创建活动
- `PUT /api/admin/price-lock/configs/:id` - 编辑活动
- `GET /api/admin/price-lock/records` - 锁价记录

**锁价规则配置**:
```typescript
interface PriceLockConfig {
  productId: number      // 商品ID
  originalPrice: number  // 原价
  lockPrice: number      // 锁定价
  lockDuration: number   // 锁定时长（小时，默认48）
  totalStock: number     // 活动库存
}
```

---

### 22. 发圈审核管理【2026-01-20新增】

**页面**: `pages/share-audit/index.vue`

**功能清单**:
| 功能 | 说明 |
|------|------|
| 审核列表 | 待审核的发圈记录 |
| 图片预览 | 预览朋友圈截图 |
| 通过/拒绝 | 审核操作 |
| 拒绝原因 | 填写拒绝理由 |
| 批量审核 | 批量通过/拒绝 |

**核心API**:
- `GET /api/admin/share-records` - 发圈列表
- `POST /api/admin/share-records/:id/review` - 审核

**审核规则**:
- 图片必须清晰可见
- 必须包含推广内容
- 发布时间在24小时内
- 重复图片不通过

---

### 23. 周期奖励管理【2026-01-20新增】

**页面**: `pages/weekly-rewards/index.vue`

**功能清单**:
| 功能 | 说明 |
|------|------|
| 周统计列表 | 每周销售/拉新统计 |
| 奖励发放记录 | 已发放的周期奖励 |
| 手动发放 | 补发遗漏的奖励 |
| 数据导出 | 导出周期数据 |

**核心API**:
- `GET /api/admin/weekly-stats` - 周统计列表
- `GET /api/admin/weekly-rewards` - 奖励发放记录
- `POST /api/admin/weekly-rewards/manual` - 手动发放

**周期奖励规则**:
| 类型 | 条件 | 奖励 |
|------|------|------|
| 周销售3单 | 本周完成3单 | ¥30代金券 |
| 周销售5单 | 本周完成5单 | ¥80代金券 |
| 周销售10单 | 本周完成10单 | ¥200代金券 |
| 周发圈全勤 | 本周7天都有审核通过 | ¥20代金券 |
| 周拉新3人 | 本周邀请≥3人注册 | ¥50代金券 |

---

### 24. 激励配置管理【2026-01-20新增】

**页面**: `pages/incentive-config/index.vue`

**功能清单**:
| 功能 | 说明 |
|------|------|
| 即时奖励配置 | 注册/首预约/首单奖励金额 |
| 周期奖励配置 | 周销售/发圈/拉新奖励金额 |
| 拉新奖励配置 | 邀请新人奖励金额 |
| 启用/禁用 | 开关各项奖励 |

**核心API**:
- `GET /api/admin/incentive-config` - 获取配置
- `PUT /api/admin/incentive-config` - 更新配置

**默认配置**:
```typescript
interface IncentiveConfig {
  // 即时奖励
  registerReward: number       // 注册奖励，默认5
  firstReservationReward: number // 首预约奖励，默认10
  firstCompletedReward: number  // 首单成交奖励，默认20
  referralReward: number       // 拉新奖励，默认15

  // 周期奖励
  weeklySales3Reward: number   // 周销售3单，默认30
  weeklySales5Reward: number   // 周销售5单，默认80
  weeklySales10Reward: number  // 周销售10单，默认200
  weeklyShareReward: number    // 周发圈全勤，默认20
  weeklyReferralReward: number // 周拉新3人，默认50
}
```

---

### 25. 代金券统计【2026-01-21新增】

**页面**: `pages/coupon-stats/index.vue`

**功能清单**:
| 功能 | 说明 |
|------|------|
| 发放统计 | 按类型统计发放数量和金额 |
| 使用统计 | 已使用/未使用/已过期 |
| 持有人列表 | 按推销员查看代金券 |
| 核销记录 | 门店核销记录 |
| 数据导出 | 导出统计数据 |

**核心API**:
- `GET /api/admin/coupons/stats` - 统计数据
- `GET /api/admin/coupons/list` - 代金券列表
- `GET /api/admin/coupons/redeem-records` - 核销记录

**统计维度**:
| 维度 | 说明 |
|------|------|
| 按类型 | 注册/首预约/首单/拉新/周期等 |
| 按状态 | 未使用/已使用/已过期 |
| 按时间 | 日/周/月发放和使用 |
| 按推销员 | 持有代金券金额排行 |

---

## 开发规范

### 组件命名
- 页面组件：PascalCase（`ReservationList.vue`）
- 公共组件：PascalCase（`ProductCard.vue`）
- 工具函数：camelCase（`formatAmount.ts`）

### API调用
```typescript
// 统一使用api目录下的封装
import { getReservations, confirmReservation } from '@/api/reservation'

// 正确
const { data } = await getReservations({ page: 1 })

// 错误：直接调用axios
const res = await axios.get('/api/admin/reservations')
```

### 错误处理
```typescript
try {
  await confirmReservation(id)
  MessagePlugin.success('确认成功')
} catch (error) {
  MessagePlugin.error(error.message || '操作失败')
}
```

### 表单验证
```typescript
const FORM_RULES = {
  name: [
    { required: true, message: '请输入商品名称' },
    { max: 50, message: '长度不超过50字符' }
  ],
  price: [
    { required: true, message: '请输入价格' },
    { validator: (val) => val > 0, message: '价格必须大于0' }
  ]
}
```

---

## 常用工具函数

### 格式化
```typescript
// 金额格式化
formatAmount(1234.56) // "1,234.56"

// 时间格式化
formatTime(date, 'YYYY-MM-DD HH:mm:ss')

// 预约状态
formatReservationStatus(0) // "待确认"
```

### 验证
```typescript
// 手机号验证
isValidPhone('13800138000') // true

// 金额验证
isValidAmount(100.5) // true
```

---

## 常见问题

### Q1: 预约确认后状态未变化
**原因**: 预约可能已被门店确认
**解决**: 检查预约当前状态，只有待确认(0)或确认中(1)状态可以确认

### Q2: 赠品档位未生效
**原因**: 档位已禁用或金额阈值设置错误
**解决**: 检查档位的 `isActive` 状态和 `minAmount` 设置

### Q3: 推销员定价未生效
**原因**: 定价只对新预约生效
**解决**: 已创建的预约价格不会变化

### Q4: 客户被错误拉黑
**原因**: 爽约3次自动拉黑
**解决**: 在客户风控页面手动解除黑名单

### Q5: 员工提现审批后余额未退回
**原因**: 审核拒绝时未调用退回余额接口
**解决**: 使用 `POST /api/admin/staff-withdrawals/:id/review` 并传递 `status: 'REJECTED'`

---

## 技术支持

- **开发手册**: 本文档
- **门店端手册**: [docs/store/STORE-GUIDE.md](../store/STORE-GUIDE.md)
- **客户端手册**: [docs/agent/AGENT_MINIPROGRAM_MANUAL.md](../agent/AGENT_MINIPROGRAM_MANUAL.md)

---

## 更新日志

### 2026-01-24【营销活动体系完善】

**新增模块（8个）**
- 砍价活动管理（砍价配置 + 砍价数据）
- 拼团活动管理（拼团配置 + 拼团列表）
- 大转盘活动管理（配置 + 兑换 + 黑名单 + 数据分析）
- 锁价活动管理
- 发圈审核管理
- 周期奖励管理
- 激励配置管理
- 代金券统计

**文档更新**
- 更新模块统计（46个路由）
- 新增8个模块的完整文档
- 新增营销活动管理章节

### 2026-01-21【拼团与锁价】

**新增功能**
- 拼团配置 `/group-buy-config`
- 拼团列表 `/group-buy-list`
- 锁价配置 `/price-lock-config`
- 代金券统计 `/coupon-stats`

### 2026-01-20【推销员激励】

**新增功能**
- 发圈审核 `/share-audit`
- 周期奖励 `/weekly-rewards`
- 激励配置 `/incentive-config`

### 2026-01-19【营销活动】

**新增功能**
- 限时秒杀 `/flash-sale`
- 代金券活动 `/coupon-activities`
- 活动专题页 `/activity-pages`

### 2026-01-17【定价与推广】

**新增功能**
- 推销员定价 `/agent-prices`
- 晋升申请 `/upgrade-applications`
- 推广文案 `/promotion-copies`
- 品牌素材 `/brand-assets`

### 2026-01-16【重大升级】

**预约模式升级**
- 新增预约管理模块（替代订单管理）
- 新增赠品档位管理模块
- 新增客户风控模块
- 移除移库管理模块（锁货模式已废弃）
- 更新财务管理（移除移库费相关）
- 更新推销员管理（移除代理商分润，改为定价利润）

### 2026-01-12

- 初始版本发布
- 20个功能模块上线

---

**最后更新**: 2026-01-24
**维护者**: Claude AI

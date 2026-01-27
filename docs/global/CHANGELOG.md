# 开发日志 (CHANGELOG)

> 此文件保存详细的开发记录,供历史参考。核心配置信息请查看 CLAUDE.md
>
> **文档整理规则**（2026-01-21执行）：
> - 最近7天（1月14日后）：保留完整记录
> - 7天前：压缩为摘要，详情归档至末尾

---

## 📑 目录导航

### 最近更新（完整记录）
- [2026-01-21](#2026-01-21-全局优化与代码审查) - **全局优化：PrismaClient单例、文档整理**
- [2026-01-20](#2026-01-20-推销员激励系统完整实现) - **推销员激励系统P2（发圈审核、周奖励、活动中心）**
- [2026-01-18](#2026-01-18-春节营销代金券系统) - **春节营销代金券系统 + H5推广资料**
- [2026-01-17](#2026-01-17-业务流程审查与代码优化) - **预约模式术语规范化、代码优化**
- [2026-01-16](#2026-01-16-预约模式升级完成) - **推广体系升级、预约模式全面上线**

### 历史归档（摘要）
- [2026-01-12及更早](#历史归档摘要) - H5货管端100%复刻、上线测试、移库费系统等

---

## 2026-01-21 全局优化与代码审查

### 代码优化
- **PrismaClient单例修复**：修复22个文件的多实例问题，统一使用 `utils/prisma.ts` 单例
- **临时文件清理**：删除根目录和server目录的空`nul`文件
- **文档路径修正**：CLAUDE.md中的文档引用路径更正

### 修改的文件（22个）
```
server/src/services/campaign2026/couponService.ts
server/src/services/campaign2026/weeklyRewardService.ts
server/src/services/campaign2026/instantRewardService.ts
server/src/services/campaign2026/couponManageService.ts
server/src/services/campaign2026/shareAuditService.ts
server/src/services/groupBuy/groupBuyService.ts
server/src/services/groupBuy/groupBuyPickupService.ts
server/src/services/priceLock/priceLockService.ts
server/src/services/promotion/priceService.ts
server/src/services/promotion/settlementService.ts
server/src/services/promotion/rewardService.ts
server/src/services/promotion/upgradeService.ts
server/src/services/promotion/profitService.ts
server/src/services/productService.ts
server/src/services/activityPageService.ts
server/src/services/promotionMaterialService.ts
server/src/services/staffWithdrawalService.ts
server/src/services/categoryService.ts
server/src/controllers/regionController.ts
server/src/tasks/weeklyRewardTask.ts
server/src/tasks/monthlyTeamRewardTask.ts
server/src/scripts/seedRegions.ts
```

---

## 2026-01-20 推销员激励系统完整实现

### 功能概述
完成了春节营销系统的P2功能：发圈审核、周期奖励、活动中心。

### 后端新增服务
| 文件 | 功能 |
|------|------|
| `services/campaign2026/shareAuditService.ts` | 发圈审核服务 |
| `services/campaign2026/weeklyRewardService.ts` | 周期奖励服务 |
| `tasks/weeklyRewardTask.ts` | 周奖励定时任务（每周一凌晨2:00） |

### 周奖励规则
| 奖励类型 | 触发条件 | 金额 |
|---------|---------|------|
| 周销售3单 | 本周完成≥3单 | ¥30 |
| 周销售5单 | 本周完成≥5单 | ¥80 |
| 周销售10单 | 本周完成≥10单 | ¥200 |
| 周发圈全勤 | 7天都有审核通过 | ¥20 |
| 周拉新3人 | 本周拉新≥3人 | ¥50 |

**注意**：周销售奖励取最高档，不叠加

### 新增页面
- 管理后台：发圈审核、周期奖励、激励配置
- H5推销员端：活动中心、发圈打卡、我的发圈

---

## 2026-01-18 春节营销代金券系统

### 业务需求
为2026年春节销售旺季设计的营销激励系统：
- 所有营销奖励发放代金券（非现金）
- 代金券仅推销员自用，门店购买时使用
- 有效期：2026年2月14日前

### 即时奖励明细
| 奖励类型 | 金额 | 触发条件 | 成本承担 |
|---------|------|---------|---------|
| 注册奖励 | 5元 | 新推销员注册 | 总代理 |
| 首预约奖励 | 10元 | 首次有客户预约 | 上级 |
| 首单成交奖励 | 20元 | 首次有订单完成 | 上级 |
| 拉新奖励 | 15元 | 邀请的新推销员注册 | 总代理 |

### H5推广资料功能
- 商品海报：自动生成带二维码的宣传海报
- 推广文案：朋友圈文案、客户话术、商品卖点
- 品牌素材：LOGO、产品图、视频、海报模板

---

## 2026-01-17 业务流程审查与代码优化

### 术语规范化
- 统一使用"推销员"替代"代理商"
- H5推销员端术语更新完成

### 代码优化
- 使用settlementExecutor统一利润入账逻辑
- 团队奖励改为月度统计
- 新增自动晋升功能

---

## 2026-01-16 预约模式升级完成

### 推广体系升级
- 四级价格体系：成本价 → 供货价 → 给二级价 → 零售价
- 即时结算：核销完成时利润立即入账
- 预约状态流转：10种状态完整支持

### 预约流程
```
客户访问 → 选商品 → 提交预约 → 门店电话确认 → 备货 → 到店付款提货
```

---

## 历史归档摘要

### 2026-01-12 H5货管端100%复刻完成
- 完成H5货管端开发，实现小程序100%功能复刻
- 30项功能验收全部通过
- 上线前完整测试报告

### 2026-01-11 移库费系统重大重构
- 移库费由平台统一收取改为自定义金额
- 短信服务正式上线（阿里云SMS）
- 安全测试：9项测试全部通过

### 2026-01-10 库存盘点功能上线
- 库存盘点功能
- 货管端BUG修复
- UI优化

### 2026-01-09 货管端提现功能
- 货管提现申请功能
- 订单管理优化

### 更早历史
详细功能清单请参考系统各端开发手册：
- 门店端：`docs/store/STORE-GUIDE.md`
- 推销员端：`docs/agent/AGENT_MINIPROGRAM_MANUAL.md`
- 管理后台：`docs/admin/ADMIN-GUIDE.md`

---

## 四端功能详细清单

> 以下为2026-01-12从CLAUDE.md压缩迁移的完整功能清单

### 1. H5推销员端功能（40+功能）

| 模块 | 功能 |
|------|------|
| 首页 | 商品搜索、分类筛选、轮播图、推荐商品、公告滚动 |
| 商品 | 商品列表、详情、规格选择、采购车 |
| 预约 | 预约提交、预约列表、预约详情、取消预约 |
| 分润 | 分润中心、余额明细、代金券列表 |
| 推广 | 推广中心、邀请码、团队管理、定价管理 |
| 活动 | 活动中心、发圈打卡、周进度、闪购、拼团、锁价 |
| 个人 | 个人中心、收款设置、修改密码 |

### 2. H5门店端功能（20+功能）

| 模块 | 功能 |
|------|------|
| 工作台 | 统计卡片、待处理列表、快捷操作 |
| 预约管理 | 预约列表、电话确认、批量接单 |
| 备货管理 | 备货列表、备货详情、进度更新、完成备货 |
| 提货核销 | 提货列表、扫码核销、手动核销、代金券核销 |
| 库存管理 | 库存查看、盘点功能 |

### 3. 管理后台功能（70+功能）

| 模块 | 功能 |
|------|------|
| 预约管理 | 列表、详情、状态管理、筛选导出 |
| 商品管理 | 商品CRUD、分类管理、库存管理 |
| 推销员管理 | 列表、详情、层级管理、定价审核 |
| 营销管理 | 代金券活动、周奖励、发圈审核、激励配置 |
| 活动管理 | 闪购活动、拼团配置、锁价配置、活动页面 |
| 财务管理 | 财务概览、提现审批、资金流水 |
| 系统管理 | 员工管理、操作日志、系统设置 |

### 4. 后端核心服务

| 服务 | 功能 |
|------|------|
| 预约服务 | 创建、确认、备货、核销、取消 |
| 利润服务 | 计算、分配、即时结算 |
| 价格服务 | 四级价格体系、定价权限 |
| 代金券服务 | 发放、核销、统计 |
| 定时任务 | 预约过期、备货提醒、周奖励、月度奖励 |

---

**文档版本**: 2026-01-21 (压缩整理后)
**行数**: 约300行（原2042行）

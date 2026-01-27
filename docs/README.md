# 开发文档导航

本目录按开发板块分类整理，让每个板块的AI只调用自己需要的文档。

**最后更新**: 2026-01-24
**文档版本**: v2.0

---

## 目录结构

```
docs/
├── global/                     # 全局文档（所有板块通用）
│   ├── CHANGELOG.md            # 变更日志
│   ├── BUSINESS_MANUAL.md      # 完整业务手册【新增】
│   ├── MARKETING_ACTIVITIES.md # 营销活动体系【新增】
│   ├── PROJECT_STATUS.md       # 项目状态
│   └── 蒙庆烟花_产品需求文档_用户视角_V1_3.md
│
├── agent/                      # 推销员端文档
│   └── AGENT_MINIPROGRAM_MANUAL.md  # v3.0 含38个路由
│
├── store/                      # 门店端文档
│   └── STORE-GUIDE.md          # v2.0 含14个路由
│
├── admin/                      # 管理后台文档
│   └── ADMIN-GUIDE.md          # v3.0 含46个路由
│
├── server/                     # 后端文档
│   ├── API_REFERENCE.md        # v2.0 178个API端点
│   ├── DATABASE.md             # v2.0 72个数据表
│   ├── AUDIT_SYSTEM.md         # 审计追踪系统【新增】
│   └── SMS_INTEGRATION.md      # 阿里云短信服务
│
├── design/                     # 设计资源
│   ├── H5页面功能演示指南.md
│   ├── IMAGE_OPTIMIZATION_GUIDE.md
│   ├── JS-BRIDGE-GUIDE.md
│   └── 首屏设计.html
│
└── README.md                   # 本文件
```

---

## 文档统计

| 分类 | 文档数 | 说明 |
|------|--------|------|
| 全局文档 | 5 | 业务手册、营销活动、变更日志等 |
| 端开发手册 | 3 | 推销员端/门店端/管理后台 |
| 后端技术 | 4 | API/数据库/审计/短信 |
| 设计资源 | 4 | 演示指南、优化指南等 |
| **总计** | **16** | |

---

## AI调用指南

### 开发推销员端H5
```
必读: ../CLAUDE.md
专属: docs/agent/AGENT_MINIPROGRAM_MANUAL.md
参考: docs/global/MARKETING_ACTIVITIES.md（营销活动相关）
参考: docs/server/API_REFERENCE.md（API接口）
代码: h5-agent/
```

### 开发门店端H5
```
必读: ../CLAUDE.md
专属: docs/store/STORE-GUIDE.md
参考: docs/global/BUSINESS_MANUAL.md（业务流程）
参考: docs/server/API_REFERENCE.md（API接口）
代码: h5-warehouse/
```

### 开发管理后台
```
必读: ../CLAUDE.md
专属: docs/admin/ADMIN-GUIDE.md
参考: docs/server/API_REFERENCE.md（API接口）
参考: docs/global/MARKETING_ACTIVITIES.md（营销活动）
代码: admin/
```

### 开发后端服务
```
必读: ../CLAUDE.md
专属: docs/server/API_REFERENCE.md
专属: docs/server/DATABASE.md
专属: docs/server/AUDIT_SYSTEM.md（审计追踪）
参考: docs/global/BUSINESS_MANUAL.md（业务规则）
代码: server/
```

### 了解业务全貌
```
必读: docs/global/BUSINESS_MANUAL.md
补充: docs/global/MARKETING_ACTIVITIES.md
补充: docs/global/CHANGELOG.md
```

---

## 文档索引

### 全局文档 (global/)

| 文档 | 说明 | 更新日期 |
|------|------|----------|
| BUSINESS_MANUAL.md | 完整业务手册（角色/流程/规则）| 2026-01-24 |
| MARKETING_ACTIVITIES.md | 营销活动体系（砍价/拼团/转盘等）| 2026-01-24 |
| CHANGELOG.md | 详细开发日志、功能清单 | 持续更新 |
| PROJECT_STATUS.md | 项目状态快照 | 2026-01-22 |

### 各端开发手册

| 端 | 文档 | 版本 | 路由数 |
|----|------|------|--------|
| 推销员端 | agent/AGENT_MINIPROGRAM_MANUAL.md | v3.0 | 39 |
| 门店端 | store/STORE-GUIDE.md | v2.0 | 13 |
| 管理后台 | admin/ADMIN-GUIDE.md | v3.0 | 44 |

### 后端技术文档 (server/)

| 文档 | 说明 | 数量 |
|------|------|------|
| API_REFERENCE.md | API端点参考 | 178个 |
| DATABASE.md | 数据表详细说明 | 72表 |
| AUDIT_SYSTEM.md | 审计追踪系统 | 4表 |
| SMS_INTEGRATION.md | 阿里云短信服务 | 2模板 |

### 设计资源 (design/)

| 文档 | 说明 |
|------|------|
| H5页面功能演示指南.md | H5功能演示说明 |
| IMAGE_OPTIMIZATION_GUIDE.md | 图片优化指南 |
| JS-BRIDGE-GUIDE.md | H5与App交互 |
| 首屏设计.html | 首屏设计稿 |

---

## 营销活动文档指引

本系统包含6大营销活动模块，相关文档分布如下：

| 活动 | 业务规则 | 前端开发 | 后台管理 | API接口 |
|------|---------|---------|---------|---------|
| 砍价 | MARKETING_ACTIVITIES.md | AGENT_MINIPROGRAM_MANUAL.md | ADMIN-GUIDE.md | API_REFERENCE.md |
| 拼团 | MARKETING_ACTIVITIES.md | AGENT_MINIPROGRAM_MANUAL.md | ADMIN-GUIDE.md | API_REFERENCE.md |
| 转盘 | MARKETING_ACTIVITIES.md | AGENT_MINIPROGRAM_MANUAL.md | ADMIN-GUIDE.md | API_REFERENCE.md |
| 锁价 | MARKETING_ACTIVITIES.md | AGENT_MINIPROGRAM_MANUAL.md | ADMIN-GUIDE.md | API_REFERENCE.md |
| 代金券 | MARKETING_ACTIVITIES.md | AGENT_MINIPROGRAM_MANUAL.md | ADMIN-GUIDE.md | API_REFERENCE.md |
| 发圈 | MARKETING_ACTIVITIES.md | AGENT_MINIPROGRAM_MANUAL.md | ADMIN-GUIDE.md | API_REFERENCE.md |

---

## 系统架构概览

```
                    ┌─────────────────┐
                    │   H5推销员端     │
                    │  (38个路由)      │
                    └────────┬────────┘
                             │
┌─────────────┐              │              ┌─────────────┐
│  门店端H5   │              │              │  管理后台   │
│ (14个路由)  │──────────────┼──────────────│ (46个路由)  │
└─────────────┘              │              └─────────────┘
                             │
                    ┌────────▼────────┐
                    │   后端API服务    │
                    │  (178端点)       │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   MySQL数据库    │
                    │   (72个表)       │
                    └─────────────────┘
```

---

## 代码目录对照

| 端 | 代码目录 | 技术栈 |
|----|----------|--------|
| H5推销员端 | h5-agent/ | Vue 3 + TDesign |
| 门店端H5 | h5-warehouse/ | Vue 3 + TDesign |
| 管理后台 | admin/ | Vue 3 + TDesign |
| 后端服务 | server/ | Express + Prisma |

---

## 文档更新记录

### 2026-01-24
- [新增] 营销活动体系文档 `MARKETING_ACTIVITIES.md`
- [新增] 完整业务手册 `BUSINESS_MANUAL.md`
- [更新] API参考文档升级到v2.0（200+ API）
- [更新] 数据库文档升级到v2.0（72表）
- [更新] 推销员端手册升级到v3.0（+7模块）
- [更新] 管理后台手册升级到v3.0（+8模块）
- [更新] 门店端手册升级到v2.0（+代金券核销）
- [更新] 本导航文档全面重构

### 2026-01-17
- [重构] 目录结构调整
- [新增] 备货流程文档
- [更新] 预约状态流转图

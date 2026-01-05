# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

蒙庆烟花系统 - B2B烟花批发代理商订货系统，包含代理商裂变推广和库存履约管理功能。

## 技术栈

- **后端**: NestJS 10 + TypeORM 0.3.x + MySQL 8.0 + Redis 7.x
- **小程序端**: uni-app (Vue 3) - 代理商端、库管端、货管端
- **管理后台**: Vue 3 + Element Plus + Vite
- **认证**: uniCloud uni-id (小程序端) + JWT (业务层)
- **部署**: 阿里云ECS + RDS + OSS

## 代码规范

1. 使用TypeScript严格模式
2. 遵循NestJS最佳实践（模块化、依赖注入、DTO验证）
3. 使用class-validator进行参数校验
4. 统一响应格式：`{ code: number, message: string, data?: any }`
5. 错误处理使用自定义HttpException
6. 所有金额使用`decimal(10,2)`，前端传入单位为元
7. 时间使用MySQL datetime，返回ISO格式字符串

## 核心架构

### 全局中间件栈（执行顺序）

应用启动时在 [main.ts](apps/server/src/main.ts) 中注册全局中间件：

1. **ValidationPipe** - 自动验证请求DTO，使用class-validator装饰器
2. **JwtAuthGuard** - JWT认证守卫（全局启用，使用@Public()装饰器跳过）
3. **RolesGuard** - 角色权限守卫（使用@Roles()装饰器）
4. **TransformInterceptor** - 统一响应格式转换
5. **HttpExceptionFilter** - 全局异常捕获和格式化

### 认证流程与装饰器

请求执行流程：
```
请求 → ValidationPipe验证 → JwtAuthGuard验证Token
→ @CurrentUser注入用户 → RolesGuard验证角色 → Controller处理
→ TransformInterceptor转换响应 → 返回统一格式
```

**常用装饰器**（位置：`src/common/decorators/`）：
- `@Public()` - 标记接口为公开，跳过JWT认证（用于登录、注册等接口）
- `@CurrentUser()` - 自动注入当前登录用户信息到方法参数
- `@Roles('admin', 'warehouse')` - 限制接口访问角色

示例：
```typescript
@Post('login')
@Public()  // 跳过JWT认证
async login(@Body() dto: LoginDto) { ... }

@Get('profile')
async getProfile(@CurrentUser() user: User) { ... }  // 自动注入用户

@Get('admin-only')
@Roles('admin')  // 仅管理员可访问
async adminOnly() { ... }
```

### 模块开发模式

创建新模块时应遵循标准结构（参考 `src/modules/user/` 或 `src/modules/product/`）：

```
modules/
└── [module-name]/
    ├── dto/
    │   ├── create-[entity].dto.ts    # 创建请求DTO（使用class-validator装饰器）
    │   ├── update-[entity].dto.ts    # 更新请求DTO
    │   ├── query-[entity].dto.ts     # 查询/分页请求DTO
    │   └── [entity].response.dto.ts  # 响应DTO（可选）
    ├── entities/
    │   └── [entity].entity.ts        # TypeORM数据库实体（已在database/entities/中）
    ├── [module-name].controller.ts   # 控制器（HTTP路由、参数验证）
    ├── [module-name].service.ts      # 服务（业务逻辑）
    ├── [module-name].module.ts       # 模块定义（声明依赖和提供者）
    └── [module-name].spec.ts         # 单元测试
```

### 数据库实体与关系

已实现的实体（位置：`src/database/entities/`）：
- **User** - 用户表（代理商、普通用户）
- **UserAddress** - 用户收货地址
- **Admin** - 管理员账户
- **Employee** - 员工账户（仓库员、搬运工）
- **Product** - 商品
- **Category** - 商品分类

关键关系：
- User 1:N UserAddress （一个用户多个收货地址）
- User N:1 User （代理商层级关系，通过parentId）
- Product N:1 Category （商品属于分类）

迁移操作：
```bash
npm run typeorm migration:generate -- -n DescriptionOfChanges  # 生成迁移
npm run typeorm migration:run                                   # 执行迁移
npm run typeorm migration:revert                                # 回滚最后一个迁移
```

## 项目结构

```
apps/
├── mp-agent/     # 代理商端小程序 (待开发)
├── mp-warehouse/ # 库管端小程序 (待开发)
├── mp-porter/    # 货管端小程序 (待开发)
├── admin/        # Web管理后台 (待开发)
└── server/       # NestJS后端 (已初始化)
    ├── src/
    │   ├── modules/          # 业务模块
    │   │   ├── health/       # ✅ 健康检查模块
    │   │   ├── auth/         # ✅ 认证模块
    │   │   ├── user/         # ✅ 用户模块
    │   │   └── product/      # ✅ 商品模块
    │   ├── common/           # 公共模块
    │   │   ├── decorators/   # 装饰器 (@Public, @CurrentUser, @Roles)
    │   │   ├── filters/      # 过滤器 (HttpExceptionFilter)
    │   │   ├── guards/       # 守卫 (JwtAuthGuard, RolesGuard)
    │   │   ├── interceptors/ # 拦截器 (TransformInterceptor)
    │   │   ├── pipes/        # 管道 (ValidationPipe)
    │   │   └── utils/        # 工具 (ErrorCode枚举)
    │   ├── config/           # 配置 (app, database, redis, jwt)
    │   ├── database/
    │   │   ├── entities/     # 数据库实体 (User, Product, Category等)
    │   │   └── migrations/   # 数据库迁移
    │   ├── app.module.ts
    │   └── main.ts
    ├── scripts/              # 测试脚本 (test-api.sh, test-auth.sh, test-user.sh)
    └── test/                 # E2E测试文件
```

## 常用命令

### 后端开发（apps/server/）

```bash
# 启动应用
npm run start:dev       # 开发模式启动（热重载）
npm run start:debug     # 调试模式启动（可用IDE调试器连接）
npm run build           # 编译为生产版本
npm run start:prod      # 生产模式启动编译后的代码

# 测试
npm run test            # 运行单元测试（*.spec.ts）
npm run test:watch      # 监听模式运行单元测试（开发时使用）
npm run test:cov        # 运行测试并生成覆盖率报告
npm run test:e2e        # 运行端到端测试（*.e2e-spec.ts）
npm run test:debug      # 调试模式运行测试

# 代码质量
npm run lint            # ESLint检查并自动修复代码格式
npm run format          # Prettier格式化代码

# 数据库操作
npm run typeorm migration:generate -- -n MigrationName    # 生成新的数据库迁移
npm run typeorm migration:run                             # 执行待运行的迁移
npm run typeorm migration:revert                          # 回滚最后一个迁移

# 测试脚本（Linux/Mac可直接执行，Windows使用Git Bash）
bash scripts/test-api.sh       # API基础健康检查测试
bash scripts/test-auth.sh      # 认证模块完整测试
bash scripts/test-user.sh      # 用户模块完整测试
```

### 管理后台开发（apps/admin/）

```bash
npm run dev             # 开发模式启动
npm run build           # 构建生产版本
```

## 服务器部署

- **API端口**: 3000 (Nginx反向代理到80)
- **管理后台端口**: 9090
- **Webhook端口**: 9000
- **数据库**: `firework_db`
- **服务器项目目录**: `/root/projects/test111`
- **进程管理**: PM2 (`firework-api`, `webhook-listener`)
- **自动部署**: GitHub push → Webhook触发 → `git pull && npm install && build && PM2 restart`

## API路径规范

```
/api/auth/*        # 认证（登录、注册、Token刷新）
/api/user/*        # 用户管理（个人信息、地址管理）
/api/product/*     # 商品查询（小程序端）
/api/order/*       # 订单管理（代理商端）
/api/agent/*       # 代理商管理
/api/commission/*  # 分润与提现
/api/warehouse/*   # 库管端接口
/api/porter/*      # 货管端接口
/api/admin/*       # 管理后台接口
/api/health        # 系统健康检查
```

## 模块开发状态

| 模块 | 状态 | 功能描述 |
|-----|------|--------|
| **health** | ✅ 已完成 | 系统健康检查（/api/health）、数据库连接检查、缓存检查 |
| **auth** | ✅ 已完成 | uni-app微信登录、管理员登录、员工登录、JWT Token生成与验证 |
| **user** | ✅ 已完成 | 用户信息管理、实名认证、收货地址CRUD、用户查询 |
| **product** | ✅ 已完成 | 商品列表查询（分页/筛选/排序）、商品详情、分类查询 |
| **order** | ⏳ 待开发 | 订单创建、支付处理、状态流转、提货码生成、订单查询 |
| **cart** | ⏳ 待开发 | 订货单管理（购物车功能） |
| **agent** | ⏳ 待开发 | 代理申请、代理商层级管理、下级代理团队查看 |
| **commission** | ⏳ 待开发 | 佣金计算结算、提现申请、提现记录查询 |
| **warehouse** | ⏳ 待开发 | 库存管理、入库操作、备货管理、核销操作 |
| **payment** | ⏳ 待开发 | 微信支付集成、支付状态回调、交易记录 |

## 核心业务规则

**分润规则**:
- 订单金额 < 399元: 一级代理10%, 二级代理2%
- 订单金额 >= 399元: 一级代理15%, 二级代理3%

**代理等级**:
- 0: 普通用户
- 1: 一级代理（可发展下级）
- 2: 二级代理

**VIP锁货费**: 80元/单，订单满500元免费

## 测试验证

每个后端模块完成后需进行API测试验证，使用curl命令或Postman测试各接口的正常响应和异常处理。

## 重要约束

- 所有跟用户对话必须使用中文
- 自动阅读GitHub上传与服务器拉取的测试流程，每次测试都在服务器上实地开展

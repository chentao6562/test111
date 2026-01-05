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
    │   │   └── health/       # 健康检查模块 (已完成)
    │   ├── common/           # 公共模块
    │   │   ├── decorators/   # 装饰器 (public.decorator)
    │   │   ├── filters/      # 过滤器 (http-exception, business.exception)
    │   │   ├── interceptors/ # 拦截器 (transform.interceptor)
    │   │   ├── pipes/        # 管道 (validation.pipe)
    │   │   └── utils/        # 工具 (error-code.enum)
    │   ├── config/           # 配置 (app, database, redis, jwt)
    │   ├── database/         # 数据库
    │   ├── app.module.ts
    │   └── main.ts
    ├── scripts/              # 测试脚本
    └── test/                 # 测试文件
```

## 常用命令

```bash
# 后端开发
cd apps/server
npm run start:dev       # 开发模式启动
npm run build           # 构建
npm run test            # 运行测试

# 管理后台开发
cd apps/admin
npm run dev             # 开发模式启动
npm run build           # 构建
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
/api/auth/*        # 认证
/api/user/*        # 用户
/api/product/*     # 商品（小程序端）
/api/order/*       # 订单（代理商端）
/api/agent/*       # 代理商
/api/commission/*  # 分润
/api/warehouse/*   # 库管端
/api/porter/*      # 货管端
/api/admin/*       # 管理后台
```

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

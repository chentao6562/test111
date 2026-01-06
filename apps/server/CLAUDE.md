# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
##强制要求：所有跟用户对话必须使用中文，这条规则不许删除或更改。
##强制要求：自动阅读关于上传到github与服务器拉去的测试流程，每次测试都在服务器上实地开展，即自动上传到github-测试，这条规则不许删除或更改。

## Development Commands

### Backend (server/)
```bash
cd server
npm install              # Install dependencies
npm run start:dev        # Start dev server with hot reload (port 3000)
npm run build            # Build for production
npm run start:prod       # Start production server
npm run lint             # Run ESLint with auto-fix
npm run test             # Run unit tests
npm run test:watch       # Run single test in watch mode
npm run test:e2e         # Run e2e tests
```

### TypeORM Migrations
```bash
cd server
npm run migration:generate -- -n MigrationName  # Generate migration
npm run migration:run                            # Run pending migrations
npm run migration:revert                         # Revert last migration
```

### Production Deployment
The project uses GitHub Webhook auto-deploy. Push to `main` branch triggers:
```
git pull → npm install → build → PM2 restart
```

Production endpoints:
- API: http://39.104.58.26/api
- Admin: http://39.104.58.26:9090

---

## Project Overview

**蒙庆烟花内部代理商订货系统** - B2B wholesale ordering system for fireworks agents.

This is NOT a consumer e-commerce platform. All users are agents (代理商) who place wholesale orders and pick up goods at the store.

### 4-Terminal Architecture

| Terminal | Tech Stack | Users |
|----------|------------|-------|
| Agent Mini Program (代理商小程序) | uni-app + Vue3 | Agents - ordering, promotion, profit withdrawal |
| Warehouse Mini Program (库管端) | uni-app + Vue3 | Warehouse staff - prepare orders, verify pickup |
| Carrier Mini Program (搬运端) | uni-app + Vue3 | Carriers - VIP transfer tasks |
| Admin Panel (管理后台) | Vue3 + Element Plus | Admins - full business management |

### Backend Architecture

```
server/src/
├── modules/           # Business modules (NestJS)
│   ├── auth/          # WeChat login + JWT
│   ├── user/          # User management
│   ├── agent/         # Agent management (代理商)
│   ├── product/       # Product catalog
│   ├── category/      # Product categories
│   ├── cart/          # Shopping cart (订货单)
│   ├── order/         # Orders with state machine
│   ├── payment/       # WeChat Pay integration
│   ├── inventory/     # Stock management with VIP locking
│   ├── profit/        # Commission calculation & settlement
│   └── team/          # Agent hierarchy
├── common/            # Shared utilities
│   ├── decorators/    # @CurrentUser, etc.
│   ├── guards/        # JwtAuthGuard
│   ├── filters/       # HttpExceptionFilter
│   ├── interceptors/  # TransformInterceptor (response wrapper)
│   └── constants/     # Error codes
└── config/            # Database, app config
```

---

## Terminology (Compliance Requirements)

Use these terms consistently in code, UI, and documentation:

| Forbidden | Correct | Reason |
|-----------|---------|--------|
| 用户/客户/消费者 | 代理商 | All users are agents |
| 购买/下单 | 订货 | Wholesale ordering, not retail |
| 购物车 | 订货单 | Wholesale order form |
| 商城/电商平台 | 订货系统 | Internal ordering system |
| 零售价 | 批发价 | Wholesale pricing |
| 配送/快递 | 到店提货 | In-store pickup only |
| 送货上门 | VIP移库 | Pre-lock stock to VIP warehouse |

---

## Key Business Logic

### Order Status Flow
```
unpaid → paid → preparing → prepared → waiting → completed
                                 ↘ transferring ↗ (VIP only)
       ↘ cancelled
```

### VIP Lock Fee
- VIP pickup (提前锁货): 80 yuan fee
- Waived if order total >= 500 yuan

### Commission Rates (分润)
| Order Amount | Level 1 Agent | Level 2 Agent |
|--------------|---------------|---------------|
| < 399 yuan   | 10%           | 2%            |
| >= 399 yuan  | 15%           | 3%            |

Settlement: T+1 after order completion

### Stock Management
- `stock`: Total inventory
- `vipLockedStock`: Reserved for VIP orders
- Available stock = `stock - vipLockedStock`

---

## API Response Format

All APIs return this structure:
```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

Paginated responses include:
```json
{
  "list": [...],
  "total": 100,
  "page": 1,
  "pageSize": 20
}
```

Error codes: See `server/src/common/constants/error-codes.ts`

---

## Development Rules

### Required Practices
- Use `Decimal.js` or database `DECIMAL` for money calculations
- Wrap stock/balance operations in database transactions
- Use `class-validator` for all DTO validation
- Add Swagger decorators (`@ApiOperation`, `@ApiProperty`) to all endpoints

### Naming Conventions
- Files: `kebab-case` (e.g., `create-order.dto.ts`)
- Classes: `PascalCase` (e.g., `CreateOrderDto`)
- Variables/Functions: `camelCase`
- DB Tables/Columns: `snake_case`

### Module Structure
```
modules/[name]/
├── [name].module.ts
├── [name].controller.ts
├── [name].service.ts
├── entities/
├── dto/
└── enums/
```

---

## Environment Configuration

Copy `.env.example` to `.env` and configure:
- Database: MySQL 8.0 connection
- Redis: Session/cache storage
- JWT: Secret and expiration
- WeChat: Mini Program AppID/Secret
- WeChat Pay: Merchant credentials
- Aliyun OSS: File storage

Production database: `rm-hp39t0j1y3xo2a25g.mysql.huhehaote.rds.aliyuncs.com`

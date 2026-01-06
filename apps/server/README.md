# 蒙庆烟花后端服务

蒙庆烟花B2B代理商订货系统后端API服务。

## 技术栈

- **框架**: NestJS 10
- **ORM**: TypeORM 0.3.x
- **数据库**: MySQL 8.0
- **缓存**: Redis (可选) / 内存缓存
- **认证**: JWT + uniCloud uni-id

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

主要配置项：

```env
# 数据库
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=firework_db

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
```

### 3. 创建数据库

在MySQL中创建数据库：

```sql
CREATE DATABASE firework_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. 启动服务

开发模式：
```bash
npm run start:dev
```

生产模式：
```bash
npm run build
npm run start:prod
```

### 5. 访问API

- API地址: http://localhost:3000/api
- Swagger文档: http://localhost:3000/api-docs

## 测试

### 运行测试脚本

```bash
# 在Linux/Mac上
bash scripts/test-api.sh

# 或者使用curl手动测试
curl http://localhost:3000/api/health
```

### 测试用例

1. **健康检查**
   ```bash
   curl http://localhost:3000/api/health
   ```
   期望响应：
   ```json
   {
     "code": 0,
     "message": "success",
     "data": {
       "status": "ok",
       "timestamp": "2024-01-05T...",
       "uptime": 123.456
     }
   }
   ```

2. **数据库连接检查**
   ```bash
   curl http://localhost:3000/api/health/db
   ```

3. **缓存检查**
   ```bash
   curl http://localhost:3000/api/health/cache
   ```

## 项目结构

```
src/
├── modules/            # 业务模块
│   └── health/         # 健康检查模块
├── common/             # 公共模块
│   ├── decorators/     # 装饰器
│   ├── filters/        # 过滤器
│   ├── guards/         # 守卫
│   ├── interceptors/   # 拦截器
│   ├── pipes/          # 管道
│   └── utils/          # 工具类
├── config/             # 配置
├── database/           # 数据库
│   ├── entities/       # 实体
│   └── migrations/     # 迁移
├── app.module.ts       # 应用模块
└── main.ts             # 入口文件
```

## 响应格式

### 成功响应

```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

### 错误响应

```json
{
  "code": 400,
  "message": "参数错误",
  "timestamp": "2024-01-05T...",
  "path": "/api/..."
}
```

## 错误码

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| 400 | 参数错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |
| 1001-1006 | 认证相关 |
| 2001-2004 | 商品相关 |
| 3001-3005 | 订单相关 |
| 4001-4005 | 代理商相关 |

## 部署

### 使用PM2部署

```bash
# 构建
npm run build

# 启动
pm2 start dist/main.js --name firework-api

# 查看日志
pm2 logs firework-api
```

### 服务器配置

- API端口: 3000
- 建议使用Nginx反向代理
- 数据库: 阿里云RDS MySQL 8.0

# H5代理商端部署文档

## 项目信息
- **项目名称**: 蒙庆烟花H5代理商端
- **技术栈**: Vue 3 + TypeScript + Vite + TDesign Mobile Vue
- **部署地址**: http://39.104.58.26 (端口80，无需指定)
- **用途**: 小程序的H5备选方案，功能完全一致

> **重要说明**: H5代理商端使用**80端口**（HTTP默认端口），访问时URL无需带端口号！

## 已完成的部署步骤

### 1. 项目构建 ✅
```bash
cd /root/projects/test111/h5-agent
npm install
npm run build
# 构建产物在 dist/ 目录
```

### 2. Nginx配置 ✅
配置文件: `/etc/nginx/conf.d/h5-agent.conf`
- 监听端口: **80** (HTTP默认端口)
- 根目录: `/root/projects/test111/h5-agent/dist`
- 支持前端路由 (try_files)
- 静态资源缓存 (1年)
- Gzip压缩

### 3. 服务已启动 ✅
```bash
nginx -t
systemctl reload nginx
# 80端口已监听
```

## 端口分配说明

当前服务器端口分配:
- **80**: H5代理商端 ⭐ (主入口，无需指定端口)
- **8080**: 小程序H5 (miniapp)
- **8082**: H5库管端
- **8083**: H5货管端
- **9000**: GitHub Webhook
- **9090**: 管理后台
- **后端API**: http://39.104.58.26/api (通过nginx代理)

> **注意**: 代理商端H5使用80端口是因为它是面向代理商的主要H5入口，使用默认端口更方便访问。

## 功能清单

已实现全部12个页面:
- ✅ 登录页 (`/login`)
- ✅ 首页 (`/`)
- ✅ 分类页 (`/category`)
- ✅ 商品详情 (`/product/:id`)
- ✅ 购物车 (`/cart`)
- ✅ 结算页 (`/checkout`)
- ✅ 订单列表 (`/orders`)
- ✅ 订单详情 (`/orders/:id`)
- ✅ 个人中心 (`/my`)
- ✅ 分润中心 (`/commission`)
- ✅ 团队管理 (`/team`)
- ✅ 推广中心 (`/promotion`)

## API配置

H5直接调用现有后端API:
- **Base URL**: `http://39.104.58.26/api`
- **认证方式**: JWT Bearer Token
- **存储**: localStorage
  - Token Key: `h5_agent_token`
  - User Key: `h5_agent_user`

## 更新部署流程

```bash
# 1. 本地修改后推送
git add .
git commit -m "更新内容"
git push origin main

# 2. 服务器拉取并重新构建
ssh root@39.104.58.26
cd /root/projects/test111/h5-agent
git pull origin main
npm install  # 如有新依赖
npm run build

# 3. Nginx会自动使用新的dist目录
# 无需重启nginx（静态文件直接更新）
```

## 测试账号

| 角色 | 账号 | 验证码 |
|------|------|--------|
| 测试代理商 | 13800138000 | 123456 |
| 一级代理 | 13800138001 | 123456 |
| 二级代理 | 13800138002 | 123456 |

## 注意事项

1. **不影响现有系统**: H5端独立部署，不影响小程序和管理后台
2. **共享后端API**: 使用相同的API，数据完全同步
3. **移动端优化**: 已适配移动端屏幕，建议使用手机浏览器访问
4. **路由模式**: 使用History模式，nginx已配置try_files支持前端路由
5. **端口说明**: 使用80端口（HTTP默认），访问URL无需指定端口

## 问题排查

### 1. 无法访问H5页面
```bash
# 检查nginx是否运行
systemctl status nginx

# 检查80端口监听
netstat -tlnp | grep :80

# 检查nginx日志
tail -f /var/log/nginx/h5-agent-error.log
```

### 2. API请求失败
- 检查浏览器控制台Network标签
- 确认后端API服务正常运行
- 检查JWT Token是否过期

### 3. 白屏问题
- 清除浏览器缓存
- 检查nginx配置中的root路径是否正确
- 查看nginx error日志

## 性能优化建议

当前构建产物:
- 主bundle: 755KB (gzip后222KB)
- 建议: 如需进一步优化，可配置代码分割和懒加载

## 文件清单

```
h5-agent/
├── dist/                    # 构建产物（服务器部署）
├── src/
│   ├── api/                # API封装
│   ├── router/             # 路由配置
│   ├── stores/             # Pinia状态管理
│   ├── views/              # 12个页面组件
│   ├── App.vue             # 根组件（含TabBar）
│   └── main.ts             # 入口文件
├── package.json
├── vite.config.ts
├── DEPLOYMENT.md           # 本文档
└── README.md
```

## 联系方式

- 项目仓库: https://github.com/chentao6562/test111
- 部署完成时间: 2026-01-09
- 部署人: Claude Sonnet 4.5
- 最后更新: 2026-01-13 (端口变更为80)

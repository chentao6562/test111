# 部署文档导航

本目录包含蒙庆烟花项目的部署相关文档和数据。

---

## 📚 文档列表

### [上线部署指南.md](上线部署指南.md) ⭐⭐⭐⭐⭐
**用途**: 生产环境部署完整流程

**包含内容**:
- 服务器环境配置
- 后端服务部署
- 前端应用部署
- 数据库初始化
- Webhook自动部署配置
- 常见问题排查

**何时使用**:
- 首次部署系统时
- 迁移到新服务器时
- 排查部署问题时

---

### [demo-data-summary.md](demo-data-summary.md) ⭐⭐⭐
**用途**: 演示数据创建说明

**包含内容**:
- 演示商品数据（15个商品，6个分类）
- 演示订单数据（4个订单，不同状态）
- H5素材数据（轮播图、推荐商品、公告）
- 库存统计
- 图片URL示例
- 演示要点

**何时使用**:
- 准备系统演示时
- 创建测试数据时
- 了解数据结构时

---

### [demo-data-setup.sql](demo-data-setup.sql)
**用途**: 演示数据SQL脚本

**包含内容**:
- 商品数据INSERT语句
- 订单数据INSERT语句
- H5素材数据INSERT语句
- 关联关系数据

**何时使用**:
- 快速导入演示数据时
- 重置测试环境时

---

## 🚀 快速部署

### 1. 首次部署流程

#### 步骤1：准备服务器
```bash
# 连接服务器
ssh root@39.104.58.26

# 安装Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# 安装PM2
npm install -g pm2

# 安装MySQL客户端
apt-get install -y mysql-client
```

#### 步骤2：克隆项目
```bash
cd /root/projects
git clone https://github.com/chentao6562/test111.git
cd test111
```

#### 步骤3：配置环境
```bash
cd server
cp .env.example .env
# 编辑 .env 文件，填入真实配置
vi .env
```

#### 步骤4：安装依赖
```bash
npm install
npx prisma generate
```

#### 步骤5：初始化数据库
```bash
npx prisma migrate deploy
```

#### 步骤6：导入演示数据（可选）
```bash
mysql -h rm-hp39t0j1y3xo2a25g.mysql.huhehaote.rds.aliyuncs.com \
      -u yanhuaxitong \
      -p \
      firework_db < ../deployment/demo-data-setup.sql
```

#### 步骤7：启动服务
```bash
npm run build
pm2 start ecosystem.config.js
```

**详细步骤见**: [上线部署指南.md](上线部署指南.md)

---

### 2. 更新部署流程

#### 方式1：自动部署（推荐）
```bash
# 本地推送代码
git add .
git commit -m "描述"
git push origin main

# Webhook自动触发部署
# 无需手动操作
```

#### 方式2：手动部署
```bash
ssh root@39.104.58.26
cd /root/projects/test111/server
git pull
npm install
npm run build
pm2 restart firework-api
```

---

## 📊 部署环境信息

### 生产环境
| 项目 | 值 |
|------|-----|
| 服务器IP | 39.104.58.26 |
| 操作系统 | Ubuntu 20.04 |
| Node.js | v18.x |
| MySQL | 8.0 (阿里云RDS) |
| PM2 | 最新版 |

### 服务端口
| 服务 | 端口 | 说明 |
|------|------|------|
| 后端API | 3000 | 内部端口 |
| Nginx转发 | 80 | 对外端口 |
| 管理后台 | 9090 | Vue开发服务器 |
| Webhook | 9000 | GitHub自动部署 |

### 数据库连接
```
Host: rm-hp39t0j1y3xo2a25g.mysql.huhehaote.rds.aliyuncs.com
Port: 3306
Database: firework_db
User: yanhuaxitong
Password: 见 server/.env
```

---

## 🔧 部署工具

### PM2 常用命令
```bash
# 查看进程列表
pm2 list

# 查看日志
pm2 logs firework-api

# 重启服务
pm2 restart firework-api

# 停止服务
pm2 stop firework-api

# 删除进程
pm2 delete firework-api

# 保存进程列表
pm2 save

# 设置开机自启
pm2 startup
```

### Nginx 常用命令
```bash
# 测试配置
nginx -t

# 重载配置
nginx -s reload

# 重启服务
systemctl restart nginx

# 查看状态
systemctl status nginx
```

### 数据库管理
```bash
# 连接数据库
mysql -h rm-hp39t0j1y3xo2a25g.mysql.huhehaote.rds.aliyuncs.com \
      -u yanhuaxitong \
      -p \
      firework_db

# 导出数据库
mysqldump -h ... -u ... -p firework_db > backup.sql

# 导入数据库
mysql -h ... -u ... -p firework_db < backup.sql
```

---

## 📝 部署检查清单

### 部署前检查
- [ ] .env 文件配置正确
- [ ] 数据库连接测试通过
- [ ] 代码已通过测试
- [ ] Git代码已推送
- [ ] 备份当前数据库

### 部署中检查
- [ ] 代码拉取成功
- [ ] 依赖安装成功
- [ ] 编译构建成功
- [ ] PM2启动成功
- [ ] 日志无错误

### 部署后验证
- [ ] API接口可访问
- [ ] 管理后台可登录
- [ ] 代理商小程序可用
- [ ] 库管端小程序可用
- [ ] 货管端小程序可用
- [ ] 短信服务正常
- [ ] 数据库连接正常

---

## 🚨 常见问题

### 问题1：PM2启动失败
**原因**: 端口被占用或.env配置错误
**解决**:
```bash
# 检查端口占用
lsof -i :3000

# 查看PM2日志
pm2 logs firework-api --lines 50

# 检查.env配置
cat /root/projects/test111/server/.env
```

### 问题2：数据库连接失败
**原因**: RDS白名单未添加服务器IP
**解决**: 登录阿里云RDS控制台，添加 39.104.58.26 到白名单

### 问题3：Webhook不触发
**原因**: GitHub Webhook配置错误
**解决**:
```bash
# 检查Webhook服务
pm2 status webhook

# 查看Webhook日志
pm2 logs webhook

# 测试Webhook
curl -X POST http://39.104.58.26:9000/webhook
```

### 问题4：短信发送失败
**原因**: AccessKey配置错误或签名未通过
**解决**:
```bash
# 检查短信配置
node tools/check-sms-config.js

# 测试发送
node tools/test-sms.js 17678033798
```

更多问题见: [上线部署指南.md](上线部署指南.md)

---

## 📞 技术支持

**部署问题**: 查阅部署指南或联系开发团队
**数据库问题**: 查阅数据库文档
**服务器问题**: 联系运维团队

---

**最后更新**: 2026-01-12
**维护人员**: 蒙庆烟花开发团队

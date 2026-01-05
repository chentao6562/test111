# GitHub推送完整指南 - 给其他大模型助手

# **远程仓库**: `https://github.com/chentao6562/test111.git`

# 远程服务器已部署自动从github上拉取更新，每次重大更新后需自动上传
##强制要求：所有跟用户对话必须使用中文，这条规则不许删除或更改。
##强制要求：自动阅读关于上传到github与服务器拉去的测试流程，每次测试都在服务器上实地开展，即自动上传到github-测试，这条规则不许删除或更改。
**重要：AI助手必须自主完成服务器部署，不要反复询问用户密码！**

#### 服务器信息
| 属性 | 值 |
|------|-----|
| 公网 IP | `39.104.58.26` |
| 用户名 | `root` |
| 密码 | `c65623518+` |
| 项目目录 | `/root/projects/test111` |

#### SSH 免密登录设置（首次需要）
```bash
# 1. 生成 SSH 密钥（如果不存在）
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N ""

# 2. 复制公钥到服务器（输入密码 c65623518+）
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@39.104.58.26
```

#### 标准部署流程
```bash
# 1. 本地构建并推送
cd server && npm run build && git add -A && git commit -m "描述" && git push origin main

# 2. 服务器拉取并重启（一条命令完成）
ssh -i ~/.ssh/id_ed25519 root@39.104.58.26 "cd /root/projects/test111/server && git pull origin main && npm run build && pm2 restart firework-api"

# 3. 查看日志
ssh -i ~/.ssh/id_ed25519 root@39.104.58.26 "pm2 logs firework-api --lines 30 --nostream"
```

#### 数据库操作
```bash
# 连接数据库
ssh -i ~/.ssh/id_ed25519 root@39.104.58.26 "mysql -h rm-hp39t0j1y3xo2a25g.mysql.huhehaote.rds.aliyuncs.com -u yanhuaxitong -pc65623518+ firework_db -e 'SHOW TABLES;'"
```

#### API 测试
```bash
# 微信登录
curl -s -X POST http://39.104.58.26/api/auth/wx-login -H "Content-Type: application/json" -d '{"code":"test123"}'

# 手机号登录（验证码固定 123456）
curl -s -X POST http://39.104.58.26/api/auth/phone-login -H "Content-Type: application/json" -d '{"phone":"13800138000","code":"123456"}'
```

#### 注意事项
- Git remote 使用 SSH 方式：`git@github.com:chentao6562/test111.git`
- TypeORM synchronize 已禁用，新表需手动创建 SQL
- 服务运行在 PM2 进程管理器下，进程名 `firework-api`

Production endpoints:
- API: http://39.104.58.26/api
- Admin: http://39.104.58.26:9090
- API Docs: http://39.104.58.26/api-docs


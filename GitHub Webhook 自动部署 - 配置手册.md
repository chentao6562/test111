# GitHub Webhook 自动部署 - 配置手册

**文档目的**: 详细记录从零到一配置 GitHub Webhook 自动部署系统的完整步骤、遇到的问题及解决方案，为后续维护和交接提供清晰指引。

##强制要求：所有跟用户对话必须使用中文，这条规则不许删除或更改。
##强制要求：自动阅读关于上传到github与服务器拉去的测试流程，每次测试都在服务器上实地开展，即自动上传到github-测试，这条规则不许删除或更改。

---

## 1. 目标

在阿里云 ECS 服务器上，为 GitHub 仓库 `chentao6562/test111` 配置一个自动部署系统。当开发者向 `main` 分支推送代码时，服务器能自动拉取最新的代码，实现持续集成与部署 (CI/CD) 的第一步。

---

## 2. 核心问题与解决方案

在配置过程中，遇到了两个核心问题，以下是对应的解决方案，这也是整个配置过程的关键。

### 问题 1: 服务器无法通过 HTTPS 连接 GitHub
- **现象**: `git clone` 或 `git pull` 时，连接 `github.com` 的 443 端口超时。
- **原因**: GitHub 在中国大陆的网络访问不稳定。
- **解决方案**: **使用 SSH 协议替代 HTTPS 协议**。通过在服务器生成 SSH 密钥对，并将公钥配置为 GitHub 仓库的 Deploy Key，实现免密、稳定的 Git 操作。

### 问题 2: 数据库认证失败
- **现象**: 使用 `root` 账号连接 RDS 数据库时，提示 `Authentication requires secure connection`。
- **原因**: `root` 账号使用了需要 SSL 连接的 `caching_sha2_password` 认证插件。
- **解决方案**: **使用专用的数据库账号 `yanhuaxitong`**，该账号使用 `mysql_native_password` 认证，无需 SSL 即可连接。

---

## 3. 详细配置步骤

### 步骤 1: 环境准备与检查

1.  **连接服务器**: 通过 SSH 连接到服务器 `root@39.104.58.26`。
2.  **安装依赖**: 确保 `git`, `node`, `npm` 已安装。本次配置中，还安装了 `sshpass` 用于非交互式 SSH。
    ```bash
    sudo apt-get update && sudo apt-get install -y sshpass
    ```
3.  **安装 PM2**: 全局安装 PM2 用于 Node.js 进程管理。
    ```bash
    npm install -g pm2
    ```

### 步骤 2: 配置 SSH 访问 GitHub (解决问题1)

1.  **生成 SSH 密钥对**: 在服务器上为 GitHub 生成专用的 ED25519 密钥。
    ```bash
    ssh-keygen -t ed25519 -C "deploy@test111-server" -f ~/.ssh/id_ed25519_github -N ""
    ```
2.  **获取公钥**: 查看并复制公钥内容。
    ```bash
    cat ~/.ssh/id_ed25519_github.pub
    # 输出: ssh-ed25519 AAAAC3... deploy@test111-server
    ```
3.  **在 GitHub 添加 Deploy Key**: 
    - 访问 `https://github.com/chentao6562/test111/settings/keys`。
    - 点击 "Add deploy key"。
    - Title: `test111-server-deploy`。
    - Key: 粘贴公钥。
    - **不勾选** "Allow write access"。
4.  **配置 SSH 客户端**: 创建 `~/.ssh/config` 文件，指定访问 `github.com` 时使用此密钥。
    ```bash
    cat > ~/.ssh/config << EOF
    Host github.com
        HostName github.com
        User git
        IdentityFile ~/.ssh/id_ed25519_github
        StrictHostKeyChecking no
    EOF
    chmod 600 ~/.ssh/config
    ```
5.  **测试 SSH 连接**: 
    ```bash
    ssh -T git@github.com
    # 预期输出: Hi chentao6562/test111! You've successfully authenticated...
    ```

### 步骤 3: 部署 Webhook 监听服务

1.  **创建项目目录**: 
    ```bash
    mkdir -p /root/webhook
    cd /root/webhook
    ```
2.  **初始化 Node.js 项目**: 
    ```bash
    npm init -y
    npm install express body-parser
    ```
3.  **创建服务脚本 `server.js`**: 包含 Secret 验证、日志记录和 `git pull` 逻辑。
    ```javascript
    // 详细脚本内容见 03_final_documentation.md
    const SECRET = "c65623518+";
    // ...
    exec("cd /root/projects/test111 && git pull origin main", ...);
    // ...
    ```
4.  **启动服务**: 使用 PM2 启动并设置开机自启。
    ```bash
    pm2 start server.js --name webhook-listener
    pm2 save
    pm2 startup
    ```

### 步骤 4: 克隆代码仓库

1.  **创建项目父目录**: 
    ```bash
    mkdir -p /root/projects
    cd /root/projects
    ```
2.  **使用 SSH 克隆仓库**: 
    ```bash
    git clone git@github.com:chentao6562/test111.git
    ```
3.  **测试拉取**: 
    ```bash
    cd test111 && git pull origin main
    # 预期输出: Already up to date.
    ```

### 步骤 5: 配置阿里云安全组

1.  **登录阿里云控制台**，进入 ECS 实例的安全组配置。
2.  **添加入方向规则**: 
    - **端口范围**: `9000/9000`
    - **授权对象**: `0.0.0.0/0`
    - **描述**: `GitHub Webhook`
3.  **验证出方向规则**: 确保允许访问外部的 22 端口 (SSH) 和 443 端口 (HTTPS)。

### 步骤 6: 配置 GitHub Webhook (最后一步)

1.  **访问 Webhook 设置页面**: `https://github.com/chentao6562/test111/settings/hooks`。
2.  **点击 "Add webhook"**。
3.  **填写配置**: 
    - **Payload URL**: `http://39.104.58.26:9000/webhook`
    - **Content type**: `application/json`
    - **Secret**: `c65623518+`
    - **Events**: 选择 "Just the push event"。
4.  **保存并测试**: 保存后，GitHub 会发送一个 `ping` 事件，在 "Recent Deliveries" 中应看到 200 响应。

---

## 4. 日常维护与调试

### 查看服务状态
```bash
pm2 list
```

### 查看日志
- **PM2 实时日志**: `pm2 logs webhook-listener`
- **详细文件日志**: `tail -f /root/webhook/webhook.log`

### 手动更新代码
```bash
cd /root/projects/test111 && git pull origin main
```

### 测试数据库连接
```bash
mysql -h rm-hp39t0j1y3xo2a25g.mysql.huhehaote.rds.aliyuncs.com -P 3306 -u yanhuaxitong -p'c65623518+' -e 'SHOW DATABASES;'
```

### 测试 Webhook 服务健康
```bash
curl http://39.104.58.26:9000/health
```

---

## 5. 配置文件路径清单

| 文件/目录 | 路径 | 描述 |
|---|---|---|
| Webhook 服务脚本 | `/root/webhook/server.js` | 核心逻辑 |
| Webhook 日志 | `/root/webhook/webhook.log` | 详细日志 |
| SSH 私钥 | `/root/.ssh/id_ed25519_github` | Git 认证密钥 |
| SSH 配置 | `/root/.ssh/config` | SSH 客户端配置 |
| 项目代码 | `/root/projects/test111` | Git 仓库 |
| PM2 配置 | `/root/.pm2/` | PM2 进程管理配置 |

这份手册记录了从环境检查到最终配置完成的全过程，包括遇到的关键问题和解决方案。下一个大模型可以基于此文档，快速理解系统架构和配置细节，直接进入维护或继续开发或维护的状态。

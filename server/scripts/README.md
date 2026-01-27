# 服务器脚本工具

本目录包含服务器运维和配置的脚本工具。

## 阿里云短信服务配置工具

### 1. 配置检查脚本 `check-sms-config.sh`

快速检查当前短信服务配置状态。

**使用方法**：

```bash
# 在服务器上执行
cd /root/projects/test111/server/scripts
./check-sms-config.sh
```

**输出示例**：

```
=========================================
  蒙庆烟花短信服务配置检查
=========================================

📋 当前配置状态：

1. 短信服务状态
   ✅ 已启用真实短信发送

2. AccessKey 配置
   ✅ AccessKey ID: LTAI5t****8000
   ✅ AccessKey Secret: ********

3. 短信签名
   ✅ 签名名称: 蒙庆烟花

4. 短信模板
   ✅ 模板CODE: SMS_123456789

5. 依赖检查
   ✅ 阿里云短信SDK已安装

=========================================
✅ 配置完整，短信服务已就绪
=========================================
```

---

### 2. 交互式配置向导 `setup-sms.sh`

引导式配置阿里云短信服务。

**使用方法**：

```bash
# 在服务器上执行
cd /root/projects/test111/server/scripts
./setup-sms.sh
```

**配置步骤**：

1. **选择模式**：真实短信发送 / 测试模式
2. **输入 AccessKey ID**：从阿里云控制台获取
3. **输入 AccessKey Secret**：安全输入（不显示）
4. **设置短信签名**：默认"蒙庆烟花"
5. **输入模板CODE**：格式 SMS_xxxxxxxx
6. **确认并保存**
7. **自动重启服务**

**功能特性**：

- ✅ 自动备份 `.env` 文件
- ✅ 输入验证（AccessKey格式、模板CODE格式）
- ✅ 脱敏显示（不泄露敏感信息）
- ✅ 可选择立即重启服务
- ✅ 提供后续测试指引

---

## 快速开始

### 场景1：首次配置阿里云短信

```bash
# 1. SSH登录服务器
ssh root@39.104.58.26

# 2. 进入脚本目录
cd /root/projects/test111/server/scripts

# 3. 运行配置向导
./setup-sms.sh

# 4. 按提示输入配置信息

# 5. 查看日志验证
pm2 logs firework-api --lines 50
```

### 场景2：检查当前配置

```bash
# SSH登录服务器
ssh root@39.104.58.26

# 运行检查脚本
cd /root/projects/test111/server/scripts
./check-sms-config.sh
```

### 场景3：切换到测试模式

```bash
# 运行配置向导
./setup-sms.sh

# 选择 "2) 测试模式"
# 确认保存
# 重启服务
```

---

## 注意事项

### 安全提示

1. **AccessKey 保密**：
   - AccessKey 具有账户最高权限
   - 不要分享给他人
   - 定期更换

2. **备份恢复**：
   - 脚本会自动备份 `.env` 文件
   - 备份文件格式：`.env.backup.20260108_143000`
   - 如需恢复：`cp .env.backup.xxxxxx .env`

3. **配置验证**：
   - 配置完成后务必测试验证码发送
   - 检查服务器日志确认无错误

### 常见错误

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| `isv.BUSINESS_LIMIT_CONTROL` | 触发阿里云限流 | 等待后重试，检查限流配置 |
| `isv.INVALID_PARAMETERS` | 参数错误 | 检查模板CODE、签名是否正确 |
| `SignatureDoesNotMatch` | AccessKey错误 | 重新检查AccessKey Secret |
| `配置不完整` | 缺少必要配置项 | 运行 setup-sms.sh 补全配置 |

---

## 文件说明

| 文件 | 说明 |
|------|------|
| `check-sms-config.sh` | 配置检查脚本（只读） |
| `setup-sms.sh` | 交互式配置向导（修改配置） |
| `README.md` | 本文档 |

---

## 相关文档

- **详细配置指南**：`/烟花6/阿里云短信服务配置指南.md`
- **阿里云短信文档**：https://help.aliyun.com/product/44282.html

---

## 更新日志

- **2026-01-08**：创建短信服务配置工具
  - 新增配置检查脚本
  - 新增交互式配置向导
  - 支持自动备份和恢复

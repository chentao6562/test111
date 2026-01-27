#!/bin/bash
# JWT密钥更新脚本
# 用于在服务器上安全更新JWT密钥

set -e

ENV_FILE="/root/projects/test111/server/.env"

# 生成新的64字节密钥
NEW_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('base64'))")

echo "=== JWT密钥更新脚本 ==="
echo "新密钥长度: ${#NEW_SECRET} 字符"

# 备份当前.env
cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d%H%M%S)"
echo "✓ 已备份当前配置"

# 更新JWT_SECRET
sed -i "s|^JWT_SECRET=.*|JWT_SECRET=\"$NEW_SECRET\"|" "$ENV_FILE"
echo "✓ 已更新JWT_SECRET"

# 重启服务
pm2 restart firework-api
echo "✓ 已重启服务"

echo ""
echo "⚠️ 注意: 更新JWT密钥后，所有现有用户需要重新登录"
echo "✓ JWT密钥更新完成"

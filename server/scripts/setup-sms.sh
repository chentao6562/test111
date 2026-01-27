#!/bin/bash

# 阿里云短信服务一键配置脚本（交互式）

echo "========================================="
echo "  蒙庆烟花短信服务配置向导"
echo "========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 检查 .env 文件
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env 文件不存在${NC}"
    exit 1
fi

# 备份 .env
echo -e "${BLUE}📦 备份配置文件...${NC}"
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo -e "${GREEN}✅ 已备份至 .env.backup.$(date +%Y%m%d_%H%M%S)${NC}"
echo ""

# 读取当前配置
CURRENT_ENABLED=$(grep "^SMS_ENABLED=" .env | cut -d '=' -f2 | tr -d '"')
CURRENT_KEY_ID=$(grep "^SMS_ACCESS_KEY_ID=" .env | cut -d '=' -f2 | tr -d '"')
CURRENT_KEY_SECRET=$(grep "^SMS_ACCESS_KEY_SECRET=" .env | cut -d '=' -f2 | tr -d '"')
CURRENT_SIGN=$(grep "^SMS_SIGN_NAME=" .env | cut -d '=' -f2 | tr -d '"')
CURRENT_TEMPLATE=$(grep "^SMS_TEMPLATE_CODE=" .env | cut -d '=' -f2 | tr -d '"')

echo -e "${YELLOW}📋 当前配置：${NC}"
echo "   SMS_ENABLED: $CURRENT_ENABLED"
echo "   AccessKey ID: ${CURRENT_KEY_ID:0:6}****${CURRENT_KEY_ID: -4}"
echo "   签名: $CURRENT_SIGN"
echo "   模板: $CURRENT_TEMPLATE"
echo ""

# 询问是否启用
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}步骤1/5: 选择短信服务模式${NC}"
echo ""
echo "1) 启用真实短信发送（生产环境）"
echo "2) 测试模式（固定验证码123456）"
echo ""
read -p "请选择 [1/2]: " MODE_CHOICE

if [ "$MODE_CHOICE" = "1" ]; then
    SMS_ENABLED="true"
    echo -e "${GREEN}✅ 已选择：真实短信发送${NC}"

    # 输入 AccessKey ID
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}步骤2/5: 配置 AccessKey ID${NC}"
    echo ""
    echo -e "${BLUE}💡 提示：在阿里云控制台 → AccessKey管理 中获取${NC}"
    echo "   https://ram.console.aliyun.com/manage/ak"
    echo ""
    read -p "请输入 AccessKey ID（格式：LTAI5t...）: " ACCESS_KEY_ID

    if [ -z "$ACCESS_KEY_ID" ]; then
        echo -e "${RED}❌ AccessKey ID 不能为空${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ AccessKey ID 已设置${NC}"

    # 输入 AccessKey Secret
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}步骤3/5: 配置 AccessKey Secret${NC}"
    echo ""
    read -sp "请输入 AccessKey Secret（不会显示）: " ACCESS_KEY_SECRET
    echo ""

    if [ -z "$ACCESS_KEY_SECRET" ]; then
        echo -e "${RED}❌ AccessKey Secret 不能为空${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ AccessKey Secret 已设置${NC}"

    # 输入签名
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}步骤4/5: 配置短信签名${NC}"
    echo ""
    echo -e "${BLUE}💡 提示：签名必须与阿里云控制台审核通过的签名完全一致${NC}"
    echo "   当前默认签名：蒙庆烟花"
    echo ""
    read -p "请输入短信签名 [默认: 蒙庆烟花]: " SIGN_NAME
    SIGN_NAME=${SIGN_NAME:-蒙庆烟花}
    echo -e "${GREEN}✅ 签名已设置: $SIGN_NAME${NC}"

    # 输入模板CODE
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}步骤5/5: 配置短信模板CODE${NC}"
    echo ""
    echo -e "${BLUE}💡 提示：在阿里云短信服务控制台 → 模板管理 中获取${NC}"
    echo "   格式：SMS_xxxxxxxx"
    echo ""
    read -p "请输入模板CODE（如：SMS_123456789）: " TEMPLATE_CODE

    if [ -z "$TEMPLATE_CODE" ]; then
        echo -e "${RED}❌ 模板CODE 不能为空${NC}"
        exit 1
    fi

    # 验证模板CODE格式
    if [[ ! "$TEMPLATE_CODE" =~ ^SMS_[0-9]+$ ]]; then
        echo -e "${YELLOW}⚠️  警告：模板CODE格式可能不正确（应为 SMS_xxxxxxxx）${NC}"
        read -p "是否继续？[y/N]: " CONTINUE
        if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
            echo "已取消"
            exit 1
        fi
    fi
    echo -e "${GREEN}✅ 模板CODE已设置: $TEMPLATE_CODE${NC}"

else
    SMS_ENABLED="false"
    ACCESS_KEY_ID=""
    ACCESS_KEY_SECRET=""
    SIGN_NAME="蒙庆烟花"
    TEMPLATE_CODE=""
    echo -e "${YELLOW}ℹ️  已选择：测试模式（固定验证码123456）${NC}"
fi

# 确认配置
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📝 配置确认${NC}"
echo ""
echo "SMS_ENABLED: $SMS_ENABLED"
if [ "$SMS_ENABLED" = "true" ]; then
    echo "AccessKey ID: ${ACCESS_KEY_ID:0:6}****${ACCESS_KEY_ID: -4}"
    echo "AccessKey Secret: ********"
    echo "签名: $SIGN_NAME"
    echo "模板CODE: $TEMPLATE_CODE"
fi
echo ""
read -p "确认保存配置？[y/N]: " CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "已取消"
    exit 0
fi

# 更新 .env 文件
echo ""
echo -e "${BLUE}💾 正在保存配置...${NC}"

# 使用 sed 更新配置
if [ "$(uname)" = "Darwin" ]; then
    # macOS
    sed -i '' "s/^SMS_ENABLED=.*/SMS_ENABLED=\"$SMS_ENABLED\"/" .env
    sed -i '' "s|^SMS_ACCESS_KEY_ID=.*|SMS_ACCESS_KEY_ID=\"$ACCESS_KEY_ID\"|" .env
    sed -i '' "s|^SMS_ACCESS_KEY_SECRET=.*|SMS_ACCESS_KEY_SECRET=\"$ACCESS_KEY_SECRET\"|" .env
    sed -i '' "s/^SMS_SIGN_NAME=.*/SMS_SIGN_NAME=\"$SIGN_NAME\"/" .env
    sed -i '' "s/^SMS_TEMPLATE_CODE=.*/SMS_TEMPLATE_CODE=\"$TEMPLATE_CODE\"/" .env
else
    # Linux
    sed -i "s/^SMS_ENABLED=.*/SMS_ENABLED=\"$SMS_ENABLED\"/" .env
    sed -i "s|^SMS_ACCESS_KEY_ID=.*|SMS_ACCESS_KEY_ID=\"$ACCESS_KEY_ID\"|" .env
    sed -i "s|^SMS_ACCESS_KEY_SECRET=.*|SMS_ACCESS_KEY_SECRET=\"$ACCESS_KEY_SECRET\"|" .env
    sed -i "s/^SMS_SIGN_NAME=.*/SMS_SIGN_NAME=\"$SIGN_NAME\"/" .env
    sed -i "s/^SMS_TEMPLATE_CODE=.*/SMS_TEMPLATE_CODE=\"$TEMPLATE_CODE\"/" .env
fi

echo -e "${GREEN}✅ 配置已保存${NC}"
echo ""

# 询问是否重启服务
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🔄 重启服务${NC}"
echo ""
echo "配置已更新，需要重启后端服务才能生效"
echo ""
read -p "是否立即重启服务？[y/N]: " RESTART

if [ "$RESTART" = "y" ] || [ "$RESTART" = "Y" ]; then
    echo ""
    echo -e "${BLUE}正在重启服务...${NC}"
    pm2 restart firework-api

    echo ""
    echo -e "${GREEN}✅ 服务已重启${NC}"
    echo ""
    echo "查看日志："
    echo "   pm2 logs firework-api --lines 50"
    echo ""
    echo "测试发送验证码："
    echo "   curl -X POST http://39.104.58.26/api/auth/send-code \\"
    echo "     -H 'Content-Type: application/json' \\"
    echo "     -d '{\"phone\":\"你的手机号\"}'"
else
    echo ""
    echo -e "${YELLOW}⚠️  请手动重启服务：${NC}"
    echo "   pm2 restart firework-api"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ 配置完成！${NC}"
echo ""

if [ "$SMS_ENABLED" = "true" ]; then
    echo -e "${YELLOW}📋 后续检查清单：${NC}"
    echo "  1. 确保阿里云签名和模板已审核通过"
    echo "  2. 确保阿里云账户余额充足"
    echo "  3. 重启服务后查看日志确认无错误"
    echo "  4. 使用真实手机号测试验证码发送"
fi

echo ""

#!/bin/bash

# 阿里云短信服务配置检查脚本

echo "========================================="
echo "  蒙庆烟花短信服务配置检查"
echo "========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 .env 文件是否存在
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env 文件不存在${NC}"
    exit 1
fi

echo "📋 当前配置状态："
echo ""

# 读取配置
SMS_ENABLED=$(grep "^SMS_ENABLED=" .env | cut -d '=' -f2 | tr -d '"')
SMS_ACCESS_KEY_ID=$(grep "^SMS_ACCESS_KEY_ID=" .env | cut -d '=' -f2 | tr -d '"')
SMS_ACCESS_KEY_SECRET=$(grep "^SMS_ACCESS_KEY_SECRET=" .env | cut -d '=' -f2 | tr -d '"')
SMS_SIGN_NAME=$(grep "^SMS_SIGN_NAME=" .env | cut -d '=' -f2 | tr -d '"')
SMS_TEMPLATE_CODE=$(grep "^SMS_TEMPLATE_CODE=" .env | cut -d '=' -f2 | tr -d '"')
SMS_TEST_CODE=$(grep "^SMS_TEST_CODE=" .env | cut -d '=' -f2 | tr -d '"')

# 检查各项配置
echo "1. 短信服务状态"
if [ "$SMS_ENABLED" = "true" ]; then
    echo -e "   ${GREEN}✅ 已启用真实短信发送${NC}"
else
    echo -e "   ${YELLOW}⚠️  测试模式（固定验证码: $SMS_TEST_CODE）${NC}"
fi
echo ""

echo "2. AccessKey 配置"
if [ -n "$SMS_ACCESS_KEY_ID" ]; then
    # 脱敏显示
    MASKED_ID="${SMS_ACCESS_KEY_ID:0:6}****${SMS_ACCESS_KEY_ID: -4}"
    echo -e "   ${GREEN}✅ AccessKey ID: $MASKED_ID${NC}"
else
    echo -e "   ${RED}❌ AccessKey ID 未配置${NC}"
fi

if [ -n "$SMS_ACCESS_KEY_SECRET" ]; then
    echo -e "   ${GREEN}✅ AccessKey Secret: ********${NC}"
else
    echo -e "   ${RED}❌ AccessKey Secret 未配置${NC}"
fi
echo ""

echo "3. 短信签名"
if [ -n "$SMS_SIGN_NAME" ]; then
    echo -e "   ${GREEN}✅ 签名名称: $SMS_SIGN_NAME${NC}"
else
    echo -e "   ${RED}❌ 签名名称未配置${NC}"
fi
echo ""

echo "4. 短信模板"
if [ -n "$SMS_TEMPLATE_CODE" ]; then
    echo -e "   ${GREEN}✅ 模板CODE: $SMS_TEMPLATE_CODE${NC}"
else
    echo -e "   ${RED}❌ 模板CODE未配置${NC}"
fi
echo ""

# 检查阿里云SDK是否安装
echo "5. 依赖检查"
if [ -d "node_modules/@alicloud/dysmsapi20170525" ]; then
    echo -e "   ${GREEN}✅ 阿里云短信SDK已安装${NC}"
else
    echo -e "   ${RED}❌ 阿里云短信SDK未安装，请运行: npm install${NC}"
fi
echo ""

# 综合判断
echo "========================================="
if [ "$SMS_ENABLED" = "true" ]; then
    if [ -n "$SMS_ACCESS_KEY_ID" ] && [ -n "$SMS_ACCESS_KEY_SECRET" ] && [ -n "$SMS_SIGN_NAME" ] && [ -n "$SMS_TEMPLATE_CODE" ]; then
        echo -e "${GREEN}✅ 配置完整，短信服务已就绪${NC}"
        echo ""
        echo "建议操作："
        echo "1. 重启后端服务: pm2 restart firework-api"
        echo "2. 查看日志: pm2 logs firework-api --lines 50"
        echo "3. 测试发送: curl -X POST http://39.104.58.26/api/auth/send-code -H 'Content-Type: application/json' -d '{\"phone\":\"你的手机号\"}'"
    else
        echo -e "${YELLOW}⚠️  配置不完整，请检查以下项：${NC}"
        [ -z "$SMS_ACCESS_KEY_ID" ] && echo "   - AccessKey ID"
        [ -z "$SMS_ACCESS_KEY_SECRET" ] && echo "   - AccessKey Secret"
        [ -z "$SMS_SIGN_NAME" ] && echo "   - 短信签名"
        [ -z "$SMS_TEMPLATE_CODE" ] && echo "   - 短信模板CODE"
        echo ""
        echo "请参考：阿里云短信服务配置指南.md"
    fi
else
    echo -e "${YELLOW}ℹ️  当前为测试模式${NC}"
    echo ""
    echo "要启用真实短信发送，请："
    echo "1. 在阿里云控制台完成签名和模板审核"
    echo "2. 修改 .env 文件："
    echo "   SMS_ENABLED=\"true\""
    echo "   SMS_ACCESS_KEY_ID=\"你的AccessKey ID\""
    echo "   SMS_ACCESS_KEY_SECRET=\"你的AccessKey Secret\""
    echo "   SMS_TEMPLATE_CODE=\"SMS_xxxxxxxx\""
    echo "3. 重启服务: pm2 restart firework-api"
fi
echo "========================================="
echo ""

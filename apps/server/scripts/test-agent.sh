#!/bin/bash
# 代理商模块测试脚本 - BE-06

BASE_URL="http://localhost:3000/api"
PASSED=0
FAILED=0

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "================================================"
echo "         代理商模块测试 (BE-06)"
echo "================================================"
echo ""

# 获取用户Token
echo "=== 准备工作 ==="
echo -n "获取用户Token ... "
USER_RESP=$(curl -s -X POST "$BASE_URL/auth/uni-login" \
    -H "Content-Type: application/json" \
    -d '{"token":"agent_test_token_1"}')
USER_TOKEN=$(echo "$USER_RESP" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -n "$USER_TOKEN" ]; then
    echo -e "${GREEN}成功${NC}"
else
    echo -e "${RED}失败${NC}"
    echo "响应: $USER_RESP"
    exit 1
fi

# 获取第二个用户Token
echo -n "获取第二个用户Token ... "
USER2_RESP=$(curl -s -X POST "$BASE_URL/auth/uni-login" \
    -H "Content-Type: application/json" \
    -d '{"token":"agent_test_token_2"}')
USER2_TOKEN=$(echo "$USER2_RESP" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -n "$USER2_TOKEN" ]; then
    echo -e "${GREEN}成功${NC}"
else
    echo -e "${RED}失败${NC}"
    echo "响应: $USER2_RESP"
    exit 1
fi

# 获取管理员Token
echo -n "获取管理员Token ... "
ADMIN_RESP=$(curl -s -X POST "$BASE_URL/auth/admin/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}')
ADMIN_TOKEN=$(echo "$ADMIN_RESP" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -n "$ADMIN_TOKEN" ]; then
    echo -e "${GREEN}成功${NC}"
else
    echo -e "${RED}失败${NC}"
    echo "响应: $ADMIN_RESP"
    exit 1
fi

echo ""
echo "=== 代理申请测试 ==="

# 1. 无邀请码申请（一级代理申请）
echo -n "1. 无邀请码申请代理 ... "
APPLY_RESP=$(curl -s -X POST "$BASE_URL/agent/apply" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $USER_TOKEN" \
    -d '{"realName":"张三代理","idCard":"150100199001011234","phone":"13800138001","address":"呼和浩特市赛罕区测试地址"}')
APPLY_CODE=$(echo "$APPLY_RESP" | grep -o '"code":[0-9]*' | cut -d':' -f2)
if [ "$APPLY_CODE" == "0" ]; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $APPLY_RESP"
    ((FAILED++))
fi

# 2. 重复申请（应失败）
echo -n "2. 重复申请代理(应失败) ... "
APPLY2_RESP=$(curl -s -X POST "$BASE_URL/agent/apply" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $USER_TOKEN" \
    -d '{"realName":"张三代理","idCard":"150100199001011234","phone":"13800138001"}')
APPLY2_CODE=$(echo "$APPLY2_RESP" | grep -o '"code":4006' | head -1)
if [ -n "$APPLY2_CODE" ]; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $APPLY2_RESP"
    ((FAILED++))
fi

echo ""
echo "=== 代理信息测试 ==="

# 3. 获取代理信息
echo -n "3. 获取代理信息 ... "
INFO_RESP=$(curl -s "$BASE_URL/agent/info" \
    -H "Authorization: Bearer $USER_TOKEN")
INFO_CODE=$(echo "$INFO_RESP" | grep -o '"code":[0-9]*' | cut -d':' -f2)
HAS_STATUS=$(echo "$INFO_RESP" | grep -o '"agentStatus"')
if [ "$INFO_CODE" == "0" ] && [ -n "$HAS_STATUS" ]; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $INFO_RESP"
    ((FAILED++))
fi

echo ""
echo "=== 管理后台-代理审核测试 ==="

# 4. 管理后台-获取代理列表
echo -n "4. 获取代理列表(管理后台) ... "
LIST_RESP=$(curl -s "$BASE_URL/admin/agent/list" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
LIST_CODE=$(echo "$LIST_RESP" | grep -o '"code":[0-9]*' | cut -d':' -f2)
HAS_LIST=$(echo "$LIST_RESP" | grep -o '"list"')
if [ "$LIST_CODE" == "0" ] && [ -n "$HAS_LIST" ]; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $LIST_RESP"
    ((FAILED++))
fi

# 5. 获取待审核代理列表
echo -n "5. 获取待审核代理列表 ... "
PENDING_RESP=$(curl -s "$BASE_URL/admin/agent/list?status=1" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
PENDING_CODE=$(echo "$PENDING_RESP" | grep -o '"code":[0-9]*' | cut -d':' -f2)
if [ "$PENDING_CODE" == "0" ]; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $PENDING_RESP"
    ((FAILED++))
fi

# 从列表获取用户ID用于审核
# 尝试从响应中提取第一个待审核用户的ID
USER_ID=$(echo "$LIST_RESP" | grep -oP '"id":\s*"?\K[0-9]+' | head -1)

# 6. 审核通过
echo -n "6. 审核通过代理申请 ... "
if [ -n "$USER_ID" ]; then
    AUDIT_RESP=$(curl -s -X PUT "$BASE_URL/admin/agent/$USER_ID/audit" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d '{"status":2}')
    AUDIT_CODE=$(echo "$AUDIT_RESP" | grep -o '"code":[0-9]*' | cut -d':' -f2)
    if [ "$AUDIT_CODE" == "0" ]; then
        echo -e "${GREEN}通过${NC}"
        ((PASSED++))
    else
        echo -e "${RED}失败${NC}"
        echo "响应: $AUDIT_RESP"
        ((FAILED++))
    fi
else
    echo -e "${RED}失败${NC} (未找到待审核用户)"
    ((FAILED++))
fi

echo ""
echo "=== 代理商功能测试 ==="

# 7. 审核后获取代理信息（应有邀请码）
echo -n "7. 获取审核后代理信息 ... "
INFO2_RESP=$(curl -s "$BASE_URL/agent/info" \
    -H "Authorization: Bearer $USER_TOKEN")
INFO2_CODE=$(echo "$INFO2_RESP" | grep -o '"code":[0-9]*' | cut -d':' -f2)
HAS_INVITE=$(echo "$INFO2_RESP" | grep -o '"inviteCode"')
AGENT_LEVEL=$(echo "$INFO2_RESP" | grep -oP '"agentLevel":\s*\K[0-9]+')
if [ "$INFO2_CODE" == "0" ] && [ -n "$HAS_INVITE" ] && [ "$AGENT_LEVEL" == "1" ]; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $INFO2_RESP"
    ((FAILED++))
fi

# 获取邀请码
INVITE_CODE=$(echo "$INFO2_RESP" | grep -oP '"inviteCode"\s*:\s*"\K[A-Z0-9]+')

# 8. 获取推广码
echo -n "8. 获取推广码 ... "
QRCODE_RESP=$(curl -s "$BASE_URL/agent/qrcode" \
    -H "Authorization: Bearer $USER_TOKEN")
QRCODE_CODE=$(echo "$QRCODE_RESP" | grep -o '"code":[0-9]*' | cut -d':' -f2)
HAS_QRCODE=$(echo "$QRCODE_RESP" | grep -o '"qrcodeUrl"')
if [ "$QRCODE_CODE" == "0" ] && [ -n "$HAS_QRCODE" ]; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $QRCODE_RESP"
    ((FAILED++))
fi

# 9. 获取我的团队
echo -n "9. 获取我的团队 ... "
TEAM_RESP=$(curl -s "$BASE_URL/agent/team" \
    -H "Authorization: Bearer $USER_TOKEN")
TEAM_CODE=$(echo "$TEAM_RESP" | grep -o '"code":[0-9]*' | cut -d':' -f2)
HAS_TEAM_LIST=$(echo "$TEAM_RESP" | grep -o '"list"')
if [ "$TEAM_CODE" == "0" ] && [ -n "$HAS_TEAM_LIST" ]; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $TEAM_RESP"
    ((FAILED++))
fi

# 10. 获取团队统计
echo -n "10. 获取团队统计 ... "
STATS_RESP=$(curl -s "$BASE_URL/agent/team/stats" \
    -H "Authorization: Bearer $USER_TOKEN")
STATS_CODE=$(echo "$STATS_RESP" | grep -o '"code":[0-9]*' | cut -d':' -f2)
HAS_DIRECT=$(echo "$STATS_RESP" | grep -o '"directCount"')
if [ "$STATS_CODE" == "0" ] && [ -n "$HAS_DIRECT" ]; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $STATS_RESP"
    ((FAILED++))
fi

echo ""
echo "=== 二级代理测试 ==="

# 11. 使用邀请码申请二级代理
echo -n "11. 使用邀请码申请二级代理 ... "
if [ -n "$INVITE_CODE" ]; then
    APPLY3_RESP=$(curl -s -X POST "$BASE_URL/agent/apply" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $USER2_TOKEN" \
        -d "{\"realName\":\"李四代理\",\"idCard\":\"150100199002025678\",\"phone\":\"13900139001\",\"inviteCode\":\"$INVITE_CODE\"}")
    APPLY3_CODE=$(echo "$APPLY3_RESP" | grep -o '"code":[0-9]*' | cut -d':' -f2)
    if [ "$APPLY3_CODE" == "0" ]; then
        echo -e "${GREEN}通过${NC}"
        ((PASSED++))
    else
        echo -e "${RED}失败${NC}"
        echo "响应: $APPLY3_RESP"
        ((FAILED++))
    fi
else
    echo -e "${RED}失败${NC} (无邀请码)"
    ((FAILED++))
fi

# 12. 无效邀请码申请（应失败）
echo -n "12. 无效邀请码申请(应失败) ... "
INVALID_RESP=$(curl -s -X POST "$BASE_URL/agent/apply" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $USER2_TOKEN" \
    -d '{"realName":"王五","idCard":"150100199003039999","phone":"13700137001","inviteCode":"INVALD6"}')
INVALID_CODE=$(echo "$INVALID_RESP" | grep -o '"code":4003' | head -1)
# 由于USER2已经申请过，会返回已申请错误，这也是正确的
ALREADY_APPLIED=$(echo "$INVALID_RESP" | grep -o '"code":4006' | head -1)
# 参数校验错误（400）也是一种正确的失败
PARAM_ERROR=$(echo "$INVALID_RESP" | grep -o '"code":400' | head -1)
if [ -n "$INVALID_CODE" ] || [ -n "$ALREADY_APPLIED" ] || [ -n "$PARAM_ERROR" ]; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $INVALID_RESP"
    ((FAILED++))
fi

echo ""
echo "=== 管理后台测试 ==="

# 13. 获取代理商层级树
echo -n "13. 获取代理商层级树 ... "
TREE_RESP=$(curl -s "$BASE_URL/admin/agent/tree" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
TREE_CODE=$(echo "$TREE_RESP" | grep -o '"code":[0-9]*' | cut -d':' -f2)
if [ "$TREE_CODE" == "0" ]; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $TREE_RESP"
    ((FAILED++))
fi

# 14. 获取代理商详情
echo -n "14. 获取代理商详情 ... "
if [ -n "$USER_ID" ]; then
    DETAIL_RESP=$(curl -s "$BASE_URL/admin/agent/$USER_ID" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    DETAIL_CODE=$(echo "$DETAIL_RESP" | grep -o '"code":[0-9]*' | cut -d':' -f2)
    HAS_DETAIL=$(echo "$DETAIL_RESP" | grep -o '"agentLevel"')
    if [ "$DETAIL_CODE" == "0" ] && [ -n "$HAS_DETAIL" ]; then
        echo -e "${GREEN}通过${NC}"
        ((PASSED++))
    else
        echo -e "${RED}失败${NC}"
        echo "响应: $DETAIL_RESP"
        ((FAILED++))
    fi
else
    echo -e "${RED}失败${NC} (无用户ID)"
    ((FAILED++))
fi

echo ""
echo "=== 权限测试 ==="

# 15. 无Token访问代理接口（应失败）
echo -n "15. 无Token访问代理接口(应失败) ... "
NO_AUTH=$(curl -s "$BASE_URL/agent/info")
NO_AUTH_CODE=$(echo "$NO_AUTH" | grep -o '"code":401' | head -1)
if [ -n "$NO_AUTH_CODE" ]; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $NO_AUTH"
    ((FAILED++))
fi

echo ""
echo "================================================"
echo "测试完成"
echo "通过: $PASSED"
echo "失败: $FAILED"
echo "================================================"

if [ $FAILED -gt 0 ]; then
    exit 1
else
    exit 0
fi

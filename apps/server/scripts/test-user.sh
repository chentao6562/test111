#!/bin/bash
# 用户模块测试脚本 - BE-03

BASE_URL="http://localhost:3000/api"
PASSED=0
FAILED=0

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# 测试函数
test_api() {
    local name="$1"
    local method="$2"
    local url="$3"
    local data="$4"
    local expected_code="$5"
    local auth="$6"

    echo -n "测试: $name ... "

    if [ -n "$auth" ]; then
        if [ -n "$data" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $auth" \
                -d "$data")
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
                -H "Authorization: Bearer $auth")
        fi
    else
        if [ -n "$data" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
                -H "Content-Type: application/json" \
                -d "$data")
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$url")
        fi
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    code=$(echo "$body" | grep -o '"code":[0-9]*' | head -1 | cut -d':' -f2)

    if [ "$code" == "$expected_code" ]; then
        echo -e "${GREEN}通过${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}失败${NC} (期望code=$expected_code, 实际code=$code)"
        echo "响应: $body"
        ((FAILED++))
        return 1
    fi
}

echo "================================================"
echo "         用户模块测试 (BE-03)"
echo "================================================"
echo ""

# 1. 先获取管理员token
echo "=== 准备工作 ==="
echo -n "获取管理员Token ... "
ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/admin/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}')
ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -n "$ADMIN_TOKEN" ]; then
    echo -e "${GREEN}成功${NC}"
else
    echo -e "${RED}失败${NC}"
    echo "响应: $ADMIN_RESPONSE"
    exit 1
fi

# 2. 模拟用户登录获取用户token
echo -n "获取用户Token ... "
USER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/uni-login" \
    -H "Content-Type: application/json" \
    -d '{"token":"test_token_for_user"}')
USER_TOKEN=$(echo "$USER_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -n "$USER_TOKEN" ]; then
    echo -e "${GREEN}成功${NC}"
else
    echo -e "${RED}失败${NC}"
    echo "响应: $USER_RESPONSE"
    exit 1
fi

echo ""
echo "=== 用户信息接口测试 ==="

# 3. 获取用户信息
test_api "获取用户信息" "GET" "$BASE_URL/user/info" "" "0" "$USER_TOKEN"

# 4. 更新用户信息
test_api "更新昵称" "PUT" "$BASE_URL/user/info" '{"nickname":"测试代理商"}' "0" "$USER_TOKEN"

# 5. 昵称过短（应失败）
test_api "昵称过短(应失败)" "PUT" "$BASE_URL/user/info" '{"nickname":"X"}' "400" "$USER_TOKEN"

# 6. 昵称过长（应失败）- 21个字符
test_api "昵称过长(应失败)" "PUT" "$BASE_URL/user/info" '{"nickname":"这是一个超过二十个字符限制的昵称测试内容啊"}' "400" "$USER_TOKEN"

echo ""
echo "=== 实名认证接口测试 ==="

# 7. 实名认证
test_api "实名认证" "POST" "$BASE_URL/user/verify" '{"realName":"张三","idCard":"150100199001011234"}' "0" "$USER_TOKEN"

# 8. 重复实名认证（应失败）
test_api "重复认证(应失败)" "POST" "$BASE_URL/user/verify" '{"realName":"李四","idCard":"150100199001015678"}' "1008" "$USER_TOKEN"

echo ""
echo "=== 地址管理接口测试 ==="

# 9. 添加地址
echo -n "测试: 添加地址 ... "
ADD_RESPONSE=$(curl -s -X POST "$BASE_URL/user/address" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $USER_TOKEN" \
    -d '{"name":"张三","phone":"13800138000","province":"内蒙古","city":"呼和浩特","district":"赛罕区","detail":"XX小区XX号楼1单元101室","isDefault":true}')
ADD_CODE=$(echo "$ADD_RESPONSE" | grep -o '"code":[0-9]*' | cut -d':' -f2)
ADDRESS_ID=$(echo "$ADD_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
if [ "$ADD_CODE" == "0" ]; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $ADD_RESPONSE"
    ((FAILED++))
fi

# 10. 获取地址列表
test_api "获取地址列表" "GET" "$BASE_URL/user/address" "" "0" "$USER_TOKEN"

# 11. 添加第二个地址
echo -n "测试: 添加第二个地址 ... "
ADD2_RESPONSE=$(curl -s -X POST "$BASE_URL/user/address" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $USER_TOKEN" \
    -d '{"name":"李四","phone":"13900139000","province":"内蒙古","city":"包头","district":"昆都仑区","detail":"YY路YY号","isDefault":false}')
ADD2_CODE=$(echo "$ADD2_RESPONSE" | grep -o '"code":[0-9]*' | cut -d':' -f2)
ADDRESS2_ID=$(echo "$ADD2_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
if [ "$ADD2_CODE" == "0" ]; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $ADD2_RESPONSE"
    ((FAILED++))
fi

# 12. 更新地址
if [ -n "$ADDRESS_ID" ]; then
    test_api "更新地址" "PUT" "$BASE_URL/user/address/$ADDRESS_ID" '{"detail":"新详细地址XXX"}' "0" "$USER_TOKEN"
fi

# 13. 设置默认地址
if [ -n "$ADDRESS2_ID" ]; then
    test_api "设为默认地址" "PUT" "$BASE_URL/user/address/$ADDRESS2_ID/default" "" "0" "$USER_TOKEN"
fi

# 14. 删除地址
if [ -n "$ADDRESS_ID" ]; then
    test_api "删除地址" "DELETE" "$BASE_URL/user/address/$ADDRESS_ID" "" "0" "$USER_TOKEN"
fi

# 15. 删除不存在的地址（应失败）
test_api "删除不存在地址(应失败)" "DELETE" "$BASE_URL/user/address/99999" "" "1009" "$USER_TOKEN"

echo ""
echo "=== 权限测试 ==="

# 16. 无Token访问（应失败）
echo -n "测试: 无Token访问(应失败) ... "
NO_AUTH_RESPONSE=$(curl -s -X GET "$BASE_URL/user/info")
NO_AUTH_CODE=$(echo "$NO_AUTH_RESPONSE" | grep -o '"code":401' | head -1)
if [ -n "$NO_AUTH_CODE" ]; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $NO_AUTH_RESPONSE"
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

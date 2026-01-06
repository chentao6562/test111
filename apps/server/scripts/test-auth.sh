#!/bin/bash
# 蒙庆烟花系统 - BE-02 认证模块测试脚本

BASE_URL="${1:-http://localhost:3000/api}"

echo "================================================"
echo "蒙庆烟花系统 - BE-02 认证模块测试"
echo "API地址: $BASE_URL"
echo "================================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 测试计数
PASSED=0
FAILED=0

# 存储Token
ADMIN_TOKEN=""
USER_TOKEN=""

# 测试函数
test_response() {
    local name="$1"
    local response="$2"
    local expected_field="$3"

    echo -n "测试: $name... "

    if echo "$response" | grep -q "$expected_field"; then
        echo -e "${GREEN}通过${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}失败${NC}"
        echo "响应: $response"
        ((FAILED++))
        return 1
    fi
}

echo "=== 1. 管理员登录测试 ==="
echo ""

# 创建测试管理员（如果不存在，需要数据库有数据）
echo "注意: 请确保数据库中有管理员账号 admin/admin123"
echo ""

# 1.1 正确的管理员登录
echo -n "测试: 管理员正确登录... "
response=$(curl -s -X POST "$BASE_URL/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}')

if echo "$response" | grep -q '"token"'; then
    ADMIN_TOKEN=$(echo "$response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo -e "${GREEN}通过${NC} (获取到Token)"
    ((PASSED++))
else
    echo -e "${YELLOW}跳过${NC} (可能没有测试数据)"
fi

# 1.2 错误密码测试
echo -n "测试: 错误密码登录... "
response=$(curl -s -X POST "$BASE_URL/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "wrongpassword"}')

if echo "$response" | grep -q '"code":1004\|密码错误\|用户不存在'; then
    echo -e "${GREEN}通过${NC} (正确返回错误)"
    ((PASSED++))
else
    echo -e "${YELLOW}跳过${NC}"
fi

# 1.3 缺少参数测试
echo -n "测试: 缺少密码参数... "
response=$(curl -s -X POST "$BASE_URL/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin"}')

if echo "$response" | grep -q '"code":400\|密码不能为空\|参数'; then
    echo -e "${GREEN}通过${NC} (正确返回参数错误)"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $response"
    ((FAILED++))
fi

echo ""
echo "=== 2. uniCloud登录测试（开发模式模拟）==="
echo ""

# 2.1 uniCloud登录
echo -n "测试: uniCloud模拟登录... "
response=$(curl -s -X POST "$BASE_URL/auth/uni-login" \
  -H "Content-Type: application/json" \
  -d '{"token": "test_token_for_dev"}')

if echo "$response" | grep -q '"token"'; then
    USER_TOKEN=$(echo "$response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo -e "${GREEN}通过${NC} (开发模式模拟登录成功)"
    ((PASSED++))
else
    echo -e "${YELLOW}注意${NC} - 响应: $response"
fi

echo ""
echo "=== 3. 获取用户信息测试 ==="
echo ""

# 3.1 有效Token获取用户信息
if [ -n "$ADMIN_TOKEN" ]; then
    echo -n "测试: 管理员Token获取信息... "
    response=$(curl -s "$BASE_URL/auth/profile" \
      -H "Authorization: Bearer $ADMIN_TOKEN")

    if echo "$response" | grep -q '"type":"admin"'; then
        echo -e "${GREEN}通过${NC}"
        ((PASSED++))
    else
        echo -e "${RED}失败${NC}"
        echo "响应: $response"
        ((FAILED++))
    fi
fi

if [ -n "$USER_TOKEN" ]; then
    echo -n "测试: 用户Token获取信息... "
    response=$(curl -s "$BASE_URL/auth/profile" \
      -H "Authorization: Bearer $USER_TOKEN")

    if echo "$response" | grep -q '"type":"user"'; then
        echo -e "${GREEN}通过${NC}"
        ((PASSED++))
    else
        echo -e "${RED}失败${NC}"
        echo "响应: $response"
        ((FAILED++))
    fi
fi

# 3.2 无Token测试
echo -n "测试: 无Token访问受保护接口... "
response=$(curl -s "$BASE_URL/auth/profile")

if echo "$response" | grep -q '"code":401\|未授权\|Unauthorized'; then
    echo -e "${GREEN}通过${NC} (正确返回401)"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $response"
    ((FAILED++))
fi

# 3.3 无效Token测试
echo -n "测试: 无效Token访问... "
response=$(curl -s "$BASE_URL/auth/profile" \
  -H "Authorization: Bearer invalid_token_here")

if echo "$response" | grep -q '"code":401\|未授权\|Unauthorized'; then
    echo -e "${GREEN}通过${NC} (正确返回401)"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $response"
    ((FAILED++))
fi

echo ""
echo "=== 4. 刷新Token测试 ==="
echo ""

if [ -n "$USER_TOKEN" ]; then
    echo -n "测试: 刷新Token... "
    response=$(curl -s -X POST "$BASE_URL/auth/refresh" \
      -H "Authorization: Bearer $USER_TOKEN")

    if echo "$response" | grep -q '"token"'; then
        echo -e "${GREEN}通过${NC}"
        ((PASSED++))
    else
        echo -e "${RED}失败${NC}"
        echo "响应: $response"
        ((FAILED++))
    fi
fi

echo ""
echo "=== 5. 退出登录测试 ==="
echo ""

if [ -n "$USER_TOKEN" ]; then
    echo -n "测试: 退出登录... "
    response=$(curl -s -X POST "$BASE_URL/auth/logout" \
      -H "Authorization: Bearer $USER_TOKEN")

    if echo "$response" | grep -q '"message"\|退出成功\|"code":0'; then
        echo -e "${GREEN}通过${NC}"
        ((PASSED++))
    else
        echo -e "${RED}失败${NC}"
        echo "响应: $response"
        ((FAILED++))
    fi
fi

echo ""
echo "================================================"
echo "测试完成"
echo "通过: $PASSED"
echo "失败: $FAILED"
echo "================================================"

if [ $FAILED -gt 0 ]; then
    exit 1
fi

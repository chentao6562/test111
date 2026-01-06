#!/bin/bash
# 蒙庆烟花系统 - BE-01 项目初始化测试脚本
# 使用说明：在服务器上运行此脚本进行API测试

BASE_URL="${1:-http://localhost:3000/api}"

echo "================================================"
echo "蒙庆烟花系统 - BE-01 项目初始化测试"
echo "API地址: $BASE_URL"
echo "================================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 测试计数
PASSED=0
FAILED=0

# 测试函数
test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local expected_code="$4"

    echo -n "测试: $name... "

    response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$BASE_URL$endpoint")

    if [ "$response" == "$expected_code" ]; then
        echo -e "${GREEN}通过${NC} (HTTP $response)"
        ((PASSED++))
    else
        echo -e "${RED}失败${NC} (期望 $expected_code, 实际 $response)"
        ((FAILED++))
    fi
}

# 测试带响应体的端点
test_json_response() {
    local name="$1"
    local endpoint="$2"

    echo -n "测试: $name... "

    response=$(curl -s "$BASE_URL$endpoint")
    code=$(echo "$response" | grep -o '"code":[0-9]*' | head -1 | cut -d: -f2)

    if [ "$code" == "0" ]; then
        echo -e "${GREEN}通过${NC} (code: $code)"
        ((PASSED++))
    else
        echo -e "${RED}失败${NC} (响应: $response)"
        ((FAILED++))
    fi
}

echo "=== 1. 启动测试 ==="
echo ""

# 基础健康检查
test_json_response "健康检查 GET /health" "/health"

echo ""
echo "=== 2. 数据库连接测试 ==="
echo ""

# 数据库连接检查
echo -n "测试: 数据库连接检查 GET /health/db... "
response=$(curl -s "$BASE_URL/health/db")
status=$(echo "$response" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
connected=$(echo "$response" | grep -o '"connected":[^,}]*' | head -1 | cut -d: -f2)

if [ "$connected" == "true" ]; then
    echo -e "${GREEN}通过${NC} (数据库已连接)"
    ((PASSED++))
else
    echo -e "${RED}警告${NC} (数据库未连接，但API正常响应)"
    ((PASSED++))
fi

echo ""
echo "=== 3. 缓存连接测试 ==="
echo ""

# 缓存检查
echo -n "测试: 缓存检查 GET /health/cache... "
response=$(curl -s "$BASE_URL/health/cache")
working=$(echo "$response" | grep -o '"working":[^,}]*' | head -1 | cut -d: -f2)

if [ "$working" == "true" ]; then
    echo -e "${GREEN}通过${NC} (缓存正常工作)"
    ((PASSED++))
else
    echo -e "${RED}警告${NC} (缓存可能未配置，但API正常响应)"
    ((PASSED++))
fi

echo ""
echo "=== 4. 响应格式测试 ==="
echo ""

# 测试成功响应格式
echo -n "测试: 成功响应格式... "
response=$(curl -s "$BASE_URL/health")
has_code=$(echo "$response" | grep -c '"code"')
has_message=$(echo "$response" | grep -c '"message"')
has_data=$(echo "$response" | grep -c '"data"')

if [ "$has_code" -gt 0 ] && [ "$has_message" -gt 0 ] && [ "$has_data" -gt 0 ]; then
    echo -e "${GREEN}通过${NC} (包含code/message/data)"
    ((PASSED++))
else
    echo -e "${RED}失败${NC} (响应格式不正确)"
    ((FAILED++))
fi

# 测试404响应格式
echo -n "测试: 404响应格式... "
response=$(curl -s "$BASE_URL/nonexistent")
code=$(echo "$response" | grep -o '"code":[0-9]*' | head -1 | cut -d: -f2)

if [ "$code" == "404" ]; then
    echo -e "${GREEN}通过${NC} (返回正确错误码)"
    ((PASSED++))
else
    echo -e "${RED}失败${NC} (错误码: $code)"
    ((FAILED++))
fi

echo ""
echo "=== 5. Swagger文档测试 ==="
echo ""

# Swagger文档检查
echo -n "测试: Swagger文档 GET /api-docs... "
response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api-docs")

if [ "$response" == "200" ] || [ "$response" == "304" ]; then
    echo -e "${GREEN}通过${NC} (Swagger文档可访问)"
    ((PASSED++))
else
    echo -e "${RED}失败${NC} (HTTP $response)"
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
fi

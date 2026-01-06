#!/bin/bash
# BE-11~13 系统模块测试脚本

BASE_URL="http://localhost:3000/api"
PASSED=0
FAILED=0
TOTAL=0

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# 获取测试Token
echo "获取测试Token..."
ADMIN_RESP=$(curl -s -X POST "${BASE_URL}/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123456"}')
ADMIN_TOKEN=$(echo "$ADMIN_RESP" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)

USER_RESP=$(curl -s -X POST "${BASE_URL}/auth/uni-login" \
  -H "Content-Type: application/json" \
  -d '{"token":"system_test_user"}')
USER_TOKEN=$(echo "$USER_RESP" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "ADMIN_TOKEN: ${ADMIN_TOKEN:0:30}..."
echo "USER_TOKEN: ${USER_TOKEN:0:30}..."
echo ""

# 测试函数
test_api() {
  local name="$1"
  local method="$2"
  local url="$3"
  local data="$4"
  local token="$5"
  local expected_code="$6"

  TOTAL=$((TOTAL + 1))

  if [ "$method" == "GET" ]; then
    if [ -n "$token" ]; then
      response=$(curl -s -w "\n%{http_code}" -X GET "$url" -H "Authorization: Bearer $token")
    else
      response=$(curl -s -w "\n%{http_code}" -X GET "$url")
    fi
  else
    if [ -n "$token" ]; then
      response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $token" \
        -d "$data")
    else
      response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
        -H "Content-Type: application/json" \
        -d "$data")
    fi
  fi

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  code=$(echo "$body" | grep -o '"code":[0-9]*' | head -1 | cut -d':' -f2)

  if [ "$code" == "0" ] || [ "$http_code" == "$expected_code" ]; then
    echo -e "${GREEN}[PASS]${NC} $name (HTTP $http_code, code: $code)"
    PASSED=$((PASSED + 1))
  elif [ "$expected_code" == "401" ] && [ "$http_code" == "401" ]; then
    echo -e "${GREEN}[PASS]${NC} $name (HTTP 401 - 无权限)"
    PASSED=$((PASSED + 1))
  elif [ "$expected_code" == "400" ] && ([ "$http_code" == "400" ] || [ "$code" == "400" ]); then
    echo -e "${GREEN}[PASS]${NC} $name (期望400)"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}[FAIL]${NC} $name - Expected: $expected_code, Got HTTP: $http_code, code: $code"
    echo "  Response: ${body:0:150}"
    FAILED=$((FAILED + 1))
  fi
}

echo "=========================================="
echo "BE-11~15 系统模块测试"
echo "=========================================="

# ==================== BE-11 管理员模块 ====================
echo ""
echo "--- BE-11 管理员管理 ---"

# 管理员列表
test_api "管理员列表" "GET" "${BASE_URL}/admin/system/admin/list" "" "$ADMIN_TOKEN" "200"

# 管理员列表(分页)
test_api "管理员列表(分页)" "GET" "${BASE_URL}/admin/system/admin/list?page=1&pageSize=10" "" "$ADMIN_TOKEN" "200"

# ==================== BE-12 员工模块 ====================
echo ""
echo "--- BE-12 员工管理 ---"

# 员工列表
test_api "员工列表" "GET" "${BASE_URL}/admin/system/employee/list" "" "$ADMIN_TOKEN" "200"

# 员工统计
test_api "员工统计" "GET" "${BASE_URL}/admin/system/employee/stats" "" "$ADMIN_TOKEN" "200"

# ==================== BE-13 系统配置 ====================
echo ""
echo "--- BE-13 系统配置 ---"

# 初始化默认配置
test_api "初始化配置" "POST" "${BASE_URL}/admin/system/config/init" "" "$ADMIN_TOKEN" "200"

# 获取全部配置
test_api "获取全部配置" "GET" "${BASE_URL}/admin/system/config" "" "$ADMIN_TOKEN" "200"

# 按组获取配置
test_api "获取基础配置" "GET" "${BASE_URL}/admin/system/config/basic" "" "$ADMIN_TOKEN" "200"
test_api "获取订单配置" "GET" "${BASE_URL}/admin/system/config/order" "" "$ADMIN_TOKEN" "200"
test_api "获取分润配置" "GET" "${BASE_URL}/admin/system/config/commission" "" "$ADMIN_TOKEN" "200"

# 更新配置
test_api "更新配置" "PUT" "${BASE_URL}/admin/system/config" '{"items":[{"key":"site_name","value":"蒙庆烟花测试"}]}' "$ADMIN_TOKEN" "200"

# ==================== BE-15 数据统计 ====================
echo ""
echo "--- BE-15 数据统计 ---"

# 仪表盘统计
test_api "仪表盘统计" "GET" "${BASE_URL}/admin/dashboard/stats" "" "$ADMIN_TOKEN" "200"

# 趋势图表
test_api "趋势图表" "GET" "${BASE_URL}/admin/dashboard/chart" "" "$ADMIN_TOKEN" "200"
test_api "趋势图表(30天)" "GET" "${BASE_URL}/admin/dashboard/chart?days=30" "" "$ADMIN_TOKEN" "200"

# 待办事项
test_api "待办事项" "GET" "${BASE_URL}/admin/dashboard/todos" "" "$ADMIN_TOKEN" "200"

# 销售报表
test_api "销售报表" "GET" "${BASE_URL}/admin/report/sales?startDate=2024-01-01&endDate=2024-12-31" "" "$ADMIN_TOKEN" "200"

# 代理业绩报表
test_api "代理业绩报表" "GET" "${BASE_URL}/admin/report/agent?startDate=2024-01-01&endDate=2024-12-31" "" "$ADMIN_TOKEN" "200"

# 商品分析报表
test_api "商品分析报表" "GET" "${BASE_URL}/admin/report/product?startDate=2024-01-01&endDate=2024-12-31" "" "$ADMIN_TOKEN" "200"

# ==================== 权限测试 ====================
echo ""
echo "--- 权限测试 ---"

# 无Token访问管理员管理
test_api "无Token访问管理员管理" "GET" "${BASE_URL}/admin/system/admin/list" "" "" "401"

# 无Token访问配置
test_api "无Token访问配置" "GET" "${BASE_URL}/admin/system/config" "" "" "401"

# 无Token访问仪表盘
test_api "无Token访问仪表盘" "GET" "${BASE_URL}/admin/dashboard/stats" "" "" "401"

echo ""
echo "=========================================="
echo "测试结果: $PASSED/$TOTAL 通过"
echo "=========================================="

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}所有测试通过!${NC}"
  exit 0
else
  echo -e "${RED}有 $FAILED 个测试失败${NC}"
  exit 1
fi

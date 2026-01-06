#!/bin/bash
# 穿行测试4 - BE-01~08 所有模块联合测试
# 测试模块：健康检查、认证、用户、商品、订单、代理商、库存、移库任务

BASE_URL="http://localhost:3000/api"
PASSED=0
FAILED=0
TOTAL=0

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

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
    echo -e "${GREEN}[PASS]${NC} $name"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}[FAIL]${NC} $name - HTTP: $http_code, code: $code"
    FAILED=$((FAILED + 1))
  fi
}

echo "=========================================="
echo "穿行测试4 - BE-01~08 联合测试"
echo "=========================================="

# 1. BE-01 健康检查
echo ""
echo "--- BE-01 健康检查 ---"
test_api "健康检查" "GET" "${BASE_URL}/health" "" "" "200"

# 2. BE-02 认证模块
echo ""
echo "--- BE-02 认证模块 ---"
USER_RESP=$(curl -s -X POST "${BASE_URL}/auth/uni-login" \
  -H "Content-Type: application/json" \
  -d '{"token":"integration_test_user"}')
USER_TOKEN=$(echo "$USER_RESP" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "获取用户Token: ${USER_TOKEN:0:20}..."

ADMIN_RESP=$(curl -s -X POST "${BASE_URL}/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123456"}')
ADMIN_TOKEN=$(echo "$ADMIN_RESP" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "获取管理员Token: ${ADMIN_TOKEN:0:20}..."

test_api "用户登录" "POST" "${BASE_URL}/auth/uni-login" '{"token":"test_user"}' "" "200"
test_api "管理员登录" "POST" "${BASE_URL}/auth/admin/login" '{"username":"admin","password":"Admin@123456"}' "" "200"

# 3. BE-03 用户模块
echo ""
echo "--- BE-03 用户模块 ---"
test_api "获取用户信息" "GET" "${BASE_URL}/user/info" "" "$USER_TOKEN" "200"
test_api "获取地址列表" "GET" "${BASE_URL}/user/address" "" "$USER_TOKEN" "200"

# 4. BE-04 商品模块
echo ""
echo "--- BE-04 商品模块 ---"
test_api "商品列表" "GET" "${BASE_URL}/product/list" "" "$USER_TOKEN" "200"
test_api "分类列表" "GET" "${BASE_URL}/product/category" "" "$USER_TOKEN" "200"
test_api "热销商品" "GET" "${BASE_URL}/product/hot" "" "$USER_TOKEN" "200"
test_api "新品列表" "GET" "${BASE_URL}/product/new" "" "$USER_TOKEN" "200"

# 5. BE-05 订单模块
echo ""
echo "--- BE-05 订单模块 ---"
test_api "订单列表" "GET" "${BASE_URL}/order/list" "" "$USER_TOKEN" "200"

# 6. BE-06 代理商模块
echo ""
echo "--- BE-06 代理商模块 ---"
test_api "代理商信息" "GET" "${BASE_URL}/agent/info" "" "$USER_TOKEN" "200"
test_api "管理-代理申请列表" "GET" "${BASE_URL}/admin/agent/list" "" "$ADMIN_TOKEN" "200"
test_api "管理-代理商层级" "GET" "${BASE_URL}/admin/agent/tree" "" "$ADMIN_TOKEN" "200"

# 7. BE-07 库存模块
echo ""
echo "--- BE-07 库存模块 ---"
test_api "库存列表" "GET" "${BASE_URL}/warehouse/stock/list" "" "$ADMIN_TOKEN" "200"
test_api "入库单列表" "GET" "${BASE_URL}/warehouse/inbound/list" "" "$ADMIN_TOKEN" "200"
test_api "管理-库存总览" "GET" "${BASE_URL}/admin/inventory/overview" "" "$ADMIN_TOKEN" "200"
test_api "管理-库存列表" "GET" "${BASE_URL}/admin/inventory/list" "" "$ADMIN_TOKEN" "200"
test_api "管理-库存日志" "GET" "${BASE_URL}/admin/inventory/logs" "" "$ADMIN_TOKEN" "200"
test_api "管理-库存预警" "GET" "${BASE_URL}/admin/inventory/warning" "" "$ADMIN_TOKEN" "200"

# 8. BE-08 移库任务模块
echo ""
echo "--- BE-08 移库任务模块 ---"
test_api "货管-待接单任务" "GET" "${BASE_URL}/porter/task/pending" "" "$ADMIN_TOKEN" "200"
test_api "货管-进行中任务" "GET" "${BASE_URL}/porter/task/doing" "" "$ADMIN_TOKEN" "200"
test_api "货管-已完成任务" "GET" "${BASE_URL}/porter/task/done" "" "$ADMIN_TOKEN" "200"
test_api "货管-收入统计" "GET" "${BASE_URL}/porter/income" "" "$ADMIN_TOKEN" "200"
test_api "货管-收入明细" "GET" "${BASE_URL}/porter/income/list" "" "$ADMIN_TOKEN" "200"
test_api "库管-任务列表" "GET" "${BASE_URL}/warehouse/transfer/list" "" "$ADMIN_TOKEN" "200"
test_api "管理-移库列表" "GET" "${BASE_URL}/admin/transfer/list" "" "$ADMIN_TOKEN" "200"

# 完整业务流程测试
echo ""
echo "--- 业务流程测试 ---"
test_api "流程1: 用户登录" "POST" "${BASE_URL}/auth/uni-login" '{"token":"flow_test"}' "" "200"
test_api "流程2: 获取用户信息" "GET" "${BASE_URL}/user/info" "" "$USER_TOKEN" "200"
test_api "流程3: 浏览商品列表" "GET" "${BASE_URL}/product/list?page=1&pageSize=10" "" "$USER_TOKEN" "200"
test_api "流程4: 查看分类" "GET" "${BASE_URL}/product/category" "" "$USER_TOKEN" "200"
test_api "流程5: 查看订单" "GET" "${BASE_URL}/order/list" "" "$USER_TOKEN" "200"
test_api "流程6: 查看代理信息" "GET" "${BASE_URL}/agent/info" "" "$USER_TOKEN" "200"

echo ""
echo "=========================================="
echo "穿行测试4结果: $PASSED/$TOTAL 通过"
echo "=========================================="

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}穿行测试4通过!${NC}"
  exit 0
else
  echo -e "${RED}有 $FAILED 个测试失败${NC}"
  exit 1
fi

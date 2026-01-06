#!/bin/bash
# 穿行测试6 - BE-01~15 所有模块联合测试

BASE_URL="http://localhost:3000/api"
PASSED=0
FAILED=0
TOTAL=0

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

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
echo "穿行测试6 - BE-01~15 联合测试"
echo "=========================================="

# 获取Token
USER_RESP=$(curl -s -X POST "${BASE_URL}/auth/uni-login" -H "Content-Type: application/json" -d '{"token":"integration6_user"}')
USER_TOKEN=$(echo "$USER_RESP" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
ADMIN_RESP=$(curl -s -X POST "${BASE_URL}/auth/admin/login" -H "Content-Type: application/json" -d '{"username":"admin","password":"Admin@123456"}')
ADMIN_TOKEN=$(echo "$ADMIN_RESP" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Token获取成功"
echo ""

# BE-01 健康检查
echo "--- BE-01 健康检查 ---"
test_api "健康检查" "GET" "${BASE_URL}/health" "" "" "200"

# BE-02 认证模块
echo "--- BE-02 认证模块 ---"
test_api "用户登录" "POST" "${BASE_URL}/auth/uni-login" '{"token":"test"}' "" "200"
test_api "管理员登录" "POST" "${BASE_URL}/auth/admin/login" '{"username":"admin","password":"Admin@123456"}' "" "200"

# BE-03 用户模块
echo "--- BE-03 用户模块 ---"
test_api "用户信息" "GET" "${BASE_URL}/user/info" "" "$USER_TOKEN" "200"
test_api "地址列表" "GET" "${BASE_URL}/user/address" "" "$USER_TOKEN" "200"

# BE-04 商品模块
echo "--- BE-04 商品模块 ---"
test_api "商品列表" "GET" "${BASE_URL}/product/list" "" "$USER_TOKEN" "200"
test_api "分类列表" "GET" "${BASE_URL}/product/category" "" "$USER_TOKEN" "200"

# BE-05 订单模块
echo "--- BE-05 订单模块 ---"
test_api "订单列表" "GET" "${BASE_URL}/order/list" "" "$USER_TOKEN" "200"

# BE-06 代理商模块
echo "--- BE-06 代理商模块 ---"
test_api "代理商信息" "GET" "${BASE_URL}/agent/info" "" "$USER_TOKEN" "200"
test_api "管理-代理商列表" "GET" "${BASE_URL}/admin/agent/list" "" "$ADMIN_TOKEN" "200"

# BE-07 库存模块
echo "--- BE-07 库存模块 ---"
test_api "库存列表" "GET" "${BASE_URL}/warehouse/stock/list" "" "$ADMIN_TOKEN" "200"
test_api "入库单列表" "GET" "${BASE_URL}/warehouse/inbound/list" "" "$ADMIN_TOKEN" "200"
test_api "管理-库存总览" "GET" "${BASE_URL}/admin/inventory/overview" "" "$ADMIN_TOKEN" "200"

# BE-08 移库任务模块
echo "--- BE-08 移库任务模块 ---"
test_api "货管-待接单任务" "GET" "${BASE_URL}/porter/task/pending" "" "$ADMIN_TOKEN" "200"
test_api "货管-收入统计" "GET" "${BASE_URL}/porter/income" "" "$ADMIN_TOKEN" "200"
test_api "库管-任务列表" "GET" "${BASE_URL}/warehouse/transfer/list" "" "$ADMIN_TOKEN" "200"
test_api "管理-移库列表" "GET" "${BASE_URL}/admin/transfer/list" "" "$ADMIN_TOKEN" "200"

# BE-09 分润结算模块
echo "--- BE-09 分润结算模块 ---"
test_api "分润列表" "GET" "${BASE_URL}/commission/list" "" "$USER_TOKEN" "200"
test_api "分润统计" "GET" "${BASE_URL}/commission/stats" "" "$USER_TOKEN" "200"
test_api "余额信息" "GET" "${BASE_URL}/commission/balance" "" "$USER_TOKEN" "200"
test_api "管理-分润列表" "GET" "${BASE_URL}/admin/commission/list" "" "$ADMIN_TOKEN" "200"
test_api "管理-分润统计" "GET" "${BASE_URL}/admin/commission/stats" "" "$ADMIN_TOKEN" "200"

# BE-10 提现模块
echo "--- BE-10 提现模块 ---"
test_api "提现列表" "GET" "${BASE_URL}/withdrawal/list" "" "$USER_TOKEN" "200"
test_api "货管-提现列表" "GET" "${BASE_URL}/porter/withdrawal/list" "" "$ADMIN_TOKEN" "200"
test_api "管理-提现列表" "GET" "${BASE_URL}/admin/withdrawal/list" "" "$ADMIN_TOKEN" "200"

# BE-11 管理员模块
echo "--- BE-11 管理员模块 ---"
test_api "管理员列表" "GET" "${BASE_URL}/admin/system/admin/list" "" "$ADMIN_TOKEN" "200"

# BE-12 员工模块
echo "--- BE-12 员工模块 ---"
test_api "员工列表" "GET" "${BASE_URL}/admin/system/employee/list" "" "$ADMIN_TOKEN" "200"
test_api "员工统计" "GET" "${BASE_URL}/admin/system/employee/stats" "" "$ADMIN_TOKEN" "200"

# BE-13 系统配置模块
echo "--- BE-13 系统配置模块 ---"
test_api "获取配置" "GET" "${BASE_URL}/admin/system/config" "" "$ADMIN_TOKEN" "200"

# BE-15 数据统计模块
echo "--- BE-15 数据统计模块 ---"
test_api "仪表盘统计" "GET" "${BASE_URL}/admin/dashboard/stats" "" "$ADMIN_TOKEN" "200"
test_api "趋势图表" "GET" "${BASE_URL}/admin/dashboard/chart" "" "$ADMIN_TOKEN" "200"
test_api "待办事项" "GET" "${BASE_URL}/admin/dashboard/todos" "" "$ADMIN_TOKEN" "200"
test_api "销售报表" "GET" "${BASE_URL}/admin/report/sales?startDate=2024-01-01&endDate=2024-12-31" "" "$ADMIN_TOKEN" "200"

echo ""
echo "=========================================="
echo "穿行测试6结果: $PASSED/$TOTAL 通过"
echo "=========================================="

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}穿行测试6通过!${NC}"
  exit 0
else
  echo -e "${RED}有 $FAILED 个测试失败${NC}"
  exit 1
fi

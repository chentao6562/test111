#!/bin/bash
# BE-08 移库任务模块测试脚本
# 测试货管端、库管端、管理后台接口

BASE_URL="http://localhost:3000/api"
PASSED=0
FAILED=0
TOTAL=0

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 获取测试用户Token (模拟登录)
echo "获取测试Token..."
LOGIN_RESP=$(curl -s -X POST "${BASE_URL}/auth/uni-login" \
  -H "Content-Type: application/json" \
  -d '{"token":"mock_porter_token"}')
USER_TOKEN=$(echo "$LOGIN_RESP" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)

# 获取管理员Token
ADMIN_RESP=$(curl -s -X POST "${BASE_URL}/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123456"}')
ADMIN_TOKEN=$(echo "$ADMIN_RESP" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "USER_TOKEN: ${USER_TOKEN:0:30}..."
echo "ADMIN_TOKEN: ${ADMIN_TOKEN:0:30}..."

if [ -z "$USER_TOKEN" ]; then
  echo -e "${RED}用户Token获取失败!${NC}"
  echo "Login Response: $LOGIN_RESP"
fi

if [ -z "$ADMIN_TOKEN" ]; then
  echo -e "${RED}管理员Token获取失败!${NC}"
  echo "Admin Response: $ADMIN_RESP"
fi
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

  # 检查HTTP状态码或业务响应码
  code=$(echo "$body" | grep -o '"code":[0-9]*' | head -1 | cut -d':' -f2)

  if [ "$http_code" == "$expected_code" ] || [ "$code" == "0" ]; then
    echo -e "${GREEN}[PASS]${NC} $name (HTTP $http_code, code: $code)"
    PASSED=$((PASSED + 1))
  elif [ "$expected_code" == "401" ] && [ "$http_code" == "401" ]; then
    echo -e "${GREEN}[PASS]${NC} $name (HTTP 401 - 无权限)"
    PASSED=$((PASSED + 1))
  elif [ "$expected_code" == "403" ] && ([ "$http_code" == "403" ] || [ "$code" == "403" ]); then
    echo -e "${GREEN}[PASS]${NC} $name (HTTP 403 - 角色限制)"
    PASSED=$((PASSED + 1))
  elif [ "$expected_code" == "404" ] && ([ "$http_code" == "404" ] || [ "$code" == "404" ] || [ "$code" == "3001" ]); then
    echo -e "${GREEN}[PASS]${NC} $name (期望404/资源不存在)"
    PASSED=$((PASSED + 1))
  elif [ "$expected_code" == "400" ] && ([ "$http_code" == "400" ] || [ "$code" == "400" ]); then
    echo -e "${GREEN}[PASS]${NC} $name (期望400/参数错误)"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}[FAIL]${NC} $name - Expected: $expected_code, Got HTTP: $http_code, code: $code"
    echo "  Response: ${body:0:150}"
    FAILED=$((FAILED + 1))
  fi
}

echo "=========================================="
echo "BE-08 移库任务模块测试"
echo "=========================================="

# ==================== 货管端接口测试 (使用Admin Token因为有admin角色) ====================
echo ""
echo "--- 货管端接口 (需要porter或admin角色) ---"

# 1. 获取待接单任务列表
test_api "获取待接单任务列表" "GET" "${BASE_URL}/porter/task/pending" "" "$ADMIN_TOKEN" "200"

# 2. 获取待接单任务列表(带分页)
test_api "获取待接单任务列表(分页)" "GET" "${BASE_URL}/porter/task/pending?page=1&pageSize=10" "" "$ADMIN_TOKEN" "200"

# 3. 获取进行中任务列表
test_api "获取进行中任务列表" "GET" "${BASE_URL}/porter/task/doing" "" "$ADMIN_TOKEN" "200"

# 4. 获取已完成任务列表
test_api "获取已完成任务列表" "GET" "${BASE_URL}/porter/task/done" "" "$ADMIN_TOKEN" "200"

# 5. 获取任务详情(不存在的任务)
test_api "获取任务详情(404)" "GET" "${BASE_URL}/porter/task/99999" "" "$ADMIN_TOKEN" "404"

# 6. 接单(任务不存在)
test_api "接单(任务不存在)" "POST" "${BASE_URL}/porter/task/99999/accept" "{}" "$ADMIN_TOKEN" "404"

# 7. 确认取货(任务不存在)
test_api "确认取货(任务不存在)" "POST" "${BASE_URL}/porter/task/99999/pick" "{}" "$ADMIN_TOKEN" "404"

# 8. 完成任务(任务不存在)
test_api "完成任务(任务不存在)" "POST" "${BASE_URL}/porter/task/99999/complete" "{}" "$ADMIN_TOKEN" "404"

# ==================== 货管端收入接口测试 ====================
echo ""
echo "--- 货管端收入接口 ---"

# 9. 获取收入统计
test_api "获取收入统计" "GET" "${BASE_URL}/porter/income" "" "$ADMIN_TOKEN" "200"

# 10. 获取收入明细
test_api "获取收入明细" "GET" "${BASE_URL}/porter/income/list" "" "$ADMIN_TOKEN" "200"

# 11. 获取收入明细(带分页)
test_api "获取收入明细(分页)" "GET" "${BASE_URL}/porter/income/list?page=1&pageSize=10" "" "$ADMIN_TOKEN" "200"

# ==================== 库管端接口测试 ====================
echo ""
echo "--- 库管端接口 ---"

# 12. 获取移库任务列表
test_api "库管-获取任务列表" "GET" "${BASE_URL}/warehouse/transfer/list" "" "$ADMIN_TOKEN" "200"

# 13. 获取移库任务列表(带状态过滤)
test_api "库管-获取任务列表(状态过滤)" "GET" "${BASE_URL}/warehouse/transfer/list?status=pending" "" "$ADMIN_TOKEN" "200"

# 14. 创建移库任务(订单不存在)
test_api "库管-创建任务(订单不存在)" "POST" "${BASE_URL}/warehouse/transfer/create" '{"orderId":99999}' "$ADMIN_TOKEN" "404"

# 15. 创建移库任务(缺少orderId)
test_api "库管-创建任务(参数错误)" "POST" "${BASE_URL}/warehouse/transfer/create" '{}' "$ADMIN_TOKEN" "400"

# 16. 指派任务(任务不存在)
test_api "库管-指派任务(任务不存在)" "POST" "${BASE_URL}/warehouse/transfer/99999/assign" '{"porterId":1}' "$ADMIN_TOKEN" "404"

# ==================== 管理后台接口测试 ====================
echo ""
echo "--- 管理后台接口 ---"

# 17. 获取移库任务列表
test_api "管理-获取任务列表" "GET" "${BASE_URL}/admin/transfer/list" "" "$ADMIN_TOKEN" "200"

# 18. 获取任务详情(不存在)
test_api "管理-获取任务详情(404)" "GET" "${BASE_URL}/admin/transfer/99999" "" "$ADMIN_TOKEN" "404"

# 19. 指派任务(任务不存在)
test_api "管理-指派任务(404)" "PUT" "${BASE_URL}/admin/transfer/99999/assign" '{"porterId":1}' "$ADMIN_TOKEN" "404"

# 20. 批量结算(空数组)
test_api "管理-批量结算" "POST" "${BASE_URL}/admin/transfer/settle" '{"taskIds":[]}' "$ADMIN_TOKEN" "200"

# ==================== 无Token访问测试 ====================
echo ""
echo "--- 权限测试 ---"

# 21. 无Token访问货管端
test_api "无Token访问货管端" "GET" "${BASE_URL}/porter/task/pending" "" "" "401"

# 22. 无Token访问库管端
test_api "无Token访问库管端" "GET" "${BASE_URL}/warehouse/transfer/list" "" "" "401"

# 23. 无Token访问管理后台
test_api "无Token访问管理后台" "GET" "${BASE_URL}/admin/transfer/list" "" "" "401"

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

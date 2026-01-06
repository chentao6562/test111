#!/bin/bash
# BE-09 分润结算模块测试脚本

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
USER_RESP=$(curl -s -X POST "${BASE_URL}/auth/uni-login" \
  -H "Content-Type: application/json" \
  -d '{"token":"settlement_test_user"}')
USER_TOKEN=$(echo "$USER_RESP" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)

ADMIN_RESP=$(curl -s -X POST "${BASE_URL}/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123456"}')
ADMIN_TOKEN=$(echo "$ADMIN_RESP" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "USER_TOKEN: ${USER_TOKEN:0:30}..."
echo "ADMIN_TOKEN: ${ADMIN_TOKEN:0:30}..."
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
  else
    echo -e "${RED}[FAIL]${NC} $name - Expected: $expected_code, Got HTTP: $http_code, code: $code"
    echo "  Response: ${body:0:150}"
    FAILED=$((FAILED + 1))
  fi
}

echo "=========================================="
echo "BE-09 分润结算模块测试"
echo "=========================================="

# ==================== 代理商端接口测试 ====================
echo ""
echo "--- 代理商端接口 ---"

# 1. 获取分润列表
test_api "获取分润列表" "GET" "${BASE_URL}/commission/list" "" "$USER_TOKEN" "200"

# 2. 获取分润列表(带分页)
test_api "获取分润列表(分页)" "GET" "${BASE_URL}/commission/list?page=1&pageSize=10" "" "$USER_TOKEN" "200"

# 3. 获取分润列表(状态过滤)
test_api "获取分润列表(待结算)" "GET" "${BASE_URL}/commission/list?status=0" "" "$USER_TOKEN" "200"

# 4. 获取分润列表(已结算)
test_api "获取分润列表(已结算)" "GET" "${BASE_URL}/commission/list?status=1" "" "$USER_TOKEN" "200"

# 5. 获取分润列表(层级过滤)
test_api "获取分润列表(一级分润)" "GET" "${BASE_URL}/commission/list?level=1" "" "$USER_TOKEN" "200"

# 6. 获取分润统计
test_api "获取分润统计" "GET" "${BASE_URL}/commission/stats" "" "$USER_TOKEN" "200"

# 7. 获取余额信息
test_api "获取余额信息" "GET" "${BASE_URL}/commission/balance" "" "$USER_TOKEN" "200"

# ==================== 管理后台接口测试 ====================
echo ""
echo "--- 管理后台接口 ---"

# 8. 获取分润列表
test_api "管理-分润列表" "GET" "${BASE_URL}/admin/commission/list" "" "$ADMIN_TOKEN" "200"

# 9. 获取分润列表(分页)
test_api "管理-分润列表(分页)" "GET" "${BASE_URL}/admin/commission/list?page=1&pageSize=10" "" "$ADMIN_TOKEN" "200"

# 10. 获取分润列表(用户过滤)
test_api "管理-分润列表(用户过滤)" "GET" "${BASE_URL}/admin/commission/list?userId=1" "" "$ADMIN_TOKEN" "200"

# 11. 获取分润列表(订单号搜索)
test_api "管理-分润列表(订单号搜索)" "GET" "${BASE_URL}/admin/commission/list?orderNo=ORD" "" "$ADMIN_TOKEN" "200"

# 12. 获取分润统计
test_api "管理-分润统计" "GET" "${BASE_URL}/admin/commission/stats" "" "$ADMIN_TOKEN" "200"

# 13. 批量结算(空数组)
test_api "管理-批量结算(空)" "POST" "${BASE_URL}/admin/commission/settle" '{}' "$ADMIN_TOKEN" "200"

# 14. 批量结算(指定IDs)
test_api "管理-批量结算(指定IDs)" "POST" "${BASE_URL}/admin/commission/settle" '{"ids":[999999]}' "$ADMIN_TOKEN" "200"

# 15. 批量结算(按用户)
test_api "管理-批量结算(按用户)" "POST" "${BASE_URL}/admin/commission/settle" '{"userId":999999}' "$ADMIN_TOKEN" "200"

# ==================== 无Token访问测试 ====================
echo ""
echo "--- 权限测试 ---"

# 16. 无Token访问代理商端
test_api "无Token访问分润列表" "GET" "${BASE_URL}/commission/list" "" "" "401"

# 17. 无Token访问分润统计
test_api "无Token访问分润统计" "GET" "${BASE_URL}/commission/stats" "" "" "401"

# 18. 无Token访问管理后台
test_api "无Token访问管理后台" "GET" "${BASE_URL}/admin/commission/list" "" "" "401"

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

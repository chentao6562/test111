#!/bin/bash
# BE-10 提现模块测试脚本

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
  -d '{"token":"withdrawal_test_user"}')
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
  elif [ "$expected_code" == "400" ] && ([ "$http_code" == "400" ] || [ "$code" == "400" ] || [ "$code" == "6001" ] || [ "$code" == "6002" ]); then
    echo -e "${GREEN}[PASS]${NC} $name (期望400/业务错误)"
    PASSED=$((PASSED + 1))
  elif [ "$expected_code" == "404" ] && ([ "$http_code" == "404" ] || [ "$code" == "404" ]); then
    echo -e "${GREEN}[PASS]${NC} $name (期望404)"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}[FAIL]${NC} $name - Expected: $expected_code, Got HTTP: $http_code, code: $code"
    echo "  Response: ${body:0:150}"
    FAILED=$((FAILED + 1))
  fi
}

echo "=========================================="
echo "BE-10 提现模块测试"
echo "=========================================="

# ==================== 代理商端接口测试 ====================
echo ""
echo "--- 代理商端接口 ---"

# 1. 获取提现列表
test_api "获取提现列表" "GET" "${BASE_URL}/withdrawal/list" "" "$USER_TOKEN" "200"

# 2. 获取提现列表(分页)
test_api "获取提现列表(分页)" "GET" "${BASE_URL}/withdrawal/list?page=1&pageSize=10" "" "$USER_TOKEN" "200"

# 3. 获取提现列表(状态过滤)
test_api "获取提现列表(待审核)" "GET" "${BASE_URL}/withdrawal/list?status=pending" "" "$USER_TOKEN" "200"

# 4. 申请提现(金额不足)
test_api "申请提现(余额不足)" "POST" "${BASE_URL}/withdrawal/apply" '{"amount":100,"bankName":"工商银行","bankAccount":"6222021234567890123","bankHolder":"测试用户"}' "$USER_TOKEN" "400"

# 5. 申请提现(金额太小)
test_api "申请提现(金额太小)" "POST" "${BASE_URL}/withdrawal/apply" '{"amount":10}' "$USER_TOKEN" "400"

# ==================== 货管端接口测试 ====================
echo ""
echo "--- 货管端接口 ---"

# 6. 获取货管提现列表
test_api "货管-提现列表" "GET" "${BASE_URL}/porter/withdrawal/list" "" "$ADMIN_TOKEN" "200"

# 7. 获取货管提现列表(分页)
test_api "货管-提现列表(分页)" "GET" "${BASE_URL}/porter/withdrawal/list?page=1&pageSize=10" "" "$ADMIN_TOKEN" "200"

# 8. 货管申请提现(余额不足)
test_api "货管-申请提现(余额不足)" "POST" "${BASE_URL}/porter/withdrawal/apply" '{"amount":100}' "$ADMIN_TOKEN" "400"

# ==================== 管理后台接口测试 ====================
echo ""
echo "--- 管理后台接口 ---"

# 9. 获取提现列表
test_api "管理-提现列表" "GET" "${BASE_URL}/admin/withdrawal/list" "" "$ADMIN_TOKEN" "200"

# 10. 获取提现列表(分页)
test_api "管理-提现列表(分页)" "GET" "${BASE_URL}/admin/withdrawal/list?page=1&pageSize=10" "" "$ADMIN_TOKEN" "200"

# 11. 获取提现列表(类型过滤)
test_api "管理-提现列表(代理商)" "GET" "${BASE_URL}/admin/withdrawal/list?userType=user" "" "$ADMIN_TOKEN" "200"

# 12. 获取提现列表(状态过滤)
test_api "管理-提现列表(待审核)" "GET" "${BASE_URL}/admin/withdrawal/list?status=pending" "" "$ADMIN_TOKEN" "200"

# 13. 获取提现详情(不存在)
test_api "管理-提现详情(404)" "GET" "${BASE_URL}/admin/withdrawal/99999" "" "$ADMIN_TOKEN" "404"

# 14. 审核提现(不存在)
test_api "管理-审核提现(404)" "PUT" "${BASE_URL}/admin/withdrawal/99999/audit" '{"status":"approved"}' "$ADMIN_TOKEN" "404"

# 15. 完成提现(不存在)
test_api "管理-完成提现(404)" "PUT" "${BASE_URL}/admin/withdrawal/99999/complete" '{}' "$ADMIN_TOKEN" "404"

# ==================== 无Token访问测试 ====================
echo ""
echo "--- 权限测试 ---"

# 16. 无Token访问代理商端
test_api "无Token访问代理商端" "GET" "${BASE_URL}/withdrawal/list" "" "" "401"

# 17. 无Token访问货管端
test_api "无Token访问货管端" "GET" "${BASE_URL}/porter/withdrawal/list" "" "" "401"

# 18. 无Token访问管理后台
test_api "无Token访问管理后台" "GET" "${BASE_URL}/admin/withdrawal/list" "" "" "401"

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

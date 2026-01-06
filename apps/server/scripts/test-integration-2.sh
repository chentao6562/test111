#!/bin/bash
# 穿行测试2 - BE-01~04 综合测试脚本

BASE_URL="http://localhost:3000/api"
PASSED=0
FAILED=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "================================================"
echo "      穿行测试2 (BE-01~04 综合测试)"
echo "================================================"
echo ""

# =============== BE-01 健康检查 ===============
echo -e "${YELLOW}=== BE-01 健康检查模块 ===${NC}"

echo -n "1. 健康检查接口 ... "
HEALTH=$(curl -s "$BASE_URL/health")
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    ((FAILED++))
fi

# =============== BE-02 认证模块 ===============
echo ""
echo -e "${YELLOW}=== BE-02 认证模块 ===${NC}"

# 管理员登录
echo -n "2. 管理员登录 ... "
ADMIN_RESP=$(curl -s -X POST "$BASE_URL/auth/admin/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}')
ADMIN_TOKEN=$(echo "$ADMIN_RESP" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -n "$ADMIN_TOKEN" ]; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $ADMIN_RESP"
    ((FAILED++))
fi

# 用户登录
echo -n "3. 用户登录 ... "
USER_RESP=$(curl -s -X POST "$BASE_URL/auth/uni-login" \
    -H "Content-Type: application/json" \
    -d '{"token":"integration_test_token"}')
USER_TOKEN=$(echo "$USER_RESP" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -n "$USER_TOKEN" ]; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $USER_RESP"
    ((FAILED++))
fi

# 获取用户信息
echo -n "4. 获取用户信息(认证接口) ... "
PROFILE=$(curl -s "$BASE_URL/auth/profile" \
    -H "Authorization: Bearer $USER_TOKEN")
if echo "$PROFILE" | grep -q '"code":0'; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    ((FAILED++))
fi

# =============== BE-03 用户模块 ===============
echo ""
echo -e "${YELLOW}=== BE-03 用户模块 ===${NC}"

# 获取用户详情
echo -n "5. 获取用户详情 ... "
USER_INFO=$(curl -s "$BASE_URL/user/info" \
    -H "Authorization: Bearer $USER_TOKEN")
if echo "$USER_INFO" | grep -q '"code":0'; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    ((FAILED++))
fi

# 更新用户信息
echo -n "6. 更新用户昵称 ... "
UPDATE_USER=$(curl -s -X PUT "$BASE_URL/user/info" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $USER_TOKEN" \
    -d '{"nickname":"穿行测试用户"}')
if echo "$UPDATE_USER" | grep -q '"code":0'; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    ((FAILED++))
fi

# 添加地址
echo -n "7. 添加收货地址 ... "
ADD_ADDR=$(curl -s -X POST "$BASE_URL/user/address" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $USER_TOKEN" \
    -d '{"name":"测试联系人","phone":"13800138001","province":"内蒙古","city":"呼和浩特","district":"赛罕区","detail":"穿行测试地址","isDefault":true}')
if echo "$ADD_ADDR" | grep -q '"code":0'; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    ((FAILED++))
fi

# 获取地址列表
echo -n "8. 获取地址列表 ... "
ADDR_LIST=$(curl -s "$BASE_URL/user/address" \
    -H "Authorization: Bearer $USER_TOKEN")
if echo "$ADDR_LIST" | grep -q '"code":0'; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    ((FAILED++))
fi

# =============== BE-04 商品模块 ===============
echo ""
echo -e "${YELLOW}=== BE-04 商品模块 ===${NC}"

# 获取分类
echo -n "9. 获取分类列表 ... "
CATEGORIES=$(curl -s "$BASE_URL/product/category")
if echo "$CATEGORIES" | grep -q '"code":0'; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    ((FAILED++))
fi

# 获取商品列表
echo -n "10. 获取商品列表 ... "
PRODUCTS=$(curl -s "$BASE_URL/product/list")
if echo "$PRODUCTS" | grep -q '"code":0'; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    ((FAILED++))
fi

# 获取商品详情
echo -n "11. 获取商品详情 ... "
PRODUCT_DETAIL=$(curl -s "$BASE_URL/product/detail/1")
if echo "$PRODUCT_DETAIL" | grep -q '"code":0'; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    ((FAILED++))
fi

# 搜索商品
echo -n "12. 搜索商品 ... "
SEARCH=$(curl -s "$BASE_URL/product/search?keyword=烟花")
if echo "$SEARCH" | grep -q '"code":0'; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    ((FAILED++))
fi

# 获取热销商品
echo -n "13. 获取热销商品 ... "
HOT=$(curl -s "$BASE_URL/product/hot")
if echo "$HOT" | grep -q '"code":0'; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    ((FAILED++))
fi

# =============== 综合场景测试 ===============
echo ""
echo -e "${YELLOW}=== 综合场景测试 ===${NC}"

# 场景：用户登录 -> 浏览商品 -> 查看分类 -> 搜索商品
echo -n "14. 综合场景: 用户浏览商品流程 ... "
# 登录
LOGIN=$(curl -s -X POST "$BASE_URL/auth/uni-login" \
    -H "Content-Type: application/json" \
    -d '{"token":"scenario_test_token"}')
SCENARIO_TOKEN=$(echo "$LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
# 获取分类
CATS=$(curl -s "$BASE_URL/product/category")
# 获取第一个分类的商品
CAT_PRODUCTS=$(curl -s "$BASE_URL/product/category/1")
# 搜索商品
SEARCH_RESULT=$(curl -s "$BASE_URL/product/search?keyword=金龙")

if [ -n "$SCENARIO_TOKEN" ] && \
   echo "$CATS" | grep -q '"code":0' && \
   echo "$CAT_PRODUCTS" | grep -q '"code":0' && \
   echo "$SEARCH_RESULT" | grep -q '"code":0'; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    ((FAILED++))
fi

# 权限验证
echo -n "15. 权限验证: 无Token访问受保护接口 ... "
NO_AUTH=$(curl -s "$BASE_URL/user/info")
if echo "$NO_AUTH" | grep -q '"code":401'; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    ((FAILED++))
fi

echo ""
echo "================================================"
echo "穿行测试2完成"
echo "通过: $PASSED"
echo "失败: $FAILED"
echo "================================================"

if [ $FAILED -gt 0 ]; then
    exit 1
else
    exit 0
fi

#!/bin/bash
# 穿行测试3 - BE-01~07 综合测试脚本

BASE_URL="http://localhost:3000/api"
PASSED=0
FAILED=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "================================================"
echo "      穿行测试3 (BE-01~07 综合测试)"
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
    -d '{"token":"integration3_test_token"}')
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

# 添加地址
echo -n "6. 添加收货地址 ... "
ADD_ADDR=$(curl -s -X POST "$BASE_URL/user/address" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $USER_TOKEN" \
    -d '{"name":"穿行测试3","phone":"13800138003","province":"内蒙古","city":"呼和浩特","district":"赛罕区","detail":"穿行测试3地址","isDefault":true}')
if echo "$ADD_ADDR" | grep -q '"code":0'; then
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
echo -n "7. 获取分类列表 ... "
CATEGORIES=$(curl -s "$BASE_URL/product/category")
if echo "$CATEGORIES" | grep -q '"code":0'; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    ((FAILED++))
fi

# 获取商品列表
echo -n "8. 获取商品列表 ... "
PRODUCTS=$(curl -s "$BASE_URL/product/list")
if echo "$PRODUCTS" | grep -q '"code":0'; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    ((FAILED++))
fi

# 获取商品详情
echo -n "9. 获取商品详情 ... "
PRODUCT_DETAIL=$(curl -s "$BASE_URL/product/detail/1")
if echo "$PRODUCT_DETAIL" | grep -q '"code":0'; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    ((FAILED++))
fi

# =============== BE-05 订单模块 ===============
echo ""
echo -e "${YELLOW}=== BE-05 订单模块 ===${NC}"

# 创建订单
echo -n "10. 创建订单 ... "
ORDER_RESP=$(curl -s -X POST "$BASE_URL/order" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $USER_TOKEN" \
    -d '{"items":[{"productId":1,"quantity":1}],"contactName":"穿行测试3","contactPhone":"13800138003","address":"测试地址"}')
ORDER_CODE=$(echo "$ORDER_RESP" | grep -o '"code":[0-9]*' | cut -d':' -f2)
ORDER_ID=$(echo "$ORDER_RESP" | grep -oP '"orderId"\s*:\s*"?\K[0-9]+' | head -1)
if [ "$ORDER_CODE" == "0" ] && [ -n "$ORDER_ID" ]; then
    echo -e "${GREEN}通过${NC} (订单ID: $ORDER_ID)"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $ORDER_RESP"
    ((FAILED++))
fi

# 获取订单列表
echo -n "11. 获取订单列表 ... "
ORDER_LIST=$(curl -s "$BASE_URL/order/list" \
    -H "Authorization: Bearer $USER_TOKEN")
if echo "$ORDER_LIST" | grep -q '"code":0'; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    ((FAILED++))
fi

# 获取订单详情
echo -n "12. 获取订单详情 ... "
if [ -n "$ORDER_ID" ]; then
    ORDER_DETAIL=$(curl -s "$BASE_URL/order/$ORDER_ID" \
        -H "Authorization: Bearer $USER_TOKEN")
    if echo "$ORDER_DETAIL" | grep -q '"code":0'; then
        echo -e "${GREEN}通过${NC}"
        ((PASSED++))
    else
        echo -e "${RED}失败${NC}"
        ((FAILED++))
    fi
else
    echo -e "${RED}失败${NC} (无订单ID)"
    ((FAILED++))
fi

# =============== BE-06 代理商模块 ===============
echo ""
echo -e "${YELLOW}=== BE-06 代理商模块 ===${NC}"

# 获取代理信息
echo -n "13. 获取代理信息 ... "
AGENT_INFO=$(curl -s "$BASE_URL/agent/info" \
    -H "Authorization: Bearer $USER_TOKEN")
if echo "$AGENT_INFO" | grep -q '"code":0'; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    ((FAILED++))
fi

# 代理商列表（管理后台）
echo -n "14. 获取代理商列表(管理后台) ... "
AGENT_LIST=$(curl -s "$BASE_URL/admin/agent/list" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
if echo "$AGENT_LIST" | grep -q '"code":0'; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    ((FAILED++))
fi

# 代理商层级树
echo -n "15. 获取代理商层级树 ... "
AGENT_TREE=$(curl -s "$BASE_URL/admin/agent/tree" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
if echo "$AGENT_TREE" | grep -q '"code":0'; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    ((FAILED++))
fi

# =============== BE-07 库存模块 ===============
echo ""
echo -e "${YELLOW}=== BE-07 库存模块 ===${NC}"

# 库存列表
echo -n "16. 获取库存列表 ... "
STOCK_LIST=$(curl -s "$BASE_URL/warehouse/stock/list" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
if echo "$STOCK_LIST" | grep -q '"code":0'; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    ((FAILED++))
fi

# 库存概览
echo -n "17. 库存概览 ... "
STOCK_OVERVIEW=$(curl -s "$BASE_URL/admin/inventory/overview" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
if echo "$STOCK_OVERVIEW" | grep -q '"code":0'; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    ((FAILED++))
fi

# 库存流水
echo -n "18. 库存流水 ... "
STOCK_LOGS=$(curl -s "$BASE_URL/admin/inventory/logs" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
if echo "$STOCK_LOGS" | grep -q '"code":0'; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    ((FAILED++))
fi

# 进货单列表
echo -n "19. 进货单列表 ... "
PURCHASE_LIST=$(curl -s "$BASE_URL/admin/purchase/list" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
if echo "$PURCHASE_LIST" | grep -q '"code":0'; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    ((FAILED++))
fi

# =============== 综合场景测试 ===============
echo ""
echo -e "${YELLOW}=== 综合场景测试 ===${NC}"

# 场景：完整下单流程
echo -n "20. 综合场景: 登录->浏览->下单 ... "
# 登录
LOGIN=$(curl -s -X POST "$BASE_URL/auth/uni-login" \
    -H "Content-Type: application/json" \
    -d '{"token":"scenario3_test_token"}')
SCENARIO_TOKEN=$(echo "$LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
# 获取商品
PRODUCTS=$(curl -s "$BASE_URL/product/list")
# 下单
ORDER=$(curl -s -X POST "$BASE_URL/order" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $SCENARIO_TOKEN" \
    -d '{"items":[{"productId":1,"quantity":1}],"contactName":"场景测试","contactPhone":"13800138888"}')

if [ -n "$SCENARIO_TOKEN" ] && \
   echo "$PRODUCTS" | grep -q '"code":0' && \
   echo "$ORDER" | grep -q '"code":0'; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    ((FAILED++))
fi

# 权限验证
echo -n "21. 权限验证: 无Token访问受保护接口 ... "
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
echo "穿行测试3完成"
echo "通过: $PASSED"
echo "失败: $FAILED"
echo "================================================"

if [ $FAILED -gt 0 ]; then
    exit 1
else
    exit 0
fi

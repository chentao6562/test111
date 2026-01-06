#!/bin/bash
# 订单模块测试脚本 - BE-05

BASE_URL="http://localhost:3000/api"
PASSED=0
FAILED=0

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "================================================"
echo "         订单模块测试 (BE-05)"
echo "================================================"
echo ""

# 获取用户Token
echo "=== 准备工作 ==="
echo -n "获取用户Token ... "
USER_RESP=$(curl -s -X POST "$BASE_URL/auth/uni-login" \
    -H "Content-Type: application/json" \
    -d '{"token":"order_test_token"}')
USER_TOKEN=$(echo "$USER_RESP" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -n "$USER_TOKEN" ]; then
    echo -e "${GREEN}成功${NC}"
else
    echo -e "${RED}失败${NC}"
    echo "响应: $USER_RESP"
    exit 1
fi

echo ""
echo "=== 创建订单测试 ==="

# 1. 创建订单
echo -n "1. 创建订单 ... "
CREATE_RESP=$(curl -s -X POST "$BASE_URL/order" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $USER_TOKEN" \
    -d '{"items":[{"productId":1,"quantity":2}],"contactName":"订单测试","contactPhone":"13800138000","address":"测试地址"}')
CREATE_CODE=$(echo "$CREATE_RESP" | grep -o '"code":[0-9]*' | cut -d':' -f2)
# orderId可能是字符串格式 "orderId":"1" 或数字格式 "orderId":1
ORDER_ID=$(echo "$CREATE_RESP" | grep -oP '"orderId"\s*:\s*"?\K[0-9]+' | head -1)
if [ "$CREATE_CODE" == "0" ] && [ -n "$ORDER_ID" ]; then
    echo -e "${GREEN}通过${NC} (订单ID: $ORDER_ID)"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $CREATE_RESP"
    ((FAILED++))
fi

# 2. 创建多商品订单
echo -n "2. 创建多商品订单 ... "
CREATE2_RESP=$(curl -s -X POST "$BASE_URL/order" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $USER_TOKEN" \
    -d '{"items":[{"productId":1,"quantity":1},{"productId":2,"quantity":2}],"contactName":"多商品测试","contactPhone":"13900139000"}')
CREATE2_CODE=$(echo "$CREATE2_RESP" | grep -o '"code":[0-9]*' | cut -d':' -f2)
ORDER2_ID=$(echo "$CREATE2_RESP" | grep -oP '"orderId"\s*:\s*"?\K[0-9]+' | head -1)
if [ "$CREATE2_CODE" == "0" ]; then
    echo -e "${GREEN}通过${NC} (订单ID: $ORDER2_ID)"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $CREATE2_RESP"
    ((FAILED++))
fi

# 3. 空商品创建订单（应失败）
echo -n "3. 空商品创建订单(应失败) ... "
EMPTY_RESP=$(curl -s -X POST "$BASE_URL/order" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $USER_TOKEN" \
    -d '{"items":[],"contactName":"空商品测试","contactPhone":"13900139000"}')
EMPTY_CODE=$(echo "$EMPTY_RESP" | grep -o '"code":400' | head -1)
if [ -n "$EMPTY_CODE" ]; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $EMPTY_RESP"
    ((FAILED++))
fi

# 4. 不存在商品创建订单（应失败）
echo -n "4. 不存在商品创建订单(应失败) ... "
NOTFOUND_RESP=$(curl -s -X POST "$BASE_URL/order" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $USER_TOKEN" \
    -d '{"items":[{"productId":9999,"quantity":1}],"contactName":"不存在商品测试","contactPhone":"13900139000"}')
NOTFOUND_CODE=$(echo "$NOTFOUND_RESP" | grep -o '"code":2001' | head -1)
if [ -n "$NOTFOUND_CODE" ]; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $NOTFOUND_RESP"
    ((FAILED++))
fi

echo ""
echo "=== 订单列表测试 ==="

# 5. 获取订单列表
echo -n "5. 获取订单列表 ... "
LIST_RESP=$(curl -s "$BASE_URL/order/list" \
    -H "Authorization: Bearer $USER_TOKEN")
LIST_CODE=$(echo "$LIST_RESP" | grep -o '"code":[0-9]*' | cut -d':' -f2)
HAS_LIST=$(echo "$LIST_RESP" | grep -o '"list"')
if [ "$LIST_CODE" == "0" ] && [ -n "$HAS_LIST" ]; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $LIST_RESP"
    ((FAILED++))
fi

# 6. 按状态查询订单
echo -n "6. 按状态查询订单 ... "
STATUS_RESP=$(curl -s "$BASE_URL/order/list?status=0" \
    -H "Authorization: Bearer $USER_TOKEN")
STATUS_CODE=$(echo "$STATUS_RESP" | grep -o '"code":[0-9]*' | cut -d':' -f2)
if [ "$STATUS_CODE" == "0" ]; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    ((FAILED++))
fi

# 7. 分页查询订单
echo -n "7. 分页查询订单 ... "
PAGE_RESP=$(curl -s "$BASE_URL/order/list?page=1&pageSize=5" \
    -H "Authorization: Bearer $USER_TOKEN")
PAGE_CODE=$(echo "$PAGE_RESP" | grep -o '"code":[0-9]*' | cut -d':' -f2)
HAS_PAGES=$(echo "$PAGE_RESP" | grep -o '"totalPages"')
if [ "$PAGE_CODE" == "0" ] && [ -n "$HAS_PAGES" ]; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    ((FAILED++))
fi

echo ""
echo "=== 订单详情测试 ==="

# 8. 获取订单详情
if [ -n "$ORDER_ID" ]; then
    echo -n "8. 获取订单详情 ... "
    DETAIL_RESP=$(curl -s "$BASE_URL/order/$ORDER_ID" \
        -H "Authorization: Bearer $USER_TOKEN")
    DETAIL_CODE=$(echo "$DETAIL_RESP" | grep -o '"code":[0-9]*' | cut -d':' -f2)
    HAS_ITEMS=$(echo "$DETAIL_RESP" | grep -o '"items"')
    if [ "$DETAIL_CODE" == "0" ] && [ -n "$HAS_ITEMS" ]; then
        echo -e "${GREEN}通过${NC}"
        ((PASSED++))
    else
        echo -e "${RED}失败${NC}"
        ((FAILED++))
    fi
fi

# 9. 获取不存在订单（应失败）
echo -n "9. 获取不存在订单(应失败) ... "
NOTFOUND_ORDER=$(curl -s "$BASE_URL/order/9999999" \
    -H "Authorization: Bearer $USER_TOKEN")
NOTFOUND_ORDER_CODE=$(echo "$NOTFOUND_ORDER" | grep -o '"code":3001' | head -1)
if [ -n "$NOTFOUND_ORDER_CODE" ]; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $NOTFOUND_ORDER"
    ((FAILED++))
fi

echo ""
echo "=== 订单操作测试 ==="

# 10. 模拟支付
if [ -n "$ORDER_ID" ]; then
    echo -n "10. 模拟支付订单 ... "
    PAY_RESP=$(curl -s -X POST "$BASE_URL/order/$ORDER_ID/pay" \
        -H "Authorization: Bearer $USER_TOKEN")
    PAY_CODE=$(echo "$PAY_RESP" | grep -o '"code":[0-9]*' | cut -d':' -f2)
    HAS_PICKUP=$(echo "$PAY_RESP" | grep -o '"pickupCode"')
    if [ "$PAY_CODE" == "0" ] && [ -n "$HAS_PICKUP" ]; then
        echo -e "${GREEN}通过${NC}"
        ((PASSED++))
    else
        echo -e "${RED}失败${NC}"
        echo "响应: $PAY_RESP"
        ((FAILED++))
    fi
fi

# 11. 重复支付（应失败）
if [ -n "$ORDER_ID" ]; then
    echo -n "11. 重复支付订单(应失败) ... "
    PAY2_RESP=$(curl -s -X POST "$BASE_URL/order/$ORDER_ID/pay" \
        -H "Authorization: Bearer $USER_TOKEN")
    PAY2_CODE=$(echo "$PAY2_RESP" | grep -o '"code":3002' | head -1)
    if [ -n "$PAY2_CODE" ]; then
        echo -e "${GREEN}通过${NC}"
        ((PASSED++))
    else
        echo -e "${RED}失败${NC}"
        echo "响应: $PAY2_RESP"
        ((FAILED++))
    fi
fi

# 12. 取消未支付订单
if [ -n "$ORDER2_ID" ]; then
    echo -n "12. 取消未支付订单 ... "
    CANCEL_RESP=$(curl -s -X POST "$BASE_URL/order/$ORDER2_ID/cancel" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $USER_TOKEN" \
        -d '{"reason":"测试取消"}')
    CANCEL_CODE=$(echo "$CANCEL_RESP" | grep -o '"code":[0-9]*' | cut -d':' -f2)
    if [ "$CANCEL_CODE" == "0" ]; then
        echo -e "${GREEN}通过${NC}"
        ((PASSED++))
    else
        echo -e "${RED}失败${NC}"
        echo "响应: $CANCEL_RESP"
        ((FAILED++))
    fi
fi

# 13. 取消已支付订单（应失败）
if [ -n "$ORDER_ID" ]; then
    echo -n "13. 取消已支付订单(应失败) ... "
    CANCEL2_RESP=$(curl -s -X POST "$BASE_URL/order/$ORDER_ID/cancel" \
        -H "Authorization: Bearer $USER_TOKEN")
    CANCEL2_CODE=$(echo "$CANCEL2_RESP" | grep -o '"code":3002' | head -1)
    if [ -n "$CANCEL2_CODE" ]; then
        echo -e "${GREEN}通过${NC}"
        ((PASSED++))
    else
        echo -e "${RED}失败${NC}"
        echo "响应: $CANCEL2_RESP"
        ((FAILED++))
    fi
fi

echo ""
echo "=== 权限测试 ==="

# 14. 无Token访问订单接口（应失败）
echo -n "14. 无Token访问订单接口(应失败) ... "
NO_AUTH=$(curl -s "$BASE_URL/order/list")
NO_AUTH_CODE=$(echo "$NO_AUTH" | grep -o '"code":401' | head -1)
if [ -n "$NO_AUTH_CODE" ]; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $NO_AUTH"
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
else
    exit 0
fi

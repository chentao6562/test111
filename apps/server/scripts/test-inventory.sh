#!/bin/bash
# 库存模块测试脚本 - BE-07

BASE_URL="http://localhost:3000/api"
PASSED=0
FAILED=0

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "================================================"
echo "         库存模块测试 (BE-07)"
echo "================================================"
echo ""

# 获取管理员Token
echo "=== 准备工作 ==="
echo -n "获取管理员Token ... "
ADMIN_RESP=$(curl -s -X POST "$BASE_URL/auth/admin/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}')
ADMIN_TOKEN=$(echo "$ADMIN_RESP" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -n "$ADMIN_TOKEN" ]; then
    echo -e "${GREEN}成功${NC}"
else
    echo -e "${RED}失败${NC}"
    echo "响应: $ADMIN_RESP"
    exit 1
fi

echo ""
echo "=== 库管端-库存列表测试 ==="

# 1. 获取库存列表
echo -n "1. 获取库存列表 ... "
LIST_RESP=$(curl -s "$BASE_URL/warehouse/stock/list" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
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

# 2. 按关键词查询库存
echo -n "2. 按关键词查询库存 ... "
SEARCH_RESP=$(curl -s "$BASE_URL/warehouse/stock/list?keyword=金龙" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
SEARCH_CODE=$(echo "$SEARCH_RESP" | grep -o '"code":[0-9]*' | cut -d':' -f2)
if [ "$SEARCH_CODE" == "0" ]; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $SEARCH_RESP"
    ((FAILED++))
fi

# 3. 获取单个商品库存详情
echo -n "3. 获取商品库存详情 ... "
DETAIL_RESP=$(curl -s "$BASE_URL/warehouse/stock/1" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
DETAIL_CODE=$(echo "$DETAIL_RESP" | grep -o '"code":[0-9]*' | cut -d':' -f2)
HAS_STOCK=$(echo "$DETAIL_RESP" | grep -o '"stock"')
if [ "$DETAIL_CODE" == "0" ] && [ -n "$HAS_STOCK" ]; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $DETAIL_RESP"
    ((FAILED++))
fi

echo ""
echo "=== 库管端-入库测试 ==="

# 4. 创建入库单
echo -n "4. 创建入库单 ... "
INBOUND_RESP=$(curl -s -X POST "$BASE_URL/warehouse/inbound" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"items":[{"productId":1,"quantity":50,"costPrice":45.00},{"productId":2,"quantity":100,"costPrice":25.00}],"supplierName":"测试供应商","remark":"测试入库"}')
INBOUND_CODE=$(echo "$INBOUND_RESP" | grep -o '"code":[0-9]*' | cut -d':' -f2)
PURCHASE_ID=$(echo "$INBOUND_RESP" | grep -oP '"purchaseId"\s*:\s*"?\K[0-9]+' | head -1)
if [ "$INBOUND_CODE" == "0" ] && [ -n "$PURCHASE_ID" ]; then
    echo -e "${GREEN}通过${NC} (进货单ID: $PURCHASE_ID)"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $INBOUND_RESP"
    ((FAILED++))
fi

# 5. 获取入库单列表
echo -n "5. 获取入库单列表 ... "
INBOUND_LIST=$(curl -s "$BASE_URL/warehouse/inbound/list" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
INBOUND_LIST_CODE=$(echo "$INBOUND_LIST" | grep -o '"code":[0-9]*' | cut -d':' -f2)
HAS_INBOUND_LIST=$(echo "$INBOUND_LIST" | grep -o '"list"')
if [ "$INBOUND_LIST_CODE" == "0" ] && [ -n "$HAS_INBOUND_LIST" ]; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $INBOUND_LIST"
    ((FAILED++))
fi

# 6. 确认入库
echo -n "6. 确认入库 ... "
if [ -n "$PURCHASE_ID" ]; then
    CONFIRM_RESP=$(curl -s -X POST "$BASE_URL/warehouse/inbound/$PURCHASE_ID/confirm" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    CONFIRM_CODE=$(echo "$CONFIRM_RESP" | grep -o '"code":[0-9]*' | cut -d':' -f2)
    if [ "$CONFIRM_CODE" == "0" ]; then
        echo -e "${GREEN}通过${NC}"
        ((PASSED++))
    else
        echo -e "${RED}失败${NC}"
        echo "响应: $CONFIRM_RESP"
        ((FAILED++))
    fi
else
    echo -e "${RED}失败${NC} (无进货单ID)"
    ((FAILED++))
fi

echo ""
echo "=== 管理后台-库存管理测试 ==="

# 7. 库存概览
echo -n "7. 库存概览 ... "
OVERVIEW_RESP=$(curl -s "$BASE_URL/admin/inventory/overview" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
OVERVIEW_CODE=$(echo "$OVERVIEW_RESP" | grep -o '"code":[0-9]*' | cut -d':' -f2)
HAS_TOTAL=$(echo "$OVERVIEW_RESP" | grep -o '"totalStock"')
if [ "$OVERVIEW_CODE" == "0" ] && [ -n "$HAS_TOTAL" ]; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $OVERVIEW_RESP"
    ((FAILED++))
fi

# 8. 管理后台库存列表
echo -n "8. 管理后台库存列表 ... "
ADMIN_LIST=$(curl -s "$BASE_URL/admin/inventory/list" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
ADMIN_LIST_CODE=$(echo "$ADMIN_LIST" | grep -o '"code":[0-9]*' | cut -d':' -f2)
if [ "$ADMIN_LIST_CODE" == "0" ]; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $ADMIN_LIST"
    ((FAILED++))
fi

# 9. 库存调整（增加）
echo -n "9. 库存调整(增加) ... "
ADJUST_RESP=$(curl -s -X PUT "$BASE_URL/admin/inventory/1/adjust" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"quantity":10,"reason":"盘盈","remark":"测试调整"}')
ADJUST_CODE=$(echo "$ADJUST_RESP" | grep -o '"code":[0-9]*' | cut -d':' -f2)
if [ "$ADJUST_CODE" == "0" ]; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $ADJUST_RESP"
    ((FAILED++))
fi

# 10. 库存调整（减少）
echo -n "10. 库存调整(减少) ... "
ADJUST2_RESP=$(curl -s -X PUT "$BASE_URL/admin/inventory/1/adjust" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"quantity":-5,"reason":"盘亏","remark":"测试减少"}')
ADJUST2_CODE=$(echo "$ADJUST2_RESP" | grep -o '"code":[0-9]*' | cut -d':' -f2)
if [ "$ADJUST2_CODE" == "0" ]; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $ADJUST2_RESP"
    ((FAILED++))
fi

# 11. 库存流水查询
echo -n "11. 库存流水查询 ... "
LOGS_RESP=$(curl -s "$BASE_URL/admin/inventory/logs" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
LOGS_CODE=$(echo "$LOGS_RESP" | grep -o '"code":[0-9]*' | cut -d':' -f2)
HAS_LOGS_LIST=$(echo "$LOGS_RESP" | grep -o '"list"')
if [ "$LOGS_CODE" == "0" ] && [ -n "$HAS_LOGS_LIST" ]; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $LOGS_RESP"
    ((FAILED++))
fi

# 12. 按商品筛选库存流水
echo -n "12. 按商品筛选库存流水 ... "
LOGS2_RESP=$(curl -s "$BASE_URL/admin/inventory/logs?productId=1" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
LOGS2_CODE=$(echo "$LOGS2_RESP" | grep -o '"code":[0-9]*' | cut -d':' -f2)
if [ "$LOGS2_CODE" == "0" ]; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $LOGS2_RESP"
    ((FAILED++))
fi

# 13. 库存预警列表
echo -n "13. 库存预警列表 ... "
WARNING_RESP=$(curl -s "$BASE_URL/admin/inventory/warning" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
WARNING_CODE=$(echo "$WARNING_RESP" | grep -o '"code":[0-9]*' | cut -d':' -f2)
if [ "$WARNING_CODE" == "0" ]; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $WARNING_RESP"
    ((FAILED++))
fi

echo ""
echo "=== 管理后台-进货管理测试 ==="

# 14. 进货单列表
echo -n "14. 进货单列表 ... "
PURCHASE_LIST=$(curl -s "$BASE_URL/admin/purchase/list" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
PURCHASE_LIST_CODE=$(echo "$PURCHASE_LIST" | grep -o '"code":[0-9]*' | cut -d':' -f2)
if [ "$PURCHASE_LIST_CODE" == "0" ]; then
    echo -e "${GREEN}通过${NC}"
    ((PASSED++))
else
    echo -e "${RED}失败${NC}"
    echo "响应: $PURCHASE_LIST"
    ((FAILED++))
fi

# 15. 进货单详情
echo -n "15. 进货单详情 ... "
if [ -n "$PURCHASE_ID" ]; then
    PURCHASE_DETAIL=$(curl -s "$BASE_URL/admin/purchase/$PURCHASE_ID" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    PURCHASE_DETAIL_CODE=$(echo "$PURCHASE_DETAIL" | grep -o '"code":[0-9]*' | cut -d':' -f2)
    HAS_ITEMS=$(echo "$PURCHASE_DETAIL" | grep -o '"items"')
    if [ "$PURCHASE_DETAIL_CODE" == "0" ] && [ -n "$HAS_ITEMS" ]; then
        echo -e "${GREEN}通过${NC}"
        ((PASSED++))
    else
        echo -e "${RED}失败${NC}"
        echo "响应: $PURCHASE_DETAIL"
        ((FAILED++))
    fi
else
    echo -e "${RED}失败${NC} (无进货单ID)"
    ((FAILED++))
fi

echo ""
echo "=== 权限测试 ==="

# 16. 无Token访问库存接口（应失败）
echo -n "16. 无Token访问库存接口(应失败) ... "
NO_AUTH=$(curl -s "$BASE_URL/warehouse/stock/list")
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

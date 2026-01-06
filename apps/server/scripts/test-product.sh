#!/bin/bash
# 商品模块测试脚本 - BE-04

BASE_URL="http://localhost:3000/api"
PASSED=0
FAILED=0

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# 测试函数
test_api() {
    local name="$1"
    local method="$2"
    local url="$3"
    local expected_code="$4"

    echo -n "测试: $name ... "

    response=$(curl -s -w "\n%{http_code}" -X "$method" "$url")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    code=$(echo "$body" | grep -o '"code":[0-9]*' | head -1 | cut -d':' -f2)

    if [ "$code" == "$expected_code" ]; then
        echo -e "${GREEN}通过${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}失败${NC} (期望code=$expected_code, 实际code=$code)"
        echo "响应: $body" | head -c 200
        echo ""
        ((FAILED++))
        return 1
    fi
}

# 测试带数据验证的函数
test_api_with_data() {
    local name="$1"
    local method="$2"
    local url="$3"
    local expected_code="$4"
    local check_field="$5"

    echo -n "测试: $name ... "

    response=$(curl -s -w "\n%{http_code}" -X "$method" "$url")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    code=$(echo "$body" | grep -o '"code":[0-9]*' | head -1 | cut -d':' -f2)
    has_field=$(echo "$body" | grep -o "\"$check_field\"" | head -1)

    if [ "$code" == "$expected_code" ] && [ -n "$has_field" ]; then
        echo -e "${GREEN}通过${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}失败${NC} (期望code=$expected_code, 实际code=$code, 检查字段=$check_field)"
        echo "响应: $body" | head -c 200
        echo ""
        ((FAILED++))
        return 1
    fi
}

echo "================================================"
echo "         商品模块测试 (BE-04)"
echo "================================================"
echo ""

echo "=== 分类接口测试 ==="

# 1. 获取分类列表
test_api_with_data "获取分类列表" "GET" "$BASE_URL/product/category" "0" "name"

# 2. 获取分类下商品
test_api_with_data "获取分类下商品" "GET" "$BASE_URL/product/category/1" "0" "list"

# 3. 获取不存在的分类（应失败）
test_api "获取不存在分类(应失败)" "GET" "$BASE_URL/product/category/9999" "2004"

echo ""
echo "=== 商品列表接口测试 ==="

# 4. 获取商品列表
test_api_with_data "获取商品列表" "GET" "$BASE_URL/product/list" "0" "list"

# 5. 按分类查询
test_api_with_data "按分类查询" "GET" "$BASE_URL/product/list?categoryId=1" "0" "list"

# 6. 带分页查询
test_api_with_data "带分页查询" "GET" "$BASE_URL/product/list?page=1&pageSize=5" "0" "totalPages"

# 7. 查询热销商品
test_api_with_data "查询热销商品(列表)" "GET" "$BASE_URL/product/list?isHot=1" "0" "list"

# 8. 查询新品
test_api_with_data "查询新品(列表)" "GET" "$BASE_URL/product/list?isNew=1" "0" "list"

echo ""
echo "=== 商品详情接口测试 ==="

# 9. 获取商品详情
test_api_with_data "获取商品详情" "GET" "$BASE_URL/product/detail/1" "0" "categoryName"

# 10. 获取不存在的商品（应失败）
test_api "获取不存在商品(应失败)" "GET" "$BASE_URL/product/detail/9999" "2001"

echo ""
echo "=== 热销/新品接口测试 ==="

# 11. 获取热销商品
test_api "获取热销商品" "GET" "$BASE_URL/product/hot" "0"

# 12. 获取热销商品(带限制)
test_api "获取热销商品(限5个)" "GET" "$BASE_URL/product/hot?limit=5" "0"

# 13. 获取新品推荐
test_api "获取新品推荐" "GET" "$BASE_URL/product/new" "0"

# 14. 获取新品推荐(带限制)
test_api "获取新品推荐(限5个)" "GET" "$BASE_URL/product/new?limit=5" "0"

echo ""
echo "=== 搜索接口测试 ==="

# 15. 搜索商品
test_api_with_data "搜索商品(金龙)" "GET" "$BASE_URL/product/search?keyword=金龙" "0" "list"

# 16. 搜索商品(礼花)
test_api_with_data "搜索商品(礼花)" "GET" "$BASE_URL/product/search?keyword=礼花" "0" "list"

# 17. 空关键词搜索
test_api_with_data "空关键词搜索" "GET" "$BASE_URL/product/search?keyword=" "0" "list"

# 18. 搜索不存在的商品
test_api_with_data "搜索不存在商品" "GET" "$BASE_URL/product/search?keyword=不存在的商品xyz" "0" "total"

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

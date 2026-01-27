#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidHlwZSI6ImFkbWluIiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzY4MjIxMzQxLCJleHAiOjE3Njg4MjYxNDF9.5KwS8CEXUUX9bK1Iae-F0vGmcl8lD8U0bU7GJdcdD3c"
API_BANNER="http://39.104.58.26/api/admin/h5-materials/banners"
API_NOTICE="http://39.104.58.26/api/admin/h5-materials/notices"

# 创建轮播图
echo "创建H5轮播图..."

curl -s -X POST "$API_BANNER" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{
  "title": "2025新春烟花盛典",
  "imageUrl": "uploads/products/veer-485580894.jpg",
  "linkType": "CATEGORY",
  "linkValue": "1",
  "sort": 1,
  "status": "ACTIVE"
}' > /dev/null && echo "✓ 轮播图1: 新春烟花盛典"

curl -s -X POST "$API_BANNER" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{
  "title": "春节组合烟花大促销",
  "imageUrl": "uploads/products/u=2041633049,3244735994&fm=253&app=138&f=JPEG.jpg",
  "linkType": "CATEGORY",
  "linkValue": "1",
  "sort": 2,
  "status": "ACTIVE"
}' > /dev/null && echo "✓ 轮播图2: 组合烟花大促"

curl -s -X POST "$API_BANNER" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{
  "title": "专业礼花弹系列",
  "imageUrl": "uploads/products/u=853857468,3445084780&fm=253&app=138&f=JPEG.jpg",
  "linkType": "CATEGORY",
  "linkValue": "2",
  "sort": 3,
  "status": "ACTIVE"
}' > /dev/null && echo "✓ 轮播图3: 专业礼花弹"

# 创建公告
echo ""
echo "创建H5公告..."

curl -s -X POST "$API_NOTICE" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{
  "title": "新春特惠！全场烟花满399减50，满799减120！",
  "content": "2025年春节特惠活动，全场烟花满399减50，满799减120！活动时间：即日起至正月十五。",
  "linkType": "NONE",
  "sort": 1,
  "status": "ACTIVE"
}' > /dev/null && echo "✓ 公告1: 新春特惠活动"

curl -s -X POST "$API_NOTICE" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{
  "title": "安全提示：燃放烟花请遵守当地法规，选择空旷场地",
  "content": "温馨提示：燃放烟花爆竹请遵守当地政府规定，选择空旷安全场地，远离易燃物品，儿童需在成人监护下燃放。",
  "linkType": "NONE",
  "sort": 2,
  "status": "ACTIVE"
}' > /dev/null && echo "✓ 公告2: 安全提示"

curl -s -X POST "$API_NOTICE" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{
  "title": "VIP移库服务上线！送货上门，安心订货",
  "content": "蒙庆烟花VIP移库服务正式上线，支持配送到您的分仓，让您订货更安心。详询客服：13190531439",
  "linkType": "NONE",
  "sort": 3,
  "status": "ACTIVE"
}' > /dev/null && echo "✓ 公告3: VIP移库服务"

echo ""
echo "H5内容创建完成！"

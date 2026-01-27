#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidHlwZSI6ImFkbWluIiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzY4MjIxMzQxLCJleHAiOjE3Njg4MjYxNDF9.5KwS8CEXUUX9bK1Iae-F0vGmcl8lD8U0bU7GJdcdD3c"
API="http://39.104.58.26/api/admin/products"

echo "开始创建商品（UTF-8编码）..."
echo ""

# 商品1: 盛世繁花组合烟花
curl -s -X POST "$API" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d @- <<'EOF' > /dev/null && echo "✓ [1/10] 盛世繁花组合烟花"
{
  "name": "盛世繁花组合烟花",
  "description": "豪华组合烟花礼盒，包含12种不同效果，从红光菊花到银光柳，层层递进，持续时间约180秒。适合春节、婚庆、庆典等重大场合。安全距离15米，燃放高度30-50米。",
  "images": ["uploads/products/veer-485580894.jpg", "uploads/products/qnEhbdMw38LGR3ceJFyz4Tt8AnahYbQcRNJFFK1phR7b496vDQVmtOj-cPABMfP4.jpg"],
  "retailPrice": "688",
  "agentPrice": "498",
  "wholesalePrice": "368",
  "stock": 200,
  "minStock": 30,
  "unit": "箱",
  "categoryId": 1,
  "transferFee": "50",
  "allowTransfer": true
}
EOF

# 商品2: 锦绣前程288响组合
curl -s -X POST "$API" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d @- <<'EOF' > /dev/null && echo "✓ [2/10] 锦绣前程288响组合"
{
  "name": "锦绣前程288响组合",
  "description": "288响连珠炮组合，红绿蓝三色交替，尾声金柳银瀑，璀璨夺目。专业级组合烟花，持续时间约240秒，适合大型庆典、商场开业、楼盘开盘等场合。",
  "images": ["uploads/products/u=2041633049,3244735994&fm=253&app=138&f=JPEG.jpg", "uploads/products/u=3548330523,2060204687&fm=253&app=138&f=JPEG.jpg"],
  "retailPrice": "1288",
  "agentPrice": "888",
  "wholesalePrice": "628",
  "stock": 150,
  "minStock": 20,
  "unit": "箱",
  "categoryId": 1,
  "transferFee": "80",
  "allowTransfer": true
}
EOF

# 商品3: 龙腾盛世礼花组合
curl -s -X POST "$API" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d @- <<'EOF' > /dev/null && echo "✓ [3/10] 龙腾盛世礼花组合"
{
  "name": "龙腾盛世礼花组合",
  "description": "2025龙年特别款，龙形喷泉+空中大花+银色冠菊组合。开场金龙吐珠，中段彩菊绽放，尾声银光瀑布。持续时间约150秒，适合家庭聚会、农村婚庆。",
  "images": ["uploads/products/u=2153773461,1891142490&fm=253&app=138&f=JPEG.jpg"],
  "retailPrice": "488",
  "agentPrice": "328",
  "wholesalePrice": "228",
  "stock": 300,
  "minStock": 50,
  "unit": "箱",
  "categoryId": 1,
  "transferFee": "35",
  "allowTransfer": true
}
EOF

# 商品4: 空中王者12发礼花弹
curl -s -X POST "$API" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d @- <<'EOF' > /dev/null && echo "✓ [4/10] 空中王者12发礼花弹"
{
  "name": "空中王者12发礼花弹",
  "description": "专业级礼花弹，12发连发，炸高60-80米，炸开直径30米。红绿金银四色交替，每发间隔2秒，总持续约30秒。适合大型庆典、广场晚会。需专业人员操作，安全距离30米。",
  "images": ["uploads/products/u=853857468,3445084780&fm=253&app=138&f=JPEG.jpg", "uploads/products/u=4039402826,2785634471&fm=253&app=138&f=JPEG.jpg"],
  "retailPrice": "1688",
  "agentPrice": "1188",
  "wholesalePrice": "888",
  "stock": 80,
  "minStock": 10,
  "unit": "箱",
  "categoryId": 2,
  "transferFee": "100",
  "allowTransfer": true
}
EOF

# 商品5: 彩虹天际8发礼花弹
curl -s -X POST "$API" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d @- <<'EOF' > /dev/null && echo "✓ [5/10] 彩虹天际8发礼花弹"
{
  "name": "彩虹天际8发礼花弹",
  "description": "高空礼花弹，炸高50-70米，彩虹七色效果。每发持续5秒，八发连续绽放，营造梦幻天空。适合婚庆典礼、周年庆、节日晚会。安全距离25米。",
  "images": ["uploads/products/u=2312286990,2291693522&fm=253&app=138&f=JPEG.jpg"],
  "retailPrice": "988",
  "agentPrice": "688",
  "wholesalePrice": "488",
  "stock": 120,
  "minStock": 15,
  "unit": "箱",
  "categoryId": 2,
  "transferFee": "60",
  "allowTransfer": true
}
EOF

# 商品6: 小天使手持仙女棒套装
curl -s -X POST "$API" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d @- <<'EOF' > /dev/null && echo "✓ [6/10] 小天使手持仙女棒套装"
{
  "name": "小天使手持仙女棒套装",
  "description": "安全手持烟花，20支装。无烟无味，持续时间60秒/支。金色、银色、彩色三种可选。适合3岁以上儿童在家长监护下使用。符合国家安全标准，通过GB 10631认证。",
  "images": ["uploads/products/u=1048718087,3147919383&fm=253&app=138&f=JPEG.jpg"],
  "retailPrice": "58",
  "agentPrice": "38",
  "wholesalePrice": "25",
  "stock": 500,
  "minStock": 100,
  "unit": "盒",
  "categoryId": 3,
  "transferFee": "0",
  "allowTransfer": false
}
EOF

# 商品7: 快乐童年旋转小蜜蜂
curl -s -X POST "$API" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d @- <<'EOF' > /dev/null && echo "✓ [7/10] 快乐童年旋转小蜜蜂"
{
  "name": "快乐童年旋转小蜜蜂",
  "description": "创意造型烟花，小蜜蜂造型旋转加吐珠，地面安全玩具烟花。持续时间约90秒，五彩缤纷。适合家庭使用，儿童最爱。安全距离3米，无高空效果。",
  "images": ["uploads/products/ScreenShot_2025-12-17_162810_986.png"],
  "retailPrice": "68",
  "agentPrice": "48",
  "wholesalePrice": "32",
  "stock": 400,
  "minStock": 80,
  "unit": "盒",
  "categoryId": 3,
  "transferFee": "0",
  "allowTransfer": false
}
EOF

# 商品8: 阖家欢乐新年套装
curl -s -X POST "$API" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d @- <<'EOF' > /dev/null && echo "✓ [8/10] 阖家欢乐新年套装"
{
  "name": "阖家欢乐新年套装",
  "description": "家庭装烟花大礼包，包含：组合烟花2个、小礼花弹5发、手持仙女棒10支、旋转小蜜蜂3个、电光鞭炮2挂。适合家庭春节使用，品种丰富，满足全家人需求。总燃放时间约15分钟。",
  "images": ["uploads/products/lihua-fireworks.jpg", "uploads/products/u=617237994,2911142058&fm=253&app=138&f=JPEG.jpg"],
  "retailPrice": "388",
  "agentPrice": "268",
  "wholesalePrice": "188",
  "stock": 250,
  "minStock": 40,
  "unit": "套",
  "categoryId": 1,
  "transferFee": "25",
  "allowTransfer": true
}
EOF

# 商品9: 庭院烟花盛宴套装
curl -s -X POST "$API" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d @- <<'EOF' > /dev/null && echo "✓ [9/10] 庭院烟花盛宴套装"
{
  "name": "庭院烟花盛宴套装",
  "description": "中高端家庭套装，含88响组合烟花1个、36发小礼花弹1盒、喷泉烟花3个、手持冷光烟花20支。专为别墅庭院设计，安全距离10米，燃放时间约20分钟。",
  "images": ["uploads/products/_v1g97YImvGGlEmy_Zg440ZAirr5BBSw0oX6Sp0MA_xOEcJR1KDvTAshptWfB8DB.jpg"],
  "retailPrice": "688",
  "agentPrice": "488",
  "wholesalePrice": "348",
  "stock": 180,
  "minStock": 30,
  "unit": "套",
  "categoryId": 1,
  "transferFee": "40",
  "allowTransfer": true
}
EOF

# 商品10: 盛大开业288响礼炮
curl -s -X POST "$API" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d @- <<'EOF' > /dev/null && echo "✓ [10/10] 盛大开业288响礼炮"
{
  "name": "盛大开业288响礼炮",
  "description": "商用级礼炮，288响连发，声音洪亮，气势磅礴。红色喜庆效果，适合店铺开业、公司开张、剪彩仪式。持续时间约4分钟，安全距离20米。包含遥控点火装置。",
  "images": ["uploads/products/u=497606185,1382115670&fm=253&app=138&f=JPEG.jpg"],
  "retailPrice": "1888",
  "agentPrice": "1288",
  "wholesalePrice": "888",
  "stock": 100,
  "minStock": 15,
  "unit": "箱",
  "categoryId": 2,
  "transferFee": "120",
  "allowTransfer": true
}
EOF

echo ""
echo "所有商品创建完成！"

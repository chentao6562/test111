#!/bin/bash

# H5应用部署脚本
# 用途：将构建好的H5应用上传到服务器并配置Nginx

echo "========================================"
echo "   H5应用部署脚本（库管端+货管端）"
echo "========================================"

# 服务器配置
SERVER="root@39.104.58.26"
REMOTE_BASE="/root/projects/test111"

# 检查dist目录是否存在
if [ ! -d "h5-warehouse/dist" ]; then
    echo "❌ 错误：h5-warehouse/dist 目录不存在，请先执行 npm run build"
    exit 1
fi

if [ ! -d "h5-logistics/dist" ]; then
    echo "❌ 错误：h5-logistics/dist 目录不存在，请先执行 npm run build"
    exit 1
fi

echo ""
echo "📦 步骤1：压缩dist目录..."
cd h5-warehouse && tar -czf dist.tar.gz dist/ && cd ..
cd h5-logistics && tar -czf dist.tar.gz dist/ && cd ..
echo "✅ 压缩完成"

echo ""
echo "📤 步骤2：上传到服务器..."
scp h5-warehouse/dist.tar.gz $SERVER:$REMOTE_BASE/h5-warehouse/
scp h5-logistics/dist.tar.gz $SERVER:$REMOTE_BASE/h5-logistics/
echo "✅ 上传完成"

echo ""
echo "📦 步骤3：在服务器上解压..."
ssh $SERVER << 'EOF'
cd /root/projects/test111/h5-warehouse
rm -rf dist
tar -xzf dist.tar.gz
rm dist.tar.gz
echo "✅ h5-warehouse 解压完成"

cd /root/projects/test111/h5-logistics
rm -rf dist
tar -xzf dist.tar.gz
rm dist.tar.gz
echo "✅ h5-logistics 解压完成"
EOF

echo ""
echo "🔧 步骤4：配置Nginx..."
ssh $SERVER << 'EOF'
# 创建Nginx配置文件
cat > /etc/nginx/sites-available/h5-apps << 'NGINX_EOF'
# 库管端H5 - 端口8082
server {
    listen 8082;
    server_name 39.104.58.26;

    root /root/projects/test111/h5-warehouse/dist;
    index index.html;

    # Gzip压缩
    gzip on;
    gzip_types text/css application/javascript application/json;
    gzip_min_length 1000;

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Vue Router history模式支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API代理（开发环境使用）
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# 货管端H5 - 端口8083
server {
    listen 8083;
    server_name 39.104.58.26;

    root /root/projects/test111/h5-logistics/dist;
    index index.html;

    # Gzip压缩
    gzip on;
    gzip_types text/css application/javascript application/json;
    gzip_min_length 1000;

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Vue Router history模式支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API代理（开发环境使用）
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX_EOF

# 创建软链接
if [ ! -L /etc/nginx/sites-enabled/h5-apps ]; then
    ln -s /etc/nginx/sites-available/h5-apps /etc/nginx/sites-enabled/h5-apps
    echo "✅ 创建Nginx配置软链接"
fi

# 测试Nginx配置
nginx -t

# 重载Nginx
systemctl reload nginx
echo "✅ Nginx配置完成并重载"
EOF

echo ""
echo "🔓 步骤5：检查阿里云安全组端口..."
echo "⚠️  请手动确认以下端口已在阿里云安全组中开放："
echo "   - 8082 (库管端H5)"
echo "   - 8083 (货管端H5)"
echo ""
echo "🌐 访问地址："
echo "   库管端：http://39.104.58.26:8082"
echo "   货管端：http://39.104.58.26:8083"
echo ""
echo "========================================"
echo "   ✅ 部署完成！"
echo "========================================"

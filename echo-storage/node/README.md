# Echo Storage - Node.js 版本

本地/私有部署的轻量级存储后端。

## 快速启动

```bash
# 1. 安装依赖
npm install

# 2. 生成认证 Token
openssl rand -hex 32

# 3. 配置环境变量
export AUTH_TOKEN=<上面生成的token>
export ALLOWED_ORIGIN=*  # 或指定前端域名
export PORT=3456

# 4. 启动服务
npm start
```

## 环境变量

| 变量 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `AUTH_TOKEN` | ✅ | - | 认证令牌（至少32字符） |
| `ALLOWED_ORIGIN` | ❌ | `*` | CORS 允许的源 |
| `DB_PATH` | ❌ | `./echo.db` | SQLite 数据库路径 |
| `PORT` | ❌ | `3456` | 服务端口 |

## 使用 .env 文件

```bash
# 创建 .env
cat > .env << 'EOF'
AUTH_TOKEN=your_strong_random_token_here
ALLOWED_ORIGIN=http://localhost:8888
DB_PATH=./echo.db
PORT=3456
EOF

# 使用 dotenv 启动
npm install dotenv
node -r dotenv/config server.js
```

## 生产部署

### 使用 PM2
```bash
npm install -g pm2
pm2 start server.js --name echo-storage
pm2 startup
pm2 save
```

### 使用 systemd
```ini
# /etc/systemd/system/echo-storage.service
[Unit]
Description=Echo Storage Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/echo-storage
Environment="AUTH_TOKEN=your_token"
Environment="ALLOWED_ORIGIN=https://your-domain.com"
ExecStart=/usr/bin/node server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable echo-storage
systemctl start echo-storage
```

## 安全建议

1. **强制 HTTPS**: 使用 Nginx/Caddy 反向代理
2. **限制访问**: 配置防火墙只允许特定 IP
3. **定期备份**: `cp echo.db echo.db.backup`
4. **监控日志**: `pm2 logs echo-storage`

## 故障排查

```bash
# 检查服务状态
curl http://localhost:3456/api/ping \
  -H "Authorization: Bearer your_token"

# 查看日志
pm2 logs echo-storage

# 检查数据库
sqlite3 echo.db "SELECT COUNT(*) FROM kv;"
```

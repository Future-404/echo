# Echo Storage - Cloudflare Workers 版本

全球分布式存储后端，适合生产环境。

## 部署步骤

### 1. 安装 Wrangler CLI
```bash
npm install -g wrangler
wrangler login
```

### 2. 创建 KV 命名空间
```bash
wrangler kv:namespace create ECHO_KV
```
记录返回的 `id`，例如：
```
{ binding = "ECHO_KV", id = "abc123def456" }
```

### 3. 创建 D1 数据库
```bash
wrangler d1 create echo-images
```
记录返回的 `database_id`，例如：
```
database_id = "xyz789-abc-def"
```

### 4. 配置 wrangler.toml
编辑 `wrangler.toml`，填入上面的 id：
```toml
[[kv_namespaces]]
binding = "ECHO_KV"
id = "abc123def456"  # 步骤2的id

[[d1_databases]]
binding = "ECHO_DB"
database_name = "echo-images"
database_id = "xyz789-abc-def"  # 步骤3的id
```

### 5. 初始化数据库表
```bash
wrangler d1 execute echo-images --file=schema.sql --remote
```

### 6. 设置认证密钥
```bash
# 生成强随机 token
openssl rand -hex 32

# 设置为 secret（不会出现在代码中）
wrangler secret put AUTH_TOKEN
# 粘贴上面生成的 token

# 可选：限制 CORS
wrangler secret put ALLOWED_ORIGIN
# 输入前端域名，如: https://your-app.com
```

### 7. 部署
```bash
wrangler deploy
```

部署成功后会显示 Worker URL：
```
https://echo-storage.your-subdomain.workers.dev
```

### 8. 测试
```bash
curl https://echo-storage.your-subdomain.workers.dev/api/ping \
  -H "Authorization: Bearer your_token"
```

## 自定义域名（可选）

```bash
# 添加自定义域名
wrangler domains add api.your-domain.com

# 更新 DNS
# 在 Cloudflare DNS 中添加 CNAME 记录指向 Worker
```

## 监控和日志

```bash
# 查看实时日志
wrangler tail

# 查看分析数据
wrangler pages deployment list
```

## 成本估算

Cloudflare Workers 免费额度：
- 100,000 请求/天
- KV: 100,000 读取/天, 1,000 写入/天
- D1: 500 万行读取/天

对于个人项目完全够用。

## 更新部署

```bash
# 修改代码后重新部署
wrangler deploy

# 回滚到上一个版本
wrangler rollback
```

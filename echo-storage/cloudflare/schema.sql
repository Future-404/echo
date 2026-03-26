-- 初始化 D1 表，部署前执行：
-- wrangler d1 execute echo-images --file=schema.sql

CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  base64 TEXT NOT NULL
);

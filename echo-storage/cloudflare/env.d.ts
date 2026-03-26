export interface Env {
  ECHO_KV: KVNamespace
  ECHO_DB: D1Database
  AUTH_TOKEN: string
  ALLOWED_ORIGIN?: string  // 可选，默认 '*'，生产环境建议设置为具体域名
}

export interface Env {
  ECHO_KV: KVNamespace
  ECHO_DB: D1Database
  ASSETS: Fetcher
  AUTH_TOKEN: string
  ALLOWED_ORIGIN?: string
}

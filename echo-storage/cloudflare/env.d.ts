export interface Env {
  ECHO_R2: R2Bucket
  ECHO_DB: D1Database
  ASSETS: Fetcher
  AUTH_TOKEN: string
  ALLOWED_ORIGIN?: string
}

/** PIN 哈希工具：仅在 crypto.subtle 可用时（HTTPS/localhost）允许使用 */
export async function pinHash(text: string): Promise<string> {
  if (!crypto?.subtle?.digest) {
    throw new Error('PIN 锁屏需要在 HTTPS 环境下使用')
  }
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/** 检查当前环境是否支持安全哈希（即是否可启用锁屏） */
export function isPinHashSupported(): boolean {
  return !!(crypto?.subtle?.digest)
}

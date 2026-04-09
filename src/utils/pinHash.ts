/** PIN 哈希工具：HTTPS 下用 SHA-256，非 HTTPS 降级为 FNV-1a + btoa 混淆 */
export async function pinHash(text: string): Promise<string> {
  if (crypto?.subtle?.digest) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
  }
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = (h * 0x01000193) >>> 0
  }
  return 'fbx-' + h.toString(16).padStart(8, '0') + btoa(text).replace(/=/g, '')
}

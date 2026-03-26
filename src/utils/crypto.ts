export class SecureStorage {
  private static checkCrypto() {
    if (!window.crypto?.subtle) {
      throw new Error('Web Crypto API 不可用。請使用 HTTPS 或 localhost 訪問。')
    }
  }

  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    this.checkCrypto()
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    )
    
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    )
  }

  static async encrypt(plaintext: string, password: string): Promise<string> {
    this.checkCrypto()
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const key = await this.deriveKey(password, salt)
    
    const encoder = new TextEncoder()
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(plaintext)
    )
    
    const result = new Uint8Array(salt.length + iv.length + ciphertext.byteLength)
    result.set(salt, 0)
    result.set(iv, salt.length)
    result.set(new Uint8Array(ciphertext), salt.length + iv.length)
    
    return btoa(String.fromCharCode(...result))
  }

  static async decrypt(encrypted: string, password: string): Promise<string> {
    this.checkCrypto()
    const data = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0))
    
    const salt = data.slice(0, 16)
    const iv = data.slice(16, 28)
    const ciphertext = data.slice(28)
    
    const key = await this.deriveKey(password, salt)
    
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    )
    
    return new TextDecoder().decode(plaintext)
  }

  static async hashPassword(password: string): Promise<string> {
    this.checkCrypto()
    const encoder = new TextEncoder()
    const hash = await crypto.subtle.digest('SHA-256', encoder.encode(password))
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }
}

# 安全警告

## API Key 存儲風險

當前應用將 API Key 存儲在 localStorage 中（通過 zustand persist）。

### 風險
- XSS 攻擊可直接讀取 localStorage
- 瀏覽器擴展可訪問
- 開發者工具可見

---

## 方案 1：後端代理（推薦）⭐

### 架構
```
前端 (Echo App)  →  後端代理服務  →  OpenAI/Anthropic API
   ↓                    ↓                    ↓
 用戶 Token         驗證 + 計費          真實 API Key
 (JWT/Session)      (Rate Limit)        (服務端環境變量)
```

### 實施步驟

#### 1. 後端服務（Node.js 示例）
```javascript
// server.js
import express from 'express'
import jwt from 'jsonwebtoken'

const app = express()
app.use(express.json())

// 中間件：驗證用戶身份
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

// 代理端點
app.post('/api/chat', authenticate, async (req, res) => {
  const { messages, model, stream } = req.body
  
  // 計費檢查（可選）
  const usage = await checkUserQuota(req.user.id)
  if (usage.exceeded) {
    return res.status(429).json({ error: 'Quota exceeded' })
  }
  
  // 轉發到真實 API
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ messages, model, stream })
  })
  
  // 記錄使用量
  await logUsage(req.user.id, model, messages.length)
  
  // 返回結果
  if (stream) {
    response.body.pipe(res)
  } else {
    res.json(await response.json())
  }
})

app.listen(3000)
```

#### 2. 前端修改
```typescript
// src/hooks/useChat.ts
// 修改 fetch 調用

// 原來：
const response = await fetch(provider.endpoint, {
  headers: { 'Authorization': `Bearer ${provider.apiKey}` }
})

// 改為：
const response = await fetch('/api/chat', {  // 你的後端代理
  headers: { 
    'Authorization': `Bearer ${getUserToken()}`,  // 用戶 JWT
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ messages, model, stream })
})
```

#### 3. 配置界面調整
```typescript
// src/components/Config/ProviderEditor.tsx
// 移除 API Key 輸入框，改為登入/註冊流程

<button onClick={handleLogin}>
  登入以使用 AI 服務
</button>
```

### 優點
✅ API Key 完全不暴露給前端  
✅ 可實現用量計費和限流  
✅ 統一管理多個用戶的 API 調用  
✅ 可添加內容審核層  

### 缺點
❌ 需要維護後端服務（成本）  
❌ 增加延遲（多一跳）  
❌ 需要用戶註冊/登入系統  

### 適用場景
- 商業化產品（SaaS）
- 多用戶平台
- 需要計費的服務

---

## 方案 2：加密存儲（次選）🔐

### 原理
用戶設置主密碼 → 派生加密密鑰 → 加密 API Key → 存儲密文

### 實施步驟

#### 1. 創建加密工具
```typescript
// src/utils/crypto.ts
export class SecureStorage {
  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
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
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const key = await this.deriveKey(password, salt)
    
    const encoder = new TextEncoder()
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(plaintext)
    )
    
    // 格式: salt(16) + iv(12) + ciphertext
    const result = new Uint8Array(salt.length + iv.length + ciphertext.byteLength)
    result.set(salt, 0)
    result.set(iv, salt.length)
    result.set(new Uint8Array(ciphertext), salt.length + iv.length)
    
    return btoa(String.fromCharCode(...result))
  }

  static async decrypt(encrypted: string, password: string): Promise<string> {
    const data = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0))
    
    const salt = data.slice(0, 16)
    const iv = data.slice(16, 28)
    const ciphertext = data.slice(28)
    
    const key = await this.deriveKey(password, salt)
    
    try {
      const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
      )
      
      return new TextDecoder().decode(plaintext)
    } catch {
      throw new Error('解密失敗：密碼錯誤')
    }
  }
}
```

#### 2. 修改 Store
```typescript
// src/store/configSlice.ts
interface ConfigState {
  masterPasswordHash?: string  // 用於驗證密碼
  encryptedProviders: string   // 加密後的 providers JSON
}

export const setMasterPassword = async (password: string) => {
  // 存儲密碼的 hash（用於驗證）
  const encoder = new TextEncoder()
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(password))
  const hashHex = Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  
  set({ masterPasswordHash: hashHex })
  
  // 將密碼存在內存中（不持久化）
  sessionStorage.setItem('_mpwd', password)
}

export const saveProvider = async (provider: Provider) => {
  const password = sessionStorage.getItem('_mpwd')
  if (!password) throw new Error('請先設置主密碼')
  
  const providers = [...get().providers, provider]
  const encrypted = await SecureStorage.encrypt(
    JSON.stringify(providers),
    password
  )
  
  set({ encryptedProviders: encrypted })
}

export const loadProviders = async (): Promise<Provider[]> => {
  const password = sessionStorage.getItem('_mpwd')
  const encrypted = get().encryptedProviders
  
  if (!password || !encrypted) return []
  
  const decrypted = await SecureStorage.decrypt(encrypted, password)
  return JSON.parse(decrypted)
}
```

#### 3. 添加解鎖界面
```typescript
// src/components/UnlockScreen.tsx
export const UnlockScreen = () => {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  
  const handleUnlock = async () => {
    try {
      await loadProviders()  // 嘗試解密
      setUnlocked(true)
    } catch {
      setError('密碼錯誤')
    }
  }
  
  return (
    <div className="unlock-screen">
      <h2>輸入主密碼解鎖</h2>
      <input 
        type="password" 
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
      <button onClick={handleUnlock}>解鎖</button>
      {error && <p className="error">{error}</p>}
    </div>
  )
}
```

#### 4. 應用啟動流程
```typescript
// src/App.tsx
const App = () => {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const hasEncryptedData = useAppStore(s => !!s.encryptedProviders)
  
  if (hasEncryptedData && !isUnlocked) {
    return <UnlockScreen onUnlock={() => setIsUnlocked(true)} />
  }
  
  return <MainApp />
}
```

### 優點
✅ 無需後端服務  
✅ API Key 加密存儲  
✅ 用戶完全控制數據  
✅ 離線可用  

### 缺點
❌ 用戶忘記密碼 = 數據永久丟失  
❌ 仍有 XSS 風險（密碼在內存中）  
❌ 每次啟動需要輸入密碼  
❌ 無法防止用戶設置弱密碼  

### 適用場景
- 個人工具/單機應用
- 不想維護後端
- 用戶隱私優先

---

## 方案對比

| 維度 | 方案 1（後端代理） | 方案 2（加密存儲） |
|------|-------------------|-------------------|
| 安全性 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 實施成本 | 高（需後端） | 中（純前端） |
| 用戶體驗 | 需登入 | 需記密碼 |
| 可擴展性 | 高（計費/審核） | 低 |
| 維護成本 | 高 | 低 |
| 推薦場景 | 商業產品 | 個人工具 |

---

## 當前狀態
✅ 已添加此文檔提醒  
⚠️ 代碼未修改（需架構決策）

## 實施建議
1. **如果是商業產品** → 選方案 1
2. **如果是開源工具** → 選方案 2
3. **快速驗證 MVP** → 暫時保持現狀 + 添加安全警告提示

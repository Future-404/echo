import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'

export const UnlockScreen = () => {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const unlockProviders = useAppStore(s => s.unlockProviders)

  const handleUnlock = async () => {
    if (!password.trim()) {
      setError('請輸入密碼')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      await unlockProviders(password)
      setIsLoading(false)
    } catch (err: any) {
      setError(err.message || '解密失敗')
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleUnlock()
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-96 shadow-2xl border border-white/20">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🔒</div>
          <h2 className="text-2xl font-bold text-white mb-2">解鎖應用</h2>
          <p className="text-sm text-gray-300">輸入主密碼以訪問 API Keys</p>
        </div>

        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="主密碼"
          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          autoFocus
          disabled={isLoading}
        />

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleUnlock}
          disabled={isLoading}
          className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium transition-colors"
        >
          {isLoading ? '解鎖中...' : '解鎖'}
        </button>

        <p className="text-xs text-gray-400 text-center mt-4">
          忘記密碼？數據將無法恢復，需重新設置。
        </p>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'

export const SetPasswordScreen = () => {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const setMasterPassword = useAppStore(s => s.setMasterPassword)
  const updateConfig = useAppStore(s => s.updateConfig)

  const handleSkip = () => {
    updateConfig({ masterPasswordHash: 'skipped' })
  }

  const handleSetPassword = async () => {
    if (password.length < 8) {
      setError('密碼至少需要 8 個字符')
      return
    }

    if (password !== confirm) {
      setError('兩次輸入的密碼不一致')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      await setMasterPassword(password)
    } catch (err: any) {
      setError(err.message || '設置失敗')
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-96 shadow-2xl border border-white/20">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🔐</div>
          <h2 className="text-2xl font-bold text-white mb-2">設置主密碼</h2>
          <p className="text-sm text-gray-300">用於加密保護您的 API Keys</p>
        </div>

        <div className="space-y-4 mb-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="主密碼（至少 8 位）"
            className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />

          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="確認密碼"
            className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleSetPassword}
          disabled={isLoading}
          className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium transition-colors"
        >
          {isLoading ? '設置中...' : '設置密碼'}
        </button>

        <button
          onClick={handleSkip}
          disabled={isLoading}
          className="w-full py-3 rounded-lg bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white font-medium transition-colors mt-2"
        >
          暫時跳過（不加密）
        </button>

        <div className="mt-4 p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/50">
          <p className="text-xs text-yellow-200">
            ⚠️ 請牢記此密碼！忘記後數據無法恢復。
          </p>
        </div>
      </div>
    </div>
  )
}

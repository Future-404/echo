import { useState } from 'react'

interface Props {
  onUnlock: (password: string) => Promise<void>
}

export const GateScreen = ({ onUnlock }: Props) => {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!password) return
    setLoading(true)
    setError('')
    try {
      await onUnlock(password)
    } catch {
      setError('密碼錯誤')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-80 shadow-2xl border border-white/20 space-y-4">
        <div className="text-center">
          <div className="text-4xl mb-2">🔑</div>
          <h2 className="text-xl font-bold text-white">Echo</h2>
          <p className="text-xs text-gray-400 mt-1">輸入訪問密碼</p>
        </div>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="Password"
          autoFocus
          disabled={loading}
          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/30"
        />
        {error && <p className="text-red-400 text-xs text-center">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={loading || !password}
          className="w-full py-3 rounded-lg bg-white/20 hover:bg-white/30 disabled:opacity-30 text-white text-sm transition-colors"
        >
          {loading ? '驗證中…' : '進入'}
        </button>
      </div>
    </div>
  )
}

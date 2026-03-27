import { useState } from 'react'

const REPO_URL = 'https://github.com/Future-404/echo'

const GithubIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
)

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
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 text-gray-500 hover:text-gray-300 transition-colors text-xs pt-1">
          <GithubIcon />
          <span className="tracking-widest uppercase">GitHub</span>
        </a>
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Loader2, ChevronRight } from 'lucide-react'

interface Props {
  onUnlock: (pin: string) => Promise<boolean>
}

export const LockScreen: React.FC<Props> = ({ onUnlock }) => {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState(0)

  const MAX_ATTEMPTS = 5
  const LOCKOUT_MS = 30_000

  const handleSubmit = async () => {
    const now = Date.now()
    if (lockedUntil > now) {
      setError(`LOCKED: RETRY IN ${Math.ceil((lockedUntil - now) / 1000)}s`)
      return
    }
    if (!pin || loading) return
    setLoading(true)
    setError('')
    const ok = await onUnlock(pin)
    if (ok) return // parent unmounts this component
    const next = attempts + 1
    setAttempts(next)
    if (next >= MAX_ATTEMPTS) {
      setLockedUntil(Date.now() + LOCKOUT_MS)
      setAttempts(0)
      setError('TOO MANY ATTEMPTS. LOCKED FOR 30s')
    } else {
      setError(`WRONG PIN (${MAX_ATTEMPTS - next} left)`)
    }
    setPin('')
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[320px] px-6"
      >
        <div className="bg-black/70 border border-white/10 rounded-[2rem] p-8 flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <Lock size={24} strokeWidth={1.5} className="text-white/60" />
            <p className="text-[10px] tracking-[0.4em] text-white/40 uppercase font-mono">App Locked</p>
          </div>

          <div className="w-full relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-blue-400 transition-colors">
              <Lock size={14} strokeWidth={1.5} />
            </div>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="PIN"
              autoFocus
              disabled={loading || lockedUntil > Date.now()}
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white text-sm font-mono tracking-[0.5em] text-center placeholder:tracking-widest placeholder:text-white/20 focus:outline-none focus:border-blue-400 transition-all"
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-rose-500/80 text-[10px] tracking-widest font-mono text-center"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <button
            onClick={handleSubmit}
            disabled={loading || !pin || lockedUntil > Date.now()}
            className="w-full flex items-center justify-center gap-2 py-3 bg-white/90 hover:bg-white text-black rounded-xl text-[11px] font-bold tracking-[0.3em] uppercase transition-all disabled:opacity-20 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <>Unlock <ChevronRight size={12} /></>}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

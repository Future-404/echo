import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ShieldCheck, Loader2, Github, Key, ChevronRight } from 'lucide-react';
import { getDisplayVersion } from '../version';

const REPO_URL = 'https://github.com/Future-404/echo';

interface Props {
  onUnlock: (password: string) => Promise<void>;
}

export const GateScreen: React.FC<Props> = ({ onUnlock }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);

  const MAX_ATTEMPTS = 5;
  const LOCKOUT_MS = 30_000;

  const handleSubmit = async () => {
    const now = Date.now();
    if (lockedUntil > now) {
      const secs = Math.ceil((lockedUntil - now) / 1000);
      setError(`ACCESS LOCKED: RETRY IN ${secs}s`);
      return;
    }
    if (!password || loading) return;
    setLoading(true);
    setError('');
    try {
      await onUnlock(password);
    } catch (err) {
      const next = attempts + 1;
      setAttempts(next);
      if (next >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_MS;
        setLockedUntil(until);
        setAttempts(0);
        setError(`ACCESS DENIED: TOO MANY ATTEMPTS. LOCKED FOR 30s`);
      } else {
        setError(`ACCESS DENIED: INVALID TOKEN (${MAX_ATTEMPTS - next} attempts left)`);
      }
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-transparent overflow-hidden">
      {/* 氛围背景层 - 与主菜单一致 */}
      <div className="absolute inset-0 z-0">
        <motion.div
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.6 }}
          transition={{ duration: 3, ease: 'easeOut' }}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/bg.webp)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
        
        {/* 动态扫光线 */}
        <motion.div 
          animate={{ y: ['-100%', '200%'] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute inset-x-0 h-[50vh] bg-gradient-to-b from-transparent via-white/[0.05] to-transparent pointer-events-none"
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[400px] px-6"
      >
        <div className="bg-black/60 border border-white/10 rounded-[2.5rem] p-10 md:p-12 shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col items-center text-center">
          
          {/* Logo 区域 */}
          <div className="mb-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center gap-2"
            >
              <h1 className="text-5xl font-light tracking-[0.3em] text-white leading-none">
                ECHO
              </h1>
              <div className="flex items-center gap-3 mt-4">
                <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-white/20" />
                <span className="text-[9px] tracking-[0.5em] text-white/50 uppercase font-sans">
                  System Authorization
                </span>
                <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-white/20" />
              </div>
            </motion.div>
          </div>

          {/* 表单区域 */}
          <div className="w-full space-y-6">
            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-blue-400 transition-colors">
                <Lock size={16} strokeWidth={1.5} />
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="AUTHENTICATION TOKEN"
                autoFocus
                disabled={loading || lockedUntil > Date.now()}
                className="w-full pl-12 pr-6 py-4 bg-black/80 border border-white/30 rounded-2xl text-white text-sm font-mono tracking-widest placeholder:text-white/30 focus:outline-none focus:border-blue-400 focus:bg-black/90 transition-all"
              />
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.p 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-rose-500/80 text-[10px] tracking-[0.15em] font-mono italic"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              onClick={handleSubmit}
              disabled={loading || !password || lockedUntil > Date.now()}
              className="w-full group relative overflow-hidden py-4 bg-white/90 hover:bg-white dark:bg-white/10 dark:hover:bg-white/20 text-black dark:text-white rounded-2xl text-[11px] font-bold tracking-[0.4em] uppercase transition-all disabled:opacity-20 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-[0.98]"
            >
              <div className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <>
                    <span>Decrypt</span>
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </div>
            </button>
          </div>

          {/* 底部装饰 */}
          <div className="mt-12 flex flex-col items-center gap-6">
            <div className="flex items-center gap-4 opacity-40">
              <ShieldCheck size={14} strokeWidth={1.5} className="text-white" />
              <div className="w-[1px] h-3 bg-white/40" />
              <span className="text-[8px] tracking-[0.2em] text-white uppercase font-mono">
                CORE // {getDisplayVersion()}
              </span>
            </div>

            <a 
              href={REPO_URL} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-white/30 hover:text-white/60 transition-all group"
            >
              <Github size={12} strokeWidth={1.5} className="group-hover:rotate-12 transition-transform" />
              <span className="text-[8px] tracking-[0.2em] uppercase font-sans">GitHub Repository</span>
            </a>
          </div>
        </div>

        {/* 装饰性边角标 */}
        <div className="absolute -top-4 -left-4 w-20 h-20 border-t border-l border-white/10 pointer-events-none" />
        <div className="absolute -bottom-4 -right-4 w-20 h-20 border-b border-r border-white/10 pointer-events-none" />
      </motion.div>

      {/* 底部版权信息 */}
      <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none flex flex-col items-center gap-2">
        <div className="h-[1px] w-12 bg-white/20 mb-1" />
        <span className="text-[8px] tracking-[0.6em] text-white/40 uppercase">
          &copy; 2026 ECHO PROJECT. ADVANCED NEURAL RENDERER.
        </span>
      </div>
    </div>
  );
};

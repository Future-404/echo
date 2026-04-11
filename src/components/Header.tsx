import React, { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'
import MusicPlayer from './MusicPlayer'
import CharCard from './CharCard'
import { Clock, MapPin, Cloud, ChevronLeft } from 'lucide-react'

const Header: React.FC = () => {
  const { 
    isLoading, selectedCharacter, setCurrentView,
    lastTokenCount, maxContextTokens 
  } = useAppStore()
  const attrs = selectedCharacter.attributes || {}
  const [charCardOpen, setCharCardOpen] = useState(false)
  const charNameRef = useRef<HTMLButtonElement>(null)

  // 计算 Token 百比分与颜色
  const tokenUsagePercent = maxContextTokens > 0 ? (lastTokenCount / maxContextTokens) * 100 : 0
  const tokenColorClass = tokenUsagePercent > 95 ? 'text-red-500' : tokenUsagePercent > 80 ? 'text-orange-400' : 'text-echo-text-subtle'

  return (
    <header className="echo-header-container sticky top-0 z-50 pointer-events-none bg-echo-base/60 dark:bg-black/60 backdrop-blur-md border-b border-black/5 dark:border-white/5">
      {/* iOS 状态栏占位层 */}
      <div className="h-[var(--sat)] w-full" />
      
      {/* 实际内容层：固定高度 */}
      <div className="h-14 flex items-center justify-between px-4 md:px-10 pointer-events-auto">
        <div className="flex items-center gap-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: isLoading ? 0 : 1 }} className="flex items-center gap-2">
            {/* 极简返回图标 */}
            <button
              onClick={() => setCurrentView('home')}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 text-echo-text-dim hover:bg-black/10 dark:hover:bg-white/10 transition-all pointer-events-auto"
              title="返回主菜单"
            >
              <ChevronLeft size={16} strokeWidth={2.5} />
            </button>

            <div className="flex flex-col md:flex-row md:items-center md:gap-3">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    ref={charNameRef}
                    onClick={() => setCharCardOpen(v => !v)}
                    className="text-[9px] md:text-[10px] tracking-[0.4em] italic uppercase hover:opacity-70 transition-all"
                    style={{ color: 'var(--echo-header-primary)' }}
                  >
                    {selectedCharacter.name}
                  </button>
                </div>
                <CharCard
                  open={charCardOpen}
                  onClose={() => setCharCardOpen(false)}
                  anchorRef={charNameRef}
                />

                {/* 环境信息：双排小字展示 */}
                <div className="flex flex-col justify-center leading-none ml-1 border-l border-white/10 pl-2">
                  {(() => {
                    const time = Object.entries(attrs).find(([k]) => /time|date|时|日/.test(k.toLowerCase()))?.[1];
                    const loc = Object.entries(attrs).find(([k]) => /loc|place|地|位/.test(k.toLowerCase()))?.[1];
                    const weather = Object.entries(attrs).find(([k]) => /weather|候|天/.test(k.toLowerCase()))?.[1];
                    
                    return (
                      <>
                        {time && (
                          <span className="text-[7px] font-mono font-medium uppercase tracking-tighter mb-0.5" style={{ color: 'var(--echo-header-secondary)' }}>
                            {String(time)}
                          </span>
                        )}
                        {(loc || weather) && (
                          <span className="text-[7px] font-mono font-medium uppercase tracking-tighter" style={{ color: 'var(--echo-header-secondary)' }}>
                            {loc ? String(loc) : ''} {weather ? ` // ${String(weather)}` : ''}
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {lastTokenCount > 0 && (
                <span className={`text-[7px] md:text-[8px] font-mono tracking-widest uppercase ${tokenColorClass} md:mt-0.5 opacity-60`}>
                  [ {lastTokenCount >= 1000 ? (lastTokenCount / 1000).toFixed(1) + 'k' : lastTokenCount} / {maxContextTokens >= 1000 ? (maxContextTokens / 1000).toFixed(0) + 'k' : maxContextTokens} ctx ]
                </span>
              )}
            </div>
          </motion.div>
        </div>

        <div className="flex gap-6 items-center">
           <MusicPlayer />
           <motion.button 
              whileHover={{ scale: 1.1 }} 
              whileTap={{ scale: 0.9 }} 
              onClick={(e) => { e.stopPropagation(); setCurrentView('config'); }} 
              className="no-tap-css w-5 h-5 flex flex-col items-center justify-center gap-1 cursor-pointer group pointer-events-auto"
           >
              <div className="w-4 h-[1px] bg-gray-400 dark:bg-gray-600 group-hover:bg-gray-600 dark:group-hover:bg-gray-400 transition-colors" />
              <div className="w-4 h-[1px] bg-gray-400 dark:bg-gray-600 group-hover:bg-gray-600 dark:group-hover:bg-gray-400 transition-colors" />
              <div className="w-4 h-[1px] bg-gray-400 dark:bg-gray-600 group-hover:bg-gray-600 dark:group-hover:bg-gray-400 transition-colors" />
           </motion.button>
        </div>
      </div>
    </header>
  )
}

export default Header

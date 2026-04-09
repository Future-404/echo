import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'
import MusicPlayer from './MusicPlayer'
import { Clock, MapPin, Cloud } from 'lucide-react'

const Header: React.FC = () => {
  const { 
    isLoading, selectedCharacter, setIsConfigOpen, setCurrentView,
    lastTokenCount, maxContextTokens 
  } = useAppStore()
  const attrs = selectedCharacter.attributes || {}

  // 计算 Token 百比分与颜色
  const tokenUsagePercent = maxContextTokens > 0 ? (lastTokenCount / maxContextTokens) * 100 : 0
  const tokenColorClass = tokenUsagePercent > 95 ? 'text-red-500' : tokenUsagePercent > 80 ? 'text-orange-400' : 'text-gray-400 dark:text-gray-500'

  return (
    <header className="echo-header-container sticky top-0 z-50 pointer-events-none bg-echo-base/60 dark:bg-black/60 backdrop-blur-md border-b border-black/5 dark:border-white/5">
      {/* iOS 状态栏占位层 */}
      <div className="h-[var(--sat)] w-full" />
      
      {/* 实际内容层：固定 16 高度 */}
      <div className="h-16 flex items-center justify-between px-6 md:px-10 pointer-events-auto">
        <div className="flex items-center gap-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: isLoading ? 0 : 1 }} className="flex items-center gap-4">
          {/* 隐藏式返回主菜单按钮 */}
          <div className="relative group">
            <button
              onClick={() => setCurrentView('home')}
              className="text-[9px] md:text-[10px] tracking-[0.4em] text-gray-400 dark:text-gray-500 uppercase hover:text-gray-700 dark:hover:text-gray-400 transition-colors duration-300 pointer-events-auto"
            >
              ECHO
            </button>
            {/* hover 提示 */}
            <div className="absolute top-full left-0 mt-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap">
              <span className="text-[8px] tracking-[0.2em] font-mono text-gray-400 dark:text-gray-500 uppercase bg-white/80 dark:bg-black/80 px-2 py-1 rounded backdrop-blur-sm border border-gray-200 dark:border-white/10">
                ← 主菜单
              </span>
            </div>
          </div>

          <div className="w-[1px] h-3 bg-gray-200 dark:bg-gray-800" />
          <div className="flex flex-col md:flex-row md:items-center md:gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[9px] md:text-[10px] tracking-[0.4em] text-gray-400 dark:text-gray-600 italic uppercase">{selectedCharacter.name}</span>
              
              {/* 双轨解析模式快速切换 */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const modes: any[] = ['vn', 'markdown', 'plain'];
                    const currentIdx = modes.indexOf(selectedCharacter.bodyEngine || 'vn');
                    const nextMode = modes[(currentIdx + 1) % modes.length];
                    useAppStore.getState().updateCharacter(selectedCharacter.id, { bodyEngine: nextMode });
                  }}
                  className="px-1.5 py-0.5 rounded-l-md border border-gray-200 dark:border-white/5 text-[7px] font-mono uppercase bg-blue-500/5 text-blue-500/70 hover:bg-blue-500/10 transition-colors"
                  title="正文解析引擎 (VN/MD/RAW)"
                >
                  B:{selectedCharacter.bodyEngine || 'vn'}
                </button>
                <button
                  onClick={() => {
                    const modes: any[] = ['xml', 'html', 'st-card', 'none'];
                    const currentIdx = modes.indexOf(selectedCharacter.widgetEngine || 'xml');
                    const nextMode = modes[(currentIdx + 1) % modes.length];
                    useAppStore.getState().updateCharacter(selectedCharacter.id, { widgetEngine: nextMode });
                  }}
                  className="px-1.5 py-0.5 rounded-r-md border-y border-r border-gray-200 dark:border-white/5 text-[7px] font-mono uppercase bg-orange-500/5 text-orange-500/70 hover:bg-orange-500/10 transition-colors"
                  title="组件扩展引擎 (XML/HTML/ST/OFF)"
                >
                  W:{selectedCharacter.widgetEngine || 'xml'}
                </button>
              </div>
            </div>

            {lastTokenCount > 0 && (
              <span className={`text-[7px] md:text-[8px] font-mono tracking-widest uppercase ${tokenColorClass} md:mt-0.5`}>
                [ {lastTokenCount >= 1000 ? (lastTokenCount / 1000).toFixed(1) + 'k' : lastTokenCount} / {maxContextTokens >= 1000 ? (maxContextTokens / 1000).toFixed(0) + 'k' : maxContextTokens} ctx ]
              </span>
            )}
          </div>
        </motion.div>

        {/* 通用环境信息自动识别展示 */}
        <AnimatePresence>
          {!isLoading && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }} 
              className="hidden md:flex items-center gap-4 ml-4"
            >
              {Object.entries(attrs).map(([key, val]) => {
                const k = key.toLowerCase();
                const v = String(val);
                
                // 启发式识别：长度短且属于环境类关键词
                const isEnv = /time|date|loc|place|weather|时|日|天|地|位|候/.test(k);
                const isShort = v.length < 20;
                
                if (!isEnv || !isShort) return null;

                // 自动匹配图标
                let Icon = Clock;
                if (/loc|place|地|位/.test(k)) Icon = MapPin;
                if (/weather|候|天/.test(k)) Icon = Cloud;

                return (
                  <div key={key} className="flex items-center gap-1.5 text-[9px] font-mono text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    <Icon size={12} className="opacity-50" /> {v}
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
        </div>

      <div className="flex gap-6 items-center">
         <MusicPlayer />
         <motion.button 
            whileHover={{ scale: 1.1 }} 
            whileTap={{ scale: 0.9 }} 
            onClick={(e) => { e.stopPropagation(); setIsConfigOpen(true); }} 
            className="no-tap-css w-5 h-5 border-0.5 border-gray-300 dark:border-gray-700 rounded-full flex items-center justify-center cursor-pointer hover:border-gray-500 dark:hover:border-gray-400 transition-colors pointer-events-auto"
         >
            <div className="w-1 h-1 bg-gray-400 dark:bg-gray-600 rounded-full" />
         </motion.button>
      </div>
    </div>
  </header>
  )
}

export default Header

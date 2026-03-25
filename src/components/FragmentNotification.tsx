import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'
import { Sparkles } from 'lucide-react'

const FragmentNotification: React.FC = () => {
  const { fragments } = useAppStore()
  const [activeFragment, setActiveFragment] = useState<string | null>(null)

  // 监听碎片数量变化，显示最新产生的一个
  useEffect(() => {
    if (fragments.length > 0) {
      const latest = fragments[fragments.length - 1]
      setActiveFragment(latest)
      
      const timer = setTimeout(() => {
        setActiveFragment(null)
      }, 5000) // 显示5秒后自动消失
      
      return () => clearTimeout(timer)
    }
  }, [fragments.length])

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] pointer-events-none w-full max-w-xs px-6">
      <AnimatePresence>
        {activeFragment && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
            className="glass-morphism p-5 rounded-[2rem] flex flex-col items-center gap-3 shadow-xl border-white/40 dark:border-white/10"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center">
                <Sparkles size={12} className="text-gray-400 dark:text-gray-300 animate-pulse" />
              </div>
              <span className="text-[8px] tracking-[0.4em] text-gray-400 dark:text-gray-500 uppercase font-sans font-medium">
                Neural Fragment Retreived
              </span>
            </div>
            
            <div className="w-8 h-[0.5px] bg-gray-200 dark:bg-gray-800" />
            
            <p className="text-xs text-gray-500 dark:text-gray-300 font-serif italic text-center leading-relaxed px-2">
              “ {activeFragment} ”
            </p>
            
            <div className="text-[7px] text-gray-300 dark:text-gray-600 tracking-widest uppercase mt-1">
              Synchronized to Archive
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default FragmentNotification

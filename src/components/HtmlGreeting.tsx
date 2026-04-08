import React from 'react'
import { motion } from 'framer-motion'
import { MessageCircle } from 'lucide-react'
import { IframeBlock } from './Dialogue/IframeBlock'

interface HtmlGreetingProps {
  content: string
  onEnter: () => void
}

export const HtmlGreeting: React.FC<HtmlGreetingProps> = ({ content, onEnter }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1001] bg-black overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 沉浸式全屏渲染区域 */}
      <div className="w-full h-full">
        <IframeBlock html={content} isFullScreen={true} />
      </div>
        
      {/* 入场按钮：悬浮在最上方 */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.2, type: 'spring' }}
        onClick={(e) => { e.stopPropagation(); onEnter(); }}
        className="fixed bottom-10 left-1/2 -translate-x-1/2 px-8 py-3 rounded-full backdrop-blur-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white shadow-2xl flex items-center gap-3 transition-all duration-300 hover:scale-105 z-[1002] group"
      >
        <span className="text-xs tracking-[0.3em] uppercase font-light text-white/80 group-hover:text-white">进入系统 // Initiate</span>
        <MessageCircle size={18} strokeWidth={1.5} className="text-blue-400" />
      </motion.button>

      {/* 顶部装饰性暗角，确保按钮和内容层级感 */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
    </motion.div>
  )
}

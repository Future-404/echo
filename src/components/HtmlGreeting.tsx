import React from 'react'
import { motion } from 'framer-motion'
import { MessageCircle } from 'lucide-react'

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
      className="fixed inset-0 z-50 bg-black/95 overflow-y-auto"
    >
      <div className="min-h-screen flex items-center justify-center p-4 py-20">
        <div className="max-w-4xl w-full">
          <div dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      </div>
        
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5 }}
        onClick={onEnter}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full backdrop-blur-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110"
      >
        <MessageCircle size={24} strokeWidth={1.5} />
      </motion.button>
    </motion.div>
  )
}

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { MessageCircle } from 'lucide-react'
import DOMPurify from 'dompurify'

interface HtmlGreetingProps {
  content: string
  onEnter: () => void
}

export const HtmlGreeting: React.FC<HtmlGreetingProps> = ({ content, onEnter }) => {
  const cleanHtml = useMemo(() => DOMPurify.sanitize(content, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target'] // Allow links to open in new tabs if specified
  }), [content])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1001] bg-black/95 overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="min-h-screen flex items-center justify-center p-4 py-20 pointer-events-none">
        <div className="max-w-4xl w-full pointer-events-auto">
          <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />
        </div>
      </div>
        
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5 }}
        onClick={(e) => { e.stopPropagation(); onEnter(); }}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full backdrop-blur-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 z-[1002]"
      >
        <MessageCircle size={24} strokeWidth={1.5} />
      </motion.button>
    </motion.div>
  )
}

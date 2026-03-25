import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'

interface ChatInputProps {
  onSend: (content: string) => void
  disabled?: boolean
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const { isLoading } = useAppStore()
  const [userInput, setUserInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 自动调整高度
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [userInput])

  const handleSend = () => {
    if (userInput.trim() && !disabled) {
      onSend(userInput.trim())
      setUserInput('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Shift + Enter 换行，仅 Enter 发送 (用户要求：回车换行，发送按钮发送)
    // 但通常习惯是 Enter 发送，Shift+Enter 换行。
    // 如果用户明确要求 "回车改成换行"，则我们不做 Enter 发送逻辑。
    if (e.key === 'Enter' && e.shiftKey && !disabled) {
      e.preventDefault()
      handleSend()
    }
  }

  if (isLoading) return null

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ delay: 0.8 }} 
      onClick={(e) => e.stopPropagation()}
      className="w-full flex flex-col gap-2"
    >
      <div className="flex items-start gap-4 px-6 md:px-10">
        <span className="text-gray-300 dark:text-gray-600 text-[10px] font-serif italic tracking-widest uppercase shrink-0 mt-2">
          User // 
        </span>
        <div className="flex-1 relative group">
          <textarea 
            ref={textareaRef}
            rows={1}
            value={userInput} 
            onChange={(e) => setUserInput(e.target.value)} 
            onKeyDown={handleKeyDown}
            placeholder="Type your thought..." 
            className="w-full bg-transparent border-b-0.5 border-gray-200 dark:border-gray-800 py-1 pr-12 text-sm text-gray-500 dark:text-gray-400 focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 transition-all placeholder:text-gray-200 dark:placeholder:text-gray-800 placeholder:italic resize-none overflow-y-auto no-scrollbar min-h-[32px] max-h-[200px]" 
          />
          
          <AnimatePresence>
            {userInput.trim() && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, y: '-50%' }}
                animate={{ opacity: 1, scale: 1, y: '-50%' }}
                exit={{ opacity: 0, scale: 0.8, y: '-50%' }}
                onClick={handleSend}
                disabled={disabled}
                className="absolute right-0 top-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors disabled:opacity-30"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 12 7-7 7 7"/>
                  <path d="M12 19V5"/>
                </svg>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      <div className="px-6 md:px-10 flex justify-end">
        <span className="text-[9px] text-gray-300 dark:text-gray-700 italic tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
          Shift+Enter to fast send //
        </span>
      </div>
    </motion.div>
  )
}

export default ChatInput

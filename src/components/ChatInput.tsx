import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'
import { imageDb } from '../utils/imageDb'

interface ChatInputProps {
  onSend: (content: string) => void
  disabled?: boolean
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const { isLoading, config } = useAppStore()
  const [userInput, setUserInput] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const activePersona = config.personas?.find(p => p.id === config.activePersonaId) || config.personas?.[0]

  // 加载 persona 头像
  useEffect(() => {
    if (!activePersona?.avatarId) { setAvatarUrl(null); return }
    imageDb.get(activePersona.avatarId).then(url => setAvatarUrl(url))
  }, [activePersona?.id, activePersona?.avatarId])

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
      <div className="flex items-start gap-3 px-6 md:px-10">
        {/* Persona 头像 / 文字标签 */}
        <div className="shrink-0 mt-1.5">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={activePersona?.name}
              className="w-6 h-6 rounded-full object-cover border-0.5 border-gray-200 dark:border-white/10 opacity-70"
            />
          ) : (
            <span className="text-gray-300 dark:text-gray-600 text-[10px] font-serif italic tracking-widest uppercase">
              {activePersona?.name || 'User'} //
            </span>
          )}
        </div>

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

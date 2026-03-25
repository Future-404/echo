import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'

interface ChatInputProps {
  onSend: (content: string) => void
  disabled?: boolean
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const { isLoading } = useAppStore()
  const [userInput, setUserInput] = useState('')

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !disabled) {
      onSend(userInput)
      setUserInput('')
    }
  }

  if (isLoading) return null

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ delay: 0.8 }} 
      onClick={(e) => e.stopPropagation()}
      className="w-full max-w-2xl flex items-center gap-4 px-6 md:px-10"
    >
      <span className="text-gray-300 dark:text-gray-600 text-[10px] font-serif italic tracking-widest uppercase shrink-0">User // </span>
      <input 
        type="text" 
        value={userInput} 
        onChange={(e) => setUserInput(e.target.value)} 
        onKeyDown={handleKeyDown}
        placeholder="Type your thought..." 
        className="flex-1 bg-transparent border-b-0.5 border-gray-200 dark:border-gray-800 py-1 text-sm text-gray-500 dark:text-gray-400 focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 transition-colors placeholder:text-gray-200 dark:placeholder:text-gray-800 placeholder:italic" 
      />
    </motion.div>
  )
}

export default ChatInput

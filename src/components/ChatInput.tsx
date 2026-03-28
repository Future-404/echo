import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'
import { imageDb } from '../utils/imageDb'
import { Image as ImageIcon, X } from 'lucide-react'

interface ChatInputProps {
  onSend: (content: string, images?: string[]) => void
  disabled?: boolean
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const { isLoading, config } = useAppStore()
  const [userInput, setUserInput] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [attachedImages, setAttachedImages] = useState<string[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    if ((userInput.trim() || attachedImages.length > 0) && !disabled) {
      onSend(userInput.trim(), attachedImages.length > 0 ? attachedImages : undefined)
      setUserInput('')
      setAttachedImages([])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !disabled) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64 = event.target?.result as string
        if (base64) {
          setAttachedImages(prev => [...prev, base64].slice(0, 4)) // 最多 4 张图
        }
      }
      reader.readAsDataURL(file)
    })
    
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index))
  }

  if (isLoading) return null

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ delay: 0.8 }} 
      onClick={(e) => e.stopPropagation()}
      className="w-full flex flex-col gap-2 relative"
    >
      {/* 附件预览区 */}
      <AnimatePresence>
        {attachedImages.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="flex gap-2 px-6 md:px-10 mb-2 overflow-x-auto no-scrollbar"
          >
            {attachedImages.map((img, idx) => (
              <div key={idx} className="relative w-16 h-16 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex-shrink-0 group">
                <img src={img} alt={`attachment-${idx}`} className="w-full h-full object-cover" />
                <button 
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 p-0.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-start gap-3 px-6 md:px-10">
        <div className="shrink-0 mt-1.5 flex items-center gap-2">
          {avatarUrl ? (
            <img src={avatarUrl} alt={activePersona?.name} className="w-6 h-6 rounded-full object-cover border-0.5 border-gray-200 dark:border-white/10 opacity-70" />
          ) : (
            <span className="text-gray-300 dark:text-gray-600 text-[10px] font-serif italic tracking-widest uppercase">
              {activePersona?.name || 'User'} //
            </span>
          )}
        </div>

        <div className="flex-1 relative group flex items-end">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            multiple 
            onChange={handleFileChange} 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors mr-2 mb-0.5"
            disabled={disabled || attachedImages.length >= 4}
          >
            <ImageIcon size={16} strokeWidth={1.5} />
          </button>

          <textarea 
            ref={textareaRef}
            rows={1}
            value={userInput} 
            onChange={(e) => setUserInput(e.target.value)} 
            onKeyDown={handleKeyDown}
            placeholder={attachedImages.length > 0 ? "Describe the image(s)..." : "Type your thought..."} 
            className="w-full bg-transparent border-b-0.5 border-gray-200 dark:border-gray-800 py-1 pr-10 text-sm text-gray-500 dark:text-gray-400 focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 transition-all placeholder:text-gray-300 dark:placeholder:text-gray-700 placeholder:italic resize-none overflow-y-auto no-scrollbar min-h-[32px] max-h-[200px]" 
          />
          
          <AnimatePresence>
            {(userInput.trim() || attachedImages.length > 0) && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={handleSend}
                disabled={disabled}
                className="absolute right-0 bottom-1 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors disabled:opacity-30"
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
          Enter to send, Shift+Enter for newline //
        </span>
      </div>
    </motion.div>
  )
}

export default ChatInput

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'
import { Image as ImageIcon, X, Square } from 'lucide-react'

interface ChatInputProps {
  onSend: (content: string, images?: string[]) => void
  disabled?: boolean
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const { isLoading, config, isTyping, stopGeneration } = useAppStore()
  const [userInput, setUserInput] = useState('')
  const [attachedImages, setAttachedImages] = useState<string[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          const MAX_SIZE = 1024 // 限制最大边长为 1024px

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width
              width = MAX_SIZE
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height
              height = MAX_SIZE
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', 0.8)) // 使用 JPEG 压缩并设置质量为 0.8
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    for (const file of files) {
      try {
        const resizedBase64 = await resizeImage(file)
        setAttachedImages(prev => [...prev, resizedBase64].slice(0, 4))
      } catch (err) {
        console.error('Failed to resize image:', err)
      }
    }
    
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
      className="echo-input-container w-full flex flex-col gap-2 relative"
    >
      {/* 附件预览区 */}
      <AnimatePresence>
        {attachedImages.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="echo-input-attachments flex gap-2 px-6 md:px-10 mb-2 overflow-x-auto no-scrollbar"
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

      <div className="echo-input-inner flex items-start gap-3 px-6 md:px-10">
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
            className="echo-input-textarea w-full bg-transparent border-b-0.5 border-gray-200 dark:border-gray-800 py-1 pr-10 text-sm text-gray-500 dark:text-gray-400 focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-700 placeholder:italic resize-none overflow-y-auto no-scrollbar min-h-[32px] max-h-[200px]" 
          />
          
          <AnimatePresence mode="wait">
            {isTyping ? (
              <motion.button
                key="stop-btn"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={stopGeneration}
                className="absolute right-0 bottom-1 p-1.5 text-red-400 hover:text-red-500 transition-colors"
                title="终止生成"
              >
                <Square size={16} fill="currentColor" strokeWidth={0} />
              </motion.button>
            ) : (userInput.trim() || attachedImages.length > 0) && (
              <motion.button
                key="send-btn"
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
      
      <div className="echo-input-hint px-6 md:px-10 flex justify-end">
        <span className="text-[9px] text-gray-400 dark:text-gray-700 italic tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
          Enter to send, Shift+Enter for newline //
        </span>
      </div>
    </motion.div>
  )
}

export default ChatInput


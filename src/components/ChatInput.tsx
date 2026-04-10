import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'
import { Image as ImageIcon, X, Square } from 'lucide-react'
import { readFileAsDataURL } from '../utils/fileUtils'

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

  const resizeImage = async (file: File): Promise<string> => {
    const dataUrl = await readFileAsDataURL(file)
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        const MAX_SIZE = 1024

        if (width > height) {
          if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE }
        } else {
          if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE }
        }

        canvas.width = width
        canvas.height = height
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.src = dataUrl
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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ delay: 0.8 }} 
      onClick={(e) => e.stopPropagation()}
      className="echo-input-container w-full flex flex-col gap-2 relative group/input"
    >
      {/* 附件预览区 */}
      <AnimatePresence>
        {attachedImages.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0, marginBottom: 0 }} 
            animate={{ opacity: 1, height: 'auto', marginBottom: 8 }} 
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="echo-input-attachments flex gap-3 px-6 md:px-10 overflow-x-auto no-scrollbar py-1"
          >
            {attachedImages.map((img, idx) => (
              <motion.div 
                layout
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                key={idx} 
                className="relative w-16 h-16 rounded-2xl border-0.5 border-black/10 dark:border-white/10 overflow-hidden flex-shrink-0 group/img shadow-sm"
              >
                <img src={img} alt={`attachment-${idx}`} className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110" />
                <button 
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover/img:opacity-100 transition-all hover:bg-red-500 scale-75 group-hover/img:scale-100"
                >
                  <X size={10} />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="echo-input-inner flex items-end gap-2 px-6 md:px-10">
        <div 
          className="flex-1 relative flex items-end px-4 py-2 transition-all duration-300 shadow-sm border focus-within:shadow-[0_0_20px_rgba(59,130,246,0.05)]"
          style={{ 
            borderRadius: 'var(--echo-input-radius, 2rem)',
            backgroundColor: 'var(--echo-input-bg)',
            borderColor: 'var(--echo-input-border)',
            // 聚焦状态通过类名辅助，但颜色来源于变量
          }}
        >
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
            className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors mb-0.5 flex-shrink-0"
            disabled={disabled || attachedImages.length >= 4}
          >
            <ImageIcon size={18} strokeWidth={1.5} />
          </button>

          <textarea 
            ref={textareaRef}
            rows={1}
            value={userInput} 
            onChange={(e) => setUserInput(e.target.value)} 
            onKeyDown={handleKeyDown}
            placeholder={attachedImages.length > 0 ? "Describe the image(s)..." : "Type your thought..."} 
            className="echo-input-textarea flex-1 bg-transparent border-none py-1.5 px-1 text-sm text-echo-text-base focus:outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 placeholder:italic resize-none overflow-y-auto no-scrollbar min-h-[32px] max-h-[200px]" 
          />
          
          <div className="flex items-center mb-0.5 ml-1">
            <AnimatePresence mode="wait">
              {isTyping ? (
                <motion.button
                  key="stop-btn"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={stopGeneration}
                  className="p-2 hover:bg-red-500/10 rounded-full transition-all"
                  style={{ color: 'var(--echo-stop-btn-text, #ef4444)' }}
                  title="终止生成"
                >
                  <Square size={14} fill="currentColor" strokeWidth={0} />
                </motion.button>
              ) : (userInput.trim() || attachedImages.length > 0) ? (
                <motion.button
                  key="send-btn"
                  initial={{ opacity: 0, scale: 0.8, x: 5 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 5 }}
                  onClick={handleSend}
                  disabled={disabled}
                  className="p-2 rounded-full shadow-lg shadow-blue-500/20 hover:brightness-110 transition-all disabled:opacity-30 flex items-center justify-center"
                  style={{ 
                    backgroundColor: 'var(--echo-send-btn-bg, #3b82f6)',
                    color: 'var(--echo-send-btn-text, #ffffff)'
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12 7-7 7 7"/>
                    <path d="M12 19V5"/>
                  </svg>
                </motion.button>
              ) : (
                <div key="placeholder" className="w-8 h-8" />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      
      <div className="echo-input-hint px-10 flex justify-between items-center mt-1">
        <div className="flex gap-1">
          {attachedImages.length > 0 && (
             <span className="text-[8px] text-blue-500/60 font-mono uppercase tracking-tighter">
               {attachedImages.length}/4 Images
             </span>
          )}
        </div>
        <span className="text-[8px] text-gray-400 dark:text-gray-700 italic tracking-tighter opacity-0 group-hover/input:opacity-100 transition-opacity">
          Shift+Enter for newline // Cmd+Enter to send
        </span>
      </div>
    </motion.div>
  )
}

export default ChatInput


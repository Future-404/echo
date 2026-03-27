import React, { useRef, useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MoreHorizontal, Copy, RotateCcw, RotateCw, Maximize2, Minimize2 } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import MessageContent from './Dialogue/MessageContent'
import { useDevice } from '../hooks/useMediaQuery'
import { useDialog } from './GlobalDialog'

interface DialogueBoxProps {
  displayText: string
  isTyping: boolean
  onCanAdvanceChange?: (canAdvance: boolean) => void
  onRetry?: (content: string) => void
  onSkipGreeting?: () => void
  isKeyboardVisible?: boolean
}

const DialogueBox: React.FC<DialogueBoxProps> = ({ displayText, isTyping, onCanAdvanceChange, onRetry, onSkipGreeting, isKeyboardVisible = false }) => {
  const { 
    messages, selectedCharacter, config, isLoading,
    setCurrentView, rollbackMessages, secondaryCharacter,
    isDialogueFullscreen, setDialogueFullscreen
  } = useAppStore()
  const { confirm } = useDialog()
  const { isMobile, isTouchDevice } = useDevice()

  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeMenuIndex, setActiveMenuIndex] = useState<number | null>(null)
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const pressTimer = useRef<any>(null)

  const activePersona = config.personas.find(p => p.id === config.activePersonaId) || config.personas[0]

  const lastAssistantMsg = useMemo(() =>
    [...messages].reverse().find(m => m.role === 'assistant'), [messages])

  const visibleMessages = useMemo(() =>
    messages.filter(m => m.role === 'assistant' || m.role === 'user'), [messages])

  const lastMessage = visibleMessages[visibleMessages.length - 1] ?? null
  const isLastAi = lastMessage?.role === 'assistant'

  // 通知父组件 canAdvance 始终为 false（单一模式无翻页）
  useEffect(() => { onCanAdvanceChange?.(false) }, [])

  // 新消息时滚动到底部
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior })
  }

  useEffect(() => { scrollToBottom() }, [messages.length, displayText])

  const handleRollback = (index: number) => {
    rollbackMessages(index, true)
    setActiveIdx(null)
    setActiveMenuIndex(null)
  }

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
    setActiveMenuIndex(null)
  }

  const handleRetry = async (index: number, msg: any) => {
    const confirmed = await confirm('之后的对话记录将被永久删除并覆盖当前存档！', {
      title: '确定要重试吗？',
      confirmText: '重试',
      danger: true,
    })
    if (!confirmed) return

    if (msg.role === 'user') {
      const targetIndex = index - 1
      rollbackMessages(targetIndex < 0 ? -1 : targetIndex, false)
      if (onRetry) setTimeout(() => onRetry(msg.content), 150)
    } else {
      let lastUserIndex = index - 1
      while (lastUserIndex >= 0 && messages[lastUserIndex].role !== 'user') lastUserIndex--
      if (lastUserIndex >= 0) {
        const userContent = messages[lastUserIndex].content
        const targetIndex = lastUserIndex - 1
        rollbackMessages(targetIndex < 0 ? -1 : targetIndex, false)
        if (onRetry) setTimeout(() => onRetry(userContent), 150)
      }
    }
    setActiveMenuIndex(null)
  }

  const handlePointerDown = (idx: number) => {
    const delay = isMobile ? 300 : 500
    pressTimer.current = setTimeout(() => {
      setActiveIdx(idx)
      if (window.navigator.vibrate) window.navigator.vibrate(50)
    }, delay)
  }

  const handlePointerUpOrCancel = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }

  const getStatusLight = () => {
    const isError = lastMessage?.role === 'assistant' && lastMessage.content.startsWith('错误')
    if (isError) return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse'
    if (isTyping) return 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)] animate-pulse'
    return 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]'
  }

  const getCharForMsg = (msg: any) => {
    if (!secondaryCharacter || !msg.speakerId) return selectedCharacter
    return msg.speakerId === secondaryCharacter.id ? secondaryCharacter : selectedCharacter
  }

  return (
    <motion.div
      initial={false}
      animate={{ y: isLoading ? 50 : 0, opacity: isLoading ? 0 : 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`relative w-[95%] h-full ${isMobile ? 'max-w-full' : 'max-w-4xl'} glass-morphism ${isMobile ? 'rounded-2xl' : 'rounded-3xl'} shadow-lg flex flex-col overflow-hidden select-text z-30 mx-auto safe-area-padding`}
      onClick={() => setActiveMenuIndex(null)}
    >
      {/* 顶部状态条 */}
      <div className="flex-shrink-0 z-40 border-b border-gray-300/10 dark:border-white/5 bg-echo-base/90 dark:bg-black/90 backdrop-blur-xl" onClick={e => e.stopPropagation()}>
        <div className={`flex justify-between items-center ${isMobile ? 'px-4 py-2' : 'px-6 py-1.5'} min-h-[44px]`}>
          <span className="text-[9px] tracking-widest text-gray-400 uppercase font-serif">{selectedCharacter.name}</span>
          <div className={`flex ${isMobile ? 'gap-2' : 'gap-3'}`}>
            {[
              { label: isDialogueFullscreen ? <Minimize2 size={12}/> : <Maximize2 size={12}/>, action: () => setDialogueFullscreen(!isDialogueFullscreen) },
              { label: '存档', action: () => setCurrentView('save') },
              { label: '读档', action: () => setCurrentView('load') },
            ].map((btn, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); btn.action() }}
                className={`${isMobile ? 'text-[10px] min-w-[44px] min-h-[44px] -my-2 px-2' : 'text-[9px]'} font-serif tracking-widest text-gray-500 dark:text-gray-400 hover:text-blue-500 active:scale-95 transition-all uppercase touch-manipulation flex items-center`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 消息列表 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-6"
        onClick={e => e.stopPropagation()}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {visibleMessages.length === 0 ? (
          <div className="text-gray-400 dark:text-gray-500 font-serif leading-relaxed italic text-center mt-8" style={{ fontSize: 'var(--app-font-size, 1.125rem)' }}>
            " 我是 {selectedCharacter.name}，很高兴见到你。 "
          </div>
        ) : (
          <div className="space-y-6 pb-4">
            {messages.map((msg, idx) => {
              if (msg.role === 'system' || msg.role === 'tool') return null
              const isAi = msg.role === 'assistant'
              const isLatest = idx === messages.length - 1
              const showMenu = activeMenuIndex === idx
              const charForMsg = isAi ? getCharForMsg(msg) : null

              return (
                <div
                  key={idx}
                  className={`flex gap-3 group relative ${isAi ? 'items-start' : 'items-end flex-row-reverse'}`}
                  onPointerDown={() => handlePointerDown(idx)}
                  onPointerUp={handlePointerUpOrCancel}
                  onPointerCancel={handlePointerUpOrCancel}
                  onPointerLeave={handlePointerUpOrCancel}
                >
                  {/* 头像 */}
                  {isAi && charForMsg && (
                    <img
                      src={charForMsg.image}
                      alt={charForMsg.name}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-white/20 dark:border-white/10 mt-1"
                    />
                  )}

                  <div className={`flex flex-col gap-1 ${isAi ? 'items-start' : 'items-end'} flex-1 min-w-0`}>
                    {/* 名字 + 操作按钮 */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] tracking-widest text-gray-500 dark:text-white/40 uppercase font-serif">
                        {isAi ? (charForMsg?.name ?? selectedCharacter.name) : (activePersona?.name || 'You')}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveMenuIndex(showMenu ? null : idx) }}
                        className={`${isMobile ? 'p-2 min-w-[44px] min-h-[44px]' : 'p-1'} text-gray-400 ${isTouchDevice ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} hover:text-black dark:hover:text-white transition-all touch-manipulation`}
                      >
                        <MoreHorizontal size={isMobile ? 16 : 14} />
                      </button>

                      <AnimatePresence>
                        {showMenu && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="absolute left-10 top-0 flex items-center gap-1 bg-white/90 dark:bg-black/90 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-full px-2 py-1 shadow-lg z-20"
                          >
                            <button onClick={(e) => { e.stopPropagation(); handleCopy(msg.content) }} className={`${isMobile ? 'p-2.5' : 'p-1.5'} text-gray-500 hover:text-blue-500 transition-all`} title="复制">
                              <Copy size={isMobile ? 14 : 12} />
                            </button>
                            {!isLatest && (
                              <button onClick={(e) => { e.stopPropagation(); handleRollback(idx) }} className={`${isMobile ? 'p-2.5' : 'p-1.5'} text-gray-500 hover:text-orange-500 transition-all`} title="回溯">
                                <RotateCcw size={isMobile ? 14 : 12} />
                              </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); handleRetry(idx, msg) }} className={`${isMobile ? 'p-2.5' : 'p-1.5'} text-gray-500 hover:text-red-500 transition-all`} title="重试">
                              <RotateCw size={isMobile ? 14 : 12} />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* 消息内容 */}
                    <div className={`${isAi ? '' : 'text-right'}`}>
                      {isAi && isLatest && isTyping ? (
                        <div className="font-serif leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap" style={{ fontSize: 'var(--app-font-size, 1.125rem)' }}>
                          {displayText}
                        </div>
                      ) : isAi && msg.content.startsWith('错误') ? (
                        <span className="text-red-500 dark:text-red-400 text-sm">{msg.content}</span>
                      ) : (
                        <MessageContent content={msg.content} isAi={isAi} isGreeting={idx === 0 && isAi} isLatest={isLatest} />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 状态指示灯 */}
      <div className={`absolute ${isMobile ? 'bottom-3 right-4' : 'bottom-4 right-6'} pointer-events-none`}>
        <div className={`${isMobile ? 'w-2 h-2' : 'w-1.5 h-1.5'} rounded-full transition-all duration-500 ${getStatusLight()}`} />
      </div>
    </motion.div>
  )
}

export default DialogueBox

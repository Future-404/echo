import React, { useRef, useEffect, useState, useMemo, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MoreHorizontal, Copy, RotateCcw, RotateCw, Maximize2, Minimize2, Volume2 } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import MessageContent from './Dialogue/MessageContent'
import { useDevice } from '../hooks/useMediaQuery'
import { useDialog } from './GlobalDialog'
import { ttsService } from '../utils/ttsService'

// 单条消息 memo 化，只有 content/isLatest/isTyping 变化时才重渲染
const MessageRow = memo<{
  msg: any; idx: number; isAi: boolean; isLatest: boolean;
  isTyping: boolean; displayText: string;
  charForMsg: any; activePersona: any;
  isMobile: boolean; isTouchDevice: boolean;
  showMenu: boolean; distanceFromEnd: number;
  ttsSettings: any;
  onMenuToggle: (idx: number) => void;
  onCopy: (content: string) => void;
  onRollback: (idx: number) => void;
  onRetry: (idx: number, msg: any) => void;
  onSpeak: (text: string, charId?: string) => void;
}>(({ msg, idx, isAi, isLatest, isTyping, displayText, charForMsg, activePersona, isMobile, isTouchDevice, showMenu, distanceFromEnd, ttsSettings, onMenuToggle, onCopy, onRollback, onRetry, onSpeak }) => (
  <div className={`flex gap-3 group relative ${isAi ? 'items-start' : 'items-end flex-row-reverse'}`}>
    {isAi && charForMsg && (
      <img src={charForMsg.image} alt={charForMsg.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-white/20 dark:border-white/10 mt-1" />
    )}
    <div className={`flex flex-col gap-1 ${isAi ? 'items-start' : 'items-end'} flex-1 min-w-0`}>
      <div className="flex items-center gap-2">
        <span className="text-[10px] tracking-widest text-gray-500 dark:text-white/40 uppercase font-serif">
          {isAi ? (charForMsg?.name ?? '') : (activePersona?.name || 'You')}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onMenuToggle(idx) }}
          className={`${isMobile ? 'p-2 min-w-[44px] min-h-[44px]' : 'p-1'} text-gray-400 ${isTouchDevice ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} hover:text-black dark:hover:text-white transition-all touch-manipulation`}
        >
          <MoreHorizontal size={isMobile ? 16 : 14} />
        </button>
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="absolute left-10 top-0 flex items-center gap-1 bg-white/90 dark:bg-black/90 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-full px-2 py-1 shadow-lg z-20"
            >
              <button onClick={(e) => { e.stopPropagation(); onCopy(msg.content) }} className={`${isMobile ? 'p-2.5' : 'p-1.5'} text-gray-500 hover:text-blue-500 transition-all`}><Copy size={isMobile ? 14 : 12} /></button>
              {ttsSettings.enabled && <button onClick={(e) => { e.stopPropagation(); onSpeak(msg.content, msg.speakerId) }} className={`${isMobile ? 'p-2.5' : 'p-1.5'} text-gray-500 hover:text-purple-500 transition-all`}><Volume2 size={isMobile ? 14 : 12} /></button>}
              {!isLatest && <button onClick={(e) => { e.stopPropagation(); onRollback(idx) }} className={`${isMobile ? 'p-2.5' : 'p-1.5'} text-gray-500 hover:text-orange-500 transition-all`}><RotateCcw size={isMobile ? 14 : 12} /></button>}
              <button onClick={(e) => { e.stopPropagation(); onRetry(idx, msg) }} className={`${isMobile ? 'p-2.5' : 'p-1.5'} text-gray-500 hover:text-red-500 transition-all`}><RotateCw size={isMobile ? 14 : 12} /></button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className={`${isAi ? '' : 'text-right'}`}>
        {isAi && isLatest && isTyping ? (
          <div className="font-serif leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap" style={{ fontSize: 'var(--app-font-size, 1.125rem)' }}>{displayText}</div>
        ) : isAi && msg.content.startsWith('错误') ? (
          <span className="text-red-500 dark:text-red-400 text-sm">{msg.content}</span>
        ) : (
          <MessageContent content={msg.content} isAi={isAi} isLatest={isLatest} renderDepth={distanceFromEnd <= 3 ? 0 : distanceFromEnd} images={msg.images} />
        )}
      </div>
    </div>
  </div>
));

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
    isDialogueFullscreen, setDialogueFullscreen,
    ttsSettings
  } = useAppStore()
  const { confirm } = useDialog()
  const { isMobile, isTouchDevice } = useDevice()

  // ... (rest of implementation)

  const handleSpeak = (text: string, charId?: string) => {
    const voiceId = charId ? ttsSettings.voiceMap[charId] : undefined
    ttsService.speak(text, ttsSettings, voiceId)
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
      {/* ... */}
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
              const distanceFromEnd = messages.length - 1 - idx
              const charForMsg = isAi ? getCharForMsg(msg) : null

              return (
                <div
                  key={idx}
                  onPointerDown={() => handlePointerDown(idx)}
                  onPointerUp={handlePointerUpOrCancel}
                  onPointerCancel={handlePointerUpOrCancel}
                  onPointerLeave={handlePointerUpOrCancel}
                >
                  <MessageRow
                    msg={msg} idx={idx} isAi={isAi} isLatest={isLatest}
                    isTyping={isTyping} displayText={displayText}
                    charForMsg={charForMsg} activePersona={activePersona}
                    isMobile={isMobile} isTouchDevice={isTouchDevice}
                    showMenu={activeMenuIndex === idx}
                    distanceFromEnd={distanceFromEnd}
                    ttsSettings={ttsSettings}
                    onMenuToggle={(i) => setActiveMenuIndex(activeMenuIndex === i ? null : i)}
                    onCopy={handleCopy}
                    onRollback={handleRollback}
                    onRetry={handleRetry}
                    onSpeak={handleSpeak}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
...

      {/* 状态指示灯 */}
      <div className={`absolute ${isMobile ? 'bottom-3 right-4' : 'bottom-4 right-6'} pointer-events-none`}>
        <div className={`${isMobile ? 'w-2 h-2' : 'w-1.5 h-1.5'} rounded-full transition-all duration-500 ${getStatusLight()}`} />
      </div>
    </motion.div>
  )
}

export default DialogueBox

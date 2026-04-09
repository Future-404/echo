import React, { useRef, useEffect, useState, useMemo, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MoreHorizontal, Copy, RotateCw, Maximize2, Minimize2, Volume2, VolumeX, GitBranch, User as UserIcon } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import MessageContent from './Dialogue/MessageContent'
import { useDevice } from '../hooks/useMediaQuery'
import { useDialog } from './GlobalDialog'
import { ttsService } from '../utils/ttsService'
import { imageDb } from '../utils/imageDb'

// 对等的消息行组件
const MessageRow = memo<{
  msg: any; idx: number; isAi: boolean; isLatest: boolean;
  isTyping: boolean; displayText: string;
  charForMsg: any; activePersona: any;
  userAvatarUrl: string | null;
  isMobile: boolean; isTouchDevice: boolean;
  showMenu: boolean; distanceFromEnd: number;
  ttsSettings: any;
  activeAudioId: string | null;
  onMenuToggle: (idx: number) => void;
  onCopy: (content: string) => void;
  onRetry: (idx: number, msg: any) => void;
  onSpeak: (text: string, charId?: string, msgId?: string) => void;
  onStopAudio: () => void;
  onBranch: (idx: number) => void;
}>(({ msg, idx, isAi, isLatest, isTyping, displayText, charForMsg, activePersona, userAvatarUrl, isMobile, isTouchDevice, showMenu, distanceFromEnd, ttsSettings, activeAudioId, onMenuToggle, onCopy, onRetry, onSpeak, onStopAudio, onBranch }) => {
  const avatar = isAi ? charForMsg?.image : userAvatarUrl;
  const name = isAi ? (charForMsg?.name ?? '') : (activePersona?.name || 'You');
  const isPlaying = activeAudioId === msg.content;

  return (
    <div className={`echo-message-row ${isAi ? 'echo-message-row-ai' : 'echo-message-row-user'} flex gap-2 group relative w-full ${isAi ? 'flex-row' : 'flex-row-reverse'}`}>
      {/* 头像部分 - 左右对等 */}
      <div className="echo-message-avatar flex-shrink-0 mt-1">
        {avatar ? (
          <img src={avatar} alt={name} className="w-9 h-9 rounded-full object-cover border border-black/10 dark:border-white/10 shadow-sm" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center border border-black/5 dark:border-white/5">
            <UserIcon size={16} className="text-gray-400" />
          </div>
        )}
      </div>

      {/* 内容区域 - 左右对等留白 */}
      <div className={`echo-message-content flex flex-col gap-1 flex-1 min-w-0 ${isAi ? 'items-start' : 'items-end'}`}>
        <div className={`flex items-center gap-2 ${isAi ? 'flex-row' : 'flex-row-reverse'}`}>
          <span className="text-[10px] tracking-widest text-gray-500 dark:text-white/40 uppercase font-serif">
            {name}
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
                initial={{ opacity: 0, scale: 0.9, x: isAi ? -10 : 10 }} 
                animate={{ opacity: 1, scale: 1, x: 0 }} 
                exit={{ opacity: 0, scale: 0.9 }}
                className={`absolute top-0 flex items-center gap-1 bg-white/95 dark:bg-black/95 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-full px-2 py-1 shadow-lg z-20 ${isAi ? 'left-10' : 'right-10'}`}
              >
                <button onClick={(e) => { e.stopPropagation(); onCopy(msg.content) }} title="复制内容" className={`${isMobile ? 'p-2.5' : 'p-1.5'} text-gray-500 hover:text-blue-500 transition-all`}><Copy size={isMobile ? 14 : 12} /></button>
                {ttsSettings.enabled && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); isPlaying ? onStopAudio() : onSpeak(msg.content, msg.speakerId, msg.content) }} 
                    title={isPlaying ? "停止播放" : "播放语音"} 
                    className={`${isMobile ? 'p-2.5' : 'p-1.5'} ${isPlaying ? 'text-purple-500 animate-pulse' : 'text-gray-500'} hover:text-purple-500 transition-all`}
                  >
                    {isPlaying ? <VolumeX size={isMobile ? 14 : 12} /> : <Volume2 size={isMobile ? 14 : 12} />}
                  </button>
                )}
                {!isLatest && <button onClick={(e) => { e.stopPropagation(); onBranch(idx) }} title="存档并跳转到此" className={`${isMobile ? 'p-2.5' : 'p-1.5'} text-gray-500 hover:text-emerald-500 transition-all`}><GitBranch size={isMobile ? 14 : 12} /></button>}
                <button onClick={(e) => { e.stopPropagation(); onRetry(idx, msg) }} title="重试/修改" className={`${isMobile ? 'p-2.5' : 'p-1.5'} text-gray-500 hover:text-red-500 transition-all`}><RotateCw size={isMobile ? 14 : 12} /></button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className={`echo-message-bubble max-w-full`}>
          {isAi && isLatest && isTyping ? (
            <div className="font-serif leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-left" style={{ fontSize: 'var(--app-font-size, 1.125rem)' }}>{displayText}</div>
          ) : isAi && msg.content.startsWith('错误') ? (
            <span className="text-red-500 dark:text-red-400 text-sm text-left block w-full">{msg.content}</span>
          ) : (
            <MessageContent content={msg.content} isAi={isAi} isLatest={isLatest} renderDepth={distanceFromEnd <= 3 ? 0 : distanceFromEnd} images={msg.images} />
          )}
        </div>
      </div>
      {/* 对侧占位，与头像等宽，保持左右对称留白 */}
      <div className="flex-shrink-0 w-9" />
    </div>
  );
});

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
    ttsSettings, branchGame, hasMoreOlder, fetchOlderMessages,
    loadInitialMessages, currentAutoSlotId, activeAudioId
  } = useAppStore()
  const { confirm, prompt } = useDialog()
  const { isMobile, isTouchDevice } = useDevice()

  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeMenuIndex, setActiveMenuIndex] = useState<number | null>(null)
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const pressTimer = useRef<any>(null)
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const activePersona = config.personas?.find(p => p.id === config.activePersonaId) || config.personas?.[0]

  // 初始化加载：如果没有消息且有存档 ID，尝试加载 initial
  useEffect(() => {
    if (currentAutoSlotId && messages.length === 0) {
      loadInitialMessages(currentAutoSlotId);
    }
  }, [currentAutoSlotId]);

  const handleLoadMore = async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    
    // 记录加载前的滚动高度
    const oldHeight = scrollRef.current?.scrollHeight || 0;
    const oldTop = scrollRef.current?.scrollTop || 0;

    await fetchOlderMessages();
    
    // 关键：恢复滚动位置，防止跳动
    setTimeout(() => {
      if (scrollRef.current) {
        const newHeight = scrollRef.current.scrollHeight;
        scrollRef.current.scrollTop = (newHeight - oldHeight) + oldTop;
      }
      setIsLoadingMore(false);
    }, 50);
  };

  // 使用系统原生的 imageDb 加载 Persona 头像
  useEffect(() => {
    if (!activePersona?.avatarId) { setUserAvatarUrl(null); return }
    imageDb.get(activePersona.avatarId).then(url => setUserAvatarUrl(url))
  }, [activePersona?.id, activePersona?.avatarId])

  // 过滤掉没有内容且是工具调用的消息，保持对话框纯净
  const visibleMessages = useMemo(() =>
    messages.filter(m => {
      const isSystem = m.role === 'system'
      const isTool = m.role === 'tool'
      const isPureToolCall = m.role === 'assistant' && m.tool_calls && !m.content?.trim()
      return !isSystem && !isTool && !isPureToolCall
    }), [messages])

  const lastMessage = visibleMessages[visibleMessages.length - 1] ?? null

  useEffect(() => { onCanAdvanceChange?.(false) }, [])

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (isLoadingMore) return; // 手动加载历史时，不要滚到底部
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior })
  }

  useEffect(() => { 
    if (!isLoadingMore) scrollToBottom();
  }, [messages.length, displayText])

  const handleBranch = async (msg: any) => {
    const branchName = await prompt('请输入分支存档的名称', {
      title: '创建分支存档',
      defaultValue: `分支 - ${new Date().toLocaleString()}`,
      placeholder: '分支 1',
    })
    if (branchName === null) return
    
    // 找到该消息在当前内存窗口中的位置
    const msgIdx = messages.findIndex(m => (m as any).timestamp === msg.timestamp)
    if (msgIdx === -1) return

    const truncatedMessages = messages.slice(0, msgIdx + 1)
    await branchGame(truncatedMessages, branchName)
    await rollbackMessages(msg.id, true)
    useAppStore.getState().addFragment(`已切换至分支：${branchName}`)
    setActiveMenuIndex(null)
  }

  const handleCopy = (content: string) => {
    const textToCopy = content.trim();
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(textToCopy)
        .then(() => useAppStore.getState().addFragment('已复制到剪贴板'))
        .catch(() => fallbackCopy(textToCopy));
    } else {
      fallbackCopy(textToCopy);
    }
    setActiveMenuIndex(null)
  }

  const fallbackCopy = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      useAppStore.getState().addFragment('已复制到剪贴板');
    } catch (err) {}
    document.body.removeChild(textArea);
  }

  const handleRetry = async (msg: any) => {
    const confirmed = await confirm('确认后，该消息之后的所有记录将被永久删除。', {
      title: '确认重试对话？',
      confirmText: '确认重试',
      danger: true,
    })
    if (!confirmed) return
    
    if (msg.role === 'user') {
      // 用户消息重试：删除该消息本身及之后的所有内容
      const allMsgs = await db.messages.where('slotId').equals(currentAutoSlotId || '').sortBy('timestamp');
      const targetIdx = allMsgs.findIndex(m => m.id === msg.id);
      const prevMsg = targetIdx > 0 ? allMsgs[targetIdx - 1] : undefined;
      
      await rollbackMessages(prevMsg?.id, false)
      if (onRetry) setTimeout(() => onRetry(msg.content), 150)
    } else {
      // AI 回复重试：找到该回复之前的最后一条用户消息
      const allMsgs = await db.messages.where('slotId').equals(currentAutoSlotId || '').sortBy('timestamp');
      let userMsgIdx = allMsgs.findIndex(m => m.id === msg.id) - 1;
      while (userMsgIdx >= 0 && allMsgs[userMsgIdx].role !== 'user') userMsgIdx--;
      
      if (userMsgIdx >= 0) {
        const userMsg = allMsgs[userMsgIdx];
        const userContent = userMsg.content;
        const prevToUser = userMsgIdx > 0 ? allMsgs[userMsgIdx - 1] : undefined;
        await rollbackMessages(prevToUser?.id, false)
        if (onRetry) setTimeout(() => onRetry(userContent), 150)
      }
    }
    setActiveMenuIndex(null)
  }

  const handlePointerDown = (idx: number) => {
    pressTimer.current = setTimeout(() => {
      setActiveIdx(idx)
      if (window.navigator.vibrate) window.navigator.vibrate(50)
    }, isMobile ? 300 : 500)
  }

  const handlePointerUpOrCancel = () => { if (pressTimer.current) clearTimeout(pressTimer.current) }

  const handleSpeak = (text: string, charId?: string, msgId?: string) => {
    const voiceId = charId ? ttsSettings.voiceMap[charId] : undefined
    ttsService.speak(text, ttsSettings, voiceId, msgId)
    setActiveMenuIndex(null)
  }

  const handleStopAudio = () => {
    ttsService.stop()
    setActiveMenuIndex(null)
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
      className={`echo-dialogue-container relative h-full ${isMobile ? 'max-w-full' : 'max-w-4xl'} glass-morphism ${isMobile ? 'rounded-2xl' : 'rounded-3xl'} shadow-lg flex flex-col overflow-hidden select-text z-30 mx-auto safe-area-padding`}
      onClick={() => setActiveMenuIndex(null)}
    >
      {/* 恢复原来的状态条布局 */}
      <div className="echo-dialogue-toolbar flex-shrink-0 z-40 border-b border-gray-300/10 dark:border-white/5 bg-echo-base/90 dark:bg-black/90 backdrop-blur-xl" onClick={e => e.stopPropagation()}>
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

      {/* 消息列表 - 优化留白平衡 */}
      <div
        ref={scrollRef}
        className="echo-message-list flex-1 overflow-y-auto no-scrollbar px-2 py-4 md:px-4"
        onClick={e => { e.stopPropagation(); setActiveMenuIndex(null) }}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {visibleMessages.length === 0 ? (
          <div className="text-gray-400 dark:text-gray-500 font-serif leading-relaxed italic text-center mt-8" style={{ fontSize: 'var(--app-font-size, 1.125rem)' }}>
            " 我是 {selectedCharacter.name}，很高兴见到你。 "
          </div>
        ) : (
          <div className="space-y-8 pb-4">
            {/* 真分页历史加载按钮 */}
            {hasMoreOlder && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="text-[10px] tracking-[0.2em] uppercase font-mono text-gray-400 hover:text-blue-500 transition-all flex items-center gap-2 py-4"
                >
                  {isLoadingMore ? (
                    <span className="animate-pulse">Loading Chronology...</span>
                  ) : (
                    <>
                      <RotateCw size={10} className="opacity-50" />
                      Retrieve Older Context
                    </>
                  )}
                </button>
              </div>
            )}
            
            {visibleMessages.map((msg, idx) => {
              const isAi = msg.role === 'assistant'
              const isLatest = idx === visibleMessages.length - 1
              const distanceFromEnd = visibleMessages.length - 1 - idx
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
                    userAvatarUrl={userAvatarUrl}
                    isMobile={isMobile} isTouchDevice={isTouchDevice}
                    showMenu={activeMenuIndex === idx}
                    distanceFromEnd={distanceFromEnd}
                    ttsSettings={ttsSettings}
                    activeAudioId={activeAudioId}
                    onMenuToggle={(i) => setActiveMenuIndex(activeMenuIndex === i ? null : i)}
                    onCopy={handleCopy}
                    onRetry={() => handleRetry(msg)}
                    onSpeak={handleSpeak}
                    onStopAudio={handleStopAudio}
                    onBranch={() => handleBranch(msg)}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className={`absolute ${isMobile ? 'bottom-3 right-4' : 'bottom-4 right-6'} pointer-events-none`}>
        <div className={`${isMobile ? 'w-2 h-2' : 'w-1.5 h-1.5'} rounded-full transition-all duration-500 ${getStatusLight()}`} />
      </div>
    </motion.div>
  )
}

export default DialogueBox

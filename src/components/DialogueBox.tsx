import React, { useRef, useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Maximize2, Minimize2, MoreHorizontal, Copy, RotateCcw, RotateCw, User } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import MessageContent from './Dialogue/MessageContent'
import { parseStreamingNovelText } from '../utils/novelParser'
import { MissionPanel } from './Dialogue/MissionPanel'
import { StatusPanel } from './Dialogue/StatusPanel'
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
    setCurrentView, missions, rollbackMessages,
    isHistoryExpanded, setIsHistoryExpanded, secondaryCharacter
  } = useAppStore()
  const { confirm } = useDialog()
  const { isMobile, isTouchDevice } = useDevice()
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const [visibleIndex, setVisibleIndex] = useState(0)
  const [isStatusExpanded, setIsStatusExpanded] = useState(false)
  const [activeMenuIndex, setActiveMenuIndex] = useState<number | null>(null)
  const [statusPanelHeight, setStatusPanelHeight] = useState(0)
  const [stateBeforeKeyboard, setStateBeforeKeyboard] = useState<boolean>(false)

  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const pressTimer = useRef<any>(null);
  const statusPanelRef = useRef<HTMLDivElement>(null)

  // 键盘弹出时记住状态并强制回到默认
  useEffect(() => {
    if (isKeyboardVisible) {
      // 记住当前状态
      setStateBeforeKeyboard(isHistoryExpanded)
      // 强制回到默认状态
      if (isHistoryExpanded) {
        setIsHistoryExpanded(false)
      }
    } else {
      // 键盘收起，恢复之前的状态
      if (stateBeforeKeyboard) {
        setIsHistoryExpanded(true)
      }
    }
  }, [isKeyboardVisible])

  const isQuestSkillEnabled = config?.enabledSkillIds?.includes('manage_quest_state');
  const activePersona = config.personas.find(p => p.id === config.activePersonaId) || config.personas[0];
  const userName = activePersona?.name || 'Observer';

  // 状态栏方案C：跟随最后一条 assistant 消息的发言者
  const lastAssistantMsg = useMemo(() =>
    [...messages].reverse().find(m => m.role === 'assistant'),
    [messages]
  )
  const statusCharacter = useMemo(() => {
    if (!secondaryCharacter || !lastAssistantMsg?.speakerId) return selectedCharacter
    if (lastAssistantMsg.speakerId === secondaryCharacter.id) return secondaryCharacter
    return selectedCharacter
  }, [lastAssistantMsg, selectedCharacter, secondaryCharacter])

  // 获取最后一条可见消息（排除 tool 和 system 角色）
  const visibleMessages = useMemo(() => 
    messages.filter(m => m.role === 'assistant' || m.role === 'user'),
    [messages]
  );
  const lastMessage = visibleMessages.length > 0 ? visibleMessages[visibleMessages.length - 1] : null;
  const isLastAi = lastMessage?.role === 'assistant';
  const showContent = (isLastAi && isTyping) ? displayText : (lastMessage?.content || '');

  // 流式过程中不解析分段（避免每帧重跑解析器），只在完成后解析
  // 流式时 parts 固定为单段，直接显示 displayText
  const parts = useMemo(() => {
    if (!showContent) return [];
    if (isTyping && isLastAi) return [{ id: 'streaming', type: 'narration' as const, content: showContent }];
    return parseStreamingNovelText(showContent);
  }, [showContent]);

  // 当展开/收起状态变化时的特殊处理
  useEffect(() => {
    if (isHistoryExpanded) {
      requestAnimationFrame(() => scrollToBottom('auto'));
    } else {
      const currentParts = parseStreamingNovelText(lastMessage?.content || '');
      if (currentParts.length > 0) setVisibleIndex(currentParts.length - 1);
    }
  }, [isHistoryExpanded]);

  // 当有新消息开始（打字开始或消息数组长度变化）时，重置 VN 进度
  const prevMessagesLength = useRef(messages.length);
  const prevIsTyping = useRef(isTyping);

  useEffect(() => {
    const isNewMessage = messages.length > prevMessagesLength.current;
    const isNewGeneration = isTyping && !prevIsTyping.current;
    const justFinished = !isTyping && prevIsTyping.current;

    if (!isHistoryExpanded) {
      if (isNewMessage || isNewGeneration) {
        setVisibleIndex(0);
      } else if (justFinished) {
        // 流式完成后，重新解析并跳到最后一段
        const finalParts = parseStreamingNovelText(lastMessage?.content || '');
        setVisibleIndex(finalParts.length > 0 ? finalParts.length - 1 : 0);
      }
    }

    prevMessagesLength.current = messages.length;
    prevIsTyping.current = isTyping;
  }, [messages.length, isTyping, isHistoryExpanded, parts.length])

  // 始终保持滚动到底部的能力
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior })
    }
  }
  
  useEffect(() => { 
    // 翻页时使用 auto 确保即时性，历史记录模式（及初始加载）使用 smooth
    scrollToBottom(isHistoryExpanded ? 'smooth' : 'auto') 
  }, [visibleIndex, displayText, isHistoryExpanded, messages.length])

  // 判断是否可以点击下一句/上一句 (仅在非全屏模式下有效)
  const canAdvance = !isHistoryExpanded && parts.length > 0 && visibleIndex < parts.length - 1;
  const canGoBack = !isHistoryExpanded && visibleIndex > 0;

  useEffect(() => {
    if (onCanAdvanceChange) {
      onCanAdvanceChange(canAdvance);
    }
  }, [canAdvance, onCanAdvanceChange]);

  const handleAdvance = () => {
    if (canAdvance) {
      setVisibleIndex(prev => prev + 1);
    }
  };

  const handleGoBack = () => {
    if (canGoBack) {
      setVisibleIndex(prev => prev - 1);
    }
  };

  const handleBoxClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isHistoryExpanded) {
      setActiveMenuIndex(null);
      return;
    }

    // 开场白打字机进行中：点击任意位置跳过
    if (isTyping && messages.length === 1 && onSkipGreeting) {
      onSkipGreeting();
      return;
    }

    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isRightHalf = clickX > rect.width / 2;

    if (isRightHalf) {
      handleAdvance();
    } else {
      handleGoBack();
    }
  };

  // 回溯逻辑 (分支) — 直接执行，rollbackMessages 会自动创建分支存档
  const handleRollback = (index: number) => {
    rollbackMessages(index, true);
    setActiveIdx(null);
    setActiveMenuIndex(null);
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    setActiveMenuIndex(null);
  };

  // 重试逻辑 (覆盖)
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
    if (!isHistoryExpanded) return;
    const delay = isMobile ? 300 : 500; // 移动端更快触发
    pressTimer.current = setTimeout(() => {
      setActiveIdx(idx);
      if (window.navigator.vibrate) window.navigator.vibrate(50);
    }, delay);
  };

  const handlePointerUpOrCancel = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  // Quick Menu Buttons
  const vnMenu = [
    { label: isHistoryExpanded ? '缩小' : '展开', icon: isHistoryExpanded ? <Minimize2 size={12}/> : <Maximize2 size={12}/>, action: () => setIsHistoryExpanded(!isHistoryExpanded) },
    { label: '状态', icon: <User size={12}/>, action: () => setIsStatusExpanded(!isStatusExpanded) },
    { label: '存档', action: () => setCurrentView('save') },
    { label: '读档', action: () => setCurrentView('load') }
  ];

  // 动态计算当前这一句的名字栏显示什么
  const currentPart = parts[visibleIndex];
  let displayName = '';
  let showNamePlate = true;
  // 多角色模式下，根据 speakerId 确定当前发言角色
  const currentSpeakerChar = useMemo(() => {
    if (!secondaryCharacter || !lastMessage?.speakerId) return selectedCharacter
    if (lastMessage.speakerId === secondaryCharacter.id) return secondaryCharacter
    return selectedCharacter
  }, [lastMessage, selectedCharacter, secondaryCharacter])
  const isCharB = secondaryCharacter && lastMessage?.speakerId === secondaryCharacter.id

  if (!lastMessage) {
    displayName = '系统';
  } else if (!isLastAi) {
    displayName = config.personas.find(p => p.id === config.activePersonaId)?.name || 'You';
  } else {
    if (currentPart?.type === 'dialogue') {
      displayName = currentPart.speaker || currentSpeakerChar.name;
    } else if (currentPart?.type === 'thought') {
      displayName = currentSpeakerChar.name;
    } else if (currentPart?.type === 'narration' || currentPart?.type === 'action') {
      showNamePlate = false;
    } else {
      displayName = currentSpeakerChar.name;
    }
  }

  // 计算呼吸灯状态
  const getStatusLight = () => {
    const isError = lastMessage?.role === 'assistant' && lastMessage.content.startsWith('错误');
    if (isError) return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse';
    if (isTyping) return 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)] animate-pulse';
    if (canAdvance) return 'bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)] animate-pulse';
    return 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]';
  };

  // 计算对话框固定高度
  const dialogueBoxHeight = useMemo(() => {
    let baseHeight = isMobile ? 280 : 320
    
    // 如果键盘弹出且是移动端，进一步缩小对话框高度以留出更多打字空间
    if (isKeyboardVisible && isMobile) {
      baseHeight = 180
    }
    
    return baseHeight
  }, [isMobile, isKeyboardVisible])

  const renderMessageContent = (msg: any, isAi: boolean, isLatest: boolean, segmentIndex?: number) => {
    const isError = isAi && msg.content.startsWith('错误');
    if (isError) {
      return (
        <div className="flex flex-col items-start gap-2">
          <span className="text-red-500 dark:text-red-400 font-normal text-sm md:text-base">
            {msg.content}
          </span>
        </div>
      );
    }
    return <MessageContent content={msg.content} isAi={isAi} segmentIndex={segmentIndex} />;
  };

  return (
    <motion.div 
      initial={false}
      animate={{ 
        y: isLoading ? 50 : 0,
        opacity: isLoading ? 0 : 1,
      }} 
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{ 
        height: isHistoryExpanded ? `${dialogueBoxHeight * 2.5}px` : `${dialogueBoxHeight}px`,
        touchAction: isHistoryExpanded ? 'pan-y' : 'none'
      }}
      className={`relative w-[95%] ${isMobile ? 'max-w-full' : 'max-w-4xl'} glass-morphism ${isMobile ? 'rounded-2xl' : 'rounded-3xl'} shadow-lg flex flex-col overflow-hidden select-text z-30 mx-auto safe-area-padding transition-all duration-300 ${isHistoryExpanded ? 'cursor-auto' : 'cursor-pointer'}`}
      onClick={handleBoxClick}
    >
      {/* 顶部状态条 & 任务集成栏 */}
      <div ref={statusPanelRef} className="flex-shrink-0 z-40 flex flex-col border-b border-gray-300/10 dark:border-white/5 bg-echo-base/90 dark:bg-black/90 backdrop-blur-xl safe-area-top" onClick={e => e.stopPropagation()}>
        
        <StatusPanel character={statusCharacter} userName={userName} isExpanded={isStatusExpanded} isMobile={isMobile} />
        {/* 任务主栏 */}
        <MissionPanel missions={missions} isQuestSkillEnabled={isQuestSkillEnabled} isMobile={isMobile} />
        <div className={`flex justify-between items-center ${isMobile ? 'px-4 py-2' : 'px-6 md:px-8 py-1.5'} min-h-[44px]`}>
          {/* 名字栏：多角色模式加头像和颜色 */}
          {showNamePlate && displayName ? (
            <div className="flex items-center gap-2">
              {isLastAi && secondaryCharacter && (
                <img
                  src={currentSpeakerChar.image}
                  alt={currentSpeakerChar.name}
                  className="w-5 h-5 rounded-full object-cover opacity-80 border-0.5 border-white/20"
                />
              )}
              <span className={`${isMobile ? 'text-xs' : 'text-xs'} tracking-[0.1em] font-serif font-bold ${
                isLastAi && secondaryCharacter ? '' : 'text-black dark:text-white opacity-80'
              }`} style={isLastAi && secondaryCharacter ? { color: isCharB ? 'var(--char-b-color, #c084fc)' : 'var(--char-a-color, #60a5fa)' } : undefined}>
                {displayName}
              </span>
            </div>
          ) : (
            <span />
          )}
          
          <div className={`flex ${isMobile ? 'gap-2' : 'gap-3'}`}>
            {vnMenu.map(btn => (
              <button 
                key={btn.label}
                onClick={(e) => { e.stopPropagation(); btn.action(); }}
                className={`flex items-center gap-1 ${isMobile ? 'text-[10px] min-w-[44px] min-h-[44px] -my-2 px-2' : 'text-[9px] md:text-[10px]'} font-serif tracking-widest text-gray-500 dark:text-gray-400 hover:text-blue-500 active:scale-95 transition-all font-medium uppercase touch-manipulation`}
              >
                {btn.icon}{btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* 对话内容区 - 固定高度，内部滚动 */}
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-6 relative"
        onClick={e => isHistoryExpanded && e.stopPropagation()}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {!isHistoryExpanded ? (
          <AnimatePresence>
            <motion.div
              key={`${messages.length}-${visibleIndex}`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              {messages.length === 0 ? (
                <div className="text-gray-400 dark:text-gray-500 font-serif leading-relaxed italic" style={{ fontSize: 'var(--app-font-size, 1.125rem)' }}>
                  “ 我是 {selectedCharacter.name}，很高兴见到你。 ”
                </div>
              ) : isTyping && isLastAi ? (
                <div className="font-serif leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap" style={{ fontSize: 'var(--app-font-size, 1.125rem)' }}>
                  {displayText}
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
                    className="inline-block w-[2px] h-[1em] bg-gray-400 dark:bg-gray-500 ml-0.5 align-middle"
                  />
                </div>
              ) : (
                <div className={`font-serif leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap`} style={{ fontSize: 'var(--app-font-size, 1.125rem)' }}>
                  {parts[visibleIndex]?.content || lastMessage?.content}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="space-y-8 pb-4">
            {messages.map((msg, idx) => {
              if (msg.role === 'system' || msg.role === 'tool') return null;
              const isAi = msg.role === 'assistant';
              const isLatest = idx === messages.length - 1;
              const isActive = activeIdx === idx;
              const showMenu = activeMenuIndex === idx;

              return (
                <div 
                  key={idx} 
                  className={`flex flex-col group relative ${!isAi ? 'items-end' : 'items-start'} transition-all ${isActive ? 'scale-[1.01] opacity-100' : ''}`}
                  onPointerDown={() => handlePointerDown(idx)}
                  onPointerUp={handlePointerUpOrCancel}
                  onPointerCancel={handlePointerUpOrCancel}
                  onPointerLeave={handlePointerUpOrCancel}
                >
                  <div className="flex items-center gap-4 mb-2 relative">
                    <span className="text-[10px] tracking-widest text-gray-500 dark:text-white/40 uppercase font-serif">
                      {isAi ? selectedCharacter.name : 'You'}
                    </span>
                    
                    {/* Action Menu Toggle Button */}
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setActiveMenuIndex(showMenu ? null : idx); 
                      }}
                      className={`${isMobile ? 'p-3 min-w-[44px] min-h-[44px]' : 'p-2'} -m-1 text-gray-400 ${isTouchDevice ? 'opacity-100' : 'md:opacity-0 md:group-hover:opacity-100'} hover:text-black dark:hover:text-white transition-all z-10 touch-manipulation`}
                    >
                      <MoreHorizontal size={isMobile ? 18 : 16} />
                    </button>

                    {/* Expandable Action Menu */}
                    <AnimatePresence>
                      {showMenu && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9, x: !isAi ? 10 : -10 }}
                          animate={{ opacity: 1, scale: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.9, x: !isAi ? 10 : -10 }}
                          className={`absolute ${isMobile ? 'top-full mt-2' : 'top-0'} ${!isAi ? (isMobile ? 'right-0' : 'right-full mr-2') : (isMobile ? 'left-0' : 'left-full ml-2')} flex items-center gap-1 bg-white/90 dark:bg-black/90 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-full ${isMobile ? 'px-3 py-2' : 'px-2 py-1'} shadow-lg z-20`}
                        >
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleCopy(msg.content); }}
                            className={`${isMobile ? 'p-2.5 min-w-[44px] min-h-[44px]' : 'p-1.5'} text-gray-500 hover:text-blue-500 active:scale-90 transition-all touch-manipulation`}
                            title="复制"
                          >
                            <Copy size={isMobile ? 16 : 12} />
                          </button>
                          
                          {!isLatest && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleRollback(idx); }}
                              className={`${isMobile ? 'p-2.5 min-w-[44px] min-h-[44px]' : 'p-1.5'} text-gray-500 hover:text-orange-500 active:scale-90 transition-all touch-manipulation`}
                              title="回溯到此"
                            >
                              <RotateCcw size={isMobile ? 16 : 12} />
                            </button>
                          )}

                          <button 
                            onClick={(e) => { e.stopPropagation(); handleRetry(idx, msg); }}
                            className={`${isMobile ? 'p-2.5 min-w-[44px] min-h-[44px]' : 'p-1.5'} text-gray-500 hover:text-red-500 active:scale-90 transition-all touch-manipulation`}
                            title="重试此分支"
                          >
                            <RotateCw size={isMobile ? 16 : 12} />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  {renderMessageContent(
                    { content: (isAi && isLatest && isTyping) ? displayText : msg.content },
                    isAi,
                    isLatest
                  )}
                  </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 状态指示灯 & 点击提示 */}
      <div className={`absolute ${isMobile ? 'bottom-3 right-4' : 'bottom-4 right-6'} flex items-center gap-3 pointer-events-none safe-area-bottom`}>
        {canAdvance && !isMobile && (
          <motion.div animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="text-gray-400 dark:text-gray-500 text-xs">▼</motion.div>
        )}
        <div className={`${isMobile ? 'w-2 h-2' : 'w-1.5 h-1.5'} rounded-full transition-all duration-500 ${getStatusLight()}`} />
      </div>
    </motion.div>
  )
}

export default DialogueBox

import React, { useRef, useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, CircleDot, CheckCircle2, XCircle, Maximize2, Minimize2, MoreHorizontal, Copy, RotateCcw, RotateCw, Heart, Star, Zap, User, Target, BookOpen, Calendar, Settings2 } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import MessageContent from './Dialogue/MessageContent'
import { parseStreamingNovelText } from '../utils/novelParser'

import { useDialog } from './GlobalDialog'

interface DialogueBoxProps {
  displayText: string
  isTyping: boolean
  onCanAdvanceChange?: (canAdvance: boolean) => void
  onRetry?: (content: string) => void
  onSkipGreeting?: () => void
}

const DialogueBox: React.FC<DialogueBoxProps> = ({ displayText, isTyping, onCanAdvanceChange, onRetry, onSkipGreeting }) => {
  const { 
    messages, selectedCharacter, config, isLoading, 
    setCurrentView, missions, rollbackMessages,
    isHistoryExpanded, setIsHistoryExpanded 
  } = useAppStore()
  const { confirm } = useDialog()
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const [visibleIndex, setVisibleIndex] = useState(0)
  const [isMissionsExpanded, setIsMissionsExpanded] = useState(false)
  const [isStatusExpanded, setIsStatusExpanded] = useState(false)
  const [showDescriptionId, setShowDescriptionId] = useState<string | null>(null)
  const [activeMenuIndex, setActiveMenuIndex] = useState<number | null>(null)

  // 移动端长按回溯逻辑
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const pressTimer = useRef<any>(null);

  // 状态显示逻辑映射 (通用翻译)
  const getStatConfig = (key: string) => {
    const k = key.toLowerCase();
    const mapping: Record<string, { label: string; icon: any; color: string }> = {
      love: { label: '爱意', icon: <Heart size={10} />, color: '#f43f5e' },
      hate: { label: '恨意', icon: <Zap size={10} />, color: '#9333ea' },
      value: { label: '满意', icon: <Star size={10} />, color: '#fbbf24' },
      hp: { label: '健康', icon: <Heart size={10} />, color: '#ef4444' },
      mana: { label: '灵感', icon: <Zap size={10} />, color: '#3b82f6' },
      favor: { label: '好感', icon: <Heart size={10} />, color: '#fb7185' },
    };
    return mapping[k] || { label: key, icon: <CircleDot size={10} />, color: '#94a3b8' };
  };

  const attributes = selectedCharacter.attributes || {};
  // 自动识别数值型属性 (进度条渲染候选)
  const autoStats = Object.entries(attributes)
    .filter(([_, v]) => !isNaN(parseFloat(v as string)) && String(v).length < 10)
    .slice(0, 6); 

  const hasVisibleStats = Object.keys(attributes).length > 0;

  // 任务逻辑
  const isQuestSkillEnabled = config?.enabledSkillIds?.includes('manage_quest_state')
  const mainMission = missions?.find(m => m.type === 'MAIN')
  const sideMissions = missions?.filter(m => m.type === 'SIDE') || []

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
    scrollToBottom(isHistoryExpanded ? 'auto' : 'smooth') 
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
    pressTimer.current = setTimeout(() => {
      setActiveIdx(idx);
      if (window.navigator.vibrate) window.navigator.vibrate(50);
    }, 500);
  };

  const handlePointerUpOrCancel = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  // Quick Menu Buttons
  const vnMenu = [
    { label: isHistoryExpanded ? '缩小' : '展开', icon: isHistoryExpanded ? <Minimize2 size={12}/> : <Maximize2 size={12}/>, action: () => setIsHistoryExpanded(!isHistoryExpanded) },
    { label: '状态', icon: <User size={12}/>, action: () => { setIsStatusExpanded(!isStatusExpanded); setIsMissionsExpanded(false); } },
    { label: '存档', action: () => setCurrentView('save') },
    { label: '读档', action: () => setCurrentView('load') }
  ];

  // 动态计算当前这一句的名字栏显示什么
  const currentPart = parts[visibleIndex];
  let displayName = '';
  let showNamePlate = true;

  if (!lastMessage) {
    displayName = '系统';
  } else if (!isLastAi) {
    displayName = config.personas.find(p => p.id === config.activePersonaId)?.name || 'You';
  } else {
    if (currentPart?.type === 'dialogue') {
      displayName = currentPart.speaker || selectedCharacter.name;
    } else if (currentPart?.type === 'thought') {
      displayName = selectedCharacter.name;
    } else if (currentPart?.type === 'narration' || currentPart?.type === 'action') {
      showNamePlate = false;
    } else {
      displayName = selectedCharacter.name;
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
      style={{ maxHeight: '80vh' }}
      className={`relative w-[95%] max-w-4xl glass-morphism rounded-2xl md:rounded-3xl shadow-lg flex flex-col overflow-hidden select-text z-30 mx-auto ${isHistoryExpanded ? 'cursor-auto' : 'cursor-pointer'}`}
      onClick={handleBoxClick}
    >
      {/* 顶部状态条 & 任务集成栏 */}
      <div className="flex flex-col border-b border-gray-300/10 dark:border-white/5 bg-black/10 dark:bg-black/20" onClick={e => e.stopPropagation()}>
        
        {/* 状态集成栏 */}
        <AnimatePresence>
          {isStatusExpanded && hasVisibleStats && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5"
            >
              <div className="flex flex-col px-6 md:px-8 py-3 gap-3 max-h-[35vh] overflow-y-auto no-scrollbar">
                <div className="flex justify-between items-center border-b border-black/5 dark:border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-gray-900 dark:text-gray-100 tracking-[0.1em] uppercase">{attributes.name || selectedCharacter.name}</span>
                    <span className="text-[9px] text-gray-500 dark:text-gray-400 uppercase tracking-widest italic">{attributes.role || 'Observer'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {attributes.rank && (
                      <div className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[9px] font-mono font-bold">
                        LV.{attributes.rank}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
                  {autoStats.map(([key, value]) => {
                    const config = getStatConfig(key);
                    return (
                      <div key={key} className="scale-90 origin-left">
                        <StatProgressBar 
                          label={config.label} 
                          value={parseFloat(value as string)} 
                          icon={config.icon} 
                          color={config.color} 
                        />
                      </div>
                    );
                  })}
                </div>

                {/* 动态计算并渲染未被特殊处理的文本属性 */}
                {(() => {
                  const attrs = attributes; // 统一变量名
                  const ignoreKeys = ['name', 'role', 'rank', 'value', 'efficiency', 'date', 'days', 'time', 'weather', '星期', '日期', '时间', '天气', ...autoStats.map(s => s[0])];
                  const thoughtLikeKeys = ['thought', 'inner_thought', '心声', '内心', '想法'];
                  
                  const activePersona = config.personas.find(p => p.id === config.activePersonaId) || config.personas[0];
                  const userName = activePersona?.name || 'Observer';
                  const charName = selectedCharacter.name;
                  
                  const replaceMacros = (text: string) => {
                    if (typeof text !== 'string') return text;
                    return text.replace(/\{\{user\}\}/gi, userName).replace(/\{\{char\}\}/gi, charName);
                  };

                  const thoughtKey = Object.keys(attributes).find(k => thoughtLikeKeys.includes(k));
                  const thoughtValue = thoughtKey ? attributes[thoughtKey] : null;

                  const customAttrs = Object.entries(attributes).filter(([k, v]) => 
                    !ignoreKeys.includes(k) && !thoughtLikeKeys.includes(k) && typeof v === 'string' && v.trim() !== ''
                  );

                  const getDisplayLabel = (k: string, v: string) => {
                    const isParam = /^param\d+$/i.test(k) || /^slot\d+$/i.test(k);
                    if (isParam) return null; // 隐藏无意义的正则捕获组名

                    const translatedV = replaceMacros(v);
                    // 检查值是否自带标签前缀 (例如 "姿态: xxx" 或 "对Observer的看法: xxx")
                    const hasEmbeddedLabel = /^[\u4e00-\u9fa5a-zA-Z0-9_]{2,15}[:：]/.test(translatedV);
                    const isGenericSTKey = ['todo', 'diary', 'date', 'days', 'reason', 'status', 'description'].includes(k);
                    
                    // 如果是酒馆通用 key 且值自带标签，则隐藏通用 key 避免重复 (如 "目标: 对小小的看法: xxx")
                    if (isGenericSTKey && hasEmbeddedLabel) return null;

                    const translation: Record<string, string> = {
                      todo: '目标', diary: '备忘', date: '日期', days: '时间', reason: '状态'
                    };

                    return translation[k] || k;
                  };

                  const getIcon = (k: string) => {
                    if (k === 'todo') return <Target size={12} className="text-emerald-700 dark:text-emerald-400 mt-0.5 flex-shrink-0" />;
                    if (k === 'diary') return <BookOpen size={12} className="text-blue-700 dark:text-blue-400 mt-0.5 flex-shrink-0" />;
                    if (['date', 'days'].includes(k)) return <Calendar size={12} className="text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />;
                    return <CircleDot size={10} className="text-gray-500 dark:text-gray-400 mt-1 flex-shrink-0" />;
                  };

                  return (
                    <>
                      {thoughtValue && (
                        <p className="text-[11px] text-gray-700 dark:text-gray-300 italic leading-relaxed pt-3 border-t border-black/10 dark:border-white/10">
                          “ {replaceMacros(thoughtValue as string)} ”
                        </p>
                      )}
                      
                      {customAttrs.length > 0 && (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-3 border-t border-black/10 dark:border-white/10">
                          {customAttrs.map(([k, v]) => {
                            const label = getDisplayLabel(k, v as string);
                            return (
                              <div key={k} className="flex items-start gap-1.5 overflow-hidden">
                                {getIcon(k)}
                                <span className="text-[11px] text-gray-700 dark:text-gray-300 leading-tight font-serif truncate">
                                  {label && <span className="font-bold opacity-70 mr-1">{replaceMacros(label)}:</span>}
                                  {replaceMacros(v as string)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 任务主栏 */}
        {isQuestSkillEnabled && (mainMission || sideMissions.length > 0) && (
          <div className="flex flex-col px-6 md:px-8 py-2 border-b border-white/5">
            <div className="flex justify-between items-center w-full group cursor-pointer" onClick={() => mainMission && setShowDescriptionId(showDescriptionId === mainMission.id ? null : mainMission.id)}>
              <div className="flex items-center gap-2 overflow-hidden flex-1 mr-4">
                {mainMission ? (
                  <>
                    <span className="text-[9px] tracking-widest text-blue-400 font-mono uppercase flex-shrink-0">
                      Main
                    </span>
                    <span className="text-xs font-serif text-gray-700 dark:text-gray-200 truncate font-medium">
                      {mainMission.title}
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] font-serif text-gray-500 italic opacity-60">No Active Mission</span>
                )}
              </div>
              
              <div className="flex items-center gap-3 flex-shrink-0">
                {mainMission && (
                  <div className="w-12 md:w-20 h-0.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.4)]" 
                      initial={{ width: 0 }}
                      animate={{ width: `${mainMission.progress}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                )}
                {sideMissions.length > 0 && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsMissionsExpanded(!isMissionsExpanded); }}
                    className="text-gray-500 hover:text-blue-500 transition-colors flex items-center gap-1"
                  >
                    <span className="text-[9px] font-mono opacity-50 uppercase tracking-tighter">Side ({sideMissions.length})</span>
                    {isMissionsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                )}
              </div>
            </div>

            <AnimatePresence>
              {showDescriptionId === mainMission?.id && mainMission?.description && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <p className="text-[10px] font-serif text-gray-500 dark:text-gray-400 mt-1 mb-1 leading-normal border-l border-blue-500/20 pl-2 italic">
                    {mainMission.description}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {isMissionsExpanded && sideMissions.length > 0 && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-2 pt-3 pb-1">
                    {sideMissions.map(mission => (
                      <div key={mission.id} className="flex flex-col gap-1 group/side">
                        <div 
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => setShowDescriptionId(showDescriptionId === mission.id ? null : mission.id)}
                        >
                          <div className="flex items-center gap-2 overflow-hidden flex-1 mr-4">
                            {mission.status === 'COMPLETED' ? <CheckCircle2 size={10} className="text-green-500 flex-shrink-0" /> :
                             mission.status === 'FAILED' ? <XCircle size={10} className="text-red-500 flex-shrink-0" /> :
                             <CircleDot size={10} className="text-gray-600 flex-shrink-0" />}
                            <span className={`text-xs font-serif truncate transition-colors ${
                              mission.status === 'COMPLETED' ? 'text-green-600 font-medium' :
                              mission.status === 'FAILED' ? 'text-red-600 line-through' :
                              'text-gray-700 dark:text-gray-400 group-hover/side:text-black dark:group-hover/side:text-gray-200'
                            }`}>
                              {mission.title}
                            </span>
                          </div>
                          {mission.status === 'ACTIVE' && (
                            <span className="text-[10px] font-mono text-gray-700 dark:text-gray-500 flex-shrink-0 font-bold">{mission.progress}%</span>
                          )}
                        </div>
                        <AnimatePresence>
                          {showDescriptionId === mission.id && mission.description && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <p className="text-[10px] font-serif text-gray-500/80 dark:text-gray-500 mt-1 mb-2 leading-relaxed border-l border-gray-300 dark:border-gray-700 pl-3 italic">
                                {mission.description}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* 名字栏 & 快捷菜单 */}
        <div className="flex justify-between items-center px-6 md:px-8 py-1.5 min-h-[36px]">
          <span className="text-xs tracking-[0.1em] font-serif font-bold text-black dark:text-white opacity-80">
            {showNamePlate ? displayName : ''}
          </span>
          
          <div className="flex gap-3">
            {vnMenu.map(btn => (
              <button 
                key={btn.label}
                onClick={(e) => { e.stopPropagation(); btn.action(); }}
                className="flex items-center gap-1 text-[9px] md:text-[10px] font-serif tracking-widest text-gray-500 dark:text-gray-400 hover:text-blue-500 transition-colors font-medium uppercase"
              >
                {btn.icon}{btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* 对话内容区 */}
      <div 
        ref={scrollRef} 
        className={`overflow-y-auto no-scrollbar p-6 md:px-10 md:py-8 relative transition-all duration-500 ease-in-out ${isHistoryExpanded ? 'flex-1 min-h-[40vh]' : 'h-32 md:h-40'}`}
        onClick={e => isHistoryExpanded && e.stopPropagation()}
      >
        {!isHistoryExpanded ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={visibleIndex}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              {messages.length === 0 ? (
                <div className="text-gray-400 dark:text-gray-500 font-serif leading-relaxed italic text-base md:text-lg">
                  “ 我是 {selectedCharacter.name}，很高兴见到你。 ”
                </div>
              ) : isTyping && isLastAi ? (
                <div className="font-serif leading-relaxed text-base md:text-lg text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {displayText}
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
                    className="inline-block w-[2px] h-[1em] bg-gray-400 dark:bg-gray-500 ml-0.5 align-middle"
                  />
                </div>
              ) : (
                <div className="font-serif leading-relaxed text-base md:text-lg text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {messages[visibleIndex]?.content}
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
                      className="p-2 -m-1 text-gray-400 md:opacity-0 md:group-hover:opacity-100 hover:text-black dark:hover:text-white transition-all z-10"
                    >
                      <MoreHorizontal size={16} />
                    </button>

                    {/* Expandable Action Menu */}
                    <AnimatePresence>
                      {showMenu && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9, x: !isAi ? 10 : -10 }}
                          animate={{ opacity: 1, scale: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.9, x: !isAi ? 10 : -10 }}
                          className={`absolute top-0 ${!isAi ? 'right-full mr-2' : 'left-full ml-2'} flex items-center gap-1 bg-white/80 dark:bg-black/80 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-full px-2 py-1 shadow-lg z-20`}
                        >
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleCopy(msg.content); }}
                            className="p-1.5 text-gray-500 hover:text-blue-500 transition-colors"
                            title="复制"
                          >
                            <Copy size={12} />
                          </button>
                          
                          {!isLatest && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleRollback(idx); }}
                              className="p-1.5 text-gray-500 hover:text-orange-500 transition-colors"
                              title="回溯到此"
                            >
                              <RotateCcw size={12} />
                            </button>
                          )}

                          <button 
                            onClick={(e) => { e.stopPropagation(); handleRetry(idx, msg); }}
                            className="p-1.5 text-gray-500 hover:text-red-500 transition-colors"
                            title="重试此分支"
                          >
                            <RotateCw size={12} />
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
      <div className="absolute bottom-4 right-6 flex items-center gap-3 pointer-events-none">
        {canAdvance && (
          <motion.div animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="text-gray-400 dark:text-gray-500 text-xs">▼</motion.div>
        )}
        <div className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${getStatusLight()}`} />
      </div>
    </motion.div>
  )
}

export default DialogueBox

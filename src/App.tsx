import React, { Suspense, lazy } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from './store/useAppStore'
import { useChat } from './hooks/useChat'
import { useInteraction } from './hooks/useInteraction'
import { useTheme } from './hooks/useTheme'
import { useFont } from './hooks/useFont'
import { useCustomCss } from './hooks/useCustomCss'
import { useCustomBg } from './hooks/useCustomBg'
import { useKeyboard } from './hooks/useKeyboardHeight'
import { restoreInstalledSkills } from './skills/core/loader'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LockScreen } from './components/LockScreen'
import { pinHash, isPinHashSupported } from './utils/pinHash'

// 核心/轻量组件：保持静态导入
import Loading from './components/Loading'
import FragmentNotification from './components/FragmentNotification'
import UpdatePrompt from './components/UpdatePrompt'
import Header from './components/Header'
import DialogueBox from './components/DialogueBox'
import ChatInput from './components/ChatInput'
import { MissionPanel } from './components/Dialogue/MissionPanel'
import { HtmlGreeting } from './components/HtmlGreeting'
import { GlobalDialog } from './components/GlobalDialog'

// 移除懒加载，改回静态导入以修复 Suspense 同步渲染报错
import Stage from './engine/Stage'
import Atmosphere from './engine/Atmosphere'
import ConfigPanel from './components/ConfigPanel'
import CharacterSelection from './components/CharacterSelection'
import MultiCharSelection from './components/MultiCharSelection'
import MainMenu from './components/MainMenu'
import SaveScreen from './components/SaveScreen'
import LoadScreen from './components/LoadScreen'
import HelpScreen from './components/HelpScreen'
import ArchiveScreen from './components/ArchiveScreen'
import TweetSquare from './components/AppCenter/TweetSquare'
import AppCreatorApp from './components/AppCreator/AppCreatorApp'

const App: React.FC = () => {
  const { 
    isLoading, setIsLoading, currentView, syncImagesFromDb, _hasHydrated, 
    multiCharMode, selectedCharacter, secondaryCharacter,
    config, messages, missions
  } = useAppStore()
  const setSelectedCharacter = useAppStore(s => s.setSelectedCharacter)

  // ── App Lock ──────────────────────────────────────────────────────────────
  const appLock = config?.appLock
  const [locked, setLocked] = React.useState(() => {
    if (!appLock?.enabled || !appLock?.pinHash || !isPinHashSupported()) return false
    if (appLock.timeoutMinutes === 0) return true
    const lastUnlock = Number(sessionStorage.getItem('echo-unlocked-at') || 0)
    return Date.now() - lastUnlock > appLock.timeoutMinutes * 60_000
  })

  // Re-lock when returning from background after timeout
  React.useEffect(() => {
    if (!appLock?.enabled || !appLock?.pinHash || !isPinHashSupported()) return
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return
      if (appLock.timeoutMinutes === 0) { setLocked(true); return }
      const lastUnlock = Number(sessionStorage.getItem('echo-unlocked-at') || 0)
      if (Date.now() - lastUnlock > appLock.timeoutMinutes * 60_000) setLocked(true)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [appLock])

  // hydrate 完成后重新评估锁状态（初始 useState 时 config 尚未恢复）
  React.useEffect(() => {
    if (!_hasHydrated) return
    if (!appLock?.enabled || !appLock?.pinHash || !isPinHashSupported()) { setLocked(false); return }
    if (appLock.timeoutMinutes === 0) { setLocked(true); return }
    const lastUnlock = Number(sessionStorage.getItem('echo-unlocked-at') || 0)
    setLocked(Date.now() - lastUnlock > appLock.timeoutMinutes * 60_000)
  }, [_hasHydrated])

  const handleUnlock = React.useCallback(async (pin: string): Promise<boolean> => {
    const hex = await pinHash(pin)
    if (hex !== appLock?.pinHash) return false
    sessionStorage.setItem('echo-unlocked-at', String(Date.now()))
    setLocked(false)
    return true
  }, [appLock?.pinHash])
  
  // 0. 原生环境初始化 (状态栏沉浸式)
  React.useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // 让网页延伸到状态栏下方
      StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {})
      // 根据初始主题设置状态栏文字颜色
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {})
    }
  }, [])

  // 1. 初始化应用生命周期
  React.useEffect(() => {
    if (_hasHydrated) {
      // 立即解除 loading，让 UI 框架先出来
      setIsLoading(false)
      const splash = document.getElementById('splash-screen')
      if (splash) {
        splash.style.opacity = '0'
        setTimeout(() => splash.remove(), 800)
      }
      // 异步同步图片，不再阻塞 UI
      syncImagesFromDb().catch(err => console.error('[echo] sync images failed:', err))
      // rehydrate 完成后重新恢复已安装 skill（main.tsx 调用时 store 可能尚未就绪）
      restoreInstalledSkills(useAppStore.getState().config.installedSkills || [])
      useAppStore.getState().syncRegisteredSkillNames()
    }
  }, [_hasHydrated, setIsLoading, syncImagesFromDb])

  // 保底：5秒后强制解除 loading（防止 rehydrate 回调未触发）
  React.useEffect(() => {
    const t = setTimeout(() => {
      setIsLoading(false)
      const splash = document.getElementById('splash-screen')
      if (splash) {
        splash.style.opacity = '0'
        setTimeout(() => splash.remove(), 800)
      }
    }, 5000)
    return () => clearTimeout(t)
  }, [setIsLoading])

  // 2. 初始化主题与字体
  useTheme()
  useFont()
  useCustomCss()
  useCustomBg()

  // 初始化档案统计（每日活跃）
  const initializeArchiveStats = useAppStore(s => s.initializeArchiveStats)
  const rebuildArchiveStats = useAppStore(s => s.rebuildArchiveStats)
  const loadTweets = useAppStore(s => s.loadTweets)
  React.useEffect(() => {
    if (_hasHydrated) {
      initializeArchiveStats()
      loadTweets()
      // 首次加载时从数据库回溯统计（仅执行一次）
      const hasRebuilt = sessionStorage.getItem('echo-archive-rebuilt')
      if (!hasRebuilt) {
        rebuildArchiveStats().then(() => {
          sessionStorage.setItem('echo-archive-rebuilt', '1')
        })
      }
    }
  }, [_hasHydrated, initializeArchiveStats, rebuildArchiveStats, loadTweets])
  
  // 3. 键盘检测
  const { isKeyboardVisible, viewportHeight, offsetTop } = useKeyboard()
  
  // 4. 抽离的对话逻辑
  const { displayText, sendMessage, isTyping, skipGreeting } = useChat()
  
  // 5. 抽离的背景交互逻辑
  const { handleStart, handleMove, handleStop } = useInteraction(isLoading, currentView)

  // 6. VN 对话框的进度状态 (用于阻塞输入)
  const [isWaitingForClick, setIsWaitingForClick] = React.useState(false)
  const [showGreetingPicker, setShowGreetingPicker] = React.useState(false)
  
  // HTML 開場白檢測 - 更嚴格的判定，避免誤觸
  const firstMessage = useAppStore(s => s.messages[0])
  const isHtmlGreeting = React.useMemo(() => {
    if (!firstMessage || firstMessage.role !== 'assistant') return false
    const content = firstMessage.content.trim()
    // 判定条件：包含完整的 DOCTYPE，或者以 <html> 开头，或者内容较长且包含明显的布局容器
    return content.toLowerCase().includes('<!doctype html') || 
           content.toLowerCase().startsWith('<html') ||
           (content.length > 500 && content.includes('<div') && content.includes('</div>'))
  }, [firstMessage])
  
  const [showHtmlGreeting, setShowHtmlGreeting] = React.useState(isHtmlGreeting)
  const skipHtmlGreetingRef = React.useRef(false)

  React.useEffect(() => {
    if (skipHtmlGreetingRef.current) {
      skipHtmlGreetingRef.current = false
      return
    }
    if (isHtmlGreeting && firstMessage && messages.length === 1) {
      setShowHtmlGreeting(true)
    }
  }, [isHtmlGreeting, firstMessage, messages.length])

  // 判断是否应该渲染游戏主界面
  const isGameView = currentView === 'main'

  return (
    <ErrorBoundary>
    {locked && <LockScreen onUnlock={handleUnlock} />}
    <UpdatePrompt />
    <div 
      className="echo-app-root relative w-screen h-[100dvh] overflow-hidden font-sans cursor-crosshair select-none transition-colors duration-700"
      data-view={currentView}
      data-multi-char={multiCharMode}
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleStop}
      onMouseLeave={handleStop}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleStop}
    >
      <AnimatePresence>{isLoading && <Loading key="loading" />}</AnimatePresence>
      
      {/* 核心渲染层 */}
      <Suspense fallback={null}>
        <Stage>
          {!isLoading && <Atmosphere />}
        </Stage>
      </Suspense>

      {/* 自定义背景图层（在 PixiJS 之上，UI 之下） */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none bg-cover bg-center bg-no-repeat transition-opacity duration-700"
        style={{ 
          backgroundImage: selectedCharacter?.extensions?.activeBackground 
            ? `url("${selectedCharacter.extensions.assets?.find(a => a.type === 'background' && a.name === selectedCharacter.extensions?.activeBackground)?.uri}")`
            : 'var(--custom-bg, none)'
        }}
      />

      {/* UI 控制层 */}
      <Suspense fallback={null}>
        <CharacterSelection />
        <MultiCharSelection />
        
        <AnimatePresence mode="wait">
          {currentView === 'home' && <MainMenu key="home" />}
          {currentView === 'save' && <SaveScreen key="save" />}
          {currentView === 'load' && <LoadScreen key="load" />}
          {currentView === 'help' && <HelpScreen key="help" />}
          {currentView === 'config' && <ConfigPanel key="config" />}
          {currentView === 'archive' && <ArchiveScreen key="archive" />}
          {currentView === 'tweet-square' && <TweetSquare key="tweet-square" />}
          {currentView === 'app-creator' && <AppCreatorApp key="app-creator" />}
        </AnimatePresence>
      </Suspense>

      {/* HUD 渲染层 */}
      <AnimatePresence>
        {isGameView && (
          <main 
            key="vn-hud" 
            className="fixed left-0 right-0 z-10 flex flex-col pointer-events-none"
            style={{ 
              height: `${viewportHeight}px`,
              top: `${offsetTop}px`
            }}
          >
            <Header />
            <MissionPanel
              missions={missions}
              isQuestSkillEnabled={true}
            />
            <FragmentNotification key="fragments" />
            
            {/* 对话框区域 */}
            <div className="echo-dialogue-area flex-1 min-h-0 flex flex-col pointer-events-auto">
              <div className="echo-dialogue-wrapper w-full flex-1 min-h-0">
                <DialogueBox 
                  displayText={displayText} 
                  isTyping={isTyping} 
                  onCanAdvanceChange={setIsWaitingForClick}
                  onRetry={sendMessage}
                  onSkipGreeting={skipGreeting}
                  isKeyboardVisible={isKeyboardVisible}
                />
              </div>
            </div>

            {/* 输入框区域 - 移除背景，确保完全透明交互 */}
            <div className={`echo-input-area w-full max-w-2xl mx-auto px-4 pointer-events-auto pt-4 transition-all duration-200 ${isKeyboardVisible ? 'pb-1' : 'pb-4 md:pb-8 safe-area-bottom'}`}>
              <ChatInput 
                onSend={sendMessage} 
                disabled={isTyping || isWaitingForClick} 
              />
            </div>
          </main>
        )}
      </AnimatePresence>

      <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-gray-100/10 dark:from-black/20 to-transparent pointer-events-none" />
      <GlobalDialog />
      
      {/* HTML 開場白全屏顯示 */}
      <AnimatePresence>
        {showHtmlGreeting && firstMessage && (
          <HtmlGreeting 
            content={firstMessage.content}
            onEnter={() => {
              setShowHtmlGreeting(false)
              if (selectedCharacter.alternateGreetings?.length) {
                setShowGreetingPicker(true)
              } else {
                skipGreeting()
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* 多开场白选择（HTML预览后触发，或直接选角色时触发） */}
      <AnimatePresence>
        {showGreetingPicker && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
            onClick={() => { setShowGreetingPicker(false); skipGreeting() }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-echo-white dark:bg-[#0d0d0d] rounded-[2rem] border-0.5 border-echo-border shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-echo-border">
                <p className="text-[9px] tracking-[0.5em] text-gray-400 uppercase">选择开场白 // Select Greeting</p>
                <p className="text-xs text-echo-text-muted mt-1">{selectedCharacter.name}</p>
              </div>
              <div className="overflow-y-auto max-h-[60vh] no-scrollbar divide-y divide-gray-100 dark:divide-white/5">
                {[selectedCharacter.greeting, ...(selectedCharacter.alternateGreetings || [])].map((g, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        skipHtmlGreetingRef.current = true
                        setSelectedCharacter(selectedCharacter, g ?? undefined)
                        setShowGreetingPicker(false)
                      }}
                      className="w-full text-left px-6 py-4 hover:bg-echo-surface transition-colors"
                    >
                      <span className="text-[8px] tracking-widest text-gray-400 uppercase block mb-1">
                        {i === 0 ? '默认开场白' : `备选 ${i}`}
                      </span>
                      <p className="text-xs text-echo-text-base font-serif leading-relaxed line-clamp-3">
                        {g?.replace(/<[^>]+>/g, '').slice(0, 120) || '（空）'}
                      </p>
                    </button>
                  ))}
              </div>
              <div className="p-4 border-t border-echo-border">
                <button onClick={() => { setShowGreetingPicker(false); skipGreeting() }} className="w-full py-2 text-[9px] tracking-widest uppercase text-gray-400 hover:text-gray-600 transition-colors">
                  使用默认
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  )
}

export default App

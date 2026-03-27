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
import { ErrorBoundary } from './components/ErrorBoundary'

// 核心/重型组件：改回静态导入以确保 WebGL 上下文稳定
import Stage from './engine/Stage'
import Atmosphere from './engine/Atmosphere'

// 核心/轻量组件：保持静态导入
import Loading from './components/Loading'
import FragmentNotification from './components/FragmentNotification'
import Header from './components/Header'
import DialogueBox from './components/DialogueBox'
import ChatInput from './components/ChatInput'
import CharacterAvatar from './components/CharacterAvatar'
import MultiCharAvatar from './components/MultiCharAvatar'
import { HtmlGreeting } from './components/HtmlGreeting'
import { GlobalDialog } from './components/GlobalDialog'

// 仅限 UI/次要组件：保留懒加载 (Lazy Loading)
const ConfigPanel = lazy(() => import('./components/ConfigPanel'))
const CharacterSelection = lazy(() => import('./components/CharacterSelection'))
const MultiCharSelection = lazy(() => import('./components/MultiCharSelection'))
const MainMenu = lazy(() => import('./components/MainMenu'))
const SaveScreen = lazy(() => import('./components/SaveScreen'))
const LoadScreen = lazy(() => import('./components/LoadScreen'))
const HelpScreen = lazy(() => import('./components/HelpScreen'))

const App: React.FC = () => {
  const { 
    isLoading, setIsLoading, currentView, syncImagesFromDb, _hasHydrated, 
    multiCharMode, selectedCharacter, secondaryCharacter,
    isDialogueFullscreen, config
  } = useAppStore()
  const setSelectedCharacter = useAppStore(s => s.setSelectedCharacter)
  
  // 1. 初始化应用生命周期
  React.useEffect(() => {
    if (_hasHydrated) {
      syncImagesFromDb().catch(() => {}).finally(() => {
        setIsLoading(false)
        const splash = document.getElementById('splash-screen')
        if (splash) {
          splash.style.opacity = '0'
          setTimeout(() => splash.remove(), 800)
        }
      })
    }
  }, [_hasHydrated, setIsLoading, syncImagesFromDb])

  // 保底：5秒后强制解除 loading（防止 rehydrate 回调未触发）
  React.useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 5000)
    return () => clearTimeout(t)
  }, [])

  // 2. 初始化主题与字体
  useTheme()
  useFont()
  useCustomCss()
  useCustomBg()
  
  // 3. 键盘检测
  const { isKeyboardVisible, viewportHeight, offsetTop } = useKeyboard()
  
  // 4. 抽离的对话逻辑
  const { displayText, sendMessage, isTyping, skipGreeting, activeSpeakerId } = useChat()
  
  // 5. 抽离的背景交互逻辑
  const { handleStart, handleMove, handleStop } = useInteraction(isLoading, currentView)

  // 6. VN 对话框的进度状态 (用于阻塞输入)
  const [isWaitingForClick, setIsWaitingForClick] = React.useState(false)
  const [showGreetingPicker, setShowGreetingPicker] = React.useState(false)
  
  // HTML 開場白檢測
  const firstMessage = useAppStore(s => s.messages[0])
  const isHtmlGreeting = firstMessage?.role === 'assistant' && 
    firstMessage.content.trim().startsWith('<') && 
    firstMessage.content.includes('</div>')
  const [showHtmlGreeting, setShowHtmlGreeting] = React.useState(isHtmlGreeting)
  
  React.useEffect(() => {
    if (isHtmlGreeting && firstMessage) {
      setShowHtmlGreeting(true)
    }
  }, [isHtmlGreeting, firstMessage])

  // 判断是否应该渲染游戏主界面
  const isGameView = currentView === 'main'

  return (
    <ErrorBoundary>
    <div 
      className="relative w-screen h-[100dvh] overflow-hidden font-sans cursor-crosshair select-none transition-colors duration-700"
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
      <Stage>
        {!isLoading && <Atmosphere />}
      </Stage>

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
        <ConfigPanel />
        <CharacterSelection />
        <MultiCharSelection />
        
        <AnimatePresence mode="wait">
          {currentView === 'home' && <MainMenu key="home" />}
          {currentView === 'save' && <SaveScreen key="save" />}
          {currentView === 'load' && <LoadScreen key="load" />}
          {currentView === 'help' && <HelpScreen key="help" />}
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
            <FragmentNotification key="fragments" />
            
            {/* 对话框区域 */}
            <div className="flex-1 min-h-0 flex flex-col items-center pointer-events-auto px-4 pt-4">
              {!isDialogueFullscreen && (
                <div className="mb-4 flex-shrink-0">
                  {multiCharMode ? <MultiCharAvatar activeSpeakerId={activeSpeakerId} /> : <CharacterAvatar />}
                </div>
              )}
              <div className="w-full flex-1 min-h-0 mb-4">
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

            {/* 输入框区域 */}
            <div className={`w-full max-w-2xl mx-auto px-4 pointer-events-auto bg-gradient-to-t from-echo-base/95 dark:from-black/70 to-transparent pt-4 transition-all duration-200 ${isKeyboardVisible ? 'pb-1' : 'pb-4 md:pb-8'}`}>
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
              <div className="p-6 border-b border-gray-100 dark:border-white/5">
                <p className="text-[9px] tracking-[0.5em] text-gray-400 uppercase">选择开场白 // Select Greeting</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{selectedCharacter.name}</p>
              </div>
              <div className="overflow-y-auto max-h-[60vh] no-scrollbar divide-y divide-gray-100 dark:divide-white/5">
                {[selectedCharacter.greeting, ...(selectedCharacter.alternateGreetings || [])].map((g, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedCharacter(selectedCharacter, g ?? undefined)
                        setShowGreetingPicker(false)
                      }}
                      className="w-full text-left px-6 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <span className="text-[8px] tracking-widest text-gray-400 uppercase block mb-1">
                        {i === 0 ? '默认开场白' : `备选 ${i}`}
                      </span>
                      <p className="text-xs text-gray-600 dark:text-gray-300 font-serif leading-relaxed line-clamp-3">
                        {g?.replace(/<[^>]+>/g, '').slice(0, 120) || '（空）'}
                      </p>
                    </button>
                  ))}
              </div>
              <div className="p-4 border-t border-gray-100 dark:border-white/5">
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

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
import { GlobalDialog } from './components/GlobalDialog'

// 仅限 UI/次要组件：保留懒加载 (Lazy Loading)
const ConfigPanel = lazy(() => import('./components/ConfigPanel'))
const CharacterSelection = lazy(() => import('./components/CharacterSelection'))
const MainMenu = lazy(() => import('./components/MainMenu'))
const SaveScreen = lazy(() => import('./components/SaveScreen'))
const LoadScreen = lazy(() => import('./components/LoadScreen'))
const HelpScreen = lazy(() => import('./components/HelpScreen'))

const App: React.FC = () => {
  const { isLoading, setIsLoading, currentView, syncImagesFromDb, _hasHydrated, isHistoryExpanded } = useAppStore()
  
  // 1. 初始化应用生命周期
  React.useEffect(() => {
    if (_hasHydrated) {
      syncImagesFromDb().then(() => {
        setIsLoading(false)
        const splash = document.getElementById('splash-screen')
        if (splash) {
          splash.style.opacity = '0'
          setTimeout(() => splash.remove(), 800)
        }
      })
    }
  }, [_hasHydrated, setIsLoading, syncImagesFromDb])

  // 2. 初始化主题与字体
  useTheme()
  useFont()
  useCustomCss()
  useCustomBg()
  
  // 3. 键盘检测
  const { isKeyboardVisible, viewportHeight, offsetTop } = useKeyboard()
  
  // 4. 抽离的对话逻辑
  const { displayText, sendMessage, isTyping, skipGreeting } = useChat()
  
  // 5. 抽离的背景交互逻辑
  const { handleStart, handleMove, handleStop } = useInteraction(isLoading, currentView)

  // 6. VN 对话框的进度状态 (用于阻塞输入)
  const [isWaitingForClick, setIsWaitingForClick] = React.useState(false)

  // 判断是否应该渲染游戏主界面
  const isGameView = currentView === 'main'

  return (
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
        style={{ backgroundImage: 'var(--custom-bg, none)' }}
      />

      {/* UI 控制层 */}
      <Suspense fallback={null}>
        <ConfigPanel />
        <CharacterSelection />
        
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
            <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col items-center justify-start pointer-events-auto px-4 pt-4">
              <AnimatePresence>
                {!isHistoryExpanded && (
                  <motion.div
                    key="avatar-container"
                    initial={{ opacity: 0, scale: 0.8, height: 0 }}
                    animate={{ opacity: 1, scale: 1, height: 'auto' }}
                    exit={{ opacity: 0, scale: 0.8, height: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <CharacterAvatar />
                  </motion.div>
                )}
              </AnimatePresence>
              <div className={`w-full ${isHistoryExpanded ? 'mt-0' : 'mt-4'} mb-4 transition-all duration-300`}>
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
    </div>
  )
}

export default App

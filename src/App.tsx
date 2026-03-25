import React, { Suspense, lazy } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useAppStore } from './store/useAppStore'
import { useChat } from './hooks/useChat'
import { useInteraction } from './hooks/useInteraction'
import { useTheme } from './hooks/useTheme'
import { useFont } from './hooks/useFont'

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
  const { isLoading, setIsLoading, currentView, syncImagesFromDb } = useAppStore()
  
  // 1. 初始化应用生命周期
  React.useEffect(() => {
    syncImagesFromDb().then(() => {
      setIsLoading(false)
      // 只有当业务数据加载完成后，才淡出并移除 index.html 的原生 splash-screen
      const splash = document.getElementById('splash-screen')
      if (splash) {
        splash.style.opacity = '0'
        setTimeout(() => splash.remove(), 800)
      }
    })
  }, [setIsLoading, syncImagesFromDb])

  // 2. 初始化主题与字体
  useTheme()
  useFont()
  
  // 3. 抽离的对话逻辑
  const { displayText, sendMessage, isTyping, skipGreeting } = useChat()
  
  // 4. 抽离的背景交互逻辑
  const { handleStart, handleMove, handleStop } = useInteraction(isLoading, currentView)

  // 5. VN 对话框的进度状态 (用于阻塞输入)
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
      
      {/* 核心渲染层：直接挂载，但不进行内部加载 */}
      <Stage>
        {!isLoading && <Atmosphere />}
      </Stage>

      {/* UI 控制层：使用 Suspense 包装非核心 UI */}
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

      {/* 仅在游戏主界面渲染 HUD */}
      <AnimatePresence>
        {isGameView && (
          <>
            <FragmentNotification key="fragments" />
            
            <main key="vn-hud" className="theme-surface relative z-10 w-full h-[100dvh] flex flex-col pointer-events-none">
              <Header />
              
              <div className="flex-1 overflow-y-auto no-scrollbar pointer-events-auto">
                <div className="flex flex-col items-center justify-start pt-4 md:pt-12 pb-8">
                  <CharacterAvatar />
                  
                  <div className="w-full mt-2">
                    <DialogueBox 
                      displayText={displayText} 
                      isTyping={isTyping} 
                      onCanAdvanceChange={setIsWaitingForClick}
                      onRetry={sendMessage}
                      onSkipGreeting={skipGreeting}
                    />
                  </div>
                </div>
              </div>

              {/* 输入框区域：作为 flex 的底部元素，自然贴合键盘 */}
              <div className="w-full max-w-2xl mx-auto px-4 pb-8 md:pb-12 pointer-events-auto">
                <ChatInput 
                  onSend={sendMessage} 
                  disabled={isTyping || isWaitingForClick} 
                />
              </div>
            </main>
          </>
        )}
      </AnimatePresence>

      {/* 背景修饰渐变 */}
      <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-gray-100/10 dark:from-black/20 to-transparent pointer-events-none" />

      {/* 全局弹窗 */}
      <GlobalDialog />
    </div>
  )
}

export default App

import React from 'react'
import { useAppStore } from '../../store/useAppStore'

// 占位符 — 后续实现
const ChatApp: React.FC = () => {
  const { setCurrentApp } = useAppStore()
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 items-center justify-center gap-4">
      <span className="text-4xl">💬</span>
      <p className="text-gray-500 text-sm">聊天 App 开发中...</p>
      <button
        onClick={() => setCurrentApp('launcher')}
        className="text-xs text-indigo-500 underline"
      >
        返回桌面
      </button>
    </div>
  )
}

export default ChatApp

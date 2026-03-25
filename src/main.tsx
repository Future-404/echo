import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/globals.css'
import { registerSW } from 'virtual:pwa-register'

// 注册 PWA Service Worker
registerSW({ immediate: true })

// 强制清理可能导致 quota 溢出的旧版本缓存
const obsoleteKeys = ['echo-storage', 'echo-storage-v2', 'echo-storage-v3', 'echo-storage-v4', 'echo-storage-v5', 'echo-storage-v6', 'echo-storage-v7', 'echo-storage-v8', 'echo-storage-v9', 'echo-storage-v10'];
obsoleteKeys.forEach(key => localStorage.removeItem(key));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

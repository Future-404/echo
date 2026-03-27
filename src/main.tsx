import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/globals.css'
import { registerSW } from 'virtual:pwa-register'

// HTTPS 强制跳转（生产环境）
// 临时禁用以便公网 IP 测试
// if (location.protocol === 'http:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
//   location.replace(`https://${location.host}${location.pathname}${location.search}${location.hash}`)
// }

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

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/globals.css'

// 暂时不注册 SW，防止开发环境缓存干扰
// import { registerSW } from 'virtual:pwa-register'
// registerSW({ immediate: true })

const obsoleteKeys = ['echo-storage', 'echo-storage-v2', 'echo-storage-v3', 'echo-storage-v4', 'echo-storage-v5', 'echo-storage-v6', 'echo-storage-v7', 'echo-storage-v8', 'echo-storage-v9', 'echo-storage-v10'];
obsoleteKeys.forEach(key => localStorage.removeItem(key));

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<App />);
}

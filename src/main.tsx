import React from 'react'
import ReactDOM from 'react-dom/client'
import { flushSync } from 'react-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import './styles/globals.css'
import { initStorage, authenticateWithPassword } from './storage'
import { GateScreen } from './components/GateScreen.tsx'

// 注册 Service Worker
registerSW({ immediate: true })

const root = ReactDOM.createRoot(document.getElementById('root')!)

function renderApp() {
  flushSync(() => {
    root.render(<React.StrictMode><App /></React.StrictMode>)
  })
}

if (initStorage() === 'ready') {
  renderApp()
} else {
  root.render(
    <React.StrictMode>
      <GateScreen onUnlock={async (password) => {
        await authenticateWithPassword(password)
        // 登录后强制 rehydrate store
        const { useAppStore } = await import('./store/useAppStore')
        await useAppStore.persist.rehydrate()
        renderApp()
      }} />
    </React.StrictMode>
  )
}

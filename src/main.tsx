import React from 'react'
import ReactDOM from 'react-dom/client'
import { flushSync } from 'react-dom'
import App from './App.tsx'
import './styles/globals.css'
import { registerSW } from 'virtual:pwa-register'
import { initStorage, authenticateWithPassword } from './storage'
import { GateScreen } from './components/GateScreen.tsx'

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
        // 登錄後強制重新從 KV rehydrate store（store 是單例，不會自動重新讀取）
        const { useAppStore } = await import('./store/useAppStore')
        await useAppStore.persist.rehydrate()
        renderApp()
      }} />
    </React.StrictMode>
  )
}

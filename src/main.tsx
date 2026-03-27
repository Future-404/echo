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
        renderApp()
      }} />
    </React.StrictMode>
  )
}

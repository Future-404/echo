import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/globals.css'
import { registerSW } from 'virtual:pwa-register'
import { initStorage, authenticateWithPassword } from './storage'
import { GateScreen } from './components/GateScreen.tsx'

registerSW({ immediate: true })

const root = ReactDOM.createRoot(document.getElementById('root')!)

if (initStorage() === 'ready') {
  root.render(<React.StrictMode><App /></React.StrictMode>)
} else {
  root.render(
    <React.StrictMode>
      <GateScreen onUnlock={async (password) => {
        await authenticateWithPassword(password)
        root.render(<React.StrictMode><App /></React.StrictMode>)
      }} />
    </React.StrictMode>
  )
}

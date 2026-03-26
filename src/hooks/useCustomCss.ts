import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'

export const useCustomCss = () => {
  const customCss = useAppStore(state => state.config?.customCss || '')

  useEffect(() => {
    let el = document.getElementById('user-custom-css')
    if (!el) { el = document.createElement('style'); el.id = 'user-custom-css'; document.head.appendChild(el) }
    el.textContent = customCss
  }, [customCss])
}

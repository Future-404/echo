import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'

export const useCustomCss = () => {
  const customCss = useAppStore(state => state.config?.customCss || '')

  useEffect(() => {
    const applyCss = () => {
      let el = document.getElementById('user-custom-css') as HTMLStyleElement
      if (!el) {
        el = document.createElement('style')
        el.id = 'user-custom-css'
        document.head.appendChild(el)
      }
      
      if (el.textContent !== customCss) {
        el.textContent = customCss
      }

      // 确保它始终是 head 的最后一个元素，以便覆盖 Tailwind 的样式
      if (document.head.lastElementChild !== el) {
        document.head.appendChild(el)
      }
    }

    applyCss()

    // 监听 head 的变化，防止其他插件或库覆盖我们的顺序
    const observer = new MutationObserver(applyCss)
    observer.observe(document.head, { childList: true })

    return () => observer.disconnect()
  }, [customCss])
}

import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'

export const useCustomCss = () => {
  const customCss = useAppStore(state => state.config?.customCss || '')
  // 序列化为字符串，避免数组引用变化触发无限循环
  const cssPackagesJson = useAppStore(state => JSON.stringify(state.config?.cssPackages ?? []))
  const charCssPackageIds = useAppStore(state =>
    (state.selectedCharacter?.extensions?.cssPackageIds ?? []).join(',')
  )

  useEffect(() => {
    const cssPackages = JSON.parse(cssPackagesJson)
    const boundIds = charCssPackageIds ? charCssPackageIds.split(',') : []

    const applyCss = () => {
      let el = document.getElementById('user-custom-css') as HTMLStyleElement
      if (!el) {
        el = document.createElement('style')
        el.id = 'user-custom-css'
        document.head.appendChild(el)
      }

      // 全局包：反转后注入，靠上的包后注入优先级更高（排除角色绑定的包）
      const globalCss = [...cssPackages]
        .reverse()
        .filter((p) => p.enabled && !boundIds.includes(p.id))
        .map((p) => `/* [CSS包] ${p.name} */\n${p.css}`)
        .join('\n\n')

      // 角色绑定包：最后注入，优先级最高（无视全局 enabled 状态）
      const charCss = boundIds.length
        ? cssPackages
            .filter((p) => boundIds.includes(p.id))
            .map((p) => `/* [CSS包·角色] ${p.name} */\n${p.css}`)
            .join('\n\n')
        : ''

      const finalCss = [globalCss, charCss, customCss].filter(Boolean).join('\n\n')

      if (el.textContent !== finalCss) {
        el.textContent = finalCss
      }

      if (document.head.lastElementChild !== el) {
        document.head.appendChild(el)
      }
    }

    applyCss()

    const observer = new MutationObserver(applyCss)
    observer.observe(document.head, { childList: true })

    return () => observer.disconnect()
  }, [customCss, cssPackagesJson, charCssPackageIds])
}

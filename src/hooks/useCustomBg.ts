import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { imageDb } from '../utils/imageDb'

const BG_KEY = 'custom-bg'

export const useCustomBg = () => {
  const customBg = useAppStore(state => state.config?.customBg)

  useEffect(() => {
    if (!customBg) {
      document.documentElement.style.removeProperty('--custom-bg')
      return
    }
    imageDb.get(BG_KEY).then(url => {
      if (url) document.documentElement.style.setProperty('--custom-bg', `url("${url}")`)
    })
  }, [customBg])
}

export { BG_KEY }

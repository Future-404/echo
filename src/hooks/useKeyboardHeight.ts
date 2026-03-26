import { useState, useEffect } from 'react'

/**
 * 混合键盘检测 Hook
 * 返回:
 * - isKeyboardVisible: 键盘是否弹出
 * - keyboardHeight: 键盘占用的像素高度
 * - viewportHeight: 实际可见区域的高度
 * - offsetTop: 视口顶部的偏移量（用于抵消浏览器自动滚动）
 */
export const useKeyboard = () => {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 0)
  const [offsetTop, setOffsetTop] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateHeight = () => {
      const viewport = window.visualViewport
      if (!viewport) {
        setViewportHeight(window.innerHeight)
        return
      }

      const windowHeight = window.innerHeight
      const vh = viewport.height
      const kbHeight = Math.max(0, Math.floor(windowHeight - vh))

      setViewportHeight(vh)
      setOffsetTop(viewport.offsetTop)

      const isInputFocused = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA'
      
      if (isInputFocused && kbHeight > 100) {
        setIsKeyboardVisible(true)
        setKeyboardHeight(kbHeight)
      } else if (kbHeight < 50) {
        // 只要键盘高度消失了，不论焦点在不在输入框，都认为键盘已收起
        // 这样可以解决某些浏览器（如 iOS Safari）键盘收起但输入框不失焦导致布局不恢复的问题
        setIsKeyboardVisible(false)
        setKeyboardHeight(0)
      }
    }

    const handleFocusIn = () => {
      updateHeight()
      // 循环检查多次，因为不同设备的键盘弹出耗时不同
      setTimeout(updateHeight, 100)
      setTimeout(updateHeight, 300)
      setTimeout(updateHeight, 500)
    }

    const handleFocusOut = () => {
      setTimeout(() => {
        const isInputFocused = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA'
        if (!isInputFocused) {
          setIsKeyboardVisible(false)
          setKeyboardHeight(0)
          setViewportHeight(window.innerHeight)
          setOffsetTop(0)
        }
      }, 100)
    }

    window.addEventListener('focusin', handleFocusIn)
    window.addEventListener('focusout', handleFocusOut)

    if (window.visualViewport) {
      // 现代浏览器监听 visualViewport 的缩放和滚动
      window.visualViewport.addEventListener('resize', updateHeight)
      window.visualViewport.addEventListener('scroll', updateHeight)
    }

    updateHeight()

    return () => {
      window.removeEventListener('focusin', handleFocusIn)
      window.removeEventListener('focusout', handleFocusOut)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateHeight)
        window.visualViewport.removeEventListener('scroll', updateHeight)
      }
    }
  }, [])

  return { isKeyboardVisible, keyboardHeight, viewportHeight, offsetTop }
}

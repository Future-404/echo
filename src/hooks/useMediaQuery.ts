import { useState, useEffect } from 'react'

export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches
    }
    return false
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [query])

  return matches
}

export const useDevice = () => {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)')
  const isDesktop = useMediaQuery('(min-width: 1025px)')
  const isTouchDevice = useMediaQuery('(hover: none) and (pointer: coarse)')
  
  return { isMobile, isTablet, isDesktop, isTouchDevice }
}

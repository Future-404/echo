declare const __APP_VERSION__: string

export const VERSION: string = __APP_VERSION__
export const BRANCH = 'main'

export const getDisplayVersion = () =>
  `v${VERSION}${BRANCH !== 'main' ? `-${BRANCH}` : ''}`

export const getFullVersion = () => `${VERSION}-${BRANCH}`

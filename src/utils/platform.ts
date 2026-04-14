import { Capacitor } from '@capacitor/core'

export const isNative = Capacitor.isNativePlatform()
export const platform = Capacitor.getPlatform() // 'ios' | 'android' | 'web'
export const isAndroid = platform === 'android'
export const isIOS = platform === 'ios'

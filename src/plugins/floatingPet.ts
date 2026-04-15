import { Capacitor, registerPlugin } from '@capacitor/core'

interface FloatingPetPlugin {
  hasPermission(): Promise<{ granted: boolean }>
  requestPermission(): Promise<void>
  show(): Promise<void>
  hide(): Promise<void>
  isRunning(): Promise<{ running: boolean }>
}

const FloatingPet = registerPlugin<FloatingPetPlugin>('FloatingPet')

export const floatingPet = {
  isSupported: () => Capacitor.getPlatform() === 'android',

  async hasPermission() {
    if (!this.isSupported()) return true
    return (await FloatingPet.hasPermission()).granted
  },

  async requestPermission() {
    if (!this.isSupported()) return
    await FloatingPet.requestPermission()
  },

  async show() {
    if (!this.isSupported()) return
    await FloatingPet.show()
  },

  async hide() {
    if (!this.isSupported()) return
    await FloatingPet.hide()
  },

  async isRunning() {
    if (!this.isSupported()) return false
    return (await FloatingPet.isRunning()).running
  },
}

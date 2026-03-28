import type { SaveSlot } from './useAppStore'
import { replaceMacros } from '../logic/promptEngine'
import { getStorageAdapter } from '../storage'

const SAVE_KEY = 'echo-saves'
const MULTI_SAVE_KEY = 'echo-multi-saves'

export async function persistSlots(key: string, slots: SaveSlot[]) {
  await getStorageAdapter().setItem(key, JSON.stringify(slots))
}

export async function loadSlotsFromStorage(key: string): Promise<SaveSlot[]> {
  try {
    const raw = await getStorageAdapter().getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export interface SaveSlice {
  saveSlots: SaveSlot[];
  saveGame: (slotId: string, name?: string) => void;
  renameSaveSlot: (slotId: string, newName: string) => void;
  loadGame: (slotId: string) => void;
  deleteSaveSlot: (slotId: string) => void;
  startNewGame: (charId: string) => void;
}

export const createSaveSlice = (set: any, get: any): SaveSlice => ({
  saveSlots: [],

  saveGame: (slotId, name) => {
    const state = get()
    const lastMsg = state.messages.length > 0 ? state.messages[state.messages.length - 1].content : '新游戏'
    const existing = (state.saveSlots || []).find((s: SaveSlot) => s.id === slotId)
    const newSlot: SaveSlot = {
      id: slotId,
      name: name || existing?.name,
      timestamp: Date.now(),
      characterId: state.selectedCharacter.id,
      messages: state.messages,
      summary: lastMsg.slice(0, 50) + (lastMsg.length > 50 ? '...' : ''),
      missions: state.missions,
      fragments: state.fragments,
    }
    set((s: any) => {
      const slots = (s.saveSlots || []).some((sl: SaveSlot) => sl.id === slotId)
        ? s.saveSlots.map((sl: SaveSlot) => sl.id === slotId ? newSlot : sl)
        : [...(s.saveSlots || []), newSlot]
      persistSlots(SAVE_KEY, slots)
      return { saveSlots: slots }
    })
  },

  renameSaveSlot: (slotId, newName) => {
    set((s: any) => {
      const slots = (s.saveSlots || []).map((sl: SaveSlot) => sl.id === slotId ? { ...sl, name: newName } : sl)
      persistSlots(SAVE_KEY, slots)
      return { saveSlots: slots }
    })
  },

  loadGame: (slotId) => {
    const state = get()
    const slot = (state.saveSlots || []).find((s: SaveSlot) => s.id === slotId)
    if (!slot) return
    const char = (state.characters || []).find((c: any) => c.id === slot.characterId) || state.characters[0]
    set({
      selectedCharacter: char,
      messages: slot.messages,
      missions: slot.missions,
      fragments: slot.fragments,
      currentView: 'main',
      isGreetingSession: false,
      currentAutoSlotId: slotId.startsWith('auto_') ? slotId : null,
    })
  },

  deleteSaveSlot: (slotId) => {
    set((s: any) => {
      const slots = (s.saveSlots || []).filter((sl: SaveSlot) => sl.id !== slotId)
      persistSlots(SAVE_KEY, slots)
      return {
        saveSlots: slots,
        currentAutoSlotId: s.currentAutoSlotId === slotId ? null : s.currentAutoSlotId,
      }
    })
  },

  startNewGame: (charId) => {
    const state = get()
    const char = (state.characters || []).find((c: any) => c.id === charId) || state.characters[0]
    const charWithoutAttrs = { ...char, attributes: {} }
    const activePersona = state.config.personas.find((p: any) => p.id === state.config.activePersonaId) || state.config.personas[0]
    const userName = activePersona?.name || 'Observer'
    const finalGreeting = charWithoutAttrs.greeting
      ? replaceMacros(charWithoutAttrs.greeting, userName, charWithoutAttrs.name)
      : undefined
    set({
      characters: (state.characters || []).map((c: any) => c.id === charId ? charWithoutAttrs : c),
      selectedCharacter: charWithoutAttrs,
      currentView: 'main',
      messages: finalGreeting ? [{ role: 'assistant', content: finalGreeting }] : [],
      isGreetingSession: true,
      isTyping: false,
      missions: charWithoutAttrs.extensions?.missions || state.missions,
      fragments: [],
      currentAutoSlotId: null,
    })
  },
}

export { SAVE_KEY, MULTI_SAVE_KEY }

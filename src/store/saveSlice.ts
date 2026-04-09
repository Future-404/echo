import type { StateCreator } from 'zustand'
import type { AppState } from './storeTypes'
import type { Message } from '../types/chat'
import type { SaveSlot } from '../types/store'
import { SAVE_KEY, MULTI_SAVE_KEY } from './constants'
import { replaceMacros } from '../logic/promptEngine'
import { getStorageAdapter } from '../storage'
import { db } from '../storage/db'

/**
 * 优化：存档现在分为元数据（saveSlots）和消息正文（messages 表）
 * saveSlots 列表将不再包含巨大的 messages 数组，以提升首屏和列表加载速度
 */
export async function persistSlots(key: string, slots: SaveSlot[]) {
  // 剥离消息正文后再存储元数据
  const metaOnly = slots.map(s => {
    const { messages, ...meta } = s;
    return meta;
  });
  await getStorageAdapter().setItem(key, JSON.stringify(metaOnly))
}

export async function loadSlotsFromStorage(key: string): Promise<SaveSlot[]> {
  try {
    const raw = await getStorageAdapter().getItem(key)
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return []
  }
}

export interface SaveSlice {
  saveSlots: SaveSlot[];
  saveGame: (slotId: string, name?: string) => Promise<void>;
  branchGame: (messages: Message[], name: string) => Promise<string>;
  renameSaveSlot: (slotId: string, newName: string) => void;
  loadGame: (slotId: string) => Promise<void>;
  deleteSaveSlot: (slotId: string) => void;
  startNewGame: (charId: string) => void;
}

export const createSaveSlice: StateCreator<AppState, [], [], SaveSlice> = (set, get) => ({
  saveSlots: [],

  saveGame: async (slotId, name) => {
    const state = get()
    const lastMsg = state.messages.length > 0 ? state.messages[state.messages.length - 1].content : '新存档'
    const existing = (state.saveSlots || []).find((s: SaveSlot) => s.id === slotId)
    
    // 1. 同步消息正文到独立表 (Dexie)
    await db.saveMessages(slotId, state.messages)

    // 2. 更新元数据
    const newSlot: SaveSlot = {
      id: slotId,
      name: name || existing?.name || `存档 - ${new Date().toLocaleString()}`,
      timestamp: Date.now(),
      characterId: state.selectedCharacter.id,
      summary: lastMsg.slice(0, 50) + (lastMsg.length > 50 ? '...' : ''),
      missions: state.missions,
      fragments: state.fragments,
    }

    set((s) => {
      const slots = (s.saveSlots || []).some(sl => sl.id === slotId)
        ? s.saveSlots.map(sl => sl.id === slotId ? newSlot : sl)
        : [...(s.saveSlots || []), newSlot]
      persistSlots(SAVE_KEY, slots)
      return { saveSlots: slots }
    })
  },

  branchGame: async (messages, name) => {
    const state = get()
    const parentSlotId = state.currentAutoSlotId
    const slotId = 'branch_' + Date.now()
    const lastMsg = messages.length > 0 ? messages[messages.length - 1].content : '分支起点'
    
    // 1. 同步消息正文到独立表 (Dexie)
    await db.saveMessages(slotId, messages)

    // 2. 深度克隆记忆结晶 (海马体)
    if (parentSlotId) {
      const parentEpisodes = await db.memoryEpisodes.where('slotId').equals(parentSlotId).toArray();
      if (parentEpisodes.length > 0) {
        const clonedEpisodes = parentEpisodes.map(({ id, ...ep }) => ({
          ...ep,
          slotId: slotId // 关联到新分支
        }));
        await db.memoryEpisodes.bulkAdd(clonedEpisodes);
        console.log(`[Branch] 已从 ${parentSlotId} 克隆 ${clonedEpisodes.length} 条记忆碎片`);
      }
    }

    const newSlot: SaveSlot = {
      id: slotId,
      name: name || `分支 - ${new Date().toLocaleString()}`,
      timestamp: Date.now(),
      characterId: state.selectedCharacter.id,
      summary: lastMsg.slice(0, 50) + (lastMsg.length > 50 ? '...' : ''),
      missions: state.missions,
      fragments: state.fragments,
    }

    set((s) => {
      const slots = [...(s.saveSlots || []), newSlot]
      persistSlots(SAVE_KEY, slots)
      return { saveSlots: slots }
    })
    
    return slotId
  },

  renameSaveSlot: (slotId, newName) => {
    set((s) => {
      const slots = (s.saveSlots || []).map(sl => sl.id === slotId ? { ...sl, name: newName } : sl)
      persistSlots(SAVE_KEY, slots)
      return { saveSlots: slots }
    })
  },

  loadGame: async (slotId) => {
    const state = get()
    const slot = (state.saveSlots || []).find((s: SaveSlot) => s.id === slotId)
    if (!slot) return
    
    // 核心优化：按需从独立表拉取消息正文
    const storedMessages = await db.getMessagesBySlot(slotId)
    const messages = storedMessages.length > 0 
      ? storedMessages.map(({ slotId: _slotId, timestamp: _ts, id: _id, ...m }) => m as Message) 
      : [];

    const char = (state.characters || []).find(c => c.id === slot.characterId) || state.characters[0]
    set({
      selectedCharacter: char,
      messages: messages,
      missions: slot.missions,
      fragments: slot.fragments,
      currentView: 'main',
      isGreetingSession: false,
      currentAutoSlotId: slotId.startsWith('auto_') ? slotId : null,
    })
  },

  deleteSaveSlot: (slotId) => {
    set((s) => {
      const slots = (s.saveSlots || []).filter(sl => sl.id !== slotId)
      persistSlots(SAVE_KEY, slots)
      // 同步删除独立消息表
      db.messages.where('slotId').equals(slotId).delete()
      return {
        saveSlots: slots,
        currentAutoSlotId: s.currentAutoSlotId === slotId ? null : s.currentAutoSlotId,
      }
    })
  },

  startNewGame: (charId) => {
    const state = get()
    const char = (state.characters || []).find(c => c.id === charId) || state.characters[0]
    const charWithoutAttrs = { ...char, attributes: {} }
    const activePersona = state.config.personas.find(p => p.id === state.config.activePersonaId) || state.config.personas[0]
    const userName = activePersona?.name || 'Observer'
    const finalGreeting = charWithoutAttrs.greeting
      ? replaceMacros(charWithoutAttrs.greeting, userName, charWithoutAttrs.name)
      : undefined
    set({
      characters: (state.characters || []).map(c => c.id === charId ? charWithoutAttrs : c),
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
})

export { SAVE_KEY, MULTI_SAVE_KEY }

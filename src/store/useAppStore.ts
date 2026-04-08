import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { DEFAULT_CHARACTERS, INITIAL_DIRECTIVES, INITIAL_PROVIDERS } from './constants'
import { getStorageAdapter } from '../storage'
import { db } from '../storage/db'
import { createChatSlice, type ChatSlice } from './chatSlice'
import { createCharacterSlice, type CharacterSlice } from './characterSlice'
import { createConfigSlice, type ConfigSlice } from './configSlice'
import { createSaveSlice, type SaveSlice, loadSlotsFromStorage, SAVE_KEY, MULTI_SAVE_KEY } from './saveSlice'
import { createUISlice, type UISlice } from './uiSlice'

// 导入统一的类型定义
import type { 
  CharacterCard, 
  Message, 
  WorldBookEntry, 
  Directive, 
  Mission, 
  RegexRule,
  UserPersona,
  TagTemplate,
  CharacterAsset
} from '../types/chat'

import type {
  WorldBook,
  Provider,
  ThemeMode,
  DebugEntry,
  SaveSlot,
  TtsSettings
} from '../types/store'

export type { 
  CharacterCard, 
  Message, 
  WorldBookEntry, 
  Directive, 
  Mission, 
  RegexRule,
  UserPersona,
  TagTemplate,
  CharacterAsset,
  WorldBook,
  Provider,
  ThemeMode,
  DebugEntry,
  SaveSlot,
  TtsSettings
}

interface AppState extends ChatSlice, CharacterSlice, ConfigSlice, SaveSlice, UISlice {
  _hasHydrated: boolean;
  setHasHydrated: (val: boolean) => void;
}

const INITIAL_CONFIG = {
  worldBookLibrary: [], 
  theme: 'system' as ThemeMode,
  directives: INITIAL_DIRECTIVES,
  providers: INITIAL_PROVIDERS,
  activeProviderId: 'default',
  activeEmbeddingProviderId: '',
  activeTtsProviderId: '',
  enabledSkillIds: [],
  personas: [{ id: 'p1', name: 'Observer', description: '最初的观察者', background: '你是一个意识，正在通过回声系统与外界通讯。' }],
  activePersonaId: 'p1',
  isDebugEnabled: false,
  fontFamily: 'Noto Sans SC',
  fontSize: 16,
  customCss: '',
  customBg: false,
  regexRules: [],
  appLock: { enabled: false, pinHash: '', timeoutMinutes: 5 },
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...createChatSlice(set, get),
      ...createCharacterSlice(set, get, DEFAULT_CHARACTERS),
      ...createConfigSlice(set, get, INITIAL_CONFIG),
      ...createSaveSlice(set, get),
      ...createUISlice(set, get),

      _hasHydrated: false,
      setHasHydrated: (val) => set({ _hasHydrated: val }),
    }),
    {
      name: 'echo-storage-v16',
      storage: createJSONStorage(() => ({
        getItem: (key) => getStorageAdapter().getItem(key),
        setItem: (key, value) => getStorageAdapter().setItem(key, value),
        removeItem: (key) => getStorageAdapter().removeItem(key),
      })),
      onRehydrateStorage: () => (state, error) => {
        if (error) console.error('[echo] rehydrate failed:', error)
        if (state) {
          state.setHasHydrated(true)
          
          Promise.all([
            loadSlotsFromStorage(SAVE_KEY),
            loadSlotsFromStorage(MULTI_SAVE_KEY),
            // 恢复当前会话消息（从 db.messages 而非 KV）
            state.currentAutoSlotId
              ? db.getMessagesBySlot(state.currentAutoSlotId)
              : Promise.resolve(null),
          ]).then(([saveSlots, multiSaveSlots, storedMessages]) => {
            const patch: Record<string, any> = { saveSlots, multiSaveSlots }
            if (storedMessages && storedMessages.length > 0) {
              patch.messages = storedMessages.map(({ slotId, timestamp, id, ...m }: any) => m)
            }
            useAppStore.setState(patch)
          }).catch(err => console.error('[echo] async load failed:', err))
        }
      },
      partialize: (state) => ({
          config: state.config,
          currentView: state.currentView,
          characters: state.characters.map(c => c.id.startsWith('custom-') ? { ...c, image: '' } : c),
          selectedCharacter: state.selectedCharacter.id.startsWith('custom-') ? { ...state.selectedCharacter, image: '' } : state.selectedCharacter, 
          secondaryCharacter: state.secondaryCharacter ? (state.secondaryCharacter.id.startsWith('custom-') ? { ...state.secondaryCharacter, image: '' } : state.secondaryCharacter) : null,
          routerProviderId: state.routerProviderId,
          multiCharMode: state.multiCharMode,
          isGreetingSession: state.isGreetingSession,
          missions: state.missions, 
          fragments: state.fragments,
          currentAutoSlotId: state.currentAutoSlotId,
          ttsSettings: state.ttsSettings,
        }),
    }
  )
)

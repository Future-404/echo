import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { STORE_KEY } from './persist'
import { DEFAULT_CSS_PACKAGES } from '../styles/themePresets'
import { DEFAULT_CHARACTERS, INITIAL_DIRECTIVES, INITIAL_PROVIDERS } from './constants'
import { DEFAULT_MODEL_CONFIG } from '../types/modelConfig'
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
  TtsSettings,
  PromptPreset
} from '../types/store'

import type { ModelConfig } from '../types/modelConfig'
export type { ModelConfig }

import type { CssPackage } from './configSlice'

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
  TtsSettings,
  PromptPreset,
  CssPackage
}

interface AppState extends ChatSlice, CharacterSlice, ConfigSlice, SaveSlice, UISlice {
  _hasHydrated: boolean;
  setHasHydrated: (val: boolean) => void;
}

const INITIAL_CONFIG = {
  worldBookLibrary: [], 
  theme: 'system' as ThemeMode,
  directives: INITIAL_DIRECTIVES,
  promptPresets: [],
  providers: INITIAL_PROVIDERS,
  activeProviderId: 'default',
  modelConfig: DEFAULT_MODEL_CONFIG,
  enabledSkillIds: [],
  personas: [{ id: 'p1', name: 'Observer', description: '最初的观察者', background: '你是一个意识，正在通过回声系统与外界通讯。' }],
  activePersonaId: 'p1',
  isDebugEnabled: false,
  fontFamily: 'Noto Sans SC',
  fontSize: 16,
  customCss: '',
  cssPackages: DEFAULT_CSS_PACKAGES,
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
      name: STORE_KEY,
      storage: createJSONStorage(() => ({
        getItem: (key) => getStorageAdapter().getItem(key),
        setItem: (key, value) => getStorageAdapter().setItem(key, value),
        removeItem: (key) => getStorageAdapter().removeItem(key),
      })),
      onRehydrateStorage: () => (state, error) => {
        if (error) console.error('[echo] rehydrate failed:', error)
        if (state) {
          // 旧数据迁移：补全默认 CSS 包
          const hasPresets = (state.config.cssPackages || []).some(
            (p: any) => p.id === 'preset-cyber-echo' || p.id === 'preset-social-chat'
          )
          if (!hasPresets) {
            state.config.cssPackages = [
              ...DEFAULT_CSS_PACKAGES,
              ...(state.config.cssPackages || []),
            ]
          }
          // 旧数据迁移：将散落的 provider id 字段合并到 modelConfig
          if (!state.config.modelConfig) {
            const legacy = state as any
            state.config.modelConfig = {
              chatProviderId: state.config.activeProviderId || 'default',
              embeddingProviderId: legacy.activeEmbeddingProviderId || state.config.activeEmbeddingProviderId || '',
              ttsProviderId: legacy.activeTtsProviderId || state.config.activeTtsProviderId || '',
              routerProviderId: legacy.routerProviderId || '',
              summaryProviderId: '',
            }
          }
          state.setHasHydrated(true)
          
          Promise.all([
            loadSlotsFromStorage(SAVE_KEY),
            loadSlotsFromStorage(MULTI_SAVE_KEY),
            // 有 slotId：从 db 恢复对话消息；无 slotId（开场白）：保留 KV 里的 messages
            state.currentAutoSlotId
              ? db.getMessagesBySlot(state.currentAutoSlotId)
              : Promise.resolve(null),
          ]).then(([saveSlots, multiSaveSlots, storedMessages]) => {
            const patch: Record<string, any> = { saveSlots, multiSaveSlots }
            if (storedMessages && storedMessages.length > 0) {
              // 有 slotId：用 db 消息覆盖（去掉 db 专用字段）
              patch.messages = storedMessages.map(({ slotId, timestamp, id, ...m }: any) => m)
            }
            // 无 storedMessages 且无 slotId：messages 已从 KV 恢复，不覆盖
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
          multiCharMode: state.multiCharMode,
          isGreetingSession: state.isGreetingSession,
          // 开场白阶段（无 slotId）消息只存内存，需要持久化以便刷新恢复
          messages: state.currentAutoSlotId ? [] : state.messages,
          missions: state.missions, 
          fragments: state.fragments,
          currentAutoSlotId: state.currentAutoSlotId,
          ttsSettings: state.ttsSettings,
        }),
    }
  )
)

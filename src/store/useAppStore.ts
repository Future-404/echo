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
import { createArchiveSlice, type ArchiveSlice } from './archiveSlice'
import { createTweetSlice, type TweetSlice } from './tweetSlice'
import type { AppState } from './storeTypes'

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

export type { AppState }

const INITIAL_CONFIG = {
  worldBookLibrary: [], 
  theme: 'system' as ThemeMode,
  directives: INITIAL_DIRECTIVES,
  promptPresets: [],
  providers: INITIAL_PROVIDERS,
  activeProviderId: 'default',
  modelConfig: DEFAULT_MODEL_CONFIG,
  enabledSkillIds: [],
  deviceContextEnabled: false,
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
      ...createCharacterSlice(DEFAULT_CHARACTERS)(set, get),
      ...createConfigSlice(INITIAL_CONFIG)(set, get),
      ...createSaveSlice(set, get),
      ...createUISlice(set, get),
      ...createArchiveSlice(set, get),
      ...createTweetSlice(set, get),

      _hasHydrated: false,
      setHasHydrated: (val) => set({ _hasHydrated: val }),
    }),
    {
      name: STORE_KEY,
      storage: createJSONStorage(() => ({
        // 底層是 IndexedDB（DexieStorageAdapter），不是 window.localStorage
        getItem: (key) => getStorageAdapter().getItem(key),
        setItem: (key, value) => getStorageAdapter().setItem(key, value),
        removeItem: (key) => getStorageAdapter().removeItem(key),
      })),
      // 优化：节流持久化，减少写入频率
      skipHydration: false,
      onRehydrateStorage: () => (state, error) => {
        if (error) console.error('[echo] rehydrate failed:', error)
        if (state) {
          // 旧数据迁移：补全默认 CSS 包
          const hasPresets = (state.config.cssPackages || []).some(
            (p) => p.id === 'preset-cyber-echo' || p.id === 'preset-social-chat'
          )
          if (!hasPresets) {
            state.config.cssPackages = [
              ...DEFAULT_CSS_PACKAGES,
              ...(state.config.cssPackages || []),
            ]
          } else {
            // 更新预设包 CSS 到最新版本（不影响用户自建包）
            state.config.cssPackages = (state.config.cssPackages || []).map(p => {
              const preset = DEFAULT_CSS_PACKAGES.find(d => d.id === p.id)
              return preset ? { ...p, css: preset.css, name: preset.name } : p
            })
          }
          // 旧数据迁移：将散落的 provider id 字段合并到 modelConfig
          if (!state.config.modelConfig) {
            const legacy = state as AppState & { activeEmbeddingProviderId?: string; activeTtsProviderId?: string; routerProviderId?: string }
            state.config.modelConfig = {
              chatProviderId: state.config.activeProviderId || 'default',
              embeddingProviderId: legacy.activeEmbeddingProviderId || '',
              ttsProviderId: legacy.activeTtsProviderId || '',
              routerProviderId: legacy.routerProviderId || '',
              summaryProviderId: '',
            }
          }
          state.setHasHydrated(true)
          
          Promise.all([
            loadSlotsFromStorage(SAVE_KEY),
            loadSlotsFromStorage(MULTI_SAVE_KEY),
            state.currentAutoSlotId
              ? db.getMessagesBySlot(state.currentAutoSlotId)
              : Promise.resolve(null),
            db.worldEntries.toArray(),
            // 从 Dexie characters 表恢复自定义角色（包含私设 worldBook）
            db.characters.toArray(),
          ]).then(([saveSlots, multiSaveSlots, storedMessages, allWorldEntries, dbChars]) => {
            const patch: Partial<AppState> = { saveSlots, multiSaveSlots }
            if (storedMessages && storedMessages.length > 0) {
              patch.messages = storedMessages.map(({ slotId: _s, timestamp: _t, id: _i, ...m }) => m as Message)
            }

            const currentState = useAppStore.getState()

            // 用 Dexie characters 表中的自定义角色覆盖 kvStore 里的版本（Dexie 为主存储）
            let characters = currentState.characters || []
            if (dbChars.length > 0) {
              const dbCharMap = new Map(dbChars.map(c => [c.id, c]))
              characters = characters.map(c => dbCharMap.has(c.id) ? { ...dbCharMap.get(c.id)!, image: c.image } : c)
              // 补充 kvStore 里没有但 Dexie 有的角色（极端情况：kvStore 被清空）
              dbChars.forEach(dc => {
                if (!characters.find(c => c.id === dc.id)) characters = [...characters, dc]
              })
            }

            // worldEntries 表只存全局世界书（按 ownerId 分组）
            const entriesByOwner = allWorldEntries.reduce<Record<string, typeof allWorldEntries>>((acc, e) => {
              ;(acc[e.ownerId] ||= []).push(e)
              return acc
            }, {})

            patch.config = {
              ...currentState.config,
              worldBookLibrary: (currentState.config.worldBookLibrary || []).map(b => ({
                ...b,
                entries: (entriesByOwner[b.id] || []).map(({ ownerId: _o, updatedAt: _u, ...e }) => e),
              })),
            }

            // 角色私设已在 characters 表中，无需从 worldEntries 回填
            patch.characters = characters
            patch.selectedCharacter = characters.find(c => c.id === currentState.selectedCharacter.id) || currentState.selectedCharacter
            if (currentState.secondaryCharacter) {
              patch.secondaryCharacter = rehydrateChar(
                characters.find(c => c.id === currentState.secondaryCharacter!.id) || currentState.secondaryCharacter
              )
            }

            useAppStore.setState(patch)
          }).catch(err => console.error('[echo] async load failed:', err))
        }
      },
      partialize: (state) => ({
          config: {
            ...state.config,
            // worldBook 条目已存 Dexie，只保留书的元数据（id/name），不存 entries
            worldBookLibrary: (state.config.worldBookLibrary || []).map(({ entries: _e, ...meta }) => meta),
          },
          currentView: state.currentView,
          // 角色卡存完整数据（包含私设 worldBook），只剥离 image（存 imageDb）
          characters: state.characters.map(c => ({
            ...c,
            image: c.id.startsWith('custom-') ? '' : c.image,
          })),
          selectedCharacter: state.selectedCharacter.id.startsWith('custom-')
            ? { ...state.selectedCharacter, image: '' }
            : state.selectedCharacter,
          secondaryCharacter: state.secondaryCharacter
            ? (state.secondaryCharacter.id.startsWith('custom-')
                ? { ...state.secondaryCharacter, image: '' }
                : state.secondaryCharacter)
            : null,
          multiCharMode: state.multiCharMode,
          isGreetingSession: state.isGreetingSession,
          messages: state.currentAutoSlotId ? [] : state.messages,
          missions: state.missions,
          fragments: state.fragments,
          currentAutoSlotId: state.currentAutoSlotId,
          ttsSettings: state.ttsSettings,
          archiveStats: state.archiveStats, // ← 添加档案统计数据
        }),
    }
  )
)

// 开发环境暴露 store 到 window 用于测试
if (import.meta.env.DEV) {
  ;(window as any).__ECHO_STORE__ = useAppStore.getState()
  useAppStore.subscribe(() => {
    ;(window as any).__ECHO_STORE__ = useAppStore.getState()
  })
}

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { DEFAULT_CHARACTERS, INITIAL_DIRECTIVES, INITIAL_MISSIONS, INITIAL_PROVIDERS } from './constants'
import { getStorageAdapter } from '../storage'
import { createChatSlice, type ChatSlice } from './chatSlice'
import { createCharacterSlice, type CharacterSlice } from './characterSlice'
import { createConfigSlice, type ConfigSlice } from './configSlice'
import { createSaveSlice, type SaveSlice } from './saveSlice'

export interface WorldBookEntry { 
  id: string; 
  keys: string[]; 
  content: string; 
  enabled: boolean; 
  comment?: string;
  insertionOrder?: number;
  constant?: boolean;
  position?: 0 | 1; // 0=before_char, 1=after_char (ST 规范)
  extensions?: Record<string, any>;
}

export interface WorldBook {
  id: string;
  name: string;
  scanDepth?: number;
  entries: WorldBookEntry[];
}

export interface TagTemplate {
  id: string;
  name: string;
  fields: string[];
  originalRegex?: string;
  replaceString?: string;
  enabled: boolean;
  placement?: number[]; // ST 兼容：1=存储层, 2=渲染层，默认 [1,2]
}

export type CharacterAsset = {
  type: 'icon' | 'background' | 'emotion' | string;
  uri: string;
  name: string;
  ext: string;
}

export type CharacterCard = { 
  id: string; 
  name: string; 
  image: string; 
  description: string; 
  systemPrompt: string; 
  postHistoryInstructions?: string;
  alternateGreetings?: string[];
  greeting?: string;
  attributes?: Record<string, any>;
  providerId?: string;
  depthPrompt?: { content: string; depth: number; role: 'system' | 'user' | 'assistant' }; // ST depth_prompt
  extensions?: {
    missions?: Mission[];
    directives?: Directive[];
    worldBook?: WorldBookEntry[];
    worldBookIds?: string[];
    tagTemplates?: TagTemplate[];
    luminescence?: any;
    assets?: CharacterAsset[];
    activeEmotion?: string;
    activeBackground?: string;
  }
}

export interface Message { 
  role: 'user' | 'assistant' | 'system' | 'tool'; 
  content: string; 
  tool_call_id?: string; 
  name?: string;
  tool_calls?: any[];
  isGreeting?: boolean;
  speakerId?: string; // 发言者 id：角色 id 或 'user' 或 'narrator'
}

export interface Provider { 
  id: string; 
  name: string; 
  apiKey: string; 
  endpoint: string; 
  model: string;
  temperature?: number;
  topP?: number;
  contextWindow?: number;
  stream?: boolean;
  apiFormat?: 'openai' | 'anthropic' | 'gemini';
}

export interface Directive { id: string; title: string; content: string; enabled: boolean }
export interface Mission { id: string; title: string; type: 'MAIN' | 'SIDE'; progress: number; status: 'ACTIVE' | 'COMPLETED' | 'FAILED'; description?: string }
export type ThemeMode = 'light' | 'dark' | 'system'
export interface UserPersona { 
  id: string; 
  name: string; 
  surname?: string;    // {{user_surname}} 姓氏
  nickname?: string;   // {{user_nickname}} 昵称
  description: string; 
  background: string;
  worldBook?: WorldBookEntry[];
  avatarId?: string; // IndexedDB key: `persona-${id}`
}

export interface DebugEntry {
  id: string;
  timestamp: number;
  direction: 'OUT' | 'IN' | 'ERR';
  label: string;
  data: any;
}

export interface SaveSlot {
  id: string;
  name?: string;
  timestamp: number;
  characterId: string;
  secondaryCharacterId?: string; // 三人聊天副角色
  messages: Message[];
  summary: string;
  missions: Mission[];
  fragments: string[];
}

interface AppState extends ChatSlice, CharacterSlice, ConfigSlice, SaveSlice {
  isLoading: boolean; 
  isConfigOpen: boolean;
  isDialogueFullscreen: boolean;
  currentView: 'home' | 'main' | 'selection' | 'multi-selection' | 'save' | 'load' | 'help';
  configSubView: 'main' | 'advanced' | 'gateway' | 'world' | 'prompt' | 'provider-edit' | 'directive-edit' | 'skills' | 'persona' | 'debug' | 'parsers' | 'appearance';
  lastInteraction: { x: number; y: number } | null; 
  isInteracting: boolean;
  debugLogs: DebugEntry[];

  // 三人聊天
  secondaryCharacter: CharacterCard | null;
  routerProviderId: string;
  multiCharMode: boolean;
  multiSaveSlots: SaveSlot[];
  setSecondaryCharacter: (char: CharacterCard | null) => void;
  setRouterProviderId: (id: string) => void;
  setMultiCharMode: (enabled: boolean) => void;
  saveMultiGame: (slotId: string, name?: string) => void;
  loadMultiGame: (slotId: string) => void;
  deleteMultiSaveSlot: (slotId: string) => void;
  
  _hasHydrated: boolean;
  setHasHydrated: (val: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setIsConfigOpen: (open: boolean, subView?: AppState['configSubView']) => void;
  setConfigSubView: (view: AppState['configSubView']) => void;
  setCurrentView: (view: 'home' | 'main' | 'selection' | 'multi-selection' | 'save' | 'load' | 'help') => void;
  setDialogueFullscreen: (v: boolean) => void;
  setInteraction: (x: number, y: number, interacting: boolean) => void;
  addDebugLog: (entry: Omit<DebugEntry, 'id' | 'timestamp'>) => void;
  clearDebugLogs: () => void;
}

const INITIAL_CONFIG = {
  worldBookLibrary: [], 
  theme: 'system' as ThemeMode,
  directives: INITIAL_DIRECTIVES,
  providers: INITIAL_PROVIDERS,
  activeProviderId: 'default',
  enabledSkillIds: ['manage_quest_state'],
  personas: [{ id: 'p1', name: 'Observer', description: '最初的观察者', background: '你是一个意识，正在通过回声系统与外界通讯。' }],
  activePersonaId: 'p1',
  isDebugEnabled: false,
  fontFamily: 'Noto Sans SC',
  fontSize: 16,
  customCss: '',
  customBg: false,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...createChatSlice(set, get),
      ...createCharacterSlice(set, get, DEFAULT_CHARACTERS),
      ...createConfigSlice(set, get, INITIAL_CONFIG),
      ...createSaveSlice(set, get),

      _hasHydrated: false,
      isLoading: true,
      isConfigOpen: false,
      isDialogueFullscreen: false,
      currentView: 'home',
      configSubView: 'main',
      lastInteraction: null,
      isInteracting: false,
      debugLogs: [],
      secondaryCharacter: null,
      routerProviderId: '',
      multiCharMode: false,
      multiSaveSlots: [],

      setHasHydrated: (val) => set({ _hasHydrated: val }),
      setIsLoading: (loading) => set({ isLoading: loading }),
      setIsConfigOpen: (open, subView) => set((state) => ({ 
        isConfigOpen: open, 
        configSubView: subView || (open ? state.configSubView : 'main') 
      })),
      setConfigSubView: (view) => set({ configSubView: view }),
      setCurrentView: (view) => set({ currentView: view }),
      setDialogueFullscreen: (v) => set({ isDialogueFullscreen: v }),
      setInteraction: (x, y, interacting) => set({ lastInteraction: interacting ? { x, y } : null, isInteracting: interacting }),
      
      addDebugLog: (entry) => set((state) => ({ 
        debugLogs: [{ ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, timestamp: Date.now() }, ...(state.debugLogs || [])].slice(0, 50) 
      })),
      clearDebugLogs: () => set({ debugLogs: [] }),
      setSecondaryCharacter: (char) => set({ secondaryCharacter: char }),
      setRouterProviderId: (id) => set({ routerProviderId: id }),
      setMultiCharMode: (enabled) => set({ multiCharMode: enabled }),

      saveMultiGame: (slotId, name) => {
        const state = get()
        const lastMsg = state.messages.length > 0 ? state.messages[state.messages.length - 1].content : '新游戏'
        const existing = (state.multiSaveSlots || []).find((s: SaveSlot) => s.id === slotId)
        const newSlot: SaveSlot = {
          id: slotId, name: name || existing?.name, timestamp: Date.now(),
          characterId: state.selectedCharacter.id,
          secondaryCharacterId: state.secondaryCharacter?.id,
          messages: state.messages,
          summary: lastMsg.slice(0, 50) + (lastMsg.length > 50 ? '...' : ''),
          missions: state.missions, fragments: state.fragments,
        }
        set((s: any) => ({
          multiSaveSlots: (s.multiSaveSlots || []).some((sl: SaveSlot) => sl.id === slotId)
            ? s.multiSaveSlots.map((sl: SaveSlot) => sl.id === slotId ? newSlot : sl)
            : [...(s.multiSaveSlots || []), newSlot]
        }))
      },

      loadMultiGame: (slotId) => {
        const state = get()
        const slot = (state.multiSaveSlots || []).find((s: SaveSlot) => s.id === slotId)
        if (!slot) return
        const charA = state.characters.find((c: CharacterCard) => c.id === slot.characterId) || state.characters[0]
        const charB = slot.secondaryCharacterId ? state.characters.find((c: CharacterCard) => c.id === slot.secondaryCharacterId) || null : null
        set({
          selectedCharacter: charA, secondaryCharacter: charB,
          messages: slot.messages, missions: slot.missions, fragments: slot.fragments,
          currentView: 'main', multiCharMode: true, isGreetingSession: false,
        })
      },

      deleteMultiSaveSlot: (slotId) => set((s: any) => ({
        multiSaveSlots: (s.multiSaveSlots || []).filter((sl: SaveSlot) => sl.id !== slotId)
      })),
    }),
    {
      name: 'echo-storage-v16',
      storage: createJSONStorage(() => ({
        getItem: (key) => getStorageAdapter().getItem(key),
        setItem: (key, value) => getStorageAdapter().setItem(key, value),
        removeItem: (key) => getStorageAdapter().removeItem(key),
      })),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
      partialize: (state) => ({
          config: state.config,
          currentView: state.currentView,
          characters: state.characters.map(c => c.id.startsWith('custom-') ? { ...c, image: '' } : c),
          selectedCharacter: state.selectedCharacter.id.startsWith('custom-') ? { ...state.selectedCharacter, image: '' } : state.selectedCharacter, 
          secondaryCharacter: state.secondaryCharacter ? (state.secondaryCharacter.id.startsWith('custom-') ? { ...state.secondaryCharacter, image: '' } : state.secondaryCharacter) : null,
          routerProviderId: state.routerProviderId,
          multiCharMode: state.multiCharMode,
          multiSaveSlots: state.multiSaveSlots,
          messages: state.messages,
          isGreetingSession: state.isGreetingSession,
          missions: state.missions, 
          fragments: state.fragments,
          saveSlots: state.saveSlots,
        }),
    }
  )
)

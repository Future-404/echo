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
  extensions?: {
    missions?: Mission[];
    directives?: Directive[];
    worldBook?: WorldBookEntry[];
    worldBookIds?: string[];
    tagTemplates?: TagTemplate[];
    luminescence?: any;
    customParsers?: CustomParser[];
  }
}

export interface Message { 
  role: 'user' | 'assistant' | 'system' | 'tool'; 
  content: string; 
  tool_call_id?: string; 
  name?: string;
  tool_calls?: any[];
  isGreeting?: boolean;
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
  description: string; 
  background: string;
  worldBook?: WorldBookEntry[];
}

export interface CustomParser {
  id: string;
  name: string;
  triggerRegex: string;
  hideFromChat: boolean;
  fields: { index: number; name: string }[];
  enabled: boolean;
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
  messages: Message[];
  summary: string;
  missions: Mission[];
  fragments: string[];
}

interface AppState extends ChatSlice, CharacterSlice, ConfigSlice, SaveSlice {
  isLoading: boolean; 
  isConfigOpen: boolean; 
  currentView: 'home' | 'main' | 'selection' | 'save' | 'load' | 'help';
  configSubView: 'main' | 'gateway' | 'world' | 'prompt' | 'provider-edit' | 'directive-edit' | 'skills' | 'persona' | 'debug' | 'parsers' | 'appearance';
  lastInteraction: { x: number; y: number } | null; 
  isInteracting: boolean;
  isHistoryExpanded: boolean;
  debugLogs: DebugEntry[];
  
  _hasHydrated: boolean;
  setHasHydrated: (val: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setIsConfigOpen: (open: boolean, subView?: AppState['configSubView']) => void;
  setConfigSubView: (view: AppState['configSubView']) => void;
  setCurrentView: (view: 'home' | 'main' | 'selection' | 'save' | 'load' | 'help') => void;
  setIsHistoryExpanded: (expanded: boolean) => void;
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
  customParsers: [],
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
      currentView: 'home',
      configSubView: 'main',
      lastInteraction: null,
      isInteracting: false,
      isHistoryExpanded: false,
      debugLogs: [],

      setHasHydrated: (val) => set({ _hasHydrated: val }),
      setIsLoading: (loading) => set({ isLoading: loading }),
      setIsConfigOpen: (open, subView) => set((state) => ({ 
        isConfigOpen: open, 
        configSubView: subView || (open ? state.configSubView : 'main') 
      })),
      setConfigSubView: (view) => set({ configSubView: view }),
      setCurrentView: (view) => set({ currentView: view }),
      setIsHistoryExpanded: (expanded) => set({ isHistoryExpanded: expanded }),
      setInteraction: (x, y, interacting) => set({ lastInteraction: interacting ? { x, y } : null, isInteracting: interacting }),
      
      addDebugLog: (entry) => set((state) => ({ 
        debugLogs: [{ ...entry, id: Date.now().toString(), timestamp: Date.now() }, ...(state.debugLogs || [])].slice(0, 50) 
      })),
      clearDebugLogs: () => set({ debugLogs: [] }),
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
        messages: state.messages,
        isGreetingSession: state.isGreetingSession,
        missions: state.missions, 
        fragments: state.fragments,
        saveSlots: state.saveSlots,
      }),
    }
  )
)

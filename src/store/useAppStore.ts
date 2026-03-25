import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { DEFAULT_CHARACTERS, INITIAL_DIRECTIVES, INITIAL_MISSIONS, INITIAL_PROVIDERS } from './constants'
import { getStorageAdapter } from '../storage'
import { replaceMacros } from '../logic/promptEngine'

export interface WorldBookEntry { 
  id: string; 
  keys: string[]; 
  content: string; 
  enabled: boolean; 
  comment?: string;
}

export interface WorldBook {
  id: string;
  name: string;
  entries: WorldBookEntry[];
}

export interface TagTemplate {
  id: string;
  name: string;
  fields: string[];
  originalRegex?: string;
  enabled: boolean;
}

export type CharacterCard = { 
  id: string; 
  name: string; 
  image: string; 
  description: string; 
  systemPrompt: string; 
  greeting?: string;
  attributes?: Record<string, any>;
  extensions?: {
    missions?: Mission[];
    directives?: Directive[];
    worldBook?: WorldBookEntry[]; // 恢复：角色私有记忆空间
    worldBookIds?: string[]; // 绑定到该角色的公共世界书 ID 列表
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
  worldBook?: WorldBookEntry[]; // 用户私设 / User Private Settings
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

interface ConfigState {
  worldBookLibrary: WorldBook[];
  directives: Directive[];
  providers: Provider[];
  activeProviderId: string;
  theme: ThemeMode;
  enabledSkillIds: string[];
  personas: UserPersona[];
  activePersonaId: string;
  isDebugEnabled: boolean;
  customParsers: CustomParser[];
  fontFamily: string;
}

interface AppState {
  isLoading: boolean; isConfigOpen: boolean; currentView: 'home' | 'main' | 'selection' | 'save' | 'load' | 'help'; config: ConfigState;
  configSubView: 'main' | 'gateway' | 'world' | 'prompt' | 'provider-edit' | 'directive-edit' | 'skills' | 'persona' | 'debug' | 'parsers' | 'appearance';
  lastInteraction: { x: number; y: number } | null; isInteracting: boolean;
  characters: CharacterCard[]; selectedCharacter: CharacterCard; messages: Message[]; isTyping: boolean;
  isGreetingSession: boolean;
  missions: Mission[]; fragments: string[];
  saveSlots: SaveSlot[];
  isHistoryExpanded: boolean;
  currentAutoSlotId: string | null;
  debugLogs: DebugEntry[];
  
  setIsLoading: (loading: boolean) => void;
  setIsConfigOpen: (open: boolean, subView?: AppState['configSubView']) => void;
  setConfigSubView: (view: AppState['configSubView']) => void;
  setCurrentView: (view: 'home' | 'main' | 'selection' | 'save' | 'load' | 'help') => void;
  setIsHistoryExpanded: (expanded: boolean) => void;
  updateConfig: (newConfig: Partial<ConfigState>) => void;
  updateFontFamily: (font: string) => void;
  setSelectedCharacter: (char: CharacterCard) => void;
  addMessage: (msg: Message) => void;
  clearMessages: () => void;
  rollbackMessages: (index: number, shouldBranch?: boolean) => void;
  setIsTyping: (typing: boolean) => void;
  setInteraction: (x: number, y: number, interacting: boolean) => void;
  
  addProvider: (provider: Provider) => void;
  updateProvider: (id: string, updates: Partial<Provider>) => void;
  removeProvider: (id: string) => void;
  setActiveProvider: (id: string) => void;

  addCustomParser: (parser: CustomParser) => void;
  updateCustomParser: (id: string, updates: Partial<CustomParser>) => void;
  removeCustomParser: (id: string) => void;
  
  // 公共书库管理
  addWorldBook: (book: WorldBook) => void;
  updateWorldBook: (id: string, updates: Partial<WorldBook>) => void;
  removeWorldBook: (id: string) => void;
  addWorldBookEntry: (bookId: string, entry: WorldBookEntry) => void;
  updateWorldBookEntry: (bookId: string, entryId: string, updates: Partial<WorldBookEntry>) => void;
  removeWorldBookEntry: (bookId: string, entryId: string) => void;

  // 恢复：角色私有记忆管理 (操作当前选中的角色)
  addPrivateWorldBookEntry: (entry: WorldBookEntry) => void;
  updatePrivateWorldBookEntry: (id: string, updates: Partial<WorldBookEntry>) => void;
  removePrivateWorldBookEntry: (id: string) => void;

  updateAttributes: (charId: string, attributes: Record<string, any>) => void;
  addTagTemplate: (charId: string, template: TagTemplate) => void;

  addDirective: (directive: Directive) => void;
  updateDirective: (id: string, updates: Partial<Directive>) => void;
  removeDirective: (id: string) => void;
  reorderDirectives: (directives: Directive[]) => void;
  setMissions: (missions: Mission[]) => void;
  updateMission: (id: string, updates: Partial<Mission>) => void;
  addFragment: (text: string) => void;
  toggleSkill: (skillId: string) => void;

  addDebugLog: (entry: Omit<DebugEntry, 'id' | 'timestamp'>) => void;
  clearDebugLogs: () => void;

  autoSave: () => void;
  saveGame: (slotId: string, name?: string) => void;
  renameSaveSlot: (slotId: string, newName: string) => void;
  loadGame: (slotId: string) => void;
  deleteSaveSlot: (slotId: string) => void;
  startNewGame: (charId: string) => void;
  
  addCharacter: (char: CharacterCard) => Promise<void>;
  updateCharacter: (id: string, updates: Partial<CharacterCard>) => Promise<void>;
  removeCharacter: (id: string) => Promise<void>;
  syncImagesFromDb: () => Promise<void>;

  addPersona: (persona: UserPersona) => void;
  updatePersona: (id: string, updates: Partial<UserPersona>) => void;
  removePersona: (id: string) => void;
  setActivePersona: (id: string) => void;
  addPersonaWorldBookEntry: (personaId: string, entry: WorldBookEntry) => void;
  updatePersonaWorldBookEntry: (personaId: string, entryId: string, updates: Partial<WorldBookEntry>) => void;
  removePersonaWorldBookEntry: (personaId: string, entryId: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
    isLoading: true, isConfigOpen: false, currentView: 'home', isTyping: false, lastInteraction: null, isInteracting: false,
    isGreetingSession: false,
    isHistoryExpanded: false,
    configSubView: 'main',
    currentAutoSlotId: null,
    debugLogs: [],
    config: {
      worldBookLibrary: [], theme: 'system',
      directives: INITIAL_DIRECTIVES,
      providers: INITIAL_PROVIDERS,
      activeProviderId: 'default',
      enabledSkillIds: ['manage_quest_state'],
      personas: [{ id: 'p1', name: 'Observer', description: '最初的观察者', background: '你是一个意识，正在通过回声系统与外界通讯。' }],
      activePersonaId: 'p1',
      isDebugEnabled: false,
      fontFamily: 'Noto Sans SC',
      customParsers: [],
    },
      characters: DEFAULT_CHARACTERS,
      selectedCharacter: DEFAULT_CHARACTERS[0],
      messages: [],
      missions: INITIAL_MISSIONS,
      fragments: [],
      saveSlots: [],

      setIsLoading: (loading) => set({ isLoading: loading }),
      setIsConfigOpen: (open, subView) => set((state) => ({ 
        isConfigOpen: open, 
        configSubView: subView || (open ? state.configSubView : 'main') 
      })),
      setConfigSubView: (view) => set({ configSubView: view }),
      setCurrentView: (view) => set({ currentView: view }),
      setIsHistoryExpanded: (expanded) => set({ isHistoryExpanded: expanded }),
      updateConfig: (newConfig) => set((state) => ({ config: { ...state.config, ...newConfig } })),
      
      setSelectedCharacter: (char) => {
        const state = get();
        const activePersona = state.config.personas.find(p => p.id === state.config.activePersonaId) || state.config.personas[0];
        const userName = activePersona?.name || 'Observer';
        const finalGreeting = char.greeting ? replaceMacros(char.greeting, userName, char.name) : undefined;
        
        set({ 
          selectedCharacter: char, 
          currentView: 'main', 
          messages: finalGreeting ? [{ role: 'assistant', content: finalGreeting }] : [],
          isGreetingSession: true,
          isTyping: false,
          missions: char.extensions?.missions || INITIAL_MISSIONS,
        })
      },
      addMessage: (msg) => {
        set((state) => ({ messages: [...state.messages, msg] }));
        get().autoSave();
      },
      clearMessages: () => set({ messages: [] }),
      rollbackMessages: (index, shouldBranch = false) => {
        set((state) => ({ 
          messages: index < 0 ? [] : state.messages.slice(0, index + 1),
          isTyping: false,
          currentAutoSlotId: shouldBranch ? null : state.currentAutoSlotId
        }));
        get().autoSave();
      },
      setIsTyping: (typing) => set({ isTyping: typing }),
      setInteraction: (x, y, interacting) => set({ lastInteraction: interacting ? { x, y } : null, isInteracting: interacting }),
      
      addProvider: (provider) => set((state) => ({ config: { ...state.config, providers: [...(state.config.providers || []), provider] } })),
      updateProvider: (id, updates) => set((state) => ({ config: { ...state.config, providers: (state.config.providers || []).map(p => p.id === id ? { ...p, ...updates } : p) } })),
      removeProvider: (id) => set((state) => ({ config: { ...state.config, providers: (state.config.providers || []).filter(p => p.id !== id), activeProviderId: state.config.activeProviderId === id ? 'default' : state.config.activeProviderId } })),
      setActiveProvider: (id) => set((state) => ({ config: { ...state.config, activeProviderId: id } })),
      
      addCustomParser: (parser) => set((state) => ({ config: { ...state.config, customParsers: [...(state.config.customParsers || []), parser] } })),
      updateCustomParser: (id, updates) => set((state) => ({ config: { ...state.config, customParsers: (state.config.customParsers || []).map(p => p.id === id ? { ...p, ...updates } : p) } })),
      removeCustomParser: (id) => set((state) => ({ config: { ...state.config, customParsers: (state.config.customParsers || []).filter(p => p.id !== id) } })),

      addWorldBook: (book) => set((state) => ({ config: { ...state.config, worldBookLibrary: [...(state.config.worldBookLibrary || []), book] } })),
      updateWorldBook: (id, updates) => set((state) => ({ 
        config: { ...state.config, worldBookLibrary: (state.config.worldBookLibrary || []).map(b => b.id === id ? { ...b, ...updates } : b) } 
      })),
      removeWorldBook: (id) => set((state) => ({ 
        config: { ...state.config, worldBookLibrary: (state.config.worldBookLibrary || []).filter(b => b.id !== id) } 
      })),
      addWorldBookEntry: (bookId, entry) => set((state) => ({
        config: {
          ...state.config,
          worldBookLibrary: (state.config.worldBookLibrary || []).map(b => b.id === bookId ? { ...b, entries: [...(b.entries || []), entry] } : b)
        }
      })),
      updateWorldBookEntry: (bookId, entryId, updates) => set((state) => ({
        config: {
          ...state.config,
          worldBookLibrary: (state.config.worldBookLibrary || []).map(b => b.id === bookId ? {
            ...b,
            entries: (b.entries || []).map(e => e.id === entryId ? { ...e, ...updates } : e)
          } : b)
        }
      })),
      removeWorldBookEntry: (bookId, entryId) => set((state) => ({
        config: {
          ...state.config,
          worldBookLibrary: (state.config.worldBookLibrary || []).map(b => b.id === bookId ? {
            ...b,
            entries: (b.entries || []).filter(e => e.id !== entryId)
          } : b)
        }
      })),

      // 私有记忆管理实现
      addPrivateWorldBookEntry: (entry) => set((state) => {
        const char = state.selectedCharacter;
        const currentEntries = char.extensions?.worldBook || [];
        const updatedChar = { ...char, extensions: { ...char.extensions, worldBook: [...currentEntries, entry] } };
        return {
          selectedCharacter: updatedChar,
          characters: (state.characters || []).map(c => c.id === char.id ? updatedChar : c)
        }
      }),
      updatePrivateWorldBookEntry: (id, updates) => set((state) => {
        const char = state.selectedCharacter;
        const currentEntries = char.extensions?.worldBook || [];
        const updatedEntries = (currentEntries || []).map(e => e.id === id ? { ...e, ...updates } : e);
        const updatedChar = { ...char, extensions: { ...char.extensions, worldBook: updatedEntries } };
        return {
          selectedCharacter: updatedChar,
          characters: (state.characters || []).map(c => c.id === char.id ? updatedChar : c)
        }
      }),
      removePrivateWorldBookEntry: (id) => set((state) => {
        const char = state.selectedCharacter;
        const currentEntries = char.extensions?.worldBook || [];
        const updatedEntries = (currentEntries || []).filter(e => e.id !== id);
        const updatedChar = { ...char, extensions: { ...char.extensions, worldBook: updatedEntries } };
        return {
          selectedCharacter: updatedChar,
          characters: (state.characters || []).map(c => c.id === char.id ? updatedChar : c)
        }
      }),

      updateAttributes: (charId, newAttrs) => set((state) => {
        const char = (state.characters || []).find(c => c.id === charId);
        if (!char) return {};
        const updatedChar = { ...char, attributes: { ...(char.attributes || {}), ...newAttrs } };
        return {
          characters: (state.characters || []).map(c => c.id === charId ? updatedChar : c),
          selectedCharacter: state.selectedCharacter.id === charId ? updatedChar : state.selectedCharacter
        };
      }),

      addTagTemplate: (charId, template) => set((state) => {
        const char = (state.characters || []).find(c => c.id === charId);
        if (!char) return {};
        const templates = [...(char.extensions?.tagTemplates || []), template];
        const updatedChar = { ...char, extensions: { ...char.extensions, tagTemplates: templates } };
        return {
          characters: (state.characters || []).map(c => c.id === charId ? updatedChar : c),
          selectedCharacter: state.selectedCharacter.id === charId ? updatedChar : state.selectedCharacter
        };
      }),

      addDirective: (directive) => set((state) => ({ config: { ...state.config, directives: [...(state.config.directives || []), directive] } })),
      updateDirective: (id, updates) => set((state) => ({ config: { ...state.config, directives: (state.config.directives || []).map(d => d.id === id ? { ...d, ...updates } : d) } })),
      removeDirective: (id) => set((state) => ({ config: { ...state.config, directives: (state.config.directives || []).filter(d => d.id !== id) } })),
      reorderDirectives: (directives) => set((state) => ({ config: { ...state.config, directives } })),
      
      setMissions: (missions) => set({ missions }),
      updateMission: (id, updates) => {
        set((state) => ({ missions: (state.missions || []).map(m => m.id === id ? { ...m, ...updates } : m) }));
        get().autoSave();
      },
      addFragment: (text) => set((state) => ({ fragments: [...(state.fragments || []), text] })),
      toggleSkill: (skillId) => set((state) => ({ config: { ...state.config, enabledSkillIds: (state.config.enabledSkillIds || []).includes(skillId) ? (state.config.enabledSkillIds || []).filter(id => id !== skillId) : [...(state.config.enabledSkillIds || []), skillId] } })),

      addDebugLog: (entry) => set((state) => ({ 
        debugLogs: [{ ...entry, id: Date.now().toString(), timestamp: Date.now() }, ...(state.debugLogs || [])].slice(0, 50) 
      })),
      clearDebugLogs: () => set({ debugLogs: [] }),

      autoSave: () => {
        const state = get();
        if (state.messages.length === 0) return;
        const lastMsg = state.messages[state.messages.length - 1].content;
        let autoId = state.currentAutoSlotId;
        if (!autoId) {
          autoId = `auto_${Date.now()}`;
          set({ currentAutoSlotId: autoId });
        }
        const existingAutoSlot = (state.saveSlots || []).find(s => s.id === autoId);
        const autoSlot: SaveSlot = {
          id: autoId,
          name: existingAutoSlot?.name,
          timestamp: Date.now(),
          characterId: state.selectedCharacter.id,
          messages: state.messages,
          summary: `[自动] ${lastMsg.slice(0, 40)}${lastMsg.length > 40 ? '...' : ''}`,
          missions: state.missions,
          fragments: state.fragments
        };
        set((s) => {
          const slots = s.saveSlots || [];
          const otherAutoSlots = slots.filter(slot => slot.id.startsWith('auto_') && slot.id !== autoId);
          const manualSlots = slots.filter(slot => !slot.id.startsWith('auto_'));
          const limitedAutoSlots = [autoSlot, ...otherAutoSlots].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
          return { saveSlots: [...limitedAutoSlots, ...manualSlots] };
        });
      },

      saveGame: (slotId, name) => {
        const state = get();
        const lastMsg = state.messages.length > 0 ? state.messages[state.messages.length - 1].content : '新游戏';
        const existingSlot = (state.saveSlots || []).find(s => s.id === slotId);
        const newSlot: SaveSlot = {
          id: slotId,
          name: name || existingSlot?.name,
          timestamp: Date.now(),
          characterId: state.selectedCharacter.id,
          messages: state.messages,
          summary: lastMsg.slice(0, 50) + (lastMsg.length > 50 ? '...' : ''),
          missions: state.missions,
          fragments: state.fragments
        };
        set((s) => ({ saveSlots: (s.saveSlots || []).some(slot => slot.id === slotId) ? s.saveSlots.map(slot => slot.id === slotId ? newSlot : slot) : [...(s.saveSlots || []), newSlot] }));
      },

      renameSaveSlot: (slotId, newName) => set((state) => ({ saveSlots: (state.saveSlots || []).map(slot => slot.id === slotId ? { ...slot, name: newName } : slot) })),

      loadGame: (slotId) => {
        const state = get();
        const slot = (state.saveSlots || []).find(s => s.id === slotId);
        if (slot) {
          const char = (state.characters || []).find(c => c.id === slot.characterId) || state.characters[0];
          set({
            selectedCharacter: char,
            messages: slot.messages,
            missions: slot.missions,
            fragments: slot.fragments,
            currentView: 'main',
            isGreetingSession: false,
            currentAutoSlotId: slotId.startsWith('auto_') ? slotId : null
          });
        }
      },
      deleteSaveSlot: (slotId) => set((state) => ({ saveSlots: (state.saveSlots || []).filter(s => s.id !== slotId), currentAutoSlotId: state.currentAutoSlotId === slotId ? null : state.currentAutoSlotId })),
      startNewGame: (charId) => {
        const state = get();
        const char = (state.characters || []).find(c => c.id === charId) || state.characters[0];
        const charWithoutAttrs = { ...char, attributes: {} };
        const activePersona = state.config.personas.find(p => p.id === state.config.activePersonaId) || state.config.personas[0];
        const userName = activePersona?.name || 'Observer';
        const finalGreeting = charWithoutAttrs.greeting ? replaceMacros(charWithoutAttrs.greeting, userName, charWithoutAttrs.name) : undefined;
        set({ 
          characters: (state.characters || []).map(c => c.id === charId ? charWithoutAttrs : c),
          selectedCharacter: charWithoutAttrs, 
          currentView: 'main', 
          messages: finalGreeting ? [{ role: 'assistant', content: finalGreeting }] : [],
          isGreetingSession: true,
          isTyping: false,
          missions: charWithoutAttrs.extensions?.missions || INITIAL_MISSIONS,
          fragments: [],
          currentAutoSlotId: null
        });
      },

      addCharacter: async (char) => {
        if (char.image.startsWith('data:')) await getStorageAdapter().saveImage(char.id, char.image)
        set((state) => ({ characters: [...(state.characters || []), char] }))
      },
      updateCharacter: async (id, updates) => {
        if (updates.image?.startsWith('data:')) await getStorageAdapter().saveImage(id, updates.image)
        set((state) => ({
          characters: (state.characters || []).map(c => c.id === id ? { ...c, ...updates } : c),
          selectedCharacter: state.selectedCharacter.id === id ? { ...state.selectedCharacter, ...updates } : state.selectedCharacter
        }))
      },
      removeCharacter: async (id) => {
        await getStorageAdapter().removeImage(id)
        set((state) => ({
          characters: (state.characters || []).filter(c => c.id !== id),
          selectedCharacter: state.selectedCharacter.id === id ? (state.characters[0] || DEFAULT_CHARACTERS[0]) : state.selectedCharacter
        }))
      },
      
      syncImagesFromDb: async () => {
        const state = get()
        const updatedChars = await Promise.all((state.characters || []).map(async (c) => {
          if (c.id.startsWith('custom-')) {
            const img = await getStorageAdapter().getImage(c.id)
            return img ? { ...c, image: img } : c
          }
          return c
        }))
        const updatedSelected = updatedChars.find(c => c.id === state.selectedCharacter.id) || state.selectedCharacter;
        set({ characters: updatedChars, selectedCharacter: updatedSelected })
      },

      addPersona: (persona) => set((state) => ({ config: { ...state.config, personas: [...(state.config.personas || []), persona] } })),
      updatePersona: (id, updates) => set((state) => ({ config: { ...state.config, personas: (state.config.personas || []).map(p => p.id === id ? { ...p, ...updates } : p) } })),
      removePersona: (id) => set((state) => ({ config: { ...state.config, personas: (state.config.personas || []).filter(p => p.id !== id), activePersonaId: state.config.activePersonaId === id ? (state.config.personas[0]?.id || '') : state.config.activePersonaId } })),
      setActivePersona: (id) => set((state) => ({ config: { ...state.config, activePersonaId: id } })),
      addPersonaWorldBookEntry: (personaId, entry) => set((state) => ({
        config: {
          ...state.config,
          personas: (state.config.personas || []).map(p => p.id === personaId ? {
            ...p,
            worldBook: [...(p.worldBook || []), entry]
          } : p)
        }
      })),
      updatePersonaWorldBookEntry: (personaId, entryId, updates) => set((state) => ({
        config: {
          ...state.config,
          personas: (state.config.personas || []).map(p => p.id === personaId ? {
            ...p,
            worldBook: (p.worldBook || []).map(e => e.id === entryId ? { ...e, ...updates } : e)
          } : p)
        }
      })),
      removePersonaWorldBookEntry: (personaId, entryId) => set((state) => ({
        config: {
          ...state.config,
          personas: (state.config.personas || []).map(p => p.id === personaId ? {
            ...p,
            worldBook: (p.worldBook || []).filter(e => e.id !== entryId)
          } : p)
        }
      })),
      updateFontFamily: (font) => {
        set((state) => ({ config: { ...state.config, fontFamily: font } }));
        document.documentElement.style.setProperty('--app-font', font);
      },
    }),
    {
      name: 'echo-storage-v16', // 再次升级版本
      storage: createJSONStorage(() => ({
        getItem: (key) => getStorageAdapter().getItem(key),
        setItem: (key, value) => getStorageAdapter().setItem(key, value),
        removeItem: (key) => getStorageAdapter().removeItem(key),
      })),
      partialize: (state) => ({ 
        config: state.config, 
        currentView: state.currentView, // 记忆当前视图
        characters: state.characters.map(c => c.id.startsWith('custom-') ? { ...c, image: '' } : c),
        selectedCharacter: state.selectedCharacter.id.startsWith('custom-') ? { ...state.selectedCharacter, image: '' } : state.selectedCharacter, 
        messages: state.messages, // 记忆消息历史
        isGreetingSession: state.isGreetingSession, // 记忆是否是新开局状态
        missions: state.missions, 
        fragments: state.fragments,
        saveSlots: state.saveSlots,
      }),
    }
  )
)

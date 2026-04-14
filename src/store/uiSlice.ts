import type { StateCreator } from 'zustand';
import type { AppState } from './storeTypes';
import { getStorageAdapter } from '../storage';
import { MULTI_SAVE_KEY } from './constants';
import type { 
  CharacterCard, 
  DebugEntry, 
  TtsSettings, 
  SaveSlot 
} from '../types/store';

export interface UISlice {
  isLoading: boolean;
  isConfigOpen: boolean;
  currentView: 'home' | 'main' | 'selection' | 'multi-selection' | 'save' | 'load' | 'help' | 'config' | 'archive' | 'tweet-square' | 'app-creator';
  configSubView: 'main' | 'advanced' | 'gateway' | 'world' | 'prompt' | 'provider-edit' | 'directive-edit' | 'skills' | 'persona' | 'debug' | 'parsers' | 'appearance' | 'tts' | 'memory-palace' | 'global-management' | 'regex' | 'regex-edit' | 'css-packages' | 'css-package-edit';
  lastInteraction: { x: number; y: number } | null;
  isInteracting: boolean;
  debugLogs: DebugEntry[];
  
  ttsSettings: TtsSettings;
  secondaryCharacter: CharacterCard | null;
  multiCharMode: boolean;
  multiSaveSlots: SaveSlot[];
  
  lastTokenCount: number;
  maxContextTokens: number;

  setIsLoading: (loading: boolean) => void;
  setIsConfigOpen: (open: boolean, subView?: UISlice['configSubView']) => void;
  setConfigSubView: (view: UISlice['configSubView']) => void;
  setCurrentView: (view: UISlice['currentView']) => void;
  setInteraction: (x: number, y: number, interacting: boolean) => void;
  addDebugLog: (entry: Omit<DebugEntry, 'id' | 'timestamp'>) => void;
  clearDebugLogs: () => void;
  
  updateTtsSettings: (updates: Partial<TtsSettings>) => void;
  updateTtsVoice: (charId: string, voiceId: string) => void;
  
  setSecondaryCharacter: (char: CharacterCard | null) => void;
  setMultiCharMode: (enabled: boolean) => void;
  
  saveMultiGame: (slotId: string, name?: string) => void;
  loadMultiGame: (slotId: string) => void;
  deleteMultiSaveSlot: (slotId: string) => void;
  setTokenStats: (last: number, max: number) => void;
}

export const createUISlice: StateCreator<AppState, [], [], UISlice> = (set, get) => ({
  isLoading: true,
  isConfigOpen: false,
  currentView: 'home',
  configSubView: 'main',
  lastInteraction: null,
  isInteracting: false,
  debugLogs: [],
  
  ttsSettings: {
    enabled: false,
    provider: 'browser',
    autoSpeak: false,
    voiceMap: {},
    globalSettings: { speed: 1.0, pitch: 1.0 }
  },
  secondaryCharacter: null,
  multiCharMode: false,
  multiSaveSlots: [],
  
  lastTokenCount: 0,
  maxContextTokens: 0,

  setIsLoading: (loading) => set({ isLoading: loading }),
  setIsConfigOpen: (open, subView) => set((state) => ({ 
    isConfigOpen: open, 
    configSubView: subView || (open ? state.configSubView : 'main') 
  })),
  setConfigSubView: (view) => set({ configSubView: view }),
  setCurrentView: (view) => set({ currentView: view, ...(view !== 'config' && { configSubView: 'main' }) }),
  setInteraction: (x, y, interacting) => set({ lastInteraction: interacting ? { x, y } : null, isInteracting: interacting }),
  
  addDebugLog: (entry) => set((state) => ({ 
    debugLogs: [{ ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, timestamp: Date.now() }, ...(state.debugLogs || [])].slice(0, 50) 
  })),
  clearDebugLogs: () => set({ debugLogs: [] }),
  
  updateTtsSettings: (updates) => set((s) => ({ ttsSettings: { ...s.ttsSettings, ...updates } })),
  updateTtsVoice: (charId, voiceId) => set((s) => ({ ttsSettings: { ...s.ttsSettings, voiceMap: { ...s.ttsSettings.voiceMap, [charId]: voiceId } } })),
  
  setSecondaryCharacter: (char) => set({ secondaryCharacter: char }),
  setMultiCharMode: (enabled) => set({ multiCharMode: enabled }),
  
  setTokenStats: (last, max) => set({ lastTokenCount: last, maxContextTokens: max }),

  saveMultiGame: (slotId, name) => {
    const state = get();
    const lastMsg = state.messages.length > 0 ? state.messages[state.messages.length - 1].content : '新游戏';
    const existing = (state.multiSaveSlots || []).find((s: SaveSlot) => s.id === slotId);
    const newSlot: SaveSlot = {
      id: slotId, name: name || existing?.name, timestamp: Date.now(),
      characterId: state.selectedCharacter.id,
      secondaryCharacterId: state.secondaryCharacter?.id,
      messages: state.messages,
      summary: lastMsg.slice(0, 50) + (lastMsg.length > 50 ? '...' : ''),
      missions: state.missions, fragments: state.fragments,
    };
    const slots = (state.multiSaveSlots || []).some((sl: SaveSlot) => sl.id === slotId)
      ? state.multiSaveSlots.map((sl: SaveSlot) => sl.id === slotId ? newSlot : sl)
      : [...(state.multiSaveSlots || []), newSlot];
    getStorageAdapter().setItem(MULTI_SAVE_KEY, JSON.stringify(slots));
    set({ multiSaveSlots: slots });
  },

  loadMultiGame: (slotId) => {
    const state = get();
    const slot = (state.multiSaveSlots || []).find((s: SaveSlot) => s.id === slotId);
    if (!slot) return;
    const charA = state.characters.find((c) => c.id === slot.characterId) || state.characters[0];
    const charB = slot.secondaryCharacterId ? state.characters.find((c) => c.id === slot.secondaryCharacterId) || null : null;
    set({
      selectedCharacter: charA, secondaryCharacter: charB,
      messages: slot.messages, missions: slot.missions, fragments: slot.fragments,
      currentView: 'main', multiCharMode: true, isGreetingSession: false,
    });
  },

  deleteMultiSaveSlot: (slotId) => {
    const slots = (get().multiSaveSlots || []).filter((sl: SaveSlot) => sl.id !== slotId);
    getStorageAdapter().setItem(MULTI_SAVE_KEY, JSON.stringify(slots));
    set({ multiSaveSlots: slots });
  },
});

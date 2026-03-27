import type { CharacterCard, Message, Mission, SaveSlot } from './useAppStore'

export interface ChatSlice {
  messages: Message[];
  isTyping: boolean;
  isGreetingSession: boolean;
  missions: Mission[];
  fragments: string[];
  currentAutoSlotId: string | null;
  _autoSaveTimer: ReturnType<typeof setTimeout> | null;
  lastExtractedHtml: string | null;
  
  addMessage: (msg: Message) => void;
  clearMessages: () => void;
  rollbackMessages: (index: number, shouldBranch?: boolean) => void;
  setIsTyping: (typing: boolean) => void;
  setMissions: (missions: Mission[]) => void;
  updateMission: (id: string, updates: Partial<Mission>) => void;
  addFragment: (text: string) => void;
  autoSave: () => void;
  setLastExtractedHtml: (html: string | null) => void;
}

export const createChatSlice = (set: any, get: any): ChatSlice => ({
  messages: [],
  isTyping: false,
  isGreetingSession: false,
  missions: [],
  fragments: [],
  currentAutoSlotId: null,
  _autoSaveTimer: null,
  lastExtractedHtml: null,

  addMessage: (msg) => {
    set((state: any) => ({ messages: [...state.messages, msg] }));
    const state = get();
    if (state._autoSaveTimer) clearTimeout(state._autoSaveTimer);
    const timer = setTimeout(() => get().autoSave(), 1000);
    set({ _autoSaveTimer: timer });
  },

  clearMessages: () => set({ messages: [] }),

  rollbackMessages: (index, shouldBranch = false) => {
    const state = get();
    if (state._autoSaveTimer) clearTimeout(state._autoSaveTimer);
    set((s: any) => ({ 
      messages: index < 0 ? [] : s.messages.slice(0, index + 1),
      isTyping: false,
      currentAutoSlotId: shouldBranch ? null : s.currentAutoSlotId,
      _autoSaveTimer: null
    }));
    get().autoSave();
  },

  setIsTyping: (typing) => set({ isTyping: typing }),

  setMissions: (missions) => set({ missions }),

  updateMission: (id, updates) => {
    set((state: any) => ({ missions: (state.missions || []).map((m: Mission) => m.id === id ? { ...m, ...updates } : m) }));
    get().autoSave();
  },

  addFragment: (text) => set((state: any) => ({ fragments: [...(state.fragments || []), text] })),

  autoSave: () => {
    const state = get();
    if (state.messages.length === 0) return;
    const lastMsg = state.messages[state.messages.length - 1].content;
    let autoId = state.currentAutoSlotId;
    if (!autoId) {
      autoId = `auto_${Date.now()}`;
      set({ currentAutoSlotId: autoId });
    }
    const existingAutoSlot = (state.saveSlots || []).find((s: SaveSlot) => s.id === autoId);
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
    set((s: any) => {
      const slots = s.saveSlots || [];
      const otherAutoSlots = slots.filter((slot: SaveSlot) => slot.id.startsWith('auto_') && slot.id !== autoId);
      const manualSlots = slots.filter((slot: SaveSlot) => !slot.id.startsWith('auto_'));
      const limitedAutoSlots = [autoSlot, ...otherAutoSlots].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
      return { saveSlots: [...limitedAutoSlots, ...manualSlots] };
    });
  },

  setLastExtractedHtml: (html) => set({ lastExtractedHtml: html }),
});

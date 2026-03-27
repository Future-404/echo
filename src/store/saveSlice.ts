import type { SaveSlot } from './useAppStore'
import { replaceMacros } from '../logic/promptEngine'
import { forcePersist } from './persist'

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
    const state = get();
    const lastMsg = state.messages.length > 0 ? state.messages[state.messages.length - 1].content : '新游戏';
    const existingSlot = (state.saveSlots || []).find((s: SaveSlot) => s.id === slotId);
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
    set((s: any) => ({ 
      saveSlots: (s.saveSlots || []).some((slot: SaveSlot) => slot.id === slotId) 
        ? s.saveSlots.map((slot: SaveSlot) => slot.id === slotId ? newSlot : slot) 
        : [...(s.saveSlots || []), newSlot] 
    }));
    forcePersist(get)
  },

  renameSaveSlot: (slotId, newName) => {
    set((state: any) => ({ 
      saveSlots: (state.saveSlots || []).map((slot: SaveSlot) => slot.id === slotId ? { ...slot, name: newName } : slot) 
    }))
    forcePersist(get)
  },

  loadGame: (slotId) => {
    const state = get();
    const slot = (state.saveSlots || []).find((s: SaveSlot) => s.id === slotId);
    if (slot) {
      const char = (state.characters || []).find((c: any) => c.id === slot.characterId) || state.characters[0];
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

  deleteSaveSlot: (slotId) => {
    set((state: any) => ({ 
      saveSlots: (state.saveSlots || []).filter((s: SaveSlot) => s.id !== slotId), 
      currentAutoSlotId: state.currentAutoSlotId === slotId ? null : state.currentAutoSlotId 
    }))
    forcePersist(get)
  },

  startNewGame: (charId) => {
    const state = get();
    const char = (state.characters || []).find((c: any) => c.id === charId) || state.characters[0];
    const charWithoutAttrs = { ...char, attributes: {} };
    const activePersona = state.config.personas.find((p: any) => p.id === state.config.activePersonaId) || state.config.personas[0];
    const userName = activePersona?.name || 'Observer';
    const finalGreeting = charWithoutAttrs.greeting ? replaceMacros(charWithoutAttrs.greeting, userName, charWithoutAttrs.name) : undefined;
    set({ 
      characters: (state.characters || []).map((c: any) => c.id === charId ? charWithoutAttrs : c),
      selectedCharacter: charWithoutAttrs, 
      currentView: 'main', 
      messages: finalGreeting ? [{ role: 'assistant', content: finalGreeting }] : [],
      isGreetingSession: true,
      isTyping: false,
      missions: charWithoutAttrs.extensions?.missions || state.missions,
      fragments: [],
      currentAutoSlotId: null
    });
  },
});

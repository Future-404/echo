import type { CharacterCard, WorldBookEntry } from './useAppStore'
import { getStorageAdapter } from '../storage'
import { replaceMacros } from '../logic/promptEngine'
import { db } from '../storage/db'

export interface CharacterSlice {
  characters: CharacterCard[];
  selectedCharacter: CharacterCard;
  
  setSelectedCharacter: (char: CharacterCard, overrideGreeting?: string) => void;
  addCharacter: (char: CharacterCard) => Promise<void>;
  updateCharacter: (id: string, updates: Partial<CharacterCard>) => Promise<void>;
  removeCharacter: (id: string) => Promise<void>;
  syncImagesFromDb: () => Promise<void>;
  updateAttributes: (charId: string, attributes: Record<string, any>) => void;
  addTagTemplate: (charId: string, template: any) => void;
  addPrivateWorldBookEntry: (entry: WorldBookEntry, charId?: string) => Promise<void>;
  updatePrivateWorldBookEntry: (id: string, updates: Partial<WorldBookEntry>, charId?: string) => Promise<void>;
  removePrivateWorldBookEntry: (id: string, charId?: string) => Promise<void>;
}

export const createCharacterSlice = (set: any, get: any, DEFAULT_CHARACTERS: CharacterCard[]): CharacterSlice => ({
  characters: DEFAULT_CHARACTERS,
  selectedCharacter: DEFAULT_CHARACTERS[0],

  setSelectedCharacter: (char, overrideGreeting) => {
    const state = get();
    const activePersona = state.config.personas.find((p: any) => p.id === state.config.activePersonaId) || state.config.personas[0];
    const userName = activePersona?.name || 'Observer';
    const rawGreeting = overrideGreeting ?? char.greeting;
    const finalGreeting = rawGreeting ? replaceMacros(rawGreeting, userName, char.name) : undefined;
    
    const charReset = { ...char, attributes: {} };
    set((s: any) => ({ 
      selectedCharacter: charReset,
      characters: (s.characters || []).map((c: any) => c.id === char.id ? charReset : c),
      currentView: 'main', 
      messages: finalGreeting ? [{ role: 'assistant', content: finalGreeting }] : [],
      isGreetingSession: true,
      isTyping: false,
      missions: char.extensions?.missions || [],
      fragments: [],
      currentAutoSlotId: null,
    }));
  },

  addCharacter: async (char) => {
    if (char.image.startsWith('data:')) await getStorageAdapter().saveImage(char.id, char.image);
    
    // 如果角色带了私设世界书，同步到 Dexie
    if (char.extensions?.worldBook?.length) {
      const entries = char.extensions.worldBook.map(e => ({ ...e, ownerId: char.id, updatedAt: Date.now() }));
      await db.worldEntries.bulkPut(entries);
    }

    set((state: any) => ({ characters: [...(state.characters || []), char] }));
  },

  updateCharacter: async (id, updates) => {
    if (updates.image?.startsWith('data:')) await getStorageAdapter().saveImage(id, updates.image);
    set((state: any) => ({
      characters: (state.characters || []).map((c: CharacterCard) => c.id === id ? { ...c, ...updates } : c),
      selectedCharacter: state.selectedCharacter.id === id ? { ...state.selectedCharacter, ...updates } : state.selectedCharacter
    }));
  },

  removeCharacter: async (id) => {
    await getStorageAdapter().removeImage(id);
    // 清理该角色的私设世界书
    await db.worldEntries.where('ownerId').equals(id).delete();

    set((state: any) => ({
      characters: (state.characters || []).filter((c: CharacterCard) => c.id !== id),
      selectedCharacter: state.selectedCharacter.id === id ? (state.characters[0] || DEFAULT_CHARACTERS[0]) : state.selectedCharacter
    }));
  },

  syncImagesFromDb: async () => {
    const state = get();
    const updatedChars = await Promise.all((state.characters || []).map(async (c: CharacterCard) => {
      if (c.id.startsWith('custom-')) {
        const img = await getStorageAdapter().getImage(c.id);
        return img ? { ...c, image: img } : c;
      }
      return c;
    }));
    const updatedSelected = updatedChars.find((c: CharacterCard) => c.id === state.selectedCharacter.id) || state.selectedCharacter;

    let updatedSecondary = state.secondaryCharacter;
    if (updatedSecondary) {
      const found = updatedChars.find((c: CharacterCard) => c.id === updatedSecondary!.id);
      if (found) updatedSecondary = found;
    }

    set({ characters: updatedChars, selectedCharacter: updatedSelected, secondaryCharacter: updatedSecondary });
  },

  updateAttributes: (charId, newAttrs) => set((state: any) => {
    const char = (state.characters || []).find((c: CharacterCard) => c.id === charId);
    if (!char) return {};
    const updatedChar = { ...char, attributes: { ...(char.attributes || {}), ...newAttrs } };
    return {
      characters: (state.characters || []).map((c: CharacterCard) => c.id === charId ? updatedChar : c),
      selectedCharacter: state.selectedCharacter.id === charId ? updatedChar : state.selectedCharacter
    };
  }),

  addTagTemplate: (charId, template) => set((state: any) => {
    const char = (state.characters || []).find((c: CharacterCard) => c.id === charId);
    if (!char) return {};
    const templates = [...(char.extensions?.tagTemplates || []), template];
    const updatedChar = { ...char, extensions: { ...char.extensions, tagTemplates: templates } };
    return {
      characters: (state.characters || []).map((c: CharacterCard) => c.id === charId ? updatedChar : c),
      selectedCharacter: state.selectedCharacter.id === charId ? updatedChar : state.selectedCharacter
    };
  }),

  addPrivateWorldBookEntry: async (entry, charId) => {
    const state = get();
    const char = charId
      ? (state.characters || []).find((c: CharacterCard) => c.id === charId) ?? state.selectedCharacter
      : state.selectedCharacter;
    const currentEntries = char.extensions?.worldBook || [];
    const updatedChar = { ...char, extensions: { ...char.extensions, worldBook: [...currentEntries, entry] } };
    
    // 同步到 Dexie
    await db.worldEntries.put({ ...entry, ownerId: char.id, updatedAt: Date.now() });

    set((s: any) => ({
      selectedCharacter: updatedChar,
      characters: (s.characters || []).map((c: CharacterCard) => c.id === char.id ? updatedChar : c)
    }));
  },

  updatePrivateWorldBookEntry: async (id, updates, charId) => {
    const state = get();
    const char = charId
      ? (state.characters || []).find((c: CharacterCard) => c.id === charId) ?? state.selectedCharacter
      : state.selectedCharacter;
    const currentEntries = char.extensions?.worldBook || [];
    const entry = currentEntries.find((e: any) => e.id === id);
    if (!entry) return;

    const updatedEntry = { ...entry, ...updates };
    const updatedEntries = currentEntries.map((e: any) => e.id === id ? updatedEntry : e);
    const updatedChar = { ...char, extensions: { ...char.extensions, worldBook: updatedEntries } };
    
    // 同步到 Dexie
    await db.worldEntries.put({ ...updatedEntry, ownerId: char.id, updatedAt: Date.now() });

    set((s: any) => ({
      selectedCharacter: updatedChar,
      characters: (s.characters || []).map((c: CharacterCard) => c.id === char.id ? updatedChar : c)
    }));
  },

  removePrivateWorldBookEntry: async (id, charId) => {
    const state = get();
    const char = charId
      ? (state.characters || []).find((c: CharacterCard) => c.id === charId) ?? state.selectedCharacter
      : state.selectedCharacter;
    const currentEntries = char.extensions?.worldBook || [];
    const updatedEntries = currentEntries.filter((e: any) => e.id !== id);
    const updatedChar = { ...char, extensions: { ...char.extensions, worldBook: updatedEntries } };
    
    // 从 Dexie 删除
    await db.worldEntries.delete(id);

    set((s: any) => ({
      selectedCharacter: updatedChar,
      characters: (s.characters || []).map((c: CharacterCard) => c.id === char.id ? updatedChar : c)
    }));
  },
});

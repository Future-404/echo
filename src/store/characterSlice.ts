import type { StateCreator } from 'zustand'
import type { AppState } from './storeTypes'
import type { CharacterCard, WorldBookEntry, TagTemplate } from './useAppStore'
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
  addTagTemplate: (charId: string, template: TagTemplate) => void;
  addPrivateWorldBookEntry: (entry: WorldBookEntry, charId?: string) => Promise<void>;
  updatePrivateWorldBookEntry: (id: string, updates: Partial<WorldBookEntry>, charId?: string) => Promise<void>;
  removePrivateWorldBookEntry: (id: string, charId?: string) => Promise<void>;
}

export const createCharacterSlice = (DEFAULT_CHARACTERS: CharacterCard[]): StateCreator<AppState, [], [], CharacterSlice> => (set, get) => ({
  characters: DEFAULT_CHARACTERS,
  selectedCharacter: DEFAULT_CHARACTERS[0],

  setSelectedCharacter: async (char, overrideGreeting) => {
    const state = get();
    const activePersona = state.config.personas.find((p) => p.id === state.config.activePersonaId) || state.config.personas[0];
    const userName = activePersona?.name || 'Observer';
    const rawGreeting = overrideGreeting ?? char.greeting;
    const finalGreeting = rawGreeting ? replaceMacros(rawGreeting, userName, char.name) : undefined;
    
    const charReset = { ...char, attributes: {} };
    const slotId = `auto_${Date.now()}`;
    const greetingMsg = finalGreeting ? { role: 'assistant' as const, content: finalGreeting } : null;

    // 清理旧的空 auto slot（只有开场白，用户没有真正对话）
    const oldSlotId = state.currentAutoSlotId;
    if (oldSlotId?.startsWith('auto_')) {
      const oldCount = await db.messages.where('slotId').equals(oldSlotId).count();
      if (oldCount <= 1) {
        await db.messages.where('slotId').equals(oldSlotId).delete();
      }
    }

    set((s) => ({ 
      selectedCharacter: charReset,
      characters: (s.characters || []).map((c) => c.id === char.id ? charReset : c),
      currentView: 'main', 
      messages: greetingMsg ? [greetingMsg] : [],
      isGreetingSession: true,
      isTyping: false,
      missions: char.extensions?.missions || [],
      fragments: [],
      currentAutoSlotId: slotId,
    }));

    // 开场白持久化写入 DB
    if (greetingMsg) {
      await db.messages.add({ ...greetingMsg, slotId, timestamp: Date.now() });
    }
  },

  addCharacter: async (char) => {
    if (char.image.startsWith('data:')) await getStorageAdapter().saveImage(char.id, char.image);
    
    // 自定义角色存入 characters 表（包含私设 worldBook，只剥离 image）
    if (char.id.startsWith('custom-')) {
      const { image: _img, ...rest } = char
      await db.characters.put({ ...rest, updatedAt: Date.now() })
    }

    set((s) => ({ characters: [...(s.characters || []), char] }));
  },

  updateCharacter: async (id, updates) => {
    if (updates.image?.startsWith('data:')) await getStorageAdapter().saveImage(id, updates.image);

    // 同步更新 Dexie characters 表（包含私设 worldBook）
    if (id.startsWith('custom-')) {
      const existing = (get().characters || []).find(c => c.id === id)
      if (existing) {
        const merged = { ...existing, ...updates }
        const { image: _img, ...rest } = merged
        await db.characters.put({ ...rest, updatedAt: Date.now() })
      }
    }

    set((s) => ({
      characters: (s.characters || []).map((c) => c.id === id ? { ...c, ...updates } : c),
      selectedCharacter: s.selectedCharacter.id === id ? { ...s.selectedCharacter, ...updates } : s.selectedCharacter
    }));
  },

  removeCharacter: async (id) => {
    await getStorageAdapter().removeImage(id);
    if (id.startsWith('custom-')) await db.characters.delete(id);

    set((s) => ({
      characters: (s.characters || []).filter((c) => c.id !== id),
      selectedCharacter: s.selectedCharacter.id === id ? (s.characters[0] || DEFAULT_CHARACTERS[0]) : s.selectedCharacter
    }));
  },

  syncImagesFromDb: async () => {
    const state = get();
    const updatedChars = await Promise.all((state.characters || []).map(async (c) => {
      if (c.id.startsWith('custom-')) {
        const img = await getStorageAdapter().getImage(c.id);
        return img ? { ...c, image: img } : c;
      }
      return c;
    }));
    const updatedSelected = updatedChars.find((c) => c.id === state.selectedCharacter.id) || state.selectedCharacter;

    let updatedSecondary = state.secondaryCharacter;
    if (updatedSecondary) {
      const found = updatedChars.find((c) => c.id === updatedSecondary!.id);
      if (found) updatedSecondary = found;
    }

    set({ characters: updatedChars, selectedCharacter: updatedSelected, secondaryCharacter: updatedSecondary });
  },

  updateAttributes: (charId, newAttrs) => set((s) => {
    const char = (s.characters || []).find((c) => c.id === charId);
    if (!char) return {};
    const updatedChar = { ...char, attributes: { ...(char.attributes || {}), ...newAttrs } };
    return {
      characters: (s.characters || []).map((c) => c.id === charId ? updatedChar : c),
      selectedCharacter: s.selectedCharacter.id === charId ? updatedChar : s.selectedCharacter
    };
  }),

  addTagTemplate: (charId, template) => set((s) => {
    const char = (s.characters || []).find((c) => c.id === charId);
    if (!char) return {};
    const templates = [...(char.extensions?.tagTemplates || []), template];
    const updatedChar = { ...char, extensions: { ...char.extensions, tagTemplates: templates } };
    return {
      characters: (s.characters || []).map((c) => c.id === charId ? updatedChar : c),
      selectedCharacter: s.selectedCharacter.id === charId ? updatedChar : s.selectedCharacter
    };
  }),

  addPrivateWorldBookEntry: async (entry, charId) => {
    const state = get();
    const char = charId
      ? (state.characters || []).find((c) => c.id === charId) ?? state.selectedCharacter
      : state.selectedCharacter;
    const currentEntries = char.extensions?.worldBook || [];
    const updatedChar = { ...char, extensions: { ...char.extensions, worldBook: [...currentEntries, entry] } };
    
    // 角色私设直接存在角色卡中，不存 worldEntries 表
    if (char.id.startsWith('custom-')) {
      const { image: _img, ...rest } = updatedChar
      await db.characters.put({ ...rest, updatedAt: Date.now() })
    }

    set((s) => ({
      selectedCharacter: updatedChar,
      characters: (s.characters || []).map((c) => c.id === char.id ? updatedChar : c)
    }));
  },

  updatePrivateWorldBookEntry: async (id, updates, charId) => {
    const state = get();
    const char = charId
      ? (state.characters || []).find((c) => c.id === charId) ?? state.selectedCharacter
      : state.selectedCharacter;
    const currentEntries = char.extensions?.worldBook || [];
    const entry = currentEntries.find((e) => e.id === id);
    if (!entry) return;

    const updatedEntry = { ...entry, ...updates };
    const updatedEntries = currentEntries.map((e) => e.id === id ? updatedEntry : e);
    const updatedChar = { ...char, extensions: { ...char.extensions, worldBook: updatedEntries } };
    
    // 角色私设直接存在角色卡中
    if (char.id.startsWith('custom-')) {
      const { image: _img, ...rest } = updatedChar
      await db.characters.put({ ...rest, updatedAt: Date.now() })
    }

    set((s) => ({
      selectedCharacter: updatedChar,
      characters: (s.characters || []).map((c) => c.id === char.id ? updatedChar : c)
    }));
  },

  removePrivateWorldBookEntry: async (id, charId) => {
    const state = get();
    const char = charId
      ? (state.characters || []).find((c) => c.id === charId) ?? state.selectedCharacter
      : state.selectedCharacter;
    const currentEntries = char.extensions?.worldBook || [];
    const updatedEntries = currentEntries.filter((e) => e.id !== id);
    const updatedChar = { ...char, extensions: { ...char.extensions, worldBook: updatedEntries } };
    
    // 角色私设直接存在角色卡中
    if (char.id.startsWith('custom-')) {
      const { image: _img, ...rest } = updatedChar
      await db.characters.put({ ...rest, updatedAt: Date.now() })
    }

    set((s) => ({
      selectedCharacter: updatedChar,
      characters: (s.characters || []).map((c) => c.id === char.id ? updatedChar : c)
    }));
  },
});

import type { Provider, Directive, WorldBook, WorldBookEntry, UserPersona, ThemeMode, RegexRule, PromptPreset } from './useAppStore'
import { db } from '../storage/db'

export interface ConfigSlice {
  config: {
    worldBookLibrary: WorldBook[];
    directives: Directive[];
    promptPresets: PromptPreset[];
    providers: Provider[];
    activeProviderId: string;
    theme: ThemeMode;
    enabledSkillIds: string[];
    personas: UserPersona[];
    activePersonaId: string;
    isDebugEnabled: boolean;
    userName?: string;
    fontFamily: string;
    fontSize: number;
    customCss: string;
    customBg: boolean;
    dialogueQuotes?: string;
    actionMarkers?: string;
    thoughtMarkers?: string;
    regexRules: RegexRule[];
    appLock: {
      enabled: boolean;
      pinHash: string;       // SHA-256 of PIN, empty = not set
      timeoutMinutes: number; // 0 = lock on every page load
    };
  };
  
  updateConfig: (newConfig: Partial<ConfigSlice['config']>) => void;
  updateFontFamily: (font: string) => void;
  updateFontSize: (size: number) => void;
  updateCustomCss: (css: string) => void;
  updateCustomBg: (hasImage: boolean) => void;
  addProvider: (provider: Provider) => void;
  updateProvider: (id: string, updates: Partial<Provider>) => void;
  removeProvider: (id: string) => void;
  setActiveProvider: (id: string) => void;
  addWorldBook: (book: WorldBook) => Promise<void>;
  updateWorldBook: (id: string, updates: Partial<WorldBook>) => Promise<void>;
  removeWorldBook: (id: string) => Promise<void>;
  addWorldBookEntry: (bookId: string, entry: WorldBookEntry) => Promise<void>;
  updateWorldBookEntry: (bookId: string, entryId: string, updates: Partial<WorldBookEntry>) => Promise<void>;
  removeWorldBookEntry: (bookId: string, entryId: string) => Promise<void>;
  addDirective: (directive: Directive) => void;
  updateDirective: (id: string, updates: Partial<Directive>) => void;
  removeDirective: (id: string) => void;
  reorderDirectives: (directives: Directive[]) => void;
  addPromptPreset: (preset: PromptPreset) => Promise<void>;
  removePromptPreset: (id: string) => Promise<void>;
  updatePromptPresetDirective: (presetId: string, directiveId: string, updates: Partial<Directive>) => Promise<void>;
  toggleSkill: (skillId: string) => void;
  addPersona: (persona: UserPersona) => void;
  updatePersona: (id: string, updates: Partial<UserPersona>) => void;
  removePersona: (id: string) => void;
  setActivePersona: (id: string) => void;
  addPersonaWorldBookEntry: (personaId: string, entry: WorldBookEntry) => void;
  updatePersonaWorldBookEntry: (personaId: string, entryId: string, updates: Partial<WorldBookEntry>) => void;
  removePersonaWorldBookEntry: (personaId: string, entryId: string) => void;
  addRegexRule: (rule: RegexRule) => void;
  updateRegexRule: (id: string, updates: Partial<RegexRule>) => void;
  removeRegexRule: (id: string) => void;
  reorderRegexRules: (rules: RegexRule[]) => void;
}

export const createConfigSlice = (set: any, get: any, INITIAL_CONFIG: ConfigSlice['config']): ConfigSlice => ({
  config: INITIAL_CONFIG,

  updateConfig: (newConfig) => set((state: any) => ({ config: { ...state.config, ...newConfig } })),

  updateFontFamily: (font) => {
    set((state: any) => ({ config: { ...state.config, fontFamily: font } }));
  },

  updateFontSize: (size) => {
    set((state: any) => ({ config: { ...state.config, fontSize: size } }));
  },

  updateCustomCss: (css) => {
    set((state: any) => ({ config: { ...state.config, customCss: css } }));
  },

  updateCustomBg: (hasImage) => set((state: any) => ({ config: { ...state.config, customBg: hasImage } })),

  addProvider: (provider) => {
    set((state: any) => ({ config: { ...state.config, providers: [...(state.config.providers || []), provider] } }))
  },

  updateProvider: (id, updates) => {
    const providers = (get().config.providers || []).map((p: Provider) => p.id === id ? { ...p, ...updates } : p)
    set((state: any) => ({ config: { ...state.config, providers } }))
  },

  removeProvider: (id) => {
    const providers = (get().config.providers || []).filter((p: Provider) => p.id !== id)
    const activeProviderId = get().config.activeProviderId === id ? 'default' : get().config.activeProviderId
    set((state: any) => ({ config: { ...state.config, providers, activeProviderId } }))
  },

  setActiveProvider: (id) => set((state: any) => ({ config: { ...state.config, activeProviderId: id } })),

  addWorldBook: async (book) => {
    if (book.entries?.length) {
      const dbEntries = book.entries.map(e => ({ ...e, ownerId: book.id, updatedAt: Date.now() }));
      await db.worldEntries.bulkPut(dbEntries);
    }
    set((state: any) => ({ 
      config: { ...state.config, worldBookLibrary: [...(state.config.worldBookLibrary || []), book] } 
    }));
  },

  updateWorldBook: async (id, updates) => set((state: any) => ({ 
    config: { ...state.config, worldBookLibrary: (state.config.worldBookLibrary || []).map((b: any) => b.id === id ? { ...b, ...updates } : b) } 
  })),

  removeWorldBook: async (id) => {
    await db.worldEntries.where('ownerId').equals(id).delete();
    set((state: any) => ({ 
      config: { ...state.config, worldBookLibrary: (state.config.worldBookLibrary || []).filter((b: any) => b.id !== id) } 
    }));
  },

  addWorldBookEntry: async (bookId, entry) => {
    await db.worldEntries.put({ ...entry, ownerId: bookId, updatedAt: Date.now() });
    set((state: any) => ({
      config: {
        ...state.config,
        worldBookLibrary: (state.config.worldBookLibrary || []).map((b: any) => 
          b.id === bookId ? { ...b, entries: [...(b.entries || []), entry] } : b
        )
      }
    }));
  },

  updateWorldBookEntry: async (bookId, entryId, updates) => {
    const state = get();
    const book = (state.config.worldBookLibrary || []).find((b: any) => b.id === bookId);
    const entry = book?.entries?.find((e: any) => e.id === entryId);
    if (!entry) return;

    const updatedEntry = { ...entry, ...updates };
    await db.worldEntries.put({ ...updatedEntry, ownerId: bookId, updatedAt: Date.now() });

    set((state: any) => ({
      config: {
        ...state.config,
        worldBookLibrary: (state.config.worldBookLibrary || []).map((b: any) => 
          b.id === bookId ? {
            ...b,
            entries: (b.entries || []).map((e: WorldBookEntry) => e.id === entryId ? updatedEntry : e)
          } : b
        )
      }
    }));
  },

  removeWorldBookEntry: async (bookId, entryId) => {
    await db.worldEntries.delete(entryId);
    set((state: any) => ({
      config: {
        ...state.config,
        worldBookLibrary: (state.config.worldBookLibrary || []).map((b: any) => 
          b.id === bookId ? {
            ...b,
            entries: (b.entries || []).filter((e: WorldBookEntry) => e.id !== entryId)
          } : b
        )
      }
    }));
  },

  addDirective: (directive) => set((state: any) => ({ 
    config: { ...state.config, directives: [...(state.config.directives || []), directive] } 
  })),

  updateDirective: (id, updates) => set((state: any) => ({ 
    config: { ...state.config, directives: (state.config.directives || []).map((d: Directive) => d.id === id ? { ...d, ...updates } : d) } 
  })),

  removeDirective: (id) => set((state: any) => ({ 
    config: { ...state.config, directives: (state.config.directives || []).filter((d: Directive) => d.id !== id) } 
  })),

  reorderDirectives: (directives) => set((state: any) => ({ config: { ...state.config, directives } })),

  addPromptPreset: async (preset) => {
    // 條目寫 DB，元數據（id+name）存 store
    await db.promptPresetEntries.bulkPut(
      preset.directives.map(d => ({ ...d, presetId: preset.id }))
    );
    set((state: any) => ({
      config: { ...state.config, promptPresets: [...(state.config.promptPresets || []), { id: preset.id, name: preset.name, directives: [] }] }
    }));
  },

  removePromptPreset: async (id) => {
    await db.promptPresetEntries.where('presetId').equals(id).delete();
    set((state: any) => ({
      config: { ...state.config, promptPresets: (state.config.promptPresets || []).filter((p: PromptPreset) => p.id !== id) }
    }));
  },

  updatePromptPresetDirective: async (presetId, directiveId, updates) => {
    await db.promptPresetEntries.update(directiveId, updates);
  },

  toggleSkill: (skillId) => set((state: any) => ({ 
    config: { 
      ...state.config, 
      enabledSkillIds: (state.config.enabledSkillIds || []).includes(skillId) 
        ? (state.config.enabledSkillIds || []).filter((id: string) => id !== skillId) 
        : [...(state.config.enabledSkillIds || []), skillId] 
    } 
  })),

  addPersona: (persona) => set((state: any) => ({ 
    config: { ...state.config, personas: [...(state.config.personas || []), persona] } 
  })),

  updatePersona: (id, updates) => set((state: any) => ({ 
    config: { ...state.config, personas: (state.config.personas || []).map((p: UserPersona) => p.id === id ? { ...p, ...updates } : p) } 
  })),

  removePersona: (id) => set((state: any) => ({ 
    config: { 
      ...state.config, 
      personas: (state.config.personas || []).filter((p: UserPersona) => p.id !== id), 
      activePersonaId: state.config.activePersonaId === id ? (state.config.personas[0]?.id || '') : state.config.activePersonaId 
    } 
  })),

  setActivePersona: (id) => set((state: any) => ({ config: { ...state.config, activePersonaId: id } })),

  addPersonaWorldBookEntry: (personaId, entry) => set((state: any) => ({
    config: {
      ...state.config,
      personas: (state.config.personas || []).map((p: UserPersona) => 
        p.id === personaId ? {
          ...p,
          worldBook: [...(p.worldBook || []), entry]
        } : p
      )
    }
  })),

  updatePersonaWorldBookEntry: (personaId, entryId, updates) => set((state: any) => ({
    config: {
      ...state.config,
      personas: (state.config.personas || []).map((p: UserPersona) => 
        p.id === personaId ? {
          ...p,
          worldBook: (p.worldBook || []).map((e: WorldBookEntry) => e.id === entryId ? { ...e, ...updates } : e)
        } : p
      )
    }
  })),

  removePersonaWorldBookEntry: (personaId, entryId) => set((state: any) => ({
    config: {
      ...state.config,
      personas: (state.config.personas || []).map((p: UserPersona) => 
        p.id === personaId ? {
          ...p,
          worldBook: (p.worldBook || []).filter((e: WorldBookEntry) => e.id !== entryId)
        } : p
      )
    }
  })),

  addRegexRule: (rule) => set((state: any) => ({
    config: { ...state.config, regexRules: [...(state.config.regexRules || []), rule] }
  })),

  updateRegexRule: (id, updates) => set((state: any) => ({
    config: { ...state.config, regexRules: (state.config.regexRules || []).map((r: RegexRule) => r.id === id ? { ...r, ...updates } : r) }
  })),

  removeRegexRule: (id) => set((state: any) => ({
    config: { ...state.config, regexRules: (state.config.regexRules || []).filter((r: RegexRule) => r.id !== id) }
  })),

  reorderRegexRules: (rules) => set((state: any) => ({ config: { ...state.config, regexRules: rules } })),
});

import type { Provider, Directive, WorldBook, WorldBookEntry, UserPersona, ThemeMode } from './useAppStore'

export interface ConfigSlice {
  config: {
    worldBookLibrary: WorldBook[];
    directives: Directive[];
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
  addWorldBook: (book: WorldBook) => void;
  updateWorldBook: (id: string, updates: Partial<WorldBook>) => void;
  removeWorldBook: (id: string) => void;
  addWorldBookEntry: (bookId: string, entry: WorldBookEntry) => void;
  updateWorldBookEntry: (bookId: string, entryId: string, updates: Partial<WorldBookEntry>) => void;
  removeWorldBookEntry: (bookId: string, entryId: string) => void;
  addDirective: (directive: Directive) => void;
  updateDirective: (id: string, updates: Partial<Directive>) => void;
  removeDirective: (id: string) => void;
  reorderDirectives: (directives: Directive[]) => void;
  toggleSkill: (skillId: string) => void;
  addPersona: (persona: UserPersona) => void;
  updatePersona: (id: string, updates: Partial<UserPersona>) => void;
  removePersona: (id: string) => void;
  setActivePersona: (id: string) => void;
  addPersonaWorldBookEntry: (personaId: string, entry: WorldBookEntry) => void;
  updatePersonaWorldBookEntry: (personaId: string, entryId: string, updates: Partial<WorldBookEntry>) => void;
  removePersonaWorldBookEntry: (personaId: string, entryId: string) => void;
}

export const createConfigSlice = (set: any, get: any, INITIAL_CONFIG: ConfigSlice['config']): ConfigSlice => ({
  config: INITIAL_CONFIG,

  updateConfig: (newConfig) => set((state: any) => ({ config: { ...state.config, ...newConfig } })),

  updateFontFamily: (font) => {
    set((state: any) => ({ config: { ...state.config, fontFamily: font } }));
    document.documentElement.style.setProperty('--app-font', font);
  },

  updateFontSize: (size) => {
    set((state: any) => ({ config: { ...state.config, fontSize: size } }));
    document.documentElement.style.setProperty('--app-font-size', `${size}px`);
  },

  updateCustomCss: (css) => {
    set((state: any) => ({ config: { ...state.config, customCss: css } }));
    let el = document.getElementById('user-custom-css');
    if (!el) { el = document.createElement('style'); el.id = 'user-custom-css'; document.head.appendChild(el); }
    el.textContent = css;
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

  addWorldBook: (book) => set((state: any) => ({ 
    config: { ...state.config, worldBookLibrary: [...(state.config.worldBookLibrary || []), book] } 
  })),

  updateWorldBook: (id, updates) => set((state: any) => ({ 
    config: { ...state.config, worldBookLibrary: (state.config.worldBookLibrary || []).map((b: WorldBook) => b.id === id ? { ...b, ...updates } : b) } 
  })),

  removeWorldBook: (id) => set((state: any) => ({ 
    config: { ...state.config, worldBookLibrary: (state.config.worldBookLibrary || []).filter((b: WorldBook) => b.id !== id) } 
  })),

  addWorldBookEntry: (bookId, entry) => set((state: any) => ({
    config: {
      ...state.config,
      worldBookLibrary: (state.config.worldBookLibrary || []).map((b: WorldBook) => 
        b.id === bookId ? { ...b, entries: [...(b.entries || []), entry] } : b
      )
    }
  })),

  updateWorldBookEntry: (bookId, entryId, updates) => set((state: any) => ({
    config: {
      ...state.config,
      worldBookLibrary: (state.config.worldBookLibrary || []).map((b: WorldBook) => 
        b.id === bookId ? {
          ...b,
          entries: (b.entries || []).map((e: WorldBookEntry) => e.id === entryId ? { ...e, ...updates } : e)
        } : b
      )
    }
  })),

  removeWorldBookEntry: (bookId, entryId) => set((state: any) => ({
    config: {
      ...state.config,
      worldBookLibrary: (state.config.worldBookLibrary || []).map((b: WorldBook) => 
        b.id === bookId ? {
          ...b,
          entries: (b.entries || []).filter((e: WorldBookEntry) => e.id !== entryId)
        } : b
      )
    }
  })),

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
});

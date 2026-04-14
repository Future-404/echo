import type { StateCreator } from 'zustand'
import type { AppState } from './storeTypes'
import type { Provider, Directive, WorldBook, WorldBookEntry, UserPersona, ThemeMode, RegexRule, PromptPreset } from './useAppStore'
import type { ModelConfig } from '../types/modelConfig'
import type { InstalledSkill, InstalledApp } from '../skills/core/types'
import type { CreatorState } from '../components/AppCreator/types'
import { registeredSkills } from '../skills/core/registry'
import { db } from '../storage/db'

export interface CssPackage {
  id: string
  name: string
  css: string
  enabled: boolean
}

export interface ConfigSlice {
  config: {
    worldBookLibrary: WorldBook[];
    directives: Directive[];
    promptPresets: PromptPreset[];
    providers: Provider[];
    activeProviderId: string; // @deprecated 迁移期兼容，请使用 modelConfig.chatProviderId
    modelConfig: ModelConfig;
    theme: ThemeMode;
    enabledSkillIds: string[];
    deviceContextEnabled: boolean;
    personas: UserPersona[];
    activePersonaId: string;
    isDebugEnabled: boolean;
    userName?: string;
    fontFamily: string;
    fontSize: number;
    customCss: string;
    cssPackages: CssPackage[];
    customBg: boolean;
    themePreset?: string;
    dialogueQuotes?: string;
    actionMarkers?: string;
    thoughtMarkers?: string;
    regexRules: RegexRule[];
    installedSkills: InstalledSkill[];
    installedApps: InstalledApp[];
    appOrder?: string[];
    appStorage: Record<string, Record<string, any>>;
    appLock: {
      enabled: boolean;
      pinHash: string;
      timeoutMinutes: number;
    };
    appCreatorState?: CreatorState;
  };
  
  updateConfig: (newConfig: Partial<ConfigSlice['config']>) => void;
  updateAppCreatorState: (updates: Partial<CreatorState>) => void;
  resetAppCreatorState: () => void;
  updateAppStorage: (appId: string, updates: Record<string, any>) => void;
  updateFontFamily: (font: string) => void;
  updateFontSize: (size: number) => void;
  updateCustomCss: (css: string) => void;
  updateCustomBg: (hasImage: boolean) => void;
  updateThemePreset: (presetId: string) => void;
  addCssPackage: (pkg: CssPackage) => void;
  updateCssPackage: (id: string, updates: Partial<CssPackage>) => void;
  removeCssPackage: (id: string) => void;
  reorderCssPackages: (packages: CssPackage[]) => void;
  addProvider: (provider: Provider) => void;
  updateProvider: (id: string, updates: Partial<Provider>) => void;
  removeProvider: (id: string) => void;
  setActiveProvider: (id: string) => void;
  setModelConfig: (updates: Partial<ModelConfig>) => void;
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
  toggleDeviceContext: () => void;
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
  installSkill: (skill: InstalledSkill) => void;
  uninstallSkill: (id: string) => void;
  installApp: (app: InstalledApp) => void;
  reorderApps: (appIds: string[]) => void;
  uninstallApp: (id: string, keepData?: boolean) => void;
  // 响应式 skill 名称列表，用于触发 UI 重渲染（不持久化）
  registeredSkillNames: string[];
  syncRegisteredSkillNames: () => void;
}

export const createConfigSlice = (INITIAL_CONFIG: ConfigSlice['config']): StateCreator<AppState, [], [], ConfigSlice> => (set, get) => ({
  config: INITIAL_CONFIG,
  registeredSkillNames: Object.keys(registeredSkills),
  syncRegisteredSkillNames: () => set({ registeredSkillNames: Object.keys(registeredSkills) }),

  updateConfig: (newConfig) => set((s) => ({ config: { ...s.config, ...newConfig } })),

  updateAppCreatorState: (updates) => set((s) => ({
    config: {
      ...s.config,
      appCreatorState: { ...s.config.appCreatorState!, ...updates }
    }
  })),

  resetAppCreatorState: () => set((s) => ({
    config: {
      ...s.config,
      appCreatorState: {
        phase: 'form',
        manifest: EMPTY_MANIFEST,
        files: EMPTY_FILES,
        history: [],
        snapshots: [],
        status: 'idle',
      }
    }
  })),

  updateAppStorage: (appId, updates) => set((s) => {
    const appStorage = s.config.appStorage || {};
    const current = appStorage[appId] || {};
    const merged = { ...current, ...updates }
    if (JSON.stringify(merged).length > 5 * 1024 * 1024) {
      console.warn(`[AppStorage] "${appId}" 超过 5MB 上限，写入已拒绝`)
      return {}
    }
    return { config: { ...s.config, appStorage: { ...appStorage, [appId]: merged } } }
  }),

  updateFontFamily: (font) => {
    set((s) => ({ config: { ...s.config, fontFamily: font } }));
  },

  updateFontSize: (size) => {
    set((s) => ({ config: { ...s.config, fontSize: size } }));
  },

  updateCustomCss: (css) => {
    set((s) => ({ config: { ...s.config, customCss: css } }));
  },

  updateCustomBg: (hasImage) => set((s) => ({ config: { ...s.config, customBg: hasImage } })),

  updateThemePreset: (presetId) => set((s) => ({ config: { ...s.config, themePreset: presetId } })),

  addCssPackage: (pkg) => set((s) => ({
    config: { ...s.config, cssPackages: [...(s.config.cssPackages || []), pkg] }
  })),
  updateCssPackage: (id, updates) => set((s) => ({
    config: { ...s.config, cssPackages: (s.config.cssPackages || []).map((p: CssPackage) => p.id === id ? { ...p, ...updates } : p) }
  })),
  removeCssPackage: (id) => set((s) => ({
    config: { ...s.config, cssPackages: (s.config.cssPackages || []).filter((p: CssPackage) => p.id !== id) }
  })),
  reorderCssPackages: (packages) => set((s) => ({ config: { ...s.config, cssPackages: packages } })),

  addProvider: (provider) => {
    set((s) => ({ config: { ...s.config, providers: [...(s.config.providers || []), provider] } }))
  },

  updateProvider: (id, updates) => {
    const providers = (get().config.providers || []).map((p: Provider) => p.id === id ? { ...p, ...updates } : p)
    set((s) => ({ config: { ...s.config, providers } }))
  },

  removeProvider: (id) => {
    const providers = (get().config.providers || []).filter((p: Provider) => p.id !== id)
    const mc = get().config.modelConfig || {}
    const activeProviderId = get().config.activeProviderId === id ? 'default' : get().config.activeProviderId
    const modelConfig = {
      ...mc,
      chatProviderId: mc.chatProviderId === id ? 'default' : mc.chatProviderId,
      embeddingProviderId: mc.embeddingProviderId === id ? '' : mc.embeddingProviderId,
      ttsProviderId: mc.ttsProviderId === id ? '' : mc.ttsProviderId,
      routerProviderId: mc.routerProviderId === id ? '' : mc.routerProviderId,
      summaryProviderId: mc.summaryProviderId === id ? '' : mc.summaryProviderId,
      toolProviderId: mc.toolProviderId === id ? '' : mc.toolProviderId,
      extensionProviderId: mc.extensionProviderId === id ? '' : mc.extensionProviderId,
    }
    set((s) => ({ config: { ...s.config, providers, activeProviderId, modelConfig } }))
  },

  setActiveProvider: (id) => set((s) => ({ config: { ...s.config, activeProviderId: id, modelConfig: { ...s.config.modelConfig, chatProviderId: id } } })),

  setModelConfig: (updates) => set((s) => ({ config: { ...s.config, modelConfig: { ...s.config.modelConfig, ...updates } } })),

  addWorldBook: async (book) => {
    if (book.entries?.length) {
      const dbEntries = book.entries.map(e => ({ ...e, ownerId: book.id, updatedAt: Date.now() }));
      await db.worldEntries.bulkPut(dbEntries);
    }
    set((s) => ({ 
      config: { ...s.config, worldBookLibrary: [...(s.config.worldBookLibrary || []), book] } 
    }));
  },

  updateWorldBook: async (id, updates) => set((s) => ({ 
    config: { ...s.config, worldBookLibrary: (s.config.worldBookLibrary || []).map((b) => b.id === id ? { ...b, ...updates } : b) } 
  })),

  removeWorldBook: async (id) => {
    await db.worldEntries.where('ownerId').equals(id).delete();
    set((s) => ({ 
      config: { ...s.config, worldBookLibrary: (s.config.worldBookLibrary || []).filter((b) => b.id !== id) } 
    }));
  },

  addWorldBookEntry: async (bookId, entry) => {
    await db.worldEntries.put({ ...entry, ownerId: bookId, updatedAt: Date.now() });
    set((s) => ({
      config: {
        ...s.config,
        worldBookLibrary: (s.config.worldBookLibrary || []).map((b) => 
          b.id === bookId ? { ...b, entries: [...(b.entries || []), entry] } : b
        )
      }
    }));
  },

  updateWorldBookEntry: async (bookId, entryId, updates) => {
    const state = get();
    const book = (state.config.worldBookLibrary || []).find((b) => b.id === bookId);
    const entry = book?.entries?.find((e) => e.id === entryId);
    if (!entry) return;

    const updatedEntry = { ...entry, ...updates };
    await db.worldEntries.put({ ...updatedEntry, ownerId: bookId, updatedAt: Date.now() });

    set((s) => ({
      config: {
        ...s.config,
        worldBookLibrary: (s.config.worldBookLibrary || []).map((b) => 
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
    set((s) => ({
      config: {
        ...s.config,
        worldBookLibrary: (s.config.worldBookLibrary || []).map((b) => 
          b.id === bookId ? {
            ...b,
            entries: (b.entries || []).filter((e: WorldBookEntry) => e.id !== entryId)
          } : b
        )
      }
    }));
  },

  addDirective: (directive) => set((s) => ({
    config: { ...s.config, directives: [...(s.config.directives || []), directive] }
  })),

  updateDirective: (id, updates) => set((s) => ({
    config: { ...s.config, directives: (s.config.directives || []).map((d: Directive) => d.id === id ? { ...d, ...updates } : d) }
  })),

  removeDirective: (id) => set((s) => ({
    config: { ...s.config, directives: (s.config.directives || []).filter((d: Directive) => d.id !== id) }
  })),

  reorderDirectives: (directives) => set((s) => ({ config: { ...s.config, directives } })),

  addPromptPreset: async (preset) => {
    // 條目寫 DB，元數據（id+name）存 store
    await db.promptPresetEntries.bulkPut(
      preset.directives.map(d => ({ ...d, presetId: preset.id }))
    );
    set((s) => ({
      config: { ...s.config, promptPresets: [...(s.config.promptPresets || []), { id: preset.id, name: preset.name, directives: [] }] }
    }));
  },

  removePromptPreset: async (id) => {
    await db.promptPresetEntries.where('presetId').equals(id).delete();
    set((s) => ({
      config: { ...s.config, promptPresets: (s.config.promptPresets || []).filter((p: PromptPreset) => p.id !== id) }
    }));
  },

  updatePromptPresetDirective: async (presetId, directiveId, updates) => {
    await db.promptPresetEntries.update(directiveId, updates);
  },

  toggleSkill: (skillId) => set((s) => ({
    config: {
      ...s.config,
      enabledSkillIds: (s.config.enabledSkillIds || []).includes(skillId)
        ? (s.config.enabledSkillIds || []).filter((id: string) => id !== skillId)
        : [...(s.config.enabledSkillIds || []), skillId]
    }
  })),

  toggleDeviceContext: () => set((s) => ({
    config: { ...s.config, deviceContextEnabled: !s.config.deviceContextEnabled }
  })),

  addPersona: (persona) => set((s) => ({ 
    config: { ...s.config, personas: [...(s.config.personas || []), persona] } 
  })),

  updatePersona: (id, updates) => set((s) => ({ 
    config: { ...s.config, personas: (s.config.personas || []).map((p: UserPersona) => p.id === id ? { ...p, ...updates } : p) } 
  })),

  removePersona: (id) => set((s) => ({ 
    config: { 
      ...s.config, 
      personas: (s.config.personas || []).filter((p: UserPersona) => p.id !== id), 
      activePersonaId: s.config.activePersonaId === id ? (s.config.personas[0]?.id || '') : s.config.activePersonaId 
    } 
  })),

  setActivePersona: (id) => set((s) => ({ config: { ...s.config, activePersonaId: id } })),

  addPersonaWorldBookEntry: (personaId, entry) => set((s) => ({
    config: {
      ...s.config,
      personas: (s.config.personas || []).map((p: UserPersona) => 
        p.id === personaId ? {
          ...p,
          worldBook: [...(p.worldBook || []), entry]
        } : p
      )
    }
  })),

  updatePersonaWorldBookEntry: (personaId, entryId, updates) => set((s) => ({
    config: {
      ...s.config,
      personas: (s.config.personas || []).map((p: UserPersona) => 
        p.id === personaId ? {
          ...p,
          worldBook: (p.worldBook || []).map((e: WorldBookEntry) => e.id === entryId ? { ...e, ...updates } : e)
        } : p
      )
    }
  })),

  removePersonaWorldBookEntry: (personaId, entryId) => set((s) => ({
    config: {
      ...s.config,
      personas: (s.config.personas || []).map((p: UserPersona) => 
        p.id === personaId ? {
          ...p,
          worldBook: (p.worldBook || []).filter((e: WorldBookEntry) => e.id !== entryId)
        } : p
      )
    }
  })),

  addRegexRule: (rule) => set((s) => ({
    config: { ...s.config, regexRules: [...(s.config.regexRules || []), rule] }
  })),

  updateRegexRule: (id, updates) => set((s) => ({
    config: { ...s.config, regexRules: (s.config.regexRules || []).map((r: RegexRule) => r.id === id ? { ...r, ...updates } : r) }
  })),

  removeRegexRule: (id) => set((s) => ({
    config: { ...s.config, regexRules: (s.config.regexRules || []).filter((r: RegexRule) => r.id !== id) }
  })),

  reorderRegexRules: (rules) => set((s) => ({ config: { ...s.config, regexRules: rules } })),

  installSkill: (skill) => {
    // 先从内存注册表删除旧版本，确保重新加载
    delete registeredSkills[skill.id.replace(/-/g, '_')]
    set((s) => {
      const existing = (s.config.installedSkills || []).filter((sk: InstalledSkill) => sk.id !== skill.id)
      return { config: { ...s.config, installedSkills: [...existing, skill] } }
    })
    // 加载后同步名称列表触发重渲染（loader 会在外部调用 loadInstalledSkill）
    setTimeout(() => get().syncRegisteredSkillNames(), 0)
  },

  uninstallSkill: (id) => {
    const skillName = id.replace(/-/g, '_')
    delete registeredSkills[skillName]
    set((s) => ({
      config: {
        ...s.config,
        installedSkills: (s.config.installedSkills || []).filter((sk: InstalledSkill) => sk.id !== id),
        enabledSkillIds: (s.config.enabledSkillIds || []).filter((sid: string) => sid !== skillName && sid !== id),
      }
    }))
    get().syncRegisteredSkillNames()
  },

  installApp: (app) => set((s) => {
    const existing = (s.config.installedApps || []).filter((a: InstalledApp) => a.id !== app.id)
    return { config: { ...s.config, installedApps: [...existing, app] } }
  }),

  reorderApps: (appIds) => set((s) => ({ config: { ...s.config, appOrder: appIds } })),

  uninstallApp: (id, keepData = true) => set((s) => {
    const newConfig = {
      ...s.config,
      installedApps: (s.config.installedApps || []).filter((a: InstalledApp) => a.id !== id),
      appOrder: (s.config.appOrder || []).filter(appId => appId !== id),
    };
    if (!keepData && newConfig.appStorage) {
      const { [id]: _, ...restStorage } = newConfig.appStorage;
      newConfig.appStorage = restStorage;
    }
    return { config: newConfig };
  }),
});

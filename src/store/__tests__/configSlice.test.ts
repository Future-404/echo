import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../storage/db', () => ({
  db: {
    promptPresetEntries: {
      bulkPut: vi.fn().mockResolvedValue(undefined),
      where: vi.fn(() => ({ equals: vi.fn(() => ({ delete: vi.fn().mockResolvedValue(undefined) })) })),
      update: vi.fn().mockResolvedValue(undefined),
    },
    worldEntries: { where: vi.fn(() => ({ anyOf: vi.fn(() => ({ filter: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })) })) })) },
  }
}));

import { createConfigSlice } from '../configSlice';
import type { ConfigSlice } from '../configSlice';
import type { PromptPreset } from '../../types/store';
import { DEFAULT_MODEL_CONFIG } from '../../types/modelConfig';

const makeSlice = () => {
  const initialConfig = {
    promptPresets: [] as PromptPreset[],
    directives: [],
    worldBookLibrary: [],
    providers: [],
    activeProviderId: '',
    modelConfig: { ...DEFAULT_MODEL_CONFIG },
    theme: 'system' as const,
    enabledSkillIds: [],
    personas: [],
    activePersonaId: '',
    isDebugEnabled: false,
    fontFamily: '',
    fontSize: 16,
    customCss: '',
    customBg: false,
    regexRules: [],
    appLock: { enabled: false, pinHash: '', timeoutMinutes: 5 },
  };
  let state: any = { config: initialConfig };
  const set = (fn: any) => {
    const next = typeof fn === 'function' ? fn(state) : fn;
    Object.assign(state, next);
    if (next.config) slice.config = next.config;
  };
  const get = () => state;
  const slice = createConfigSlice(initialConfig)(set, get, {} as any) as ConfigSlice;
  return slice;
};

describe('configSlice promptPresets', () => {
  let slice: ConfigSlice;

  beforeEach(() => {
    slice = makeSlice();
    vi.clearAllMocks();
  });

  it('addPromptPreset stores metadata only (empty directives) in config', async () => {
    const preset: PromptPreset = {
      id: 'p1',
      name: 'TestPreset',
      directives: [{ id: 'd1', title: 'Rule', content: 'Content', enabled: true }]
    };
    await slice.addPromptPreset(preset);
    const stored = slice.config.promptPresets[0];
    expect(stored.id).toBe('p1');
    expect(stored.name).toBe('TestPreset');
    expect(stored.directives).toHaveLength(0);
  });

  it('addPromptPreset writes entries to DB with presetId', async () => {
    const { db } = await import('../../storage/db');
    const preset: PromptPreset = {
      id: 'p1',
      name: 'TestPreset',
      directives: [{ id: 'd1', title: 'Rule', content: 'Content', enabled: true }]
    };
    await slice.addPromptPreset(preset);
    expect(db.promptPresetEntries.bulkPut).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'd1', presetId: 'p1' })
    ]);
  });

  it('removePromptPreset removes from config and deletes DB entries', async () => {
    const { db } = await import('../../storage/db');
    const preset: PromptPreset = { id: 'p1', name: 'Test', directives: [] };
    await slice.addPromptPreset(preset);
    await slice.removePromptPreset('p1');
    expect(slice.config.promptPresets).toHaveLength(0);
    expect(db.promptPresetEntries.where).toHaveBeenCalledWith('presetId');
  });

  it('updatePromptPresetDirective calls db.update', async () => {
    const { db } = await import('../../storage/db');
    await slice.updatePromptPresetDirective('p1', 'd1', { enabled: false });
    expect(db.promptPresetEntries.update).toHaveBeenCalledWith('d1', { enabled: false });
  });
});

describe('configSlice modelConfig', () => {
  let slice: ConfigSlice;

  beforeEach(() => {
    slice = makeSlice();
  });

  it('初始 modelConfig 使用 DEFAULT_MODEL_CONFIG', () => {
    expect(slice.config.modelConfig).toEqual(DEFAULT_MODEL_CONFIG);
  });

  it('setModelConfig 部分更新', () => {
    slice.setModelConfig({ chatProviderId: 'p1', embeddingProviderId: 'p2' });
    expect(slice.config.modelConfig.chatProviderId).toBe('p1');
    expect(slice.config.modelConfig.embeddingProviderId).toBe('p2');
    expect(slice.config.modelConfig.routerProviderId).toBe(''); // 未改动
  });

  it('setActiveProvider 同步更新 modelConfig.chatProviderId', () => {
    slice.addProvider({ id: 'p1', name: 'Test', apiKey: 'k', endpoint: 'e', model: 'm', type: 'chat' });
    slice.setActiveProvider('p1');
    expect(slice.config.activeProviderId).toBe('p1');
    expect(slice.config.modelConfig.chatProviderId).toBe('p1');
  });

  it('removeProvider 清理 modelConfig 中所有对该 provider 的引用', () => {
    slice.addProvider({ id: 'p1', name: 'A', apiKey: 'k', endpoint: 'e', model: 'm', type: 'chat' });
    slice.setModelConfig({
      chatProviderId: 'p1',
      embeddingProviderId: 'p1',
      ttsProviderId: 'p1',
      routerProviderId: 'p1',
      summaryProviderId: 'p1',
    });
    slice.removeProvider('p1');
    const mc = slice.config.modelConfig;
    expect(mc.chatProviderId).toBe('default');
    expect(mc.embeddingProviderId).toBe('');
    expect(mc.ttsProviderId).toBe('');
    expect(mc.routerProviderId).toBe('');
    expect(mc.summaryProviderId).toBe('');
  });

  it('removeProvider 不影响未引用该 provider 的 modelConfig 字段', () => {
    slice.addProvider({ id: 'p1', name: 'A', apiKey: 'k', endpoint: 'e', model: 'm', type: 'chat' });
    slice.addProvider({ id: 'p2', name: 'B', apiKey: 'k', endpoint: 'e', model: 'm', type: 'embedding' });
    slice.setModelConfig({ chatProviderId: 'p1', embeddingProviderId: 'p2' });
    slice.removeProvider('p1');
    expect(slice.config.modelConfig.embeddingProviderId).toBe('p2'); // 不受影响
  });
});

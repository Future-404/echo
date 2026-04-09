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

const makeSlice = () => {
  const initialConfig = {
    promptPresets: [] as PromptPreset[],
    directives: [],
    worldBookLibrary: [],
    providers: [],
    activeProviderId: '',
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
    // 同步更新 slice.config 引用
    if (next.config) slice.config = next.config;
  };
  const get = () => state;
  const slice = createConfigSlice(set, get, initialConfig) as ConfigSlice;
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
    expect(stored.directives).toHaveLength(0); // 條目在 DB，不在 store
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

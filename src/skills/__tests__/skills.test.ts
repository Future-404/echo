import { describe, it, expect, vi } from 'vitest';

vi.mock('../../logic/promptEngine', () => ({ buildPromptMessages: vi.fn(), replaceMacros: vi.fn() }))
vi.mock('../../store/useAppStore', () => ({ useAppStore: { getState: vi.fn(() => ({ config: { providers: [], modelConfig: {} }, characters: [], addFragment: vi.fn() })) } }))
vi.mock('../../storage/db', () => ({ db: { messages: {}, worldEntries: { where: vi.fn() }, memoryEpisodes: { where: vi.fn() } } }))

import { questSkill } from '../quests';
import { tweetSkill } from '../tweet';
import { registeredSkills } from '../core/registry';
import { getEnabledSkillPrompts, getEnabledSkills, executeSkill } from '../index';
import { ALLOWED_PERMISSIONS } from '../core/types';

// ── registry ──────────────────────────────────────────────────────
describe('skill registry', () => {
  it('contains questSkill and tweetSkill by default', () => {
    expect(registeredSkills[questSkill.name]).toBeDefined();
    expect(registeredSkills[tweetSkill.name]).toBeDefined();
  });

  it('all registered skills have required fields', () => {
    Object.values(registeredSkills).forEach(skill => {
      expect(skill.name).toBeTruthy();
      expect(skill.displayName).toBeTruthy();
      expect(skill.schema).toBeTruthy();
      expect(typeof skill.execute).toBe('function');
    });
  });

  it('getEnabledSkills returns schemas for valid ids', () => {
    const schemas = getEnabledSkills([questSkill.name]);
    expect(schemas).toHaveLength(1);
  });

  it('getEnabledSkills ignores unknown ids', () => {
    expect(getEnabledSkills(['unknown_skill'])).toHaveLength(0);
  });

  it('getEnabledSkills returns empty for undefined', () => {
    expect(getEnabledSkills(undefined)).toHaveLength(0);
  });
});

// ── systemPrompt ──────────────────────────────────────────────────
describe('skill systemPrompt', () => {
  const ctx = { messages: [], characterName: 'Aria', userName: 'Alice', attributes: {} };

  it('getEnabledSkillPrompts returns empty when no skills enabled', () => {
    expect(getEnabledSkillPrompts([])).toBe('');
  });

  it('getEnabledSkillPrompts returns empty for unknown skill', () => {
    expect(getEnabledSkillPrompts(['unknown'])).toBe('');
  });

  it('supports function systemPrompt with ctx', () => {
    const mockSkill = {
      name: 'test_skill',
      displayName: 'Test',
      description: 'test',
      schema: {},
      execute: vi.fn(),
      systemPrompt: (c: typeof ctx) => `Hello ${c.characterName}`,
    };
    registeredSkills['test_skill'] = mockSkill;
    const result = getEnabledSkillPrompts(['test_skill'], ctx);
    expect(result).toBe('Hello Aria');
    delete registeredSkills['test_skill'];
  });

  it('supports string systemPrompt', () => {
    const mockSkill = {
      name: 'test_skill2',
      displayName: 'Test2',
      description: 'test',
      schema: {},
      execute: vi.fn(),
      systemPrompt: 'Static prompt',
    };
    registeredSkills['test_skill2'] = mockSkill;
    const result = getEnabledSkillPrompts(['test_skill2'], ctx);
    expect(result).toBe('Static prompt');
    delete registeredSkills['test_skill2'];
  });
});

// ── executeSkill ──────────────────────────────────────────────────
describe('executeSkill', () => {
  const ctx = { messages: [], characterName: 'Aria', userName: 'Alice', attributes: {} };

  it('returns error for unknown skill', async () => {
    const result = await executeSkill('nonexistent', {}, ctx);
    expect(result.success).toBe(false);
    expect(result.message).toContain('not found');
  });

  it('passes ctx to execute', async () => {
    const mockExecute = vi.fn().mockResolvedValue({ success: true, message: 'ok' });
    registeredSkills['ctx_test'] = {
      name: 'ctx_test', displayName: 'T', description: 'd', schema: {}, execute: mockExecute,
    };
    await executeSkill('ctx_test', { foo: 'bar' }, ctx);
    expect(mockExecute).toHaveBeenCalledWith({ foo: 'bar' }, ctx);
    delete registeredSkills['ctx_test'];
  });

  it('catches execute errors gracefully', async () => {
    registeredSkills['err_skill'] = {
      name: 'err_skill', displayName: 'E', description: 'd', schema: {},
      execute: async () => { throw new Error('boom') },
    };
    const result = await executeSkill('err_skill', {}, ctx);
    expect(result.success).toBe(false);
    expect(result.message).toContain('boom');
    delete registeredSkills['err_skill'];
  });
});

// ── loader validation ─────────────────────────────────────────────
describe('ALLOWED_PERMISSIONS', () => {
  it('contains expected permissions', () => {
    expect(ALLOWED_PERMISSIONS).toContain('chat_history');
    expect(ALLOWED_PERMISSIONS).toContain('character_info');
    expect(ALLOWED_PERMISSIONS).toContain('attributes');
  });
});

// ── SkillExecuteResult.suppressFollowUp ──────────────────────────
describe('suppressFollowUp field', () => {
  it('skill can return suppressFollowUp: true', async () => {
    registeredSkills['suppress_test'] = {
      name: 'suppress_test', displayName: 'S', description: 'd', schema: {},
      execute: async () => ({ success: true, message: 'done', suppressFollowUp: true }),
    };
    const result = await executeSkill('suppress_test', {}, { messages: [], characterName: '', userName: '', attributes: {} });
    expect((result as any).suppressFollowUp).toBe(true);
    delete registeredSkills['suppress_test'];
  });
});

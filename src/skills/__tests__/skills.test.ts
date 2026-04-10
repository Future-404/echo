import { describe, it, expect, vi } from 'vitest';

// mock 重型依赖，避免 DB/store 初始化失败
vi.mock('../../logic/promptEngine', () => ({ buildPromptMessages: vi.fn(), replaceMacros: vi.fn() }))
vi.mock('../../store/useAppStore', () => ({ useAppStore: { getState: vi.fn(() => ({ config: { providers: [], modelConfig: {} }, characters: [] })) } }))
vi.mock('../../storage/db', () => ({ db: { messages: {}, worldEntries: { toArray: vi.fn() }, memoryEpisodes: { where: vi.fn() } } }))

import { questSkill } from '../quests';
import { deviceSkill } from '../device';
import { getEnabledSkillPrompts, getEnabledSkills, ALL_SKILLS } from '../index';

describe('skills - no systemPrompt after refactor', () => {
  it('questSkill has no systemPrompt', () => {
    expect(questSkill.systemPrompt).toBeUndefined();
  });

  it('deviceSkill has no systemPrompt', () => {
    expect(deviceSkill.systemPrompt).toBeUndefined();
  });

  it('getEnabledSkillPrompts returns empty string', () => {
    expect(getEnabledSkillPrompts(['manage_quest_state', 'get_device_status'])).toBe('');
  });
});

describe('skills - schema description contains behavior rules', () => {
  it('questSchema description mentions MAIN objective constraint', () => {
    const schema = questSkill.schema as any;
    expect(schema.function.description).toContain('MAIN');
  });

  it('questSchema action description covers all actions', () => {
    const schema = questSkill.schema as any;
    const actionDesc = schema.function.parameters.properties.action.description;
    expect(actionDesc).toContain('CREATE');
    expect(actionDesc).toContain('RESOLVE');
    expect(actionDesc).toContain('FAIL');
  });

  it('deviceSchema description mentions narrative guidance', () => {
    const schema = deviceSkill.schema as any;
    expect(schema.description).toContain('叙事');
  });
});

describe('skills - registry', () => {
  it('all registered skills have required fields', () => {
    ALL_SKILLS.forEach(skill => {
      expect(skill.name).toBeTruthy();
      expect(skill.displayName).toBeTruthy();
      expect(skill.schema).toBeTruthy();
      expect(typeof skill.execute).toBe('function');
    });
  });

  it('getEnabledSkills returns schemas for valid ids', () => {
    const schemas = getEnabledSkills(['manage_quest_state']);
    expect(schemas).toHaveLength(1);
  });

  it('getEnabledSkills ignores unknown ids', () => {
    const schemas = getEnabledSkills(['unknown_skill']);
    expect(schemas).toHaveLength(0);
  });
});

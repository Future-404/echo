import type { SkillModule, SkillContext } from './core/types';
export { registeredSkills } from './core/registry';
import { registeredSkills } from './core/registry';

export const getEnabledSkills = (enabledIds?: string[]) => {
  if (!enabledIds) return [];
  return enabledIds
    .map(id => registeredSkills[id]?.schema)
    .filter(Boolean);
};

export const ALL_SKILLS: SkillModule[] = Object.values(registeredSkills);

export const getEnabledSkillPrompts = (enabledIds?: string[], ctx?: SkillContext) => {
  if (!enabledIds) return '';
  return enabledIds
    .map(id => {
      const sp = registeredSkills[id]?.systemPrompt;
      if (!sp) return null;
      return typeof sp === 'function' ? (ctx ? sp(ctx) : null) : sp;
    })
    .filter(Boolean)
    .join('\n\n');
};

export const executeSkill = async (name: string, args: any, ctx?: SkillContext) => {
  const skill = registeredSkills[name];
  if (!skill) return { success: false, message: `Skill not found: ${name}` };
  const resolvedCtx: SkillContext = ctx ?? {
    messages: [],
    characterName: '',
    userName: '',
    attributes: {},
  };
  try {
    return await skill.execute(args, resolvedCtx);
  } catch (e: any) {
    console.error(`Skill ${name} failed:`, e);
    return { success: false, message: `Error: ${e?.message || 'unknown'}` };
  }
};

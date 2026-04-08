import type { SkillModule, SkillExecuteResult } from './core/types';
import { questSkill } from './quests';
import { deviceSkill } from './device';

export const registeredSkills: Record<string, SkillModule> = {
  [questSkill.name]: questSkill,
  [deviceSkill.name]: deviceSkill,
};

export const getEnabledSkills = (enabledIds?: string[]) => {
  if (!enabledIds) return [];
  return enabledIds
    .map(id => registeredSkills[id]?.schema)
    .filter(Boolean);
};

export const ALL_SKILLS: SkillModule[] = Object.values(registeredSkills);

export const getEnabledSkillPrompts = (enabledIds?: string[]) => {
  if (!enabledIds) return '';
  return enabledIds
    .map(id => registeredSkills[id]?.systemPrompt)
    .filter(Boolean)
    .join('\n\n');
};

export const executeSkill = async (name: string, args: any): Promise<SkillExecuteResult> => {
  const skill = registeredSkills[name];
  if (!skill) return { success: false, message: `Skill not found: ${name}` };
  try {
    return await skill.execute(args);
  } catch (e: any) {
    console.error(`Skill ${name} failed:`, e);
    return { success: false, message: `Error: ${e?.message || 'unknown'}` };
  }
};

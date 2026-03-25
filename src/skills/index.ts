import type { SkillModule } from './core/types';
import { questSkill } from './quests';

// 注册所有可用的技能模块
export const registeredSkills: Record<string, SkillModule> = {
  [questSkill.name]: questSkill,
};

// 暴露给 API 调用的 Schemas (按需)
export const getEnabledSkills = (enabledIds?: string[]) => {
  if (!enabledIds) return [];
  return enabledIds
    .map(id => registeredSkills[id]?.schema)
    .filter(Boolean);
};

// 暴露所有技能供 UI 列表展示
export const ALL_SKILLS = Object.values(registeredSkills).map(s => s.schema);

// 暴露给 Prompt 引擎的专属指令 (按需)
export const getEnabledSkillPrompts = (enabledIds?: string[]) => {
  if (!enabledIds) return '';
  return enabledIds
    .map(id => registeredSkills[id]?.systemPrompt)
    .filter(Boolean)
    .join('\n\n');
};

// 统一的执行入口
export const executeSkill = (name: string, args: any) => {
  const skill = registeredSkills[name];
  if (skill) {
    try {
      return skill.execute(args);
    } catch (e) {
      console.error(`Skill ${name} failed:`, e);
      return `Error executing ${name}`;
    }
  }
  return `Skill ${name} not found`;
};

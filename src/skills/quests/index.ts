import type { SkillModule } from '../core/types';
import { questSchema } from './schema';
import { executeQuestSkill } from './executor';

export const questSkill: SkillModule = {
  name: questSchema.function.name,
  displayName: '叙事目标追踪',
  description: questSchema.function.description,
  schema: questSchema,
  execute: executeQuestSkill,
  systemPrompt: '当你调用叙事目标追踪工具后，不要在回复中复述或展示 JSON 数据。直接用自然语言继续叙事即可。',
};

import type { SkillModule } from '../core/types';
import { questSchema } from './schema';
import { executeQuestSkill } from './executor';

export const questSkill: SkillModule = {
  name: questSchema.function.name,
  displayName: '叙事目标追踪',
  description: questSchema.function.description,
  schema: questSchema,
  execute: executeQuestSkill,
};

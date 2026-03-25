import type { SkillModule } from '../core/types';
import { questSchema } from './schema';
import { executeQuestSkill } from './executor';
import { questPrompt } from './prompt';

export const questSkill: SkillModule = {
  name: questSchema.function.name,
  schema: questSchema,
  execute: executeQuestSkill,
  systemPrompt: questPrompt
};

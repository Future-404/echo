import type { SkillModule } from './types'
import { questSkill } from '../quests'
import { tweetSkill } from '../tweet'

// 全局 skill 注册表，第三方 skill 动态注入此对象
export const registeredSkills: Record<string, SkillModule> = {
  [questSkill.name]: questSkill,
  [tweetSkill.name]: tweetSkill,
}

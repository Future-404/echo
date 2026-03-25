import { CORE_FORMATTING_RULES } from '../store/constants';
import type { CharacterCard, UserPersona, Directive, Mission, WorldBook } from '../store/useAppStore';
import { getEnabledSkillPrompts } from '../skills';

export interface PromptContext {
  character: CharacterCard;
  persona?: UserPersona;
  directives: Directive[];
  worldBookLibrary: WorldBook[]; // 全局世界书库
  missions: Mission[];
  userName: string;
  enabledSkillIds?: string[];
  recentMessages?: any[]; // 用于关键词匹配
}

/**
 * 宏替换引擎：将文本中的 {{user}} 和 {{char}} 替换为实际名称
 */
export const replaceMacros = (text: string, userName: string, charName: string): string => {
  if (!text) return '';
  return text
    .replace(/\{\{user\}\}/gi, userName)
    .replace(/\{\{char\}\}/gi, charName);
};

/**
 * 核心提示词引擎：将各模块数据组装为结构化的 System Prompt
 * 遵循极简主义与高保真还原
 */
export const buildSystemPrompt = (ctx: PromptContext): string => {
  const { 
    character, persona, directives, worldBookLibrary, 
    missions, userName, enabledSkillIds, recentMessages = [] 
  } = ctx;

  const actualUserName = persona?.name || userName || 'User';
  const charName = character.name;

  // 1. 提取最近对话作为匹配上下文
  const contextText = recentMessages
    .slice(-3)
    .map(m => m.content)
    .join(' ')
    .toLowerCase();

  const enabledDirectives = (directives || [])
    .filter(d => d.enabled)
    .map(d => `[Protocol: ${d.title}]\n${replaceMacros(d.content, actualUserName, charName)}`)
    .join('\n\n');

  const missionStatus = (missions || [])
    .filter(m => m.status === 'ACTIVE')
    .map(m => `- ${m.title}: ${replaceMacros(m.description || '', actualUserName, charName)} (${m.progress}%)`)
    .join('\n');

  // 2. 知识源处理
  // A. 公共绑定书库 (保持关键词动态加载)
  const boundBookIds = character.extensions?.worldBookIds || [];
  const libraryEntries = (worldBookLibrary || [])
    .filter(book => boundBookIds.includes(book.id))
    .flatMap(book => book.entries || [])
    .filter(entry => {
      if (!entry.enabled) return false;
      if (!entry.keys || entry.keys.length === 0) return true; // 无 Key 基础设定始终开启
      return entry.keys.some(k => contextText.includes(k.toLowerCase().trim()));
    });

  // B. 角色私有条目 (全量注入，不进行关键词匹配)
  const privateEntries = (character.extensions?.worldBook || [])
    .filter(entry => entry.enabled);

  // 合并并渲染
  const allActiveEntries = [...libraryEntries, ...privateEntries];

  const activeWorldContext = allActiveEntries
    .map(entry => {
      const label = entry.keys && entry.keys.length > 0 ? ` [Knowledge: ${entry.keys.join(', ')}]` : '';
      return `${label}\n${replaceMacros(entry.content, actualUserName, charName)}`;
    })
    .join('\n\n') || 'A digital echo chamber where memories fragment and reform.';


  // 动态替换技能提示词中的变量
  const rawSkillPrompts = getEnabledSkillPrompts(enabledSkillIds);
  const dynamicSkillPrompts = rawSkillPrompts 
    ? replaceMacros(rawSkillPrompts, actualUserName, charName).replace(/\[角色名\]/g, charName)
    : '';

  const skillSection = dynamicSkillPrompts ? `\n\n  ### SKILL MODULES & DIRECTIVES\n  ${dynamicSkillPrompts}` : '';

  // 注入动态属性状态 (反馈回路)
  const currentAttributes = character.attributes || {};
  const attributeContext = Object.keys(currentAttributes).length > 0
    ? `\n### ACTIVE STATE SLOTS (STATEFUL TRACKING)\nCurrently tracked attributes for this session:\n${Object.entries(currentAttributes)
        .map(([k, v]) => `- ${k}: ${v}`)
        .join('\n')}`
    : '';

  const systemPrompt = replaceMacros(character.systemPrompt, actualUserName, charName);

  return `
  ### CORE IDENTITY
  ${systemPrompt}

  ### USER PERSONA
  You are interacting with: ${actualUserName}
  Background: ${replaceMacros(persona?.background || 'A silent observer.', actualUserName, charName)}
  ${(persona?.worldBook || []).filter(e => e.enabled).map(e => `[User Settings: ${e.comment || 'Private'}]\n${replaceMacros(e.content, actualUserName, charName)}`).join('\n\n') || ''}
  Current Alias: ${userName}

  ### OPERATIONAL PROTOCOLS
  ${enabledDirectives}

  ### WORLD CONTEXT
  ${activeWorldContext}
  ${attributeContext}${skillSection}

  ### CURRENT OBJECTIVE STATUS (READ BEFORE RESPONDING)
  ${missionStatus || 'No active narrative objectives. You may establish a MAIN or SIDE objective if the narrative requires it.'}

  ### FORMATTING RULES (SYSTEM IMMUTABLE)
  ${CORE_FORMATTING_RULES}
  `.trim();
};

import { CORE_FORMATTING_RULES } from '../store/constants';
import type { CharacterCard, UserPersona, Directive, Mission, WorldBook } from '../store/useAppStore';
import { getEnabledSkillPrompts } from '../skills';

export interface PromptContext {
  character: CharacterCard;
  persona?: UserPersona;
  directives: Directive[];
  worldBookLibrary: WorldBook[];
  missions: Mission[];
  userName: string;
  enabledSkillIds?: string[];
  recentMessages?: any[];
  isMultiChar?: boolean;
  otherCharName?: string;
}

/**
 * 宏替换引擎上下文接口
 */
export interface MacroOptions {
  otherName?: string;
  currentQuest?: string;
  userDescription?: string;
  userBackground?: string;
}

/**
 * 宏替换引擎：将文本中的 {{user}}, {{char}}, {{time}}, {{date}}, {{weekday}}, {{other}}, {{current_quest}}, {{description}}, {{background}} 替换为实际内容
 */
export const replaceMacros = (text: string, userName: string, charName: string, options: MacroOptions = {}): string => {
  if (!text) return '';
  
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const date = now.toISOString().split('T')[0];
  const weekday = now.toLocaleDateString(undefined, { weekday: 'long' });

  return text
    .replace(/\{\{user\}\}/gi, userName)
    .replace(/\{\{char\}\}/gi, charName)
    .replace(/\{\{other\}\}/gi, options.otherName || 'None')
    .replace(/\{\{time\}\}/gi, time)
    .replace(/\{\{date\}\}/gi, date)
    .replace(/\{\{weekday\}\}/gi, weekday)
    .replace(/\{\{current_quest\}\}/gi, options.currentQuest || 'None')
    .replace(/\{\{description\}\}/gi, options.userDescription || '')
    .replace(/\{\{background\}\}/gi, options.userBackground || '');
};

/**
 * 核心提示词引擎：将各模块数据组装为结构化的 System Prompt
 * 遵循极简主义与高保真还原
 */
export const buildSystemPrompt = (ctx: PromptContext): string => {
  const { 
    character, persona, directives, worldBookLibrary, 
    missions, userName, enabledSkillIds, recentMessages = [],
    isMultiChar, otherCharName,
  } = ctx;

  const actualUserName = persona?.name || userName || 'User';
  const charName = character.name;

  // 准备宏替换上下文
  const activeMainQuest = (missions || []).find(m => m.status === 'ACTIVE' && m.type === 'MAIN');
  const macroOptions: MacroOptions = {
    otherName: otherCharName,
    currentQuest: activeMainQuest?.title,
    userDescription: persona?.description,
    userBackground: persona?.background,
  };

  // 快捷调用函数
  const fastReplace = (t: string) => replaceMacros(t, actualUserName, charName, macroOptions);

  // 1. 提取最近对话作为匹配上下文
  // scan_depth: 取所有绑定书中最大值，默认 3（V2 规范字段）
  const boundBookIds = character.extensions?.worldBookIds || [];
  const boundBooks = (worldBookLibrary || []).filter(book => boundBookIds.includes(book.id));
  const scanDepth = boundBooks.reduce((max, b) => Math.max(max, b.scanDepth ?? 3), 3);

  const contextText = recentMessages
    .slice(-scanDepth)
    .map(m => m.content)
    .join(' ')
    .toLowerCase();

  const enabledDirectives = (directives || [])
    .filter(d => d.enabled)
    .map(d => `[Protocol: ${d.title}]\n${fastReplace(d.content)}`)
    .join('\n\n');

  const missionStatus = (missions || [])
    .filter(m => m.status === 'ACTIVE')
    .map(m => `- ${m.title}: ${fastReplace(m.description || '')} (${m.progress}%)`)
    .join('\n');

  // 2. 知识源处理
  const libraryEntries = boundBooks
    .flatMap(book => book.entries || [])
    .filter(entry => {
      if (!entry.enabled) return false;
      if (entry.constant) return true;
      if (!entry.keys || entry.keys.length === 0) return true;
      return entry.keys.some(k => contextText.includes(k.toLowerCase().trim()));
    })
    .sort((a, b) => (a.insertionOrder ?? 0) - (b.insertionOrder ?? 0));

  const privateEntries = (character.extensions?.worldBook || [])
    .filter(entry => entry.enabled)
    .sort((a, b) => (a.insertionOrder ?? 0) - (b.insertionOrder ?? 0));

  const allActiveEntries = [...libraryEntries, ...privateEntries];

  const activeWorldContext = allActiveEntries
    .map(entry => {
      const label = entry.keys && entry.keys.length > 0 ? ` [Knowledge: ${entry.keys.join(', ')}]` : '';
      return `${label}\n${fastReplace(entry.content)}`;
    })
    .join('\n\n') || 'A digital echo chamber where memories fragment and reform.';

  const rawSkillPrompts = getEnabledSkillPrompts(enabledSkillIds);
  const dynamicSkillPrompts = rawSkillPrompts 
    ? fastReplace(rawSkillPrompts).replace(/\[角色名\]/g, charName)
    : '';

  const skillSection = dynamicSkillPrompts ? `\n\n  ### SKILL MODULES & DIRECTIVES\n  ${dynamicSkillPrompts}` : '';

  const currentAttributes = character.attributes || {};
  const attributeContext = Object.keys(currentAttributes).length > 0
    ? `\n### ACTIVE STATE SLOTS (STATEFUL TRACKING)\nCurrently tracked attributes for this session:\n${Object.entries(currentAttributes)
        .map(([k, v]) => `- ${k}: ${v}`)
        .join('\n')}`
    : '';

  // 3. system_prompt：支持 {{original}} 占位符（V2 规范）
  const globalSystemPrompt = `${enabledDirectives}\n\n${CORE_FORMATTING_RULES}`.trim();
  const rawSystemPrompt = character.systemPrompt || '';
  const systemPrompt = fastReplace(
    rawSystemPrompt.includes('{{original}}')
      ? rawSystemPrompt.replace(/\{\{original\}\}/gi, globalSystemPrompt)
      : rawSystemPrompt
  );

  const multiCharSection = isMultiChar && otherCharName ? `

  ### MULTI-CHARACTER SCENE RULES (IMMUTABLE)
  This is a multi-character scene. You will see messages prefixed with [Name]: indicating different speakers.
  - You are ONLY ${charName}. Never speak as ${otherCharName} or ${actualUserName}.
  - Never generate a [${charName}]: prefix in your reply.
  - Never generate lines starting with [${otherCharName}]: or [${actualUserName}]:
  - If you feel the urge to write another character's dialogue, stop immediately.` : '';

  return `
  ### CORE IDENTITY
  ${systemPrompt}

  ### USER PERSONA
  You are interacting with: ${actualUserName}
  Background: ${fastReplace(persona?.background || 'A silent observer.')}
  ${(persona?.worldBook || []).filter(e => e.enabled).map(e => `[User Settings: ${e.comment || 'Private'}]\n${fastReplace(e.content)}`).join('\n\n') || ''}
  Current Alias: ${userName}

  ### OPERATIONAL PROTOCOLS
  ${enabledDirectives}

  ### WORLD CONTEXT
  ${activeWorldContext}
  ${attributeContext}${skillSection}

  ### CURRENT OBJECTIVE STATUS (READ BEFORE RESPONDING)
  ${missionStatus || 'No active narrative objectives.'}

  ### FORMATTING RULES (SYSTEM IMMUTABLE)
  ${CORE_FORMATTING_RULES}${multiCharSection}
  `.trim();
};

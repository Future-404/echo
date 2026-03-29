import type { CharacterCard, UserPersona, Directive, Mission, WorldBook, WorldBookEntry, Message } from '../store/useAppStore';
import { getEnabledSkillPrompts } from '../skills';
import { estimateTokens } from '../utils/tokenCounter';

export interface PromptContext {
  character: CharacterCard;
  persona?: UserPersona;
  directives: Directive[];
  worldBookLibrary: WorldBook[];
  missions: Mission[];
  userName: string;
  enabledSkillIds?: string[];
  recentMessages: Message[];
  isMultiChar?: boolean;
  otherCharName?: string;
}

export interface MacroOptions {
  otherName?: string;
  currentQuest?: string;
  userDescription?: string;
  userBackground?: string;
  userSurname?: string;
  userNickname?: string;
}

/**
 * 宏替换引擎
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
    .replace(/\{\{background\}\}/gi, options.userBackground || '')
    .replace(/\{\{user_surname\}\}/gi, options.userSurname || userName)
    .replace(/\{\{user_nickname\}\}/gi, options.userNickname || userName);
};

/**
 * 递归扫描并激活世界书条目 (1:1 复刻 ST 高级匹配算法)
 */
export const scanActiveWorldInfo = (ctx: PromptContext): WorldBookEntry[] => {
  const { character, worldBookLibrary, recentMessages } = ctx;
  
  const boundBookIds = character.extensions?.worldBookIds || [];
  const allAvailableEntries = [
    ...(worldBookLibrary || []).filter(book => boundBookIds.includes(book.id)).flatMap(b => b.entries || []),
    ...(character.extensions?.worldBook || [])
  ].filter(e => e.enabled);

  const activatedEntries = new Map<string, WorldBookEntry>();
  
  // 1. 获取初始扫描文本 (最近的聊天记录)
  const scanDepth = 3; 
  const messageContext = recentMessages.slice(-scanDepth).map(m => m.content).join('\n').toLowerCase();

  const performScan = (text: string): boolean => {
    let newlyAdded = false;
    for (const entry of allAvailableEntries) {
      if (activatedEntries.has(entry.id)) continue;
      
      // 常驻条目直接激活
      if (entry.constant || !entry.keys || entry.keys.length === 0) {
        activatedEntries.set(entry.id, entry);
        newlyAdded = true;
        continue;
      }

      // 关键词匹配：支持 /regex/flags 格式或普通字符串
      const matched = entry.keys.some(k => {
        const trimmed = k.trim();
        if (!trimmed) return false;
        const reMatch = trimmed.match(/^\/(.+)\/([gimsuy]*)$/);
        if (reMatch) {
          try { return new RegExp(reMatch[1], reMatch[2]).test(text); } catch { return false; }
        }
        const lower = trimmed.toLowerCase();
        return new RegExp(`\\b${lower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text);
      });

      if (matched) {
        activatedEntries.set(entry.id, entry);
        newlyAdded = true;
      }
    }
    return newlyAdded;
  };

  // 第一轮：基于消息内容扫描
  performScan(messageContext);

  // 递归扫描：基于已激活条目的内容扫描 (最大深度 2 层，即 A -> B -> C)
  for (let i = 0; i < 2; i++) {
    const currentActiveContent = Array.from(activatedEntries.values()).map(e => e.content).join('\n').toLowerCase();
    if (!performScan(currentActiveContent)) break;
  }

  return Array.from(activatedEntries.values()).sort((a, b) => (a.insertionOrder ?? 0) - (b.insertionOrder ?? 0));
};

/**
 * 构建符合 SillyTavern 逻辑的消息数组 (Token 驱动 + 权重裁剪)
 */
export const buildPromptMessages = (ctx: PromptContext, contextWindow: number = 32000): any[] => {
  const { 
    character, persona, directives, 
    missions, userName, enabledSkillIds, recentMessages,
    isMultiChar, otherCharName,
  } = ctx;

  const actualUserName = persona?.name || userName || 'User';
  const charName = character.name;
  const fastReplace = (t: string) => replaceMacros(t, actualUserName, charName, {
    otherName: otherCharName,
    currentQuest: (missions || []).find(m => m.status === 'ACTIVE' && m.type === 'MAIN')?.title,
    userDescription: persona?.description,
    userBackground: persona?.background,
    userSurname: persona?.surname,
    userNickname: persona?.nickname,
  });

  // 1. 递归扫描获取所有激活条目
  const rawActiveEntries = scanActiveWorldInfo(ctx);

  // 2. 预估基础 Token 消耗 (System, Scenario, Persona)
  const enabledDirectives = (directives || []).filter(d => d.enabled).map(d => `[Protocol: ${d.title}]\n${fastReplace(d.content)}`).join('\n\n');
  const currentAttributes = character.attributes || {};
  const attributeContext = Object.keys(currentAttributes).length > 0 ? `\n### STATE\n${Object.entries(currentAttributes).map(([k, v]) => `- ${k}: ${v}`).join('\n')}` : '';
  const skillPrompts = getEnabledSkillPrompts(enabledSkillIds);
  const skillSection = skillPrompts ? `\n\n### MODULES\n${fastReplace(skillPrompts).replace(/\[角色名\]/g, charName)}` : '';
  const missionStatus = (missions || []).filter(m => m.status === 'ACTIVE').map(m => `- ${m.title}: (${m.progress}%)`).join('\n');

  const systemBase = `### CORE IDENTITY\n${fastReplace(character.systemPrompt)}\n${character.scenario ? '\n### SCENARIO\n' + fastReplace(character.scenario) : ''}${attributeContext}${skillSection}\n\n### PARTNER: ${actualUserName}\n${fastReplace(persona?.background || '')}\n\n### OBJECTIVE\n${missionStatus || 'Narrative exploration.'}`.trim();
  
  const RESPONSE_RESERVE = 1024;
  const baseTokens = estimateTokens(systemBase) + estimateTokens(enabledDirectives) + 100;

  // 3. 基于权重裁剪世界书 (World Info Budgeting)
  // 规则：世界书最多占用总预算的 35%，按 insertionOrder 优先级填入，常驻条目豁免裁剪
  const WI_BUDGET = contextWindow * 0.35;
  const budgetedEntries: WorldBookEntry[] = [];
  let currentWiTokens = 0;

  for (const entry of rawActiveEntries) {
    const tokens = estimateTokens(entry.content) + 10;
    if (currentWiTokens + tokens > WI_BUDGET && !entry.constant) continue; // 预算满且非必需，则裁剪
    currentWiTokens += tokens;
    budgetedEntries.push(entry);
  }

  // 4. 组装 System Content
  const topInjections = budgetedEntries.filter(e => e.position === 4).map(e => fastReplace(e.content)).join('\n\n');
  const beforeInjections = budgetedEntries.filter(e => e.position === 0).map(e => fastReplace(e.content)).join('\n\n');
  const afterInjections = budgetedEntries.filter(e => e.position === 1 || e.position === undefined).map(e => fastReplace(e.content)).join('\n\n');

  const systemFinal = `${topInjections ? topInjections + '\n\n' : ''}${beforeInjections ? beforeInjections + '\n\n' : ''}${systemBase}${afterInjections ? '\n\n' + afterInjections : ''}\n\n### PROTOCOLS\n${enabledDirectives}`.trim();

  // 5. 计算历史记录预算并加载
  const depthInjections: { content: string, depth: number, role: string, tokens: number }[] = [];
  budgetedEntries.filter(e => e.depth && e.depth > 0).forEach(e => {
    const c = fastReplace(e.content);
    depthInjections.push({ content: c, depth: e.depth!, role: 'system', tokens: estimateTokens(c) + 10 });
  });
  if (character.depthPrompt?.content) {
    const c = fastReplace(character.depthPrompt.content);
    depthInjections.push({ content: c, depth: character.depthPrompt.depth, role: character.depthPrompt.role || 'system', tokens: estimateTokens(c) + 10 });
  }

  const postHistoryTokens = character.postHistoryInstructions ? estimateTokens(fastReplace(character.postHistoryInstructions)) + 20 : 0;
  const totalFixedTokens = baseTokens + currentWiTokens + depthInjections.reduce((s, i) => s + i.tokens, 0) + postHistoryTokens;
  const historyBudget = contextWindow - totalFixedTokens - RESPONSE_RESERVE;

  const eligibleMessages: any[] = [];
  let usedHistoryTokens = 0;
  for (let i = recentMessages.length - 1; i >= 0; i--) {
    const msg = recentMessages[i];
    // 基础文字消耗
    let t = estimateTokens(msg.content) + 10;
    // 图片消耗估算：每个图片大致按 200 token 计算
    if (msg.images?.length) t += msg.images.length * 200;

    if (usedHistoryTokens + t > historyBudget) break;
    usedHistoryTokens += t;

    const charForMsg = msg.speakerId === character.id ? character : (isMultiChar && otherCharName ? { name: otherCharName } : undefined);
    eligibleMessages.unshift({ 
      role: msg.role as any, 
      content: msg.content,
      name: msg.role === 'user' ? actualUserName : (charForMsg?.name || undefined),
      images: msg.images
    });
  }

  // 6. 最终合成
  const result: any[] = [{ role: 'system', content: systemFinal }];
  let finalHistory = [...eligibleMessages];
  depthInjections.sort((a, b) => b.depth - a.depth);
  depthInjections.forEach(inj => {
    const idx = Math.max(0, finalHistory.length - inj.depth);
    finalHistory.splice(idx, 0, { role: inj.role as any, content: `[Note: ${inj.content}]` });
  });

  result.push(...finalHistory);
  if (character.postHistoryInstructions) {
    result.push({ role: 'system', content: `[Directive: ${fastReplace(character.postHistoryInstructions)}]` });
  }

  return result;
};

export const buildSystemPrompt = (ctx: PromptContext): string => {
  const msgs = buildPromptMessages(ctx);
  return msgs.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
};

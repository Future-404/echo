import type { CharacterCard } from '../types/chat';
import { getEnabledSkillPrompts } from '../skills';
import { collectDeviceContext, formatDeviceContext } from '../utils/deviceContext';
import { estimateTokens } from '../utils/tokenCounter';
import { generateFormattingPrompt } from '../store/constants';
import { db } from '../storage/db';
import type { DBMessage, DBWorldEntry } from '../storage/db';
import { vectorMath } from '../utils/vectorMath';
import { memoryDistiller } from './memoryDistiller';
import { useAppStore } from '../store/useAppStore';
import { buildContextForChar } from './multiChar';


export interface PromptContext {
  character: CharacterCard;
  persona?: UserPersona;
  directives: Directive[];
  worldBookLibrary: WorldBook[];
  missions: Mission[];
  userName: string;
  enabledSkillIds?: string[];
  deviceContextEnabled?: boolean;
  slotId?: string;
  recentMessages?: Message[];
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
 * 递归扫描并激活世界书条目 (高性能异步版)
 */
export const scanActiveWorldInfo = async (ctx: PromptContext, fullHistory?: Message[]): Promise<DBWorldEntry[]> => {
  const { character, recentMessages } = ctx;
  
  // 1. 确定搜索范围：当前角色 ID + 绑定的书库 IDs
  const boundBookIds = character.extensions?.worldBookIds || [];
  const validOwnerIds = [character.id, ...boundBookIds];

  // 2. 从数据库拉取所有潜在条目 (仅限当前对话相关的 owner)
  // 角色绑定的书库条目无视 enabled 状态，由条目自身的 enabled 控制
  const allAvailableEntries = await db.worldEntries
    .where('ownerId')
    .anyOf(validOwnerIds)
    .toArray();

  const activatedEntries = new Map<string, DBWorldEntry>();
  
  // 3. 获取扫描文本：优先用完整历史，fallback 到 recentMessages
  const scanSource = fullHistory || recentMessages || [];
  const scanDepth = 3; 
  // 优化：预编译正则，避免重复创建
  const regexCache = new Map<string, RegExp>()
  const getRegex = (pattern: string): RegExp | null => {
    if (regexCache.has(pattern)) return regexCache.get(pattern)!
    
    const reMatch = pattern.match(/^\/(.+)\/([gimsuy]*)$/)
    if (reMatch) {
      try {
        const regex = new RegExp(reMatch[1], reMatch[2])
        regexCache.set(pattern, regex)
        return regex
      } catch { return null }
    }
    
    const escaped = pattern.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`\\b${escaped}\\b`, 'i')
    regexCache.set(pattern, regex)
    return regex
  }

  const messageContext = scanSource.slice(-scanDepth).map(m => m.content).join('\n').toLowerCase()

  const performScan = (text: string): boolean => {
    let newlyAdded = false
    for (let i = 0; i < allAvailableEntries.length; i++) {
      const entry = allAvailableEntries[i]
      if (activatedEntries.has(entry.id)) continue
      
      // 跳过禁用的条目
      if (!entry.enabled) continue
      
      // 常驻条目直接激活
      if (entry.constant || !entry.keys || entry.keys.length === 0) {
        activatedEntries.set(entry.id, entry)
        newlyAdded = true
        continue
      }

      // 关键词匹配（优化：提前退出）
      let matched = false
      for (let j = 0; j < entry.keys.length; j++) {
        const trimmed = entry.keys[j].trim()
        if (!trimmed) continue
        
        const regex = getRegex(trimmed)
        if (regex && regex.test(text)) {
          matched = true
          break
        }
      }

      if (matched) {
        activatedEntries.set(entry.id, entry)
        newlyAdded = true
      }
    }
    return newlyAdded
  }

  // 第一轮：基于消息内容扫描
  performScan(messageContext)

  // 递归扫描：基于已激活条目的内容扫描 (最大深度 2 层)
  for (let i = 0; i < 2; i++) {
    const activeEntries = Array.from(activatedEntries.values())
    if (activeEntries.length === 0) break
    
    let currentActiveContent = ''
    for (let j = 0; j < activeEntries.length; j++) {
      currentActiveContent += activeEntries[j].content + '\n'
    }
    currentActiveContent = currentActiveContent.toLowerCase()
    
    if (!currentActiveContent || !performScan(currentActiveContent)) break
  }

  // 排序规则：角色私设优先 (insertionOrder + 权重)
  return Array.from(activatedEntries.values()).sort((a, b) => {
    // 角色私设 (ownerId === char.id) 赋予微弱的排序优势
    const weightA = a.ownerId === character.id ? -1000 : 0;
    const weightB = b.ownerId === character.id ? -1000 : 0;
    return (weightA + (a.insertionOrder ?? 0)) - (weightB + (b.insertionOrder ?? 0));
  });
};

/**
 * 构建符合 SillyTavern 逻辑的消息数组 (异步驱动)
 */
export const buildPromptMessages = async (ctx: PromptContext, contextWindow: number = 128000): Promise<Message[]> => {
  const { 
    character, persona, directives, 
    missions, userName, enabledSkillIds, deviceContextEnabled, recentMessages,
    isMultiChar, otherCharName, slotId
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

  // 0. 加载全量历史 (真分页支持)
  let fullHistory: Message[] = recentMessages || [];
  if (slotId) {
    fullHistory = await db.getMessagesBySlot(slotId);
  }

  // 1. 递归扫描获取所有激活条目 (异步)，传入完整历史以提高命中率
  const rawActiveEntries = await scanActiveWorldInfo(ctx, fullHistory);

  // --- 记忆召回层 (Project Hippocampus) ---
  let recallContext = '';
  // 仅在有 slotId 且用户发了新消息的情况下尝试召回
  if (slotId && recentMessages && recentMessages.length > 0) {
    const lastUserMsg = recentMessages[recentMessages.length - 1];
    if (lastUserMsg.role === 'user') {
      try {
        // 1. 获取 Embedding Provider
        const storeState = useAppStore.getState();
        const mc = storeState.config.modelConfig;
        const embProvider = storeState.config.providers.find(p => p.id === mc?.embeddingProviderId);
        
        if (embProvider && embProvider.apiKey) {
          // --- 性能防火墙：1.5s 强制超时 ---
          const recallData = await Promise.race([
            (async () => {
              // 2. 将输入向量化
              const queryVec = await memoryDistiller.callEmbeddingAPI(embProvider, lastUserMsg.content);
              // 3. 从数据库检索所有结晶 (该存档下)
              const allEpisodes = await db.memoryEpisodes.where('slotId').equals(slotId).toArray();
              // 4. 寻找最相关的 Top 3 (异步 Worker 检索)
              return await vectorMath.findBestMatches(vectorMath.ensureFloat32(queryVec), allEpisodes, 3, 0.72);
            })(),
            new Promise<any[]>((_, reject) => setTimeout(() => reject(new Error('Recall Timeout')), 1500))
          ]).catch(e => {
            console.warn('[Recall] 联想被强行中断 (超时或错误):', e.message);
            return [];
          });
          
          if (recallData && recallData.length > 0) {
            recallContext = `\n### LONG-TERM MEMORY RECALL (Associative)\nBased on the current input, you recall the following fragments from your past interactions with the user:\n` + 
              recallData.map(m => `- [Recall Similarity: ${(m.sim * 100).toFixed(0)}%] ${m.ep.narrative}`).join('\n');
          }
        }
      } catch (e) { console.warn('[Recall] 召回失败:', e); }
    }
  }

  // 2. 预估基础 Token 消耗
  // 合併全局 directives + 角色卡綁定的預設包 directives（從 DB 讀）
  const boundPresetIds = character.extensions?.promptPresetIds || []
  const boundPresetDirectives: Directive[] = boundPresetIds.length > 0
    ? await db.promptPresetEntries.where('presetId').anyOf(boundPresetIds).toArray()
    : []
  const allDirectives = [...(directives || []), ...boundPresetDirectives]
  const currentAttributes = character.attributes || {};
  const attributeContext = Object.keys(currentAttributes).length > 0 ? `\n### STATE\n${Object.entries(currentAttributes).map(([k, v]) => `- ${k}: ${v}`).join('\n')}` : '';
  const deviceCtx = deviceContextEnabled ? await collectDeviceContext() : null;
  const deviceSection = deviceCtx ? `\n\n### CONTEXT\n${formatDeviceContext(deviceCtx)}` : '';
  const skillPrompts = getEnabledSkillPrompts(enabledSkillIds, {
    messages: (recentMessages || []) as Array<{ role: string; content: string }>,
    characterName: charName,
    userName: actualUserName,
    attributes: character.attributes || {},
  });
  const skillSection = skillPrompts ? `\n\n### MODULES\n${fastReplace(skillPrompts).replace(/\[角色名\]/g, charName)}` : '';
  const missionStatus = (missions || []).filter(m => m.status === 'ACTIVE').map(m => `- ${m.title}: (${m.progress}%)`).join('\n');

  const systemBase = `### CORE IDENTITY\n${fastReplace(character.systemPrompt)}\n${character.scenario ? '\n### SCENARIO\n' + fastReplace(character.scenario) : ''}${attributeContext}${recallContext}${deviceSection}${skillSection}\n\n### PARTNER: ${actualUserName}\n${fastReplace(persona?.background || '')}\n\n### OBJECTIVE\n${missionStatus || 'Narrative exploration.'}`.trim();
  
  const RESPONSE_RESERVE = 1024;
  const allDirectivesText = allDirectives.filter(d => d.enabled && !d.depth).map(d => d.content).join('\n\n');
  const baseTokens = estimateTokens(systemBase) + estimateTokens(allDirectivesText) + 100;

  // 3. 基于权重裁剪世界书 (角色私设享有豁免权或高优先级)
  const WI_BUDGET = contextWindow * 0.35;
  const budgetedEntries: WorldBookEntry[] = [];
  let currentWiTokens = 0;

  for (const entry of rawActiveEntries) {
    const tokens = estimateTokens(entry.content) + 10;
    const isPrivate = (entry as DBWorldEntry).ownerId === character.id;
    // 预算满且非私设且非必需，则裁剪
    if (currentWiTokens + tokens > WI_BUDGET && !entry.constant && !isPrivate) continue; 
    currentWiTokens += tokens;
    budgetedEntries.push(entry);
  }

  // 4. 组装 System Content
  // position=0: before char def, position=1: after char def, depth>0: depth injection (handled separately)
  const topInjections = [
    ...budgetedEntries.filter(e => !e.depth && e.position === 0).map(e => fastReplace(e.content)),
    ...allDirectives.filter(d => d.enabled && !d.depth && d.position === 0).map(d => fastReplace(d.content)),
  ].join('\n\n');

  const afterDirectives = allDirectives.filter(d => d.enabled && !d.depth && d.position !== 0)
    .map(d => `[Protocol: ${d.title}]\n${fastReplace(d.content)}`).join('\n\n');

  const afterInjections = [
    ...budgetedEntries.filter(e => !e.depth && (e.position === 1 || e.position === undefined)).map(e => fastReplace(e.content)),
  ].join('\n\n');

  const systemFinal = [
    topInjections,
    systemBase,
    afterInjections,
    afterDirectives ? `### PROTOCOLS\n${afterDirectives}` : ''
  ].filter(Boolean).join('\n\n').trim();

  // 5. 计算历史记录预算并加载
  const depthInjections: { content: string, depth: number, role: string, tokens: number }[] = [];
  budgetedEntries.filter(e => e.depth && e.depth > 0).forEach(e => {
    const c = fastReplace(e.content);
    depthInjections.push({ content: c, depth: e.depth!, role: 'system', tokens: estimateTokens(c) + 10 });
  });
  // 預設包的 depth directives
  allDirectives.filter(d => d.enabled && d.depth && d.depth > 0).forEach(d => {
    const c = fastReplace(d.content);
    depthInjections.push({ content: c, depth: d.depth!, role: d.role || 'system', tokens: estimateTokens(c) + 10 });
  });
  if (character.depthPrompt?.content) {
    const c = fastReplace(character.depthPrompt.content);
    depthInjections.push({ content: c, depth: character.depthPrompt.depth, role: character.depthPrompt.role || 'system', tokens: estimateTokens(c) + 10 });
  }

  const postHistoryTokens = character.postHistoryInstructions ? estimateTokens(fastReplace(character.postHistoryInstructions)) + 20 : 0;
  const totalFixedTokens = baseTokens + currentWiTokens + depthInjections.reduce((s, i) => s + i.tokens, 0) + postHistoryTokens;
  const historyBudget = contextWindow - totalFixedTokens - RESPONSE_RESERVE;

  const eligibleMessages: Message[] = [];
  const discardedMessageIds: number[] = [];
  let usedHistoryTokens = 0;

  for (let i = fullHistory.length - 1; i >= 0; i--) {
    const msg = fullHistory[i];
    let t = estimateTokens(msg.content) + 10;
    if (msg.images?.length) t += msg.images.length * 200;

    if (usedHistoryTokens + t > historyBudget) {
      // 记录被裁切掉的消息 ID (仅限有 ID 的 DB 记录)
      if ((msg as DBMessage).id) discardedMessageIds.push((msg as DBMessage).id!);
      continue;
    }
    
    usedHistoryTokens += t;
    eligibleMessages.unshift({ 
      role: msg.role,
      content: msg.content,
      images: msg.images,
      speakerId: msg.speakerId,
    });
  }

  // --- 记忆交换区：静默标记裁切消息 ---
  // 仅在空闲时段或异步处理，避免阻塞 Prompt 生成
  if (discardedMessageIds.length > 0) {
    const MAX_PENDING = 100; // 安全阈值：待向量区最大容量
    setTimeout(async () => {
      try {
        // 1. 检查当前待处理数量
        const pendingCount = await db.messages.where('vState').equals(1).count();
        if (pendingCount < MAX_PENDING) {
          // 2. 仅标记最靠近活跃窗口的裁切消息（最具召回价值）
          const toMark = discardedMessageIds.slice(0, MAX_PENDING - pendingCount);
          await db.messages.where('id').anyOf(toMark).modify(m => {
            if (m.vState === 0 || m.vState === undefined) m.vState = 1;
          });
        }
      } catch (e) {
        console.warn('[VectorQueue] 标记失败:', e);
      }
    }, 1000);
  }

  // 6. 最终合成
  const result: Message[] = [{ role: 'system', content: systemFinal }];

  // 多角色模式：用 buildContextForChar 从目标角色视角重构历史（解决连续 assistant 问题）
  let finalHistory: Message[];
  if (isMultiChar && otherCharName) {
    const charNames: Record<string, string> = {
      user: actualUserName,
      [character.id]: character.name,
    };
    // otherCharName 只有名字没有 id，用占位 key
    charNames['__other__'] = otherCharName;
    // 给 eligibleMessages 里没有 speakerId 的消息补上 speakerId
    const msgsForContext = eligibleMessages.map(m => ({
      ...m,
      speakerId: m.speakerId ?? (m.role === 'user' ? 'user' : character.id),
    }));
    finalHistory = buildContextForChar(msgsForContext, character.id, charNames);
  } else {
    // 单角色：直接使用，去掉 speakerId（provider 不需要）
    finalHistory = eligibleMessages.map(({ speakerId: _s, ...m }) => m);
  }

  // depth injection：先计算所有插入位置（基于原始长度），再从后往前 splice 避免偏移
  const originalLen = finalHistory.length;
  depthInjections.sort((a, b) => a.depth - b.depth); // 升序，depth=1 最靠近末尾
  const spliceOps = depthInjections.map(inj => ({
    idx: Math.max(0, originalLen - inj.depth),
    msg: { role: inj.role, content: `[Note: ${inj.content}]` }
  }));
  // 从大 idx 到小 idx 插入，保证前面的插入不影响后面的位置
  spliceOps.sort((a, b) => b.idx - a.idx).forEach(op => {
    finalHistory.splice(op.idx, 0, op.msg);
  });

  result.push(...finalHistory);
  if (character.postHistoryInstructions) {
    result.push({ role: 'system', content: `[Directive: ${fastReplace(character.postHistoryInstructions)}]` });
  }

  return result;
};

export const buildSystemPrompt = async (ctx: PromptContext): Promise<string> => {
  const msgs = await buildPromptMessages(ctx);
  return msgs.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
};

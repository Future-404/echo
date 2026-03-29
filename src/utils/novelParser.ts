import type { TextSegment } from '../types/parser';

/**
 * 极致模块化：网文解析引擎 V2
 * 专为 VN 模式设计，支持按行/按对话分段，并处理 AI 产生的杂乱换行
 */
export const parseStreamingNovelText = (
  rawText: string,
  options?: {
    dialogueQuotes?: string;
    actionMarkers?: string;
    thoughtMarkers?: string;
  }
): TextSegment[] => {
  if (!rawText) return [];

  const segments: TextSegment[] = [];
  let segmentCount = 0;

  // 從配置獲取標記符號（默認值）
  const quotes = options?.dialogueQuotes || '""“”';
  const actionChars = options?.actionMarkers || '**「」『』';
  const thoughtChars = options?.thoughtMarkers || '()（）'; // 移除 <>，防止与 AI 的 XML 标签冲突

  // 1. 预处理：提取 Markdown 风格卡片或结构化容器
  // 支持 {{...}}, {...}, [[...]], [...]
  const cardRegex = /\{\{([\s\S]+?)\}\}|\{([\s\S]+?)\}|\[\[([\s\S]+?)\]\]|\[([\s\S]+?)\]/g;

  // 用有序数组保留卡片及其在文本中的位置
  const cardSlots: { placeholder: string; segment: TextSegment }[] = [];
  let cardIdx = 0;

  const textWithPlaceholders = rawText.replace(cardRegex, (match, p1, p2, p3, p4) => {
    const content = (p1 || p2 || p3 || p4 || "").trim();
    
    // 识别分隔符：优先使用 |
    let type = "";
    let body = "";
    
    const pipeIdx = content.indexOf('|');
    if (pipeIdx > 0) {
      type = content.substring(0, pipeIdx).trim();
      body = content.substring(pipeIdx + 1).trim();
    } else {
      // 尝试换行符分隔
      const nlIdx = content.indexOf('\n');
      if (nlIdx > 0) {
        type = content.substring(0, nlIdx).trim();
        body = content.substring(nlIdx + 1).trim();
      } else {
        // 尝试首个空格分隔
        const spIdx = content.indexOf(' ');
        if (spIdx > 0) {
          type = content.substring(0, spIdx).trim();
          body = content.substring(spIdx + 1).trim();
        } else {
          type = content;
          body = "";
        }
      }
    }

    // 验证 type 是否有效（防止误触简单的 Json 或 变量注入）
    const validTypes = ['status-container', 'status', 'card', 'characterCard', 'html', 'details', '状态栏'];
    const isKnownType = validTypes.some(t => type.toLowerCase().includes(t.toLowerCase()));
    
    if (!isKnownType) {
      // 如果不是已知类型，且看起来不像一个干净的标识符，则忽略
      if (type.length > 30 || type.includes(' ') || !type.match(/^[\w\u4e00-\u9fa5-]+$/)) {
        return match;
      }
    }

    const placeholder = `\x00CARD${cardIdx}\x00`;
    const seg: TextSegment = {
      id: `seg_card_${cardIdx}`,
      type: 'card',
      content: type,
      metadata: { rawBody: body, fullMatch: match }
    };

    cardSlots.push({ placeholder, segment: seg });
    cardIdx++;
    return placeholder;
  });

  // 2. 识别对话锚点并进行初步切分（使用配置的引號）
  const quotePattern = `[${quotes.split('').map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('')}]`;
  const dialogPattern = new RegExp(
    `([^：:\\n。？！…${quotes} ]{1,10})?[:：]\\s*(${quotePattern}[^${quotes}]*${quotePattern}?)|(${quotePattern}[^${quotes}]*${quotePattern}?)`,
    'g'
  );
  let lastIdx = 0;
  let match;
  const rawParts: { type: 'narration' | 'dialogue'; content: string; speaker?: string }[] = [];

  while ((match = dialogPattern.exec(textWithPlaceholders)) !== null) {
    if (match.index > lastIdx) {
      const narration = textWithPlaceholders.substring(lastIdx, match.index);
      if (narration.trim()) rawParts.push({ type: 'narration', content: narration });
    }
    const speaker = match[1];
    const contentWithQuotes = match[2] || match[3];
    const quoteChars = quotes.split('');
    let content = contentWithQuotes;
    quoteChars.forEach(q => {
      content = content.replace(new RegExp(`^${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'g'), '');
    });
    content = content.trim();
    if (content) rawParts.push({ type: 'dialogue', content, speaker: speaker?.trim() });
    lastIdx = dialogPattern.lastIndex;
  }
  if (lastIdx < textWithPlaceholders.length) {
    const remaining = textWithPlaceholders.substring(lastIdx);
    if (remaining.trim()) rawParts.push({ type: 'narration', content: remaining });
  }

  // 3. 细化切分与清洗
  const refinedParts: { type: string; content: string; speaker?: string; metadata?: any }[] = [];

  function processSubTags(text: string, baseType: string, target: typeof refinedParts, speaker?: string) {
    // 先检查是否是卡片占位符
    const placeholderRegex = /\x00CARD(\d+)\x00/g;
    let lastSubIdx = 0;
    let subMatch;

    while ((subMatch = placeholderRegex.exec(text)) !== null) {
      if (subMatch.index > lastSubIdx) {
        const preText = text.substring(lastSubIdx, subMatch.index).trim();
        if (preText) processInlineSubTags(preText, baseType, target, speaker);
      }
      const slot = cardSlots[parseInt(subMatch[1])];
      if (slot) target.push({ type: 'card', content: slot.segment.content, metadata: slot.segment.metadata });
      lastSubIdx = placeholderRegex.lastIndex;
    }
    if (lastSubIdx < text.length) {
      const postText = text.substring(lastSubIdx).trim();
      if (postText) processInlineSubTags(postText, baseType, target, speaker);
    }
  }

  function processInlineSubTags(text: string, baseType: string, target: typeof refinedParts, speaker?: string) {
    // 動態構建動作和心理標記的正則
    const actionPattern = actionChars.split('').map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const thoughtPattern = thoughtChars.split('').map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const subRegex = new RegExp(`([${thoughtPattern}][^${thoughtPattern}]*[${thoughtPattern}]?)|([${actionPattern}][^${actionPattern}]*[${actionPattern}]?)`, 'g');
    
    let lastSubIdx = 0;
    let subMatch;
    while ((subMatch = subRegex.exec(text)) !== null) {
      if (subMatch.index > lastSubIdx) {
        const preText = text.substring(lastSubIdx, subMatch.index).trim();
        if (preText) target.push({ type: baseType, content: preText, speaker });
      }
      const fullMatch = subMatch[0];
      const firstChar = fullMatch[0];
      
      if (thoughtChars.includes(firstChar)) {
        const cleaned = fullMatch.replace(new RegExp(`[${thoughtPattern}]`, 'g'), '');
        target.push({ type: 'thought', content: cleaned, speaker });
      } else {
        const cleaned = fullMatch.replace(new RegExp(`[${actionPattern}]`, 'g'), '');
        target.push({ type: 'action', content: cleaned, speaker });
      }
      lastSubIdx = subRegex.lastIndex;
    }
    if (lastSubIdx < text.length) {
      const postText = text.substring(lastSubIdx).trim();
      if (postText) target.push({ type: baseType, content: postText, speaker });
    }
  }

  rawParts.forEach(p => {
    if (p.type === 'narration') {
      const lines = p.content.split(/\n+/);
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !/^[：:""" ]+$/.test(trimmed)) {
          processSubTags(trimmed, 'narration', refinedParts);
        }
      });
    } else {
      const cleanedDialogue = p.content.replace(/\n+/g, ' ').trim();
      if (cleanedDialogue) processSubTags(cleanedDialogue, 'dialogue', refinedParts, p.speaker);
    }
  });

  // 4. 转换成最终的 TextSegment 数组
  return refinedParts.map((p, i) => ({
    id: `seg_${i}`,
    type: p.type as TextSegment['type'],
    content: p.content,
    speaker: p.speaker,
    metadata: p.metadata,
  }));
};

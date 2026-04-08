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
  const thoughtChars = options?.thoughtMarkers || '()（）'; // 严格禁止包含 <>

  // 1. 预处理：提取 Markdown 风格卡片、结构化容器及斜杠命令
  // 支持 {{...}}, {...}, [[...]], [...]
  const cardRegex = /\{\{([\s\S]+?)\}\}|\{([\s\S]+?)\}|\[\[([\s\S]+?)\]\]|\[([\s\S]+?)\]/g;
  // 增加对斜杠命令的识别：必须是行首或换行符后的 /command
  const slashRegex = /(?:^|\n)\/([a-zA-Z0-9_-]+)\s+([\s\S]+?)(?=\n\/|$)/g;

  const cardSlots: { placeholder: string; segment: TextSegment }[] = [];
  let cardIdx = 0;

  let textWithPlaceholders = rawText.replace(cardRegex, (match, p1, p2, p3, p4) => {
    // ... (保持原有 card 逻辑不变)
    const content = (p1 || p2 || p3 || p4 || "").trim();
    const pipeIdx = content.indexOf('|');
    let type = "";
    let body = "";
    if (pipeIdx > 0) {
      type = content.substring(0, pipeIdx).trim();
      body = content.substring(pipeIdx + 1).trim();
    } else {
      const nlIdx = content.indexOf('\n');
      if (nlIdx > 0) {
        type = content.substring(0, nlIdx).trim();
        body = content.substring(nlIdx + 1).trim();
      } else {
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

  // 提取斜杠命令
  textWithPlaceholders = textWithPlaceholders.replace(slashRegex, (match, cmd, args) => {
    const placeholder = `\x00CARD${cardIdx}\x00`;
    const seg: TextSegment = {
      id: `seg_slash_${cardIdx}`,
      type: 'card', // 借用 card 类型或后续扩展，这里为了不改动太多逻辑，先用 card 类型并在 content 里标注
      content: `slash:${cmd}`,
      metadata: { rawBody: args.trim(), fullMatch: match }
    };
    cardSlots.push({ placeholder, segment: seg });
    cardIdx++;
    return `\n${placeholder}\n`;
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
    // 灵活匹配各种 \x00 格式的占位符
    const placeholderRegex = /\x00(CARD|BLOCK)(_B)?(_?\d+)?\x00/g;
    let lastSubIdx = 0;
    let subMatch;

    while ((subMatch = placeholderRegex.exec(text)) !== null) {
      if (subMatch.index > lastSubIdx) {
        const preText = text.substring(lastSubIdx, subMatch.index).trim();
        if (preText) processInlineSubTags(preText, baseType, target, speaker);
      }
      // 保持占位符原样作为 card 类型
      target.push({ type: 'card', content: subMatch[0] });
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

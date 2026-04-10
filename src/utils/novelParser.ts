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
  const quotesConfig = options?.dialogueQuotes || '""“”＂＂＇＇‘’「」『』';
  const actionChars = options?.actionMarkers || '**「」『』';
  const thoughtChars = options?.thoughtMarkers || '()（）';

  // 1. 预处理：提取 Markdown 风格卡片、结构化容器及斜杠命令
  const cardRegex = /\{\{([\s\S]+?)\}\}|\{([\s\S]+?)\}|\[\[([\s\S]+?)\]\]|\[([\s\S]+?)\]/g;
  const slashRegex = /(?:^|\n)\/([a-zA-Z0-9_-]+)\s+([\s\S]+?)(?=\n\/|$)/g;

  const cardSlots: { placeholder: string; segment: TextSegment }[] = [];
  let cardIdx = 0;

  let textWithPlaceholders = rawText.replace(cardRegex, (match, p1, p2, p3, p4) => {
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

  textWithPlaceholders = textWithPlaceholders.replace(slashRegex, (match, cmd, args) => {
    const placeholder = `\x00CARD${cardIdx}\x00`;
    const seg: TextSegment = {
      id: `seg_slash_${cardIdx}`,
      type: 'card',
      content: `slash:${cmd}`,
      metadata: { rawBody: args.trim(), fullMatch: match }
    };
    cardSlots.push({ placeholder, segment: seg });
    cardIdx++;
    return `\n${placeholder}\n`;
  });

  // 2. 识别对话锚点并进行初步切分
  // 将 quotes 字符串拆解为配对
  const quotePairs: [string, string][] = [];
  for (let i = 0; i < quotesConfig.length; i += 2) {
    if (i + 1 < quotesConfig.length) {
      quotePairs.push([quotesConfig[i], quotesConfig[i + 1]]);
    } else {
      quotePairs.push([quotesConfig[i], quotesConfig[i]]);
    }
  }

  // 构建配对正则，支持嵌套相同字符以外的内容
  const pairRegexParts = quotePairs.map(([open, close]) => {
    const o = open.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const c = close.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (o === c) {
      return `${o}[^${o}\\n]+${c}`;
    }
    // 对于不等的配对（如 “ ”），允许内部包含其他引号，直到遇到对应的结束引号
    return `${o}[^${c}\\n]*${c}`;
  });
  const pairRegex = `(?:${pairRegexParts.join('|')})`;
  const quoteSet = quotesConfig.split('').map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('');

  const dialogPattern = new RegExp(
    `([^：:\\n。？！…${quoteSet} ]{1,10})?[:：]\\s*(${pairRegex})|(${pairRegex})`,
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
    
    // 剥离首尾引号（多层剥离）
    let content = contentWithQuotes.trim();
    let changed = true;
    while (changed && content.length > 0) {
      changed = false;
      for (const [open, close] of quotePairs) {
        if (content.startsWith(open) && content.endsWith(close) && content.length >= 2) {
          content = content.slice(1, -1).trim();
          changed = true;
          break;
        } else if (content.startsWith(open) && content.length >= 1) {
           // 处理单边缺失的情况
           content = content.slice(1).trim();
           changed = true;
           break;
        } else if (content.endsWith(close) && content.length >= 1) {
           content = content.slice(0, -1).trim();
           changed = true;
           break;
        }
      }
    }

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
    const placeholderRegex = /\x00(CARD|BLOCK)(_B)?(_?\d+)?\x00/g;
    let lastSubIdx = 0;
    let subMatch;

    while ((subMatch = placeholderRegex.exec(text)) !== null) {
      if (subMatch.index > lastSubIdx) {
        const preText = text.substring(lastSubIdx, subMatch.index).trim();
        if (preText) processInlineSubTags(preText, baseType, target, speaker);
      }
      target.push({ type: 'card', content: subMatch[0] });
      lastSubIdx = placeholderRegex.lastIndex;
    }
    if (lastSubIdx < text.length) {
      const postText = text.substring(lastSubIdx).trim();
      if (postText) processInlineSubTags(postText, baseType, target, speaker);
    }
  }

  function processInlineSubTags(text: string, baseType: string, target: typeof refinedParts, speaker?: string) {
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
        const skipPattern = new RegExp(`^[：:${quoteSet} ]+$`);
        if (trimmed && !skipPattern.test(trimmed)) {
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

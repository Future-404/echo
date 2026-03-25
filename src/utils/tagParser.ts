import type { CharacterCard, CustomParser } from '../store/useAppStore';
import { parseUniversalStatus } from './statusParser';

/**
 * 应用角色卡自定义正则脚本进行内容转换
 */
export const applyCharacterRegexScripts = (text: string, char: CharacterCard, customParsers: CustomParser[] = []): string => {
  let transformedText = text;
  
  // 1. 优先应用用户全局定义的自定义解析器 (支持隐藏逻辑)
  customParsers.forEach(parser => {
    if (!parser.enabled || !parser.triggerRegex) return;
    try {
      const regex = new RegExp(parser.triggerRegex, 'gi');
      if (parser.hideFromChat) {
        transformedText = transformedText.replace(regex, '');
      }
    } catch (e) {
      console.warn(`[TagParser] Failed to apply custom hide: ${parser.name}`, e);
    }
  });

  const templates = char.extensions?.tagTemplates || [];
  
  templates.forEach(tpl => {
    if (!tpl.enabled || !tpl.originalRegex || !tpl.replaceString) return;
    
    try {
      let pattern = String(tpl.originalRegex).trim();
      let flags = 'g';
      
      if (pattern.startsWith('/') && pattern.lastIndexOf('/') > 0) {
        const lastSlash = pattern.lastIndexOf('/');
        flags = pattern.substring(lastSlash + 1) || 'g';
        pattern = pattern.substring(1, lastSlash);
        
        if (flags.includes('s')) {
          flags = flags.replace('s', '');
          pattern = pattern.replace(/\./g, '[\\s\\S]');
        }
      }

      const regex = new RegExp(pattern, flags);
      const replacement = String(tpl.replaceString).replace(/\\\\n/g, '\n').replace(/\\n/g, '\n');
      transformedText = transformedText.replace(regex, replacement);
    } catch (e) {
      console.warn(`[TagParser] Failed to apply script: ${tpl.name}`, e);
    }
  });

  return transformedText;
};

/**
 * 核心逻辑：从正则表达式字符串中推断字段名称
 * 这是一个通用的解析器，通过分析正则表达式的文本结构来提取潜在的 Key
 * 例如：从 "好感：\\s*(.*?)" 中推断出 "好感"
 */
const inferFieldNamesFromRegex = (regexStr: string): string[] => {
  const names: string[] = [];
  // 匹配模式：[非特殊字符的文本][冒号/分号][空白][紧跟的左括号]
  const metaRegex = /([^\\s\\|\\(（\\[\\]：:，,]+)[：:]\s*(?=\s*\(|\s*\\\()/g;
  
  let match;
  while ((match = metaRegex.exec(regexStr)) !== null) {
    const key = match[1].trim();
    if (key.length >= 1 && key.length <= 15) {
      names.push(key);
    }
  }
  return names;
};

/**
 * 解析各种风格的数据块
 * 1. Markdown 表格: |键|值| 或 |值1|值2|
 * 2. 键值对: 键: 值 或 键：值
 */
const parseTableBlock = (text: string): Record<string, string> => {
  const attrs: Record<string, string> = {};
  
  // 分行处理以确保更高的准确性
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  lines.forEach(line => {
    // --- 1. 匹配 Markdown 表格风格 |Key|Value| ---
    const tableMatch = line.match(/^\|([^|]+)\|([^|]+)\|$/);
    if (tableMatch) {
      const key = tableMatch[1].trim();
      const value = tableMatch[2].trim();
      if (key && value && !key.includes('---')) {
        attrs[key] = value;
        return;
      }
    }

    // --- 2. 匹配 键值对风格 Key: Value 或 Key：Value ---
    const kvMatch = line.match(/^([^|：:\n]{2,20})[：:](.+)$/);
    if (kvMatch) {
      const key = kvMatch[1].trim();
      const value = kvMatch[2].trim();
      if (key && value) {
        attrs[key] = value;
        return;
      }
    }

    // --- 3. 匹配 纯数组表格风格 |值1|值2|值3| ---
    if (line.startsWith('|') && line.endsWith('|')) {
      const parts = line.split('|').map(s => s.trim()).filter(Boolean);
      if (parts.length >= 2 && !parts[0].includes('---')) {
        const datePart = parts.find(p => /\d{4}年\d+月\d+日/.test(p) || /\d{4}-\d{2}-\d{2}/.test(p));
        const timePart = parts.find(p => /上午|下午|晚上|\d{1,2}:\d{2}/.test(p));
        const weatherPart = parts.find(p => /晴|阴|雨|云|雪|☀️|☁️|🌧️/.test(p));
        
        if (datePart || timePart || weatherPart) {
          const combinedDate = [datePart, timePart, weatherPart].filter(Boolean).join(' ');
          attrs['date'] = combinedDate;
        } else {
          attrs[parts[0]] = parts.slice(1).join(' | ');
        }
      }
    }
  });

  return attrs;
};

/**
 * 标签解析与状态同步引擎
 * 专门用于抓取 AI 输出中的状态信息并更新到角色属性槽位
 */
export const extractAndSyncTags = (
  text: string, 
  char: CharacterCard, 
  updateAttributes: (id: string, attrs: Record<string, any>) => void,
  customParsers: CustomParser[] = []
) => {
  const newAttrs: Record<string, any> = {};

  // 0. 优先应用用户全局定义的自定义解析器进行提取
  customParsers.forEach(parser => {
    if (!parser.enabled || !parser.triggerRegex) return;
    try {
      const regex = new RegExp(parser.triggerRegex, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        parser.fields.forEach(field => {
          const val = match[field.index];
          if (val) newAttrs[field.name] = val.trim();
        });
      }
    } catch (e) {
      console.warn(`[TagParser] Custom extractor failed: ${parser.name}`, e);
    }
  });

  // 先对文本应用转换，以支持从转换后的 HTML 界面中提取数据
  const processedText = applyCharacterRegexScripts(text, char, customParsers);

  // --- 1. 自动解析 <status>, <details>, <html> 等容器标签内部的 Markdown 表格 ---
  const containerTags = ['status', 'details', 'html', 'card'];
  containerTags.forEach(tag => {
    const regex = new RegExp(`<${tag}[\\s>][\\s\\S]*?>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = processedText.match(regex);
    if (match) {
      const tableData = parseTableBlock(match[1]);
      Object.assign(newAttrs, tableData);
    }
  });

  // --- 1.5 自动解析 <status-container> 嵌套标签 (通用模式) ---
  const containerMatch = processedText.match(/<status-container>([\s\S]*?)<\/status-container>/i);
  if (containerMatch) {
    const innerText = containerMatch[1];
    const tagRegex = /<([\w-]+)>([\s\S]*?)<\/\1>/g;
    let m;
    while ((m = tagRegex.exec(innerText)) !== null) {
      const key = m[1];
      const val = m[2].trim();
      newAttrs[key] = val;
    }
  }

  // --- 1.8 启发式解析器：仅作用于明确的状态容器内容，避免污染对话文本 ---
  // 只对已识别的容器标签内容运行，不对全文运行
  const statusContainerRegex = /<(status|details|card|状态栏|characterCard)[^>]*>([\s\S]*?)<\/\1>/gi;
  let containerMatch2;
  while ((containerMatch2 = statusContainerRegex.exec(processedText)) !== null) {
    const heuristicData = parseUniversalStatus(containerMatch2[2]);
    // 模糊数据优先级最低，被后续精准匹配覆盖
    Object.assign(newAttrs, heuristicData);
  }

  // --- 2. 传统正则表达式解析 (兼容已有卡片) ---
  const templates = char.extensions?.tagTemplates || [];
  templates.forEach(tpl => {
    if (!tpl.enabled || !tpl.originalRegex) return;
    
    try {
      const regexStr = String(tpl.originalRegex).replace(/\\\\/g, '\\');
      
      // 1. 优先使用显式定义的字段名 (V3 标准)
      let fieldNames = tpl.fields || [];
      
      // 2. 如果没有显式定义，则尝试从正则文本中自动推断 (通用解决方案)
      if (fieldNames.length === 0) {
        fieldNames = inferFieldNamesFromRegex(regexStr);
      }
      
      const regex = new RegExp(regexStr, 'g');
      
      let match;
      while ((match = regex.exec(processedText)) !== null) {
        const captures = match.slice(1);
        
        captures.forEach((val, i) => {
          let key = '';
          
          if (fieldNames[i]) {
            key = fieldNames[i];
          } 
          else if (tpl.name === '状态栏' || tpl.name.toLowerCase().includes('charactercard')) {
            const stFields = ['name', 'efficiency', 'role', 'days', 'rank', 'inner_thought', 'reason', 'value', 'diary', 'date', 'todo'];
            key = stFields[i];
          }
          
          if (!key) {
            key = `属性_${i + 1}`;
          }

          if (key && val !== undefined) {
            newAttrs[key] = val.trim();
          }
        });
      }
    } catch (e) {
      console.warn(`[TagParser] Failed to process template: ${tpl.name}`, e);
    }
  });

  // 如果有新值，触发 Store 更新
  if (Object.keys(newAttrs).length > 0) {
    updateAttributes(char.id, newAttrs);
  }
};

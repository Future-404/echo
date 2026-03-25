import { replaceMacros } from '../logic/promptEngine' 

/**
 * 万能状态栏解析器 V1
 * 目标：无损提取 XML, HTML, Markdown, CSV, 键值对列表中的状态数据
 */
export const parseUniversalStatus = (input: string): Record<string, string> => {
  if (!input || typeof input !== 'string') return {};

  const results: Record<string, string> = {};

  // 1. 预处理：移除 HTML/XML 标签（保留内容）
  // 许多 AI 会输出 <status>...内容...</status>
  let cleanText = input.replace(/<[^>]+>([\s\S]*?)<\/[^>]+>/gi, '$1');
  cleanText = cleanText.replace(/<[^>]+>/g, ''); // 移除孤立标签

  // 2. 预处理：Markdown 表格线移除
  // 移除 |---|---| 这种格式
  cleanText = cleanText.replace(/\|?\s*:?-+:?\s*\|/g, '');

  // 3. 核心提取逻辑：多模式键值对正则
  // 匹配模式：
  // - 键: 值 (支持中英文冒号)
  // - 键=值
  // - | 键 | 值 |
  // - [键] 值
  // - 键：[值]
  const kvPatterns = [
    // 标准冒号/等号型： 键:值 或 键=值
    /(?:^|[|\n\s,，])(?<key>[\u4e00-\u9fa5a-zA-Z0-9_]{1,15})\s*[:：=]\s*(?<value>[^|\n,，\]}]+)/g,
    // Markdown 表格型： | 键 | 值 |
    /\|?\s*(?<key>[\u4e00-\u9fa5a-zA-Z0-9_]{1,15})\s*\|\s*(?<value>[^|\n,，\]}]+)\s*\|?/g,
    // 括号包含型： [键: 值] 或 {键: 值}
    /[\[{]\s*(?<key>[\u4e00-\u9fa5a-zA-Z0-9_]{1,15})\s*[:：]\s*(?<value>[^\]}]+)[\]}]/g
  ];

  kvPatterns.forEach(pattern => {
    let match;
    // 使用 exec 循环匹配所有符合条件的键值对
    while ((match = pattern.exec(cleanText)) !== null) {
      if (match.groups?.key && match.groups?.value) {
        const k = match.groups.key.trim();
        const v = match.groups.value.trim();
        // 过滤掉一些明显的杂质（如只有标点的 key）
        if (k && !/^[：:|=_-]+$/.test(k)) {
          results[k] = v;
        }
      }
    }
  });

  // 4. 特殊处理：CSV 模式回退
  // 如果没有任何键值对被识别，但存在大量分隔符，尝试按分隔符切分
  if (Object.keys(results).length === 0) {
    const delimiters = /[|｜,，\n]/;
    const parts = cleanText.split(delimiters).map(p => p.trim()).filter(p => p.length > 0);
    
    parts.forEach((part, index) => {
      // 尝试处理 "好感 50" 这种空格分隔的
      const spaceSplit = part.split(/\s+/);
      if (spaceSplit.length >= 2) {
        results[spaceSplit[0]] = spaceSplit.slice(1).join(' ');
      } else {
        // 纯 CSV 索引模式（建议配合外部 schema 使用，此处仅作索引记录）
        results[`param${index + 1}`] = part;
      }
    });
  }

  return results;
};

/**
 * 数值提取辅助器
 * 将 "好感度: 50%" 或 "HP: 100/100" 转化为 纯数字以供进度条渲染
 */
export const extractNumericValue = (val: string): number | null => {
  if (!val) return null;
  // 寻找第一个出现的数字（支持百分比和分数）
  const match = val.match(/(\d+(\.\d+)?)/);
  if (match) {
    return parseFloat(match[1]);
  }
  return null;
};

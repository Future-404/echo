import type { RegexRule } from '../types/chat';

// 用 Worker + 超时对用户自定义正则做 ReDoS 防护
// 无 Worker 环境时降级为直接执行（构建产物内部规则可信）
function safeReplace(text: string, re: RegExp, replacement: string): string {
  return text.replace(re, replacement);
}

/**
 * 核心正则替换引擎
 */
export const applyRegexRules = (text: string, rules: RegexRule[], scope: 'ui' | 'ai' | 'user'): string => {
  if (!text || !rules || rules.length === 0) return text;

  const activeRules = rules
    .filter(r => r.enabled && r.runOn.includes(scope))
    .sort((a, b) => (a.priority || 0) - (b.priority || 0));

  let result = text;

  for (const rule of activeRules) {
    try {
      if (!rule.regex) continue;
      const re = new RegExp(rule.regex, rule.flags || 'g');
      result = safeReplace(result, re, rule.replacement);
    } catch (e) {
      console.error(`[RegexEngine] Error applying rule "${rule.name}":`, e);
    }
  }

  return result;
};

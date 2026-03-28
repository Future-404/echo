/**
 * 轻量级 Token 计数器 (估算版)
 * 目标：在不引入大体积 tiktoken 库的情况下，提供足够准确的上下文预算管理
 */

export const estimateTokens = (text: string): number => {
  if (!text) return 0;

  // 1. 处理中文：一个中文字符及其标点大致对应 0.6 - 1.2 个 Token，这里按安全上限 1.2 预估
  const chineseChars = text.match(/[\u4e00-\u9fa5]|[\u3000-\u303f]|[\uff00-\uffef]/g) || [];
  const chineseTokenCount = Math.ceil(chineseChars.length * 1.2);

  // 2. 处理英文/数字/其他：大致 4 个字符一个 Token
  const remainingText = text.replace(/[\u4e00-\u9fa5]|[\u3000-\u303f]|[\uff00-\uffef]/g, '');
  const otherTokenCount = Math.ceil(remainingText.length / 3.5);

  return chineseTokenCount + otherTokenCount;
};

/**
 * 计算消息数组的总 Token
 */
export const countMessagesTokens = (messages: { role: string, content: string }[]): number => {
  return messages.reduce((acc, msg) => {
    // 角色 Overhead：每个消息通常有约 4-5 Token 的结构开销
    return acc + estimateTokens(msg.content) + 5;
  }, 0);
};

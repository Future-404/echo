import { describe, it, expect } from 'vitest';
import { estimateTokens, countMessagesTokens } from '../tokenCounter';

describe('tokenCounter', () => {
  describe('estimateTokens', () => {
    it('should return 0 for empty string', () => {
      expect(estimateTokens('')).toBe(0);
    });

    it('should estimate tokens for English text', () => {
      // 4 characters per token roughly
      expect(estimateTokens('hello')).toBe(Math.ceil(5 / 3.5));
    });

    it('should estimate tokens for Chinese text', () => {
      // 1.2 tokens per Chinese character
      expect(estimateTokens('你好')).toBe(Math.ceil(2 * 1.2));
    });

    it('should estimate tokens for mixed text', () => {
      const text = 'hello 你好';
      // 'hello ' is 6 chars -> 2 tokens
      // '你好' is 2 chars -> 3 tokens
      // Total 5
      const expected = Math.ceil(6 / 3.5) + Math.ceil(2 * 1.2);
      expect(estimateTokens(text)).toBe(expected);
    });
  });

  describe('countMessagesTokens', () => {
    it('should count total tokens for a message array', () => {
      const messages = [
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: 'hi' }
      ];
      const expected = (estimateTokens('hello') + 5) + (estimateTokens('hi') + 5);
      expect(countMessagesTokens(messages)).toBe(expected);
    });
  });
});

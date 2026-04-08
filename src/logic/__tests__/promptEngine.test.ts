import { describe, it, expect, vi } from 'vitest';

// Mock problematic modules
vi.mock('../vectorMath', () => ({
  vectorMath: {
    findBestMatches: vi.fn(),
    ensureFloat32: vi.fn()
  }
}));
vi.mock('../memoryDistiller', () => ({
  memoryDistiller: {
    callEmbeddingAPI: vi.fn()
  }
}));
vi.mock('../../storage/db', () => ({
  db: {
    worldEntries: {},
    messages: {},
    getMessagesBySlot: vi.fn()
  }
}));
vi.mock('../../utils/vectorMath', () => ({
  vectorMath: {
    findBestMatches: vi.fn(),
    ensureFloat32: vi.fn()
  }
}));

import { replaceMacros } from '../promptEngine';

describe('promptEngine', () => {
  describe('replaceMacros', () => {
    it('should replace {{user}} and {{char}}', () => {
      const text = 'Hello {{user}}, I am {{char}}.';
      const result = replaceMacros(text, 'Alice', 'Bob');
      expect(result).toContain('Alice');
      expect(result).toContain('Bob');
      expect(result).not.toContain('{{user}}');
      expect(result).not.toContain('{{char}}');
    });

    it('should replace {{time}}, {{date}}, and {{weekday}}', () => {
      const text = 'Today is {{weekday}}, {{date}}. Time: {{time}}.';
      const result = replaceMacros(text, 'Alice', 'Bob');
      expect(result).not.toContain('{{weekday}}');
      expect(result).not.toContain('{{date}}');
      expect(result).not.toContain('{{time}}');
    });

    it('should replace other macros', () => {
      const text = 'Quest: {{current_quest}}. Description: {{description}}. Background: {{background}}. Other: {{other}}.';
      const result = replaceMacros(text, 'Alice', 'Bob', {
        currentQuest: 'Save the world',
        userDescription: 'A hero',
        userBackground: 'Forest',
        otherName: 'Charlie'
      });
      expect(result).toBe('Quest: Save the world. Description: A hero. Background: Forest. Other: Charlie.');
    });

    it('should handle missing options with defaults', () => {
      const text = 'Quest: {{current_quest}}. Description: {{description}}.';
      const result = replaceMacros(text, 'Alice', 'Bob');
      expect(result).toBe('Quest: None. Description: .');
    });

    it('should be case-insensitive for macros', () => {
      const text = 'Hello {{USER}}, I am {{Char}}.';
      const result = replaceMacros(text, 'Alice', 'Bob');
      expect(result).toBe('Hello Alice, I am Bob.');
    });
  });
});

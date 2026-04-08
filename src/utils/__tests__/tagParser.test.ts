import { describe, it, expect, vi } from 'vitest';
import { applyCharacterRegexScripts } from '../tagParser';
import type { CharacterCard } from '../../types/chat';

const makeChar = (tagTemplates: any[]): CharacterCard => ({
  id: 'c1', name: 'Test', image: '', description: '', systemPrompt: '',
  extensions: { tagTemplates },
} as any);

describe('applyCharacterRegexScripts', () => {
  it('applies basic replacement', () => {
    const char = makeChar([{ id: '1', name: 'r', originalRegex: '/hello/g', replaceString: 'hi', enabled: true, placement: [1, 2] }]);
    expect(applyCharacterRegexScripts('hello world', char, 1)).toBe('hi world');
  });

  it('skips disabled rules', () => {
    const char = makeChar([{ id: '1', name: 'r', originalRegex: '/hello/g', replaceString: 'hi', enabled: false, placement: [1, 2] }]);
    expect(applyCharacterRegexScripts('hello world', char, 1)).toBe('hello world');
  });

  it('respects layer placement', () => {
    const char = makeChar([{ id: '1', name: 'r', originalRegex: '/hello/g', replaceString: 'hi', enabled: true, placement: [2] }]);
    expect(applyCharacterRegexScripts('hello', char, 1)).toBe('hello'); // layer 1 skipped
    expect(applyCharacterRegexScripts('hello', char, 2)).toBe('hi');   // layer 2 applied
  });

  it('handles /s flag by replacing . with [\\s\\S]', () => {
    const char = makeChar([{ id: '1', name: 'r', originalRegex: '/a.b/gs', replaceString: 'X', enabled: true, placement: [1] }]);
    expect(applyCharacterRegexScripts('a\nb', char, 1)).toBe('X');
  });

  it('does not corrupt character class when handling /s flag', () => {
    // [^.] should not become [^[\\s\\S]]
    const char = makeChar([{ id: '1', name: 'r', originalRegex: '/[^.]+/gs', replaceString: 'X', enabled: true, placement: [1] }]);
    // Should not throw
    expect(() => applyCharacterRegexScripts('abc.def', char, 1)).not.toThrow();
  });

  it('replaces \\n in replacement string with actual newline', () => {
    const char = makeChar([{ id: '1', name: 'r', originalRegex: '/BREAK/', replaceString: '\\n', enabled: true, placement: [1] }]);
    expect(applyCharacterRegexScripts('aBREAKb', char, 1)).toBe('a\nb');
  });

  it('deletes matched content when replaceString is empty', () => {
    const char = makeChar([{ id: '1', name: 'r', originalRegex: '/<tag>[\\s\\S]*?<\\/tag>/g', replaceString: '', enabled: true, placement: [1] }]);
    expect(applyCharacterRegexScripts('before<tag>content</tag>after', char, 1)).toBe('beforeafter');
  });

  it('does not throw on invalid regex', () => {
    const char = makeChar([{ id: '1', name: 'r', originalRegex: '/[invalid/g', replaceString: 'x', enabled: true, placement: [1] }]);
    expect(() => applyCharacterRegexScripts('text', char, 1)).not.toThrow();
    expect(applyCharacterRegexScripts('text', char, 1)).toBe('text');
  });

  it('returns empty string for empty input', () => {
    const char = makeChar([]);
    expect(applyCharacterRegexScripts('', char, 1)).toBe('');
  });
});

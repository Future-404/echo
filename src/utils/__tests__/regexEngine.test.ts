import { describe, it, expect } from 'vitest';
import { applyRegexRules } from '../regexEngine';
import type { RegexRule } from '../../types/chat';

const rule = (overrides: Partial<RegexRule>): RegexRule => ({
  id: 'r1', name: 'test', regex: '', replacement: '', flags: 'g',
  enabled: true, runOn: ['ui', 'ai', 'user'], ...overrides,
});

describe('regexEngine', () => {
  it('applies enabled rule for matching scope', () => {
    const rules = [rule({ regex: 'Hello', replacement: 'Hi', runOn: ['ui'] })];
    expect(applyRegexRules('Hello world', rules, 'ui')).toBe('Hi world');
    expect(applyRegexRules('Hello world', rules, 'ai')).toBe('Hello world');
  });

  it('skips disabled rules', () => {
    const rules = [rule({ regex: 'secret', replacement: 'REDACTED', enabled: false })];
    expect(applyRegexRules('secret', rules, 'ui')).toBe('secret');
  });

  it('respects flags (case-insensitive)', () => {
    const rules = [rule({ regex: 'apple', replacement: 'fruit', flags: 'gi' })];
    expect(applyRegexRules('I like Apple', rules, 'ui')).toBe('I like fruit');
  });

  it('supports capture group back-references', () => {
    const rules = [rule({ regex: '(\\w+)@(\\w+)', replacement: '$1 at $2' })];
    expect(applyRegexRules('user@host', rules, 'ui')).toBe('user at host');
  });

  it('skips and does not throw on invalid regex', () => {
    const rules = [rule({ regex: '[invalid', replacement: 'x' })];
    expect(() => applyRegexRules('text', rules, 'ui')).not.toThrow();
    expect(applyRegexRules('text', rules, 'ui')).toBe('text');
  });

  it('applies rules in priority order', () => {
    const rules = [
      rule({ id: 'r2', regex: 'Hi', replacement: 'Hey', priority: 2 }),
      rule({ id: 'r1', regex: 'Hello', replacement: 'Hi', priority: 1 }),
    ];
    // priority 1 runs first: Hello→Hi, then priority 2: Hi→Hey
    expect(applyRegexRules('Hello', rules, 'ui')).toBe('Hey');
  });

  it('returns original text when rules array is empty', () => {
    expect(applyRegexRules('text', [], 'ui')).toBe('text');
  });
});

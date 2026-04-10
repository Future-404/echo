import { describe, it, expect } from 'vitest';
import { parseStreamingNovelText } from '../novelParser';

describe('novelParser - quote stripping', () => {
  it('strips straight double quotes from dialogue', () => {
    const result = parseStreamingNovelText('"你好"');
    const dialogue = result.find(s => s.type === 'dialogue');
    expect(dialogue?.content).toBe('你好');
  });

  it('strips curly left+right double quotes', () => {
    const result = parseStreamingNovelText('\u201c你好\u201d');
    const dialogue = result.find(s => s.type === 'dialogue');
    expect(dialogue?.content).toBe('你好');
  });

  it('strips mixed quote styles', () => {
    const result = parseStreamingNovelText('"你好"');
    const dialogue = result.find(s => s.type === 'dialogue');
    expect(dialogue?.content).toBe('你好');
  });

  it('strips quotes and preserves inner content', () => {
    const result = parseStreamingNovelText('"内容"');
    const dialogue = result.find(s => s.type === 'dialogue');
    expect(dialogue?.content).toBe('内容');
  });
});

describe('novelParser - font size types', () => {
  it('parses narration separately from dialogue', () => {
    const text = '她走进了房间。"你好。"';
    const result = parseStreamingNovelText(text);
    const types = result.map(s => s.type);
    expect(types).toContain('narration');
    expect(types).toContain('dialogue');
  });

  it('parses action markers', () => {
    const text = '*她轻轻叹了口气*';
    const result = parseStreamingNovelText(text);
    const action = result.find(s => s.type === 'action');
    expect(action?.content).toBe('她轻轻叹了口气');
  });

  it('parses thought markers', () => {
    const text = '（她心想）';
    const result = parseStreamingNovelText(text);
    const thought = result.find(s => s.type === 'thought');
    expect(thought?.content).toBe('她心想');
  });
});

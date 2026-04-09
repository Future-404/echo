import { describe, it, expect, vi } from 'vitest';

vi.mock('../../storage/db', () => ({
  db: {
    worldEntries: { where: vi.fn(() => ({ anyOf: vi.fn(() => ({ filter: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })) })) })) },
    messages: { where: vi.fn(() => ({ equals: vi.fn(() => ({ count: vi.fn().mockResolvedValue(0), anyOf: vi.fn(() => ({ modify: vi.fn() })) })) })) },
    getMessagesBySlot: vi.fn().mockResolvedValue([]),
    promptPresetEntries: { where: vi.fn(() => ({ anyOf: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })) })) },
  }
}));
vi.mock('../../utils/vectorMath', () => ({ vectorMath: { findBestMatches: vi.fn(), ensureFloat32: vi.fn() } }));
vi.mock('../memoryDistiller', () => ({ memoryDistiller: { callEmbeddingAPI: vi.fn() } }));
vi.mock('../../store/useAppStore', () => ({ useAppStore: { getState: vi.fn(() => ({ config: { providers: [], activeEmbeddingProviderId: null } })) } }));

import { replaceMacros, buildPromptMessages } from '../promptEngine';
import { buildContextForChar } from '../multiChar';
import type { PromptContext } from '../promptEngine';

const baseChar = {
  id: 'c1', name: 'Aria', image: '', description: 'desc',
  systemPrompt: 'You are {{char}}, talking to {{user}}.',
};

const baseCtx = (): PromptContext => ({
  character: baseChar as any,
  directives: [],
  worldBookLibrary: [],
  missions: [],
  userName: 'Alice',
  recentMessages: [],
});

// ── replaceMacros ─────────────────────────────────────────────────────────────
describe('replaceMacros', () => {
  it('replaces {{user}} and {{char}} case-insensitively', () => {
    expect(replaceMacros('{{USER}} meets {{Char}}', 'Alice', 'Aria')).toBe('Alice meets Aria');
  });

  it('replaces all optional macros', () => {
    const result = replaceMacros('{{other}} {{current_quest}} {{description}} {{background}}', 'U', 'C', {
      otherName: 'Bob', currentQuest: 'Quest1', userDescription: 'Desc', userBackground: 'BG'
    });
    expect(result).toBe('Bob Quest1 Desc BG');
  });

  it('defaults missing options to empty/None', () => {
    const result = replaceMacros('{{other}}|{{current_quest}}|{{description}}', 'U', 'C');
    expect(result).toBe('None|None|');
  });

  it('returns empty string for empty input', () => {
    expect(replaceMacros('', 'U', 'C')).toBe('');
  });
});

// ── buildPromptMessages ───────────────────────────────────────────────────────
describe('buildPromptMessages', () => {
  it('returns array with system message first', async () => {
    const msgs = await buildPromptMessages(baseCtx());
    expect(msgs[0].role).toBe('system');
    expect(msgs[0].content).toContain('Aria');
    expect(msgs[0].content).toContain('Alice');
  });

  it('applies macros in systemPrompt', async () => {
    const msgs = await buildPromptMessages(baseCtx());
    expect(msgs[0].content).not.toContain('{{char}}');
    expect(msgs[0].content).not.toContain('{{user}}');
  });

  it('includes recent messages in history', async () => {
    const ctx = baseCtx();
    ctx.recentMessages = [
      { role: 'user', content: 'Hello Aria' },
      { role: 'assistant', content: 'Hello Alice' },
    ];
    const msgs = await buildPromptMessages(ctx, 128000);
    const history = msgs.filter(m => m.role !== 'system');
    expect(history).toHaveLength(2);
    expect(history[0].content).toBe('Hello Aria');
  });

  it('appends postHistoryInstructions as last system message', async () => {
    const ctx = baseCtx();
    ctx.character = { ...baseChar, postHistoryInstructions: 'Always be concise.' } as any;
    const msgs = await buildPromptMessages(ctx);
    const last = msgs[msgs.length - 1];
    expect(last.role).toBe('system');
    expect(last.content).toContain('concise');
  });

  it('does not include PROTOCOLS section when no directives', async () => {
    const msgs = await buildPromptMessages(baseCtx());
    expect(msgs[0].content).not.toContain('### PROTOCOLS');
  });

  it('includes PROTOCOLS when directives are enabled', async () => {
    const ctx = baseCtx();
    ctx.directives = [{ id: 'd1', title: 'Rule1', content: 'Be helpful.', enabled: true }] as any;
    const msgs = await buildPromptMessages(ctx);
    expect(msgs[0].content).toContain('### PROTOCOLS');
    expect(msgs[0].content).toContain('Be helpful.');
  });

  it('depth injections inserted at correct positions', async () => {
    const ctx = baseCtx();
    ctx.recentMessages = [
      { role: 'user', content: 'msg1' },
      { role: 'assistant', content: 'msg2' },
      { role: 'user', content: 'msg3' },
    ];
    ctx.character = {
      ...baseChar,
      depthPrompt: { content: 'DEPTH_NOTE', depth: 1, role: 'system' }
    } as any;
    const msgs = await buildPromptMessages(ctx, 128000);
    const history = msgs.slice(1); // skip system
    // depth=1 means inject before the last message
    const noteIdx = history.findIndex(m => m.content?.includes('DEPTH_NOTE'));
    expect(noteIdx).toBe(history.length - 2);
  });
});

// ── buildContextForChar (multiChar) ──────────────────────────────────────────
describe('buildContextForChar', () => {
  const charNames = { user: 'Alice', 'c1': 'Aria', 'c2': 'Bolt' };

  it('maps target char messages to assistant role', () => {
    const messages = [
      { role: 'assistant', content: 'Hi', speakerId: 'c1' },
    ] as any[];
    const result = buildContextForChar(messages, 'c1', charNames);
    expect(result[0].role).toBe('assistant');
    expect(result[0].content).toBe('Hi');
  });

  it('maps other char messages to user role with name prefix', () => {
    const messages = [
      { role: 'assistant', content: 'Hey', speakerId: 'c2' },
    ] as any[];
    const result = buildContextForChar(messages, 'c1', charNames);
    expect(result[0].role).toBe('user');
    expect(result[0].content).toContain('[Bolt]');
  });

  it('merges consecutive non-target messages into one user message', () => {
    const messages = [
      { role: 'user', content: 'Hello', speakerId: 'user' },
      { role: 'assistant', content: 'Hey', speakerId: 'c2' },
    ] as any[];
    const result = buildContextForChar(messages, 'c1', charNames);
    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('user');
    expect(result[0].content).toContain('[Alice]');
    expect(result[0].content).toContain('[Bolt]');
  });

  it('does not merge when target char speaks between others', () => {
    const messages = [
      { role: 'user', content: 'A', speakerId: 'user' },
      { role: 'assistant', content: 'B', speakerId: 'c1' },
      { role: 'user', content: 'C', speakerId: 'user' },
    ] as any[];
    const result = buildContextForChar(messages, 'c1', charNames);
    expect(result).toHaveLength(3);
    expect(result[0].role).toBe('user');
    expect(result[1].role).toBe('assistant');
    expect(result[2].role).toBe('user');
  });
});

// ── PromptPreset 綁定 ─────────────────────────────────────────────────────────
describe('buildPromptMessages with promptPresets', () => {
  it('includes preset directives in PROTOCOLS when char has promptPresetIds', async () => {
    const { db } = await import('../../storage/db');
    (db.promptPresetEntries.where as any).mockReturnValue({
      anyOf: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([
        { id: 'd1', presetId: 'preset-1', title: 'PresetRule', content: 'Follow preset.', enabled: true }
      ])}))
    });

    const ctx = baseCtx();
    ctx.character = { ...baseChar, extensions: { promptPresetIds: ['preset-1'] } } as any;
    const msgs = await buildPromptMessages(ctx, 128000);
    expect(msgs[0].content).toContain('### PROTOCOLS');
    expect(msgs[0].content).toContain('Follow preset.');
  });

  it('excludes disabled preset directives', async () => {
    const { db } = await import('../../storage/db');
    (db.promptPresetEntries.where as any).mockReturnValue({
      anyOf: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([
        { id: 'd2', presetId: 'preset-2', title: 'DisabledRule', content: 'Should not appear.', enabled: false }
      ])}))
    });

    const ctx = baseCtx();
    ctx.character = { ...baseChar, extensions: { promptPresetIds: ['preset-2'] } } as any;
    const msgs = await buildPromptMessages(ctx, 128000);
    expect(msgs[0].content).not.toContain('Should not appear.');
  });

  it('preset directive with depth goes to depth injection, not PROTOCOLS', async () => {
    const { db } = await import('../../storage/db');
    (db.promptPresetEntries.where as any).mockReturnValue({
      anyOf: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([
        { id: 'd3', presetId: 'preset-3', title: 'DepthRule', content: 'DEPTH_CONTENT', enabled: true, depth: 1 }
      ])}))
    });

    const ctx = baseCtx();
    ctx.character = { ...baseChar, extensions: { promptPresetIds: ['preset-3'] } } as any;
    ctx.recentMessages = [
      { role: 'user', content: 'msg1' },
      { role: 'assistant', content: 'msg2' },
    ];
    const msgs = await buildPromptMessages(ctx, 128000);
    expect(msgs[0].content).not.toContain('DEPTH_CONTENT');
    const hasDepth = msgs.slice(1).some(m => m.content?.includes('DEPTH_CONTENT'));
    expect(hasDepth).toBe(true);
  });

  it('ignores presets when no promptPresetIds', async () => {
    const ctx = baseCtx(); // 沒有 promptPresetIds
    const msgs = await buildPromptMessages(ctx, 128000);
    expect(msgs[0].content).not.toContain('### PROTOCOLS');
  });
});

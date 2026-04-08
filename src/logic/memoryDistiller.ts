import type { Message } from '../types/chat';
import { db } from '../storage/db';
import type { DBMessage, DBMemoryEpisode } from '../storage/db';
import { vectorMath } from '../utils/vectorMath';

/**
 * 记忆提炼结果接口
 */
export interface DistillationResult {
  atomic: { text: string; importance: '高' | '中' | '低' }[];
  narrative: string;
  tags: string[];
}

/**
 * 记忆结晶师 (The Memory Distiller)
 * 加固版：具备 API 重试、超时保护、存储自动清理功能
 */
export const memoryDistiller = {
  
  // ─── 核心参数 ─────────────────────────────────────────────────────────────
  MAX_EPISODES_PER_SLOT: 1000, 
  API_TIMEOUT: 15000,          

  /**
   * 辅助：带重试与超时的 Fetch 包装
   */
  async robustFetch(url: string, options: any, retries = 2): Promise<Response> {
    for (let i = 0; i <= retries; i++) {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), this.API_TIMEOUT);
      
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        if (response.ok) return response;
        // Non-ok and non-retryable: throw immediately with status info
        if (response.status !== 429) {
          const text = await response.text().catch(() => '');
          throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
        }
        // 429: wait and retry
        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
      } catch (err: any) {
        clearTimeout(id);
        if (i === retries) throw err;
        await new Promise(r => setTimeout(r, 1000 * (i + 1))); 
      }
    }
    throw new Error('Request failed after retries');
  },

  buildDistillPrompt(charName: string, messages: Message[]): string {
    const chatTranscript = messages
      .map(m => `${m.role === 'user' ? '用户' : charName}: ${m.content}`)
      .join('\n');

    return `
You are a memory extraction system. Analyze the following conversation and extract structured memory from the perspective of [${charName}].

### Conversation:
${chatTranscript}

### Task:
Extract the following three components:

1. **atomic** — Decompose key facts, decisions, and emotional turning points into minimal, self-contained propositions (3–8 items). Each must be fully explicit (use proper names, no pronouns). Assign importance: "高" (plot-critical), "中" (contextually relevant), "低" (background detail).
2. **narrative** — Synthesize the atomic propositions into one dense paragraph. Preserve emotional arc and unresolved threads.
3. **tags** — Extract 3–6 precise labels (characters, locations, emotions, intentions, time anchors).

Respond with strict JSON only. No explanation, no markdown.

Expected format:
{"atomic":[{"text":"...","importance":"高|中|低"}],"narrative":"...","tags":["..."]}
`.trim();
  },

  /**
   * 执行结晶全流程
   */
  async crystallize(
    slotId: string, 
    messages: DBMessage[], 
    charName: string,
    llmProvider: any,
    embeddingProvider: any
  ): Promise<boolean> {
    if (messages.length === 0) return false;

    try {
      const prompt = this.buildDistillPrompt(charName, messages);
      const distilledData = await this.callDistillLLM(llmProvider, prompt);
      if (!distilledData) return false;

      const narrativeVector = await this.callEmbeddingAPI(embeddingProvider, distilledData.narrative);
      const atomicWithVectors = await Promise.all(
        distilledData.atomic.map(async (item: any) => ({
          ...item,
          vector: await this.callEmbeddingAPI(embeddingProvider, item.text)
        }))
      );

      const episode: DBMemoryEpisode = {
        slotId,
        narrative: distilledData.narrative,
        narrativeVector: vectorMath.ensureFloat32(narrativeVector),
        atomic: atomicWithVectors.map(a => ({
          text: a.text,
          importance: a.importance,
          vector: vectorMath.ensureFloat32(a.vector)
        })),
        tags: distilledData.tags,
        originalMsgIds: messages.map(m => m.id!).filter(Boolean),
        timestamp: Date.now(),
        importanceScore: this.calculateGlobalImportance(distilledData.atomic)
      };

      await db.memoryEpisodes.add(episode);
      const msgIds = messages.map(m => m.id!).filter(Boolean);
      await db.messages.where('id').anyOf(msgIds).modify({ vState: 2 });

      // 存储清理
      this.pruneOldEpisodes(slotId);

      return true;
    } catch (e) {
      console.error('[MemoryDistiller] crystallize failed:', e);
      return false;
    }
  },

  async pruneOldEpisodes(slotId: string) {
    try {
      const count = await db.memoryEpisodes.where('slotId').equals(slotId).count();
      if (count > this.MAX_EPISODES_PER_SLOT) {
        const toDelete = await db.memoryEpisodes
          .where('slotId').equals(slotId)
          .sortBy('timestamp');
        
        const deleteIds = (toDelete.slice(0, count - this.MAX_EPISODES_PER_SLOT) as any[])
          .map(e => e.id)
          .filter((id): id is number => id != null);
        await db.memoryEpisodes.bulkDelete(deleteIds);
        console.log(`[MemoryDistiller] pruned ${deleteIds.length} old episodes`);
      }
    } catch (e) { console.error('Pruning failed:', e); }
  },

  async callDistillLLM(provider: any, prompt: string): Promise<DistillationResult | null> {
    const response = await this.robustFetch(`${provider.endpoint}/chat/completions`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    });

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) throw new Error('LLM returned empty content');
    try {
      return JSON.parse(raw) as DistillationResult;
    } catch {
      throw new Error(`LLM returned non-JSON: ${raw.slice(0, 200)}`);
    }
  },

  async callEmbeddingAPI(provider: any, text: string): Promise<number[]> {
    const isGemini = provider.endpoint?.includes('generativelanguage.googleapis')
    const url = isGemini
      ? `${provider.endpoint}/models/${provider.model}:embedContent?key=${provider.apiKey}`
      : `${provider.endpoint}/embeddings`;

    const body = isGemini
      ? { content: { parts: [{ text }] } }
      : {
          input: text,
          model: provider.model,
          ...(provider.embeddingDimensions ? { dimensions: provider.embeddingDimensions } : {}),
        };

    const response = await this.robustFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(isGemini ? {} : { 'Authorization': `Bearer ${provider.apiKey}` }) },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    if (isGemini) {
      const values = data?.embedding?.values;
      if (!Array.isArray(values)) throw new Error(`Gemini embedding missing values: ${JSON.stringify(data).slice(0, 200)}`);
      return values;
    }
    const embedding = data?.data?.[0]?.embedding;
    if (!Array.isArray(embedding)) throw new Error(`Embedding missing data[0].embedding: ${JSON.stringify(data).slice(0, 200)}`);
    return embedding;
  },

  calculateGlobalImportance(atomic: any[]): number {
    if (atomic.length === 0) return 0.5;
    const scores = { '高': 1.0, '中': 0.6, '低': 0.2 };
    const sum = atomic.reduce((acc, item) => acc + (scores[item.importance as keyof typeof scores] || 0.5), 0);
    return sum / atomic.length;
  }
};

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
你现在是【记忆结晶师】。请对以下对话片段进行三层提炼，以角色 [${charName}] 的视角进行记录。

### 待处理片段：
${chatTranscript}

### 提炼任务：
1. **原子命题层 (Atomic Propositions)**：把核心事实、决定或关键情感拆成最小的、相互独立的陈述句（3-8条）。每条必须自包含（提及具体人名/物名），禁用代词。
2. **叙事块层 (Narrative Chunk)**：把上述原子命题合并成 1 段高密度的叙事，保留情感弧线和伏笔。
3. **主题标签层 (Tags)**：提取 3-6 个精确标签（人物、地点、情绪、意图、时间锚点等）。

要求：严格 JSON 格式，不得有额外文字。
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

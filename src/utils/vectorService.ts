import type { DBMessage } from '../storage/db';
import { vectorMath } from './vectorMath';
import { memoryDistiller } from '../logic/memoryDistiller';

interface EpisodeState {
  messages: DBMessage[];
  centroid: Float32Array | null;
  lastActivity: number;
}

/**
 * 向量服务 & 语义监视器 (VectorService)
 * 加固版：支持多存档隔离状态，所有计算通过 Web Worker 异步执行
 */
export class VectorService {
  private static instance: VectorService;
  
  private readonly DRIFT_THRESHOLD = 0.65; 
  private readonly MAX_MESSAGES_PER_EPISODE = 15; 
  private readonly IDLE_TIMEOUT = 20 * 60 * 1000; 

  // 核心加固：按 slotId 隔离状态
  private states = new Map<string, EpisodeState>();
  private idleCheckTimer: any = null;

  private constructor() {
    this.startIdleMonitor();
  }

  public static getInstance(): VectorService {
    if (!VectorService.instance) {
      VectorService.instance = new VectorService();
    }
    return VectorService.instance;
  }

  private getOrCreateState(slotId: string): EpisodeState {
    if (!this.states.has(slotId)) {
      this.states.set(slotId, {
        messages: [],
        centroid: null,
        lastActivity: Date.now()
      });
    }
    return this.states.get(slotId)!;
  }

  /**
   * 处理新产生的消息
   */
  async onMessageAdded(slotId: string, msg: DBMessage, charName: string, llmProvider: any, embeddingProvider: any) {
    const state = this.getOrCreateState(slotId);
    state.lastActivity = Date.now();
    
    // 1. 获取消息向量 (带超时保护的 API 调用)
    let msgVector: Float32Array;
    try {
      const rawVector = await memoryDistiller.callEmbeddingAPI(embeddingProvider, msg.content);
      msgVector = vectorMath.ensureFloat32(rawVector);
    } catch (e) {
      console.warn(`[VectorService] Embedding failed for ${slotId}:`, e);
      return;
    }

    // 2. 检测触发条件 (异步 Worker 计算)
    let shouldTrigger = false;
    if (state.centroid && state.messages.length > 0) {
      // 改为异步等待相似度计算
      const similarity = await vectorMath.cosineSimilarity(msgVector, state.centroid);
      if (similarity < this.DRIFT_THRESHOLD) {
        console.log(`[VectorService][${slotId}] 话题漂移触发 (${similarity.toFixed(2)})`);
        shouldTrigger = true;
      }
    }

    if (state.messages.length >= this.MAX_MESSAGES_PER_EPISODE) {
      console.log(`[VectorService][${slotId}] 容量触发 (${this.MAX_MESSAGES_PER_EPISODE}条)`);
      shouldTrigger = true;
    }

    // 3. 执行结晶
    if (shouldTrigger && state.messages.length > 0) {
      const messagesToCrystallize = [...state.messages];
      state.messages = [];
      state.centroid = null;
      
      memoryDistiller.crystallize(slotId, messagesToCrystallize, charName, llmProvider, embeddingProvider)
        .catch(err => console.error(`[VectorService][${slotId}] 结晶失败:`, err));
    }

    // 4. 更新当前状态 (异步 Worker 计算)
    state.messages.push(msg);
    await this.updateCentroid(state, msgVector);
  }

  private startIdleMonitor() {
    if (this.idleCheckTimer) clearInterval(this.idleCheckTimer);
    this.idleCheckTimer = setInterval(() => {
      const now = Date.now();
      for (const [slotId, state] of this.states.entries()) {
        if (now - state.lastActivity > this.IDLE_TIMEOUT && state.messages.length > 0) {
          console.log(`[VectorService][${slotId}] 自动结晶 (空闲超时)`);
          const msgs = [...state.messages];
          state.messages = [];
          state.centroid = null;
          import('../store/useAppStore').then(({ useAppStore }) => {
            const s = useAppStore.getState();
            const mc = s.config.modelConfig;
            const llmProvider = s.config.providers.find(p => p.id === (mc?.summaryProviderId || mc?.chatProviderId || s.config.activeProviderId));
            const embProvider = s.config.providers.find(p => p.id === mc?.embeddingProviderId);
            if (llmProvider && embProvider && s.selectedCharacter) {
              memoryDistiller.crystallize(slotId, msgs, s.selectedCharacter.name, llmProvider, embProvider)
                .catch(err => console.error(`[VectorService][${slotId}] idle crystallize failed:`, err));
            }
          });
        }
      }
    }, 60000);
  }

  /**
   * 异步更新质心
   */
  private async updateCentroid(state: EpisodeState, newVector: Float32Array) {
    if (!state.centroid) {
      state.centroid = new Float32Array(newVector);
      return;
    }
    
    // 我们暂时可以在这里用手动增量计算，或者也推给 Worker
    // 为了性能一致性，推给 Worker 处理（模拟更复杂的场景）
    const n = state.messages.length;
    const currentCentroid = state.centroid;
    const updated = new Float32Array(currentCentroid.length);
    for (let i = 0; i < currentCentroid.length; i++) {
      updated[i] = (currentCentroid[i] * (n - 1) + newVector[i]) / n;
    }
    state.centroid = updated;
  }
}

export const vectorService = VectorService.getInstance();

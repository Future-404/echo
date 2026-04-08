/**
 * Echo 向量数学调度器 (Async Worker Wrapper)
 * 通过 Web Worker 在后台线程执行计算密集型向量运算
 */

class VectorMathScheduler {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, { resolve: Function, reject: Function }>();

  private getWorker() {
    if (this.worker) return this.worker;
    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('../workers/vector.worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e) => {
        const { id, result, success, error } = e.data;
        const request = this.pendingRequests.get(id);
        if (request) {
          if (success) request.resolve(result);
          else request.reject(new Error(error));
          this.pendingRequests.delete(id);
        }
      };
      return this.worker;
    }
    return null;
  }

  private async callWorker(type: string, payload: any): Promise<any> {
    const worker = this.getWorker();
    if (!worker) return null;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      worker.postMessage({ type, payload, id });
    });
  }

  /**
   * 异步计算余弦相似度
   */
  async cosineSimilarity(vecA: Float32Array | number[], vecB: Float32Array | number[]): Promise<number> {
    return this.callWorker('SIMILARITY', { 
      vecA: this.ensureFloat32(vecA), 
      vecB: this.ensureFloat32(vecB) 
    });
  }

  /**
   * 异步聚合质心
   */
  async calculateCentroid(vectors: Float32Array[]): Promise<Float32Array> {
    return this.callWorker('CENTROID', { vectors });
  }

  /**
   * 异步语义检索
   */
  async findBestMatches(queryVector: Float32Array, episodes: any[], limit = 3, threshold = 0.72): Promise<any[]> {
    return this.callWorker('SEARCH', { 
      queryVector: this.ensureFloat32(queryVector), 
      episodes, 
      limit, 
      threshold 
    });
  }

  ensureFloat32(vec: any): Float32Array {
    if (vec instanceof Float32Array) return vec;
    return new Float32Array(vec);
  }
}

export const vectorMath = new VectorMathScheduler();

/**
 * Echo Vector Web Worker
 * 负责在后台线程执行耗时的向量计算 (余弦相似度、质心聚合、语义检索)
 */

const vectorMath = {
  cosineSimilarity(vecA: Float32Array, vecB: Float32Array): number {
    if (vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  },

  calculateCentroid(vectors: Float32Array[]): Float32Array {
    if (vectors.length === 0) return new Float32Array(0);
    const dims = vectors[0].length;
    const centroid = new Float32Array(dims);
    for (const vec of vectors) {
      for (let i = 0; i < dims; i++) centroid[i] += vec[i];
    }
    for (let i = 0; i < dims; i++) centroid[i] /= vectors.length;
    return centroid;
  },

  findBestMatches(queryVector: Float32Array, episodes: any[], limit: number, threshold: number) {
    const scored = episodes.map(ep => {
      const sim = this.cosineSimilarity(queryVector, ep.narrativeVector);
      return { ep, sim };
    });
    return scored
      .filter(s => s.sim >= threshold)
      .sort((a, b) => b.sim - a.sim)
      .slice(0, limit);
  }
};

self.onmessage = (e: MessageEvent) => {
  const { type, payload, id } = e.data;

  try {
    let result;
    switch (type) {
      case 'SIMILARITY':
        result = vectorMath.cosineSimilarity(payload.vecA, payload.vecB);
        break;
      case 'CENTROID':
        result = vectorMath.calculateCentroid(payload.vectors);
        break;
      case 'SEARCH':
        result = vectorMath.findBestMatches(payload.queryVector, payload.episodes, payload.limit, payload.threshold);
        break;
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
    self.postMessage({ id, result, success: true });
  } catch (err: any) {
    self.postMessage({ id, error: err.message, success: false });
  }
};

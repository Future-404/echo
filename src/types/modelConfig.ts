export interface ModelConfig {
  chatProviderId: string       // 全局主对话 LLM
  embeddingProviderId: string  // 嵌入模型
  ttsProviderId: string        // TTS
  routerProviderId: string     // 多角色路由 LLM
  summaryProviderId: string    // 记忆摘要 LLM（独立小模型）
}

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  chatProviderId: 'default',
  embeddingProviderId: '',
  ttsProviderId: '',
  routerProviderId: '',
  summaryProviderId: '',
}

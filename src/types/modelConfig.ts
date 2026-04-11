export interface ModelConfig {
  chatProviderId: string
  embeddingProviderId: string
  ttsProviderId: string
  routerProviderId: string
  summaryProviderId: string
  toolProviderId: string         // AI 工具協助，從 chat providers 中選取
}

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  chatProviderId: 'default',
  embeddingProviderId: '',
  ttsProviderId: '',
  routerProviderId: '',
  summaryProviderId: '',
  toolProviderId: '',
}

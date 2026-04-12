export interface ModelConfig {
  chatProviderId: string
  embeddingProviderId: string
  ttsProviderId: string
  routerProviderId: string
  summaryProviderId: string
  toolProviderId: string
  extensionProviderId: string    // 扩展应用专用模型（查手机、生成内容等独立请求）
}

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  chatProviderId: 'default',
  embeddingProviderId: '',
  ttsProviderId: '',
  routerProviderId: '',
  summaryProviderId: '',
  toolProviderId: '',
  extensionProviderId: '',
}

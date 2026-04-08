import type { Message, Provider } from '../../types/store';

export interface ChatRequestOptions {
  messages: Message[];
  provider: Provider;
  stopSequences?: string[];
  prefill?: string;
  isStreaming?: boolean;
  tools?: any[];
  onChunk?: (chunk: string) => void;
  signal?: AbortSignal;
}

export interface ChatResponse {
  content: string;
  toolCalls?: any[];
  usage?: any;
}

export interface IChatProvider {
  request(options: ChatRequestOptions): Promise<ChatResponse>;
}

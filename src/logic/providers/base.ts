import type { Message, Provider } from '../../types/store';

export interface ToolDefinition {
  type: 'function';
  function: { name: string; description?: string; parameters?: Record<string, unknown> };
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface UsageInfo {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface ChatRequestOptions {
  messages: Message[];
  provider: Provider;
  stopSequences?: string[];
  prefill?: string;
  isStreaming?: boolean;
  tools?: ToolDefinition[];
  onChunk?: (chunk: string) => void;
  signal?: AbortSignal;
}

export interface ChatResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage?: UsageInfo;
}

export interface IChatProvider {
  request(options: ChatRequestOptions): Promise<ChatResponse>;
}

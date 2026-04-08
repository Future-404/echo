import type { IChatProvider } from './base';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { GeminiProvider } from './gemini';

export type ProviderFormat = 'openai' | 'anthropic' | 'gemini';

export class ProviderFactory {
  static getProvider(format: ProviderFormat): IChatProvider {
    switch (format) {
      case 'openai':
        return new OpenAIProvider();
      case 'anthropic':
        return new AnthropicProvider();
      case 'gemini':
        return new GeminiProvider();
      default:
        return new OpenAIProvider();
    }
  }
}

export type { IChatProvider };
export * from './openai';
export * from './anthropic';
export * from './gemini';

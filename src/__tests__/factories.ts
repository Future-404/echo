import type { Provider, CharacterCard, Message } from '../store/useAppStore';

export const createMockProvider = (overrides: Partial<Provider> = {}): Provider => ({
  id: 'test-provider',
  name: 'Test Provider',
  apiKey: 'sk-test-key',
  endpoint: 'https://api.test.com',
  model: 'gpt-3.5-turbo',
  type: 'chat',
  apiFormat: 'openai',
  ...overrides
});

export const createMockCharacter = (overrides: Partial<CharacterCard> = {}): CharacterCard => ({
  id: 'test-char',
  name: 'Test Character',
  image: '',
  description: 'Test description',
  systemPrompt: 'You are a test assistant.',
  ...overrides
});

export const createMockMessage = (overrides: Partial<Message> = {}): Message => ({
  role: 'user',
  content: 'Hello world',
  ...overrides
});

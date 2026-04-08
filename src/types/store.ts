import type { 
  CharacterCard, 
  Message, 
  WorldBookEntry, 
  Directive, 
  Mission, 
  RegexRule,
  UserPersona,
  TagTemplate,
  CharacterAsset
} from './chat';

export interface WorldBook {
  id: string;
  name: string;
  scanDepth?: number;
  entries: WorldBookEntry[];
}

export interface Provider { 
  id: string; 
  name: string; 
  apiKey: string; 
  endpoint: string; 
  model: string;
  type: 'chat' | 'embedding' | 'tts'; 
  temperature?: number;
  topP?: number;
  contextWindow?: number;
  stream?: boolean;
  apiFormat?: 'openai' | 'anthropic' | 'gemini';
  customHeaders?: string;
  assistantPrefill?: string;
  // Embedding 专用
  embeddingDimensions?: number;
  // TTS 专用
  ttsVoice?: string;
  ttsFormat?: 'mp3' | 'opus' | 'aac' | 'flac';
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface DebugEntry {
  id: string;
  timestamp: number;
  direction: 'OUT' | 'IN' | 'ERR';
  label: string;
  data: any;
}

export interface SaveSlot {
  id: string;
  name?: string;
  timestamp: number;
  characterId: string;
  secondaryCharacterId?: string;
  messages: Message[];
  summary: string;
  missions: Mission[];
  fragments: string[];
}

export interface TtsSettings {
  enabled: boolean;
  provider: 'edge' | 'openai' | 'browser' | 'elevenlabs';
  autoSpeak: boolean;
  voiceMap: Record<string, string>;
  globalSettings: {
    speed: number;
    pitch: number;
    // ElevenLabs 独立配置（未迁移到 Provider 体系时使用）
    apiKey?: string;
    elevenlabsModel?: string;
  }
}

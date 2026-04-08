export interface TagTemplate {
  id: string;
  name: string;
  fields: string[];
  originalRegex?: string;
  replaceString?: string;
  enabled: boolean;
  placement?: number[]; 
}

export type CharacterAsset = {
  type: 'icon' | 'background' | 'emotion' | string;
  uri: string;
  name: string;
  ext: string;
}

export interface Mission { id: string; title: string; type: 'MAIN' | 'SIDE'; progress: number; status: 'ACTIVE' | 'COMPLETED' | 'FAILED'; description?: string }
export interface Directive { id: string; title: string; content: string; enabled: boolean }
export interface WorldBookEntry {
  id: string;
  keys: string[];
  content: string;
  enabled: boolean;
  constant?: boolean;
  insertionOrder?: number;
  position?: 0 | 1 | 4; 
  depth?: number;
  comment?: string;
  extensions?: Record<string, any>;
}

export type CharacterCard = { 
  id: string; 
  name: string; 
  image: string; 
  description: string; 
  systemPrompt: string; 
  scenario?: string;
  postHistoryInstructions?: string;
  alternateGreetings?: string[];
  greeting?: string;
  attributes?: Record<string, any>;
  providerId?: string;
  bodyEngine?: 'vn' | 'markdown' | 'plain';
  widgetEngine?: 'xml' | 'html' | 'st-card' | 'none';
  depthPrompt?: { content: string; depth: number; role: 'system' | 'user' | 'assistant' };
  extensions?: {
    missions?: Mission[];
    directives?: Directive[];
    worldBook?: WorldBookEntry[];
    worldBookIds?: string[];
    tagTemplates?: TagTemplate[];
    luminescence?: any;
    assets?: CharacterAsset[];
    activeEmotion?: string;
    activeBackground?: string;
  }
}

export interface Message { 
  role: 'user' | 'assistant' | 'system' | 'tool'; 
  content: string; 
  tool_call_id?: string; 
  name?: string;
  tool_calls?: any[];
  isGreeting?: boolean;
  speakerId?: string; 
  images?: string[]; 
}

export interface UserPersona {
  id: string;
  name: string;
  description: string;
  background: string;
  surname?: string;
  nickname?: string;
}

export interface RegexRule {
  id: string;
  name: string;
  regex: string;
  replacement: string;
  flags: string;
  enabled: boolean;
  runOn: ('ui' | 'ai' | 'user')[];
  priority?: number;
}

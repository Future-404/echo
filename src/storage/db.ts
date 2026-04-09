import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { CharacterCard, Message, Mission } from '../types/chat';

// ─── 消息表结构 ────────────────────────────────────────────────────────────
export interface DBMessage extends Message {
  id?: number; 
  slotId: string; 
  timestamp: number;
  vState?: number; // 0: 活跃中, 1: 待蒸馏(已被裁切), 2: 已结晶(已存入Episode)
}

// ─── 记忆结晶表结构 (海马体核心) ──────────────────────────────────────────────
export interface DBMemoryEpisode {
  id?: number;
  slotId: string;
  
  // 1. 原子命题层 (Atomic Propositions) - 用于最高精度细节召回
  atomic: {
    text: string;
    importance: '高' | '中' | '低';
    vector: Float32Array; // 命题级向量
  }[];

  // 2. 叙事块层 (Narrative Chunk) - 用于上下文连贯召回
  narrative: string;
  narrativeVector: Float32Array; // 叙事级向量 (主索引)

  // 3. 元数据层 - 用于精确过滤与管理
  tags: string[];
  originalMsgIds: number[]; // 关联的原始消息 ID
  timestamp: number;
  importanceScore: number;   // 综合重要度 (0.0 - 1.0)
}

export interface DBSaveSlot {
  id: string; 
  name?: string;
  timestamp: number;
  characterId: string;
  secondaryCharacterId?: string;
  summary: string;
  missions: Mission[];
  fragments: string[];
}

export interface DBKVStore {
  key: string;
  value: any;
}

export interface DBWorldEntry {
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
  ownerId: string; 
  updatedAt: number;
}

export interface DBPresetEntry {
  id: string;
  presetId: string;
  title: string;
  content: string;
  enabled: boolean;
  depth?: number;
  role?: 'system' | 'user' | 'assistant';
}

export interface DBCharacter extends CharacterCard {
  updatedAt: number;
}

// ─── 数据库定义 ────────────────────────────────────────────────────────────
export class EchoDatabase extends Dexie {
  characters!: Table<DBCharacter>;
  messages!: Table<DBMessage>;
  saveSlots!: Table<DBSaveSlot>;
  worldEntries!: Table<DBWorldEntry>;
  memoryEpisodes!: Table<DBMemoryEpisode>;
  kvStore!: Table<DBKVStore>;
  promptPresetEntries!: Table<DBPresetEntry>;

  constructor() {
    super('EchoDatabase');
    
    this.version(4).stores({
      characters: 'id, name, updatedAt',
      messages: '++id, slotId, timestamp, vState',
      saveSlots: 'id, characterId, timestamp',
      worldEntries: 'id, ownerId, *keys', 
      memoryEpisodes: '++id, slotId, timestamp, *tags',
      kvStore: 'key'
    });

    this.version(5).stores({
      characters: 'id, name, updatedAt',
      messages: '++id, slotId, timestamp, vState',
      saveSlots: 'id, characterId, timestamp',
      worldEntries: 'id, ownerId, *keys',
      memoryEpisodes: '++id, slotId, timestamp, *tags',
      kvStore: 'key',
      promptPresetEntries: 'id, presetId'
    });
  }

  async getMessagesBySlot(slotId: string) {
    return this.messages.where('slotId').equals(slotId).sortBy('timestamp');
  }

  async saveMessages(slotId: string, msgs: Message[]) {
    const dbMsgs = msgs.map((m, i) => ({ ...m, slotId, timestamp: Date.now() + i }));
    await this.transaction('rw', this.messages, async () => {
      await this.messages.where('slotId').equals(slotId).delete();
      await this.messages.bulkAdd(dbMsgs);
    });
  }
}

export const db = new EchoDatabase();

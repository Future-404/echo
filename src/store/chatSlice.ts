import type { CharacterCard, Message, Mission, SaveSlot } from '../types/chat';
import { db } from '../storage/db';

export interface ChatSlice {
  messages: Message[];
  isTyping: boolean;
  isGreetingSession: boolean;
  missions: Mission[];
  fragments: string[];
  currentAutoSlotId: string | null;
  hasMoreOlder: boolean; 
  activeAudioId: string | null; 
  abortController: AbortController | null;

  addMessage: (msg: Message, targetSlotId?: string) => Promise<void>;
  loadInitialMessages: (slotId: string) => Promise<void>;
  fetchOlderMessages: () => Promise<void>;
  clearMessages: () => void;
  rollbackMessages: (messageId: number | undefined, shouldBranch?: boolean) => Promise<void>;
  setIsTyping: (typing: boolean) => void;
  setActiveAudioId: (id: string | null) => void;
  setAbortController: (controller: AbortController | null) => void;
  stopGeneration: () => void;
  setMissions: (missions: Mission[]) => void;
  setIsGreetingSession: (isGreeting: boolean) => void;
  updateMission: (id: string, updates: Partial<Mission>) => void;
  addFragment: (text: string) => void;
}

export const createChatSlice = (set: any, get: any): ChatSlice => ({
  messages: [],
  isTyping: false,
  isGreetingSession: false,
  missions: [],
  fragments: [],
  currentAutoSlotId: null,
  hasMoreOlder: false,
  activeAudioId: null,
  abortController: null,

  addMessage: async (msg, targetSlotId) => {
    const state = get();
    // 优先使用传入的 targetSlotId，否则使用当前全局 slotId
    const slotId = targetSlotId || state.currentAutoSlotId || `auto_${Date.now()}`;
    if (!state.currentAutoSlotId && !targetSlotId) set({ currentAutoSlotId: slotId });

    // 1. 异步写入数据库 (精准定向写入)
    await db.messages.add({ ...msg, slotId, timestamp: Date.now() });

    // 2. 只有当写入的目标是当前正在查看的存档时，才更新内存窗口
    if (slotId === state.currentAutoSlotId) {
      set((s: any) => {
        const newMsgs = [...s.messages, msg];
        const windowedMsgs = newMsgs.length > 50 ? newMsgs.slice(-50) : newMsgs;
        return { 
          messages: windowedMsgs,
          hasMoreOlder: s.hasMoreOlder || newMsgs.length > 50
        };
      });
    }

    // 3. 更新存档元数据 (摘要、时间戳)
    const lastMsg = msg.content;
    const autoSlot: SaveSlot = {
      id: slotId,
      timestamp: Date.now(),
      characterId: state.selectedCharacter.id,
      messages: [], 
      summary: `[自动] ${lastMsg.slice(0, 40)}${lastMsg.length > 40 ? '...' : ''}`,
      missions: state.missions,
      fragments: state.fragments
    };
    
    set((s: any) => {
      const slots = s.saveSlots || [];
      const updatedSlots = slots.some((sl: any) => sl.id === slotId)
        ? slots.map((sl: any) => sl.id === slotId ? { ...sl, ...autoSlot } : sl)
        : [autoSlot, ...slots];
      return { saveSlots: updatedSlots.slice(0, 50) };
    });
  },

  loadInitialMessages: async (slotId) => {
    // 从数据库拉取最后 30 条
    const allMsgs = await db.messages.where('slotId').equals(slotId).sortBy('timestamp');
    const initial = allMsgs.slice(-30);
    set({ 
      messages: initial, 
      hasMoreOlder: allMsgs.length > 30,
      currentAutoSlotId: slotId 
    });
  },

  fetchOlderMessages: async () => {
    const state = get();
    if (!state.currentAutoSlotId || !state.hasMoreOlder) return;

    // 获取当前内存中最老消息的时间戳
    const firstMsg = state.messages[0];
    const slotId = state.currentAutoSlotId;

    // 查找更早的消息
    const older = await db.messages
      .where('slotId').equals(slotId)
      .filter(m => m.timestamp < (firstMsg as any).timestamp)
      .reverse()
      .limit(30)
      .toArray();

    if (older.length > 0) {
      set((s: any) => ({
        messages: [...older.reverse(), ...s.messages],
        hasMoreOlder: older.length === 30
      }));
    } else {
      set({ hasMoreOlder: false });
    }
  },

  clearMessages: () => set({ messages: [] }),

  rollbackMessages: async (messageId, shouldBranch = false) => {
    const state = get();
    if (messageId === undefined) return;

    // 1. 获取目标消息的确切元数据 (通过 ID)
    const targetMsg = await db.messages.get(messageId);
    if (!targetMsg) {
      console.warn('[Rollback] 目标消息不存在于数据库中:', messageId);
      return;
    }

    // 2. 数据库回滚：物理删除该消息之后的所有记录
    await db.messages
      .where('slotId').equals(state.currentAutoSlotId || '')
      .filter(m => m.timestamp > targetMsg.timestamp)
      .delete();

    // 3. 内存窗口回滚：找到内存中对应的那条消息并截断
    set((s: any) => {
      const memoryIdx = s.messages.findIndex((m: any) => (m as any).timestamp === targetMsg.timestamp);
      if (memoryIdx === -1) {
        // 极端情况：消息已在内存窗口外（通过分页加载又滚远了）
        // 此时重新从库里加载最后 30 条作为补偿
        db.messages.where('slotId').equals(state.currentAutoSlotId || '').sortBy('timestamp').then(all => {
          set({ messages: all.slice(-30), hasMoreOlder: all.length > 30 });
        });
        return { currentAutoSlotId: shouldBranch ? null : state.currentAutoSlotId };
      }
      return {
        messages: s.messages.slice(0, memoryIdx + 1),
        currentAutoSlotId: shouldBranch ? null : state.currentAutoSlotId
      };
    });
  },

  setIsTyping: (typing) => set({ isTyping: typing }),

  setActiveAudioId: (id) => set({ activeAudioId: id }),

  setAbortController: (controller) => set({ abortController: controller }),

  stopGeneration: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
      set({ abortController: null, isTyping: false });
    }
  },

  setMissions: (missions) => set({ missions }),

  setIsGreetingSession: (isGreeting) => set({ isGreetingSession: isGreeting }),

  updateMission: (id, updates) => {
    set((state: any) => ({ missions: (state.missions || []).map((m: Mission) => m.id === id ? { ...m, ...updates } : m) }));
  },

  addFragment: (text) => set((state: any) => ({ fragments: [...(state.fragments || []), text] })),
});

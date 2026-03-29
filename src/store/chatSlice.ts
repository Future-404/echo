import type { CharacterCard, Message, Mission, SaveSlot } from './useAppStore'
import { persistSlots, SAVE_KEY } from './saveSlice'

export interface ChatSlice {
  messages: Message[];
  isTyping: boolean;
  isGreetingSession: boolean;
  missions: Mission[];
  fragments: string[];
  currentAutoSlotId: string | null;
  _autoSaveTimer: ReturnType<typeof setTimeout> | null;

  addMessage: (msg: Message) => void;
  clearMessages: () => void;
  rollbackMessages: (index: number, shouldBranch?: boolean) => void;
  setIsTyping: (typing: boolean) => void;
  setMissions: (missions: Mission[]) => void;
  updateMission: (id: string, updates: Partial<Mission>) => void;
  addFragment: (text: string) => void;
  autoSave: () => void;
}

export const createChatSlice = (set: any, get: any): ChatSlice => ({
  messages: [],
  isTyping: false,
  isGreetingSession: false,
  missions: [],
  fragments: [],
  currentAutoSlotId: null,
  _autoSaveTimer: null,

  addMessage: (msg) => {
    // 立即更新内存状态以保证 UI 响应
    set((state: any) => ({ messages: [...state.messages, msg] }));
    
    // 防抖处理：1.5s 后执行 autoSave，这不仅会更新 saveSlots 分支，
    // 还会触发 Zustand persist 将完整的 state (包括最新的 messages) 同步到 R2。
    const state = get();
    if (state._autoSaveTimer) clearTimeout(state._autoSaveTimer);
    const timer = setTimeout(() => {
      get().autoSave();
    }, 1500);
    set({ _autoSaveTimer: timer });
  },

  clearMessages: () => set({ messages: [] }),

  rollbackMessages: (index, shouldBranch = false) => {
    const state = get();
    if (state._autoSaveTimer) clearTimeout(state._autoSaveTimer);
    const truncated: Message[] = index < 0 ? [] : state.messages.slice(0, index + 1);

    // 从角色卡初始 missions 出发，重放截断范围内的所有 tool_call
    const baseMissions: Mission[] = state.selectedCharacter.extensions?.missions || [];
    let replayedMissions = baseMissions.map((m: Mission) => ({ ...m }));
    for (const msg of truncated) {
      if (msg.role !== 'assistant' || !msg.tool_calls?.length) continue;
      for (const tc of msg.tool_calls) {
        if (tc.function?.name !== 'manage_quest_state') continue;
        try {
          const args = JSON.parse(tc.function.arguments);
          const { action, quest_id, quest_type, title, description, progress_delta } = args;
          if (action === 'CREATE') {
            const exists = replayedMissions.some(m => m.id === quest_id);
            if (exists) {
              replayedMissions = replayedMissions.map(m => m.id !== quest_id ? m : {
                ...m, description: description || m.description,
                progress: Math.min(100, Math.max(0, m.progress + (progress_delta || 0))),
                status: Math.min(100, m.progress + (progress_delta || 0)) >= 100 ? 'COMPLETED' : 'ACTIVE'
              });
            } else {
              const p = Math.min(100, Math.max(0, progress_delta || 0));
              replayedMissions.push({ id: quest_id, title: title || '新任务', description, type: quest_type || (quest_id.startsWith('main_') ? 'MAIN' : 'SIDE'), progress: p, status: p >= 100 ? 'COMPLETED' : 'ACTIVE' });
            }
          } else if (action === 'UPDATE') {
            replayedMissions = replayedMissions.map(m => m.id !== quest_id ? m : {
              ...m, description: description || m.description,
              progress: Math.min(100, Math.max(0, m.progress + (progress_delta || 0))),
              status: Math.min(100, m.progress + (progress_delta || 0)) >= 100 ? 'COMPLETED' : 'ACTIVE'
            });
          } else if (action === 'RESOLVE') {
            replayedMissions = replayedMissions.map(m => m.id !== quest_id ? m : { ...m, progress: 100, status: 'COMPLETED' });
          } else if (action === 'FAIL') {
            replayedMissions = replayedMissions.map(m => m.id !== quest_id ? m : { ...m, status: 'FAILED' });
          }
        } catch { /* malformed args, skip */ }
      }
    }

    set((s: any) => ({
      messages: truncated,
      missions: replayedMissions,
      isTyping: false,
      currentAutoSlotId: shouldBranch ? null : s.currentAutoSlotId,
      _autoSaveTimer: null
    }));
    get().autoSave();
  },

  setIsTyping: (typing) => set({ isTyping: typing }),

  setMissions: (missions) => set({ missions }),

  updateMission: (id, updates) => {
    set((state: any) => ({ missions: (state.missions || []).map((m: Mission) => m.id === id ? { ...m, ...updates } : m) }));
    get().autoSave();
  },

  addFragment: (text) => set((state: any) => ({ fragments: [...(state.fragments || []), text] })),

  autoSave: () => {
    const state = get();
    if (state.messages.length === 0) return;
    const lastMsg = state.messages[state.messages.length - 1].content;
    let autoId = state.currentAutoSlotId;
    if (!autoId) {
      autoId = `auto_${Date.now()}`;
      set({ currentAutoSlotId: autoId });
    }
    const existingAutoSlot = (state.saveSlots || []).find((s: SaveSlot) => s.id === autoId);
    const autoSlot: SaveSlot = {
      id: autoId,
      name: existingAutoSlot?.name,
      timestamp: Date.now(),
      characterId: state.selectedCharacter.id,
      messages: state.messages,
      summary: `[自动] ${lastMsg.slice(0, 40)}${lastMsg.length > 40 ? '...' : ''}`,
      missions: state.missions,
      fragments: state.fragments
    };
    set((s: any) => {
      const slots = s.saveSlots || [];
      const otherAutoSlots = slots.filter((slot: SaveSlot) => slot.id.startsWith('auto_') && slot.id !== autoId);
      const manualSlots = slots.filter((slot: SaveSlot) => !slot.id.startsWith('auto_'));
      const limitedAutoSlots = [autoSlot, ...otherAutoSlots].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
      const finalSlots = [...limitedAutoSlots, ...manualSlots];
      persistSlots(SAVE_KEY, finalSlots);
      return { saveSlots: finalSlots };
    });
  },
});

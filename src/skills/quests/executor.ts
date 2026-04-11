import { useAppStore } from '../../store/useAppStore';
import type { Mission } from '../../store/useAppStore';
import type { SkillExecuteResult } from '../core/types';

export const executeQuestSkill = (args: any, _ctx?: any): SkillExecuteResult => {
  const { action, quest_id, quest_type, title, description, progress_delta, ui_toast } = args;

  if (action === 'CREATE') {
    const exists = useAppStore.getState().missions.some((m: Mission) => m.id === quest_id);
    if (exists) {
      // id 已存在，降级为 UPDATE
      useAppStore.setState(s => ({
        missions: s.missions.map((m: Mission) => {
          if (m.id !== quest_id) return m;
          const newProgress = Math.min(100, Math.max(0, m.progress + (progress_delta || 0)));
          return { ...m, progress: newProgress, description: description || m.description, status: newProgress >= 100 ? 'COMPLETED' : 'ACTIVE' };
        })
      }));
    } else {
      const newQuest: Mission = {
        id: quest_id,
        title: title || '新任务',
        description,
        type: quest_type || (quest_id.startsWith('main_') ? 'MAIN' : 'SIDE'),
        progress: Math.min(100, Math.max(0, progress_delta || 0)),
        status: 'ACTIVE'
      };
      useAppStore.setState(s => ({ missions: [...s.missions, newQuest] }));
    }
  }
  else if (action === 'UPDATE') {
    const exists = useAppStore.getState().missions.some((m: Mission) => m.id === quest_id);
    if (!exists) return { success: false, message: `Quest not found: ${quest_id}` };
    useAppStore.setState(s => ({
      missions: s.missions.map((m: Mission) => {
        if (m.id !== quest_id) return m;
        const newProgress = Math.min(100, Math.max(0, m.progress + (progress_delta || 0)));
        return { ...m, progress: newProgress, description: description || m.description, status: newProgress >= 100 ? 'COMPLETED' : 'ACTIVE' };
      })
    }));
  }
  else if (action === 'RESOLVE') {
    const exists = useAppStore.getState().missions.some((m: Mission) => m.id === quest_id);
    if (!exists) return { success: false, message: `Quest not found: ${quest_id}` };
    useAppStore.setState(s => ({
      missions: s.missions.map((m: Mission) => m.id === quest_id ? { ...m, progress: 100, status: 'COMPLETED' } : m)
    }));
  }
  else if (action === 'FAIL') {
    const exists = useAppStore.getState().missions.some((m: Mission) => m.id === quest_id);
    if (!exists) return { success: false, message: `Quest not found: ${quest_id}` };
    useAppStore.setState(s => ({
      missions: s.missions.map((m: Mission) => m.id === quest_id ? { ...m, status: 'FAILED' } : m)
    }));
  }

  if (ui_toast) {
    useAppStore.getState().addFragment(ui_toast);
  }

  return { success: true, message: `${action} executed for ${quest_id}` };
};

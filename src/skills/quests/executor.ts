import { useAppStore } from '../../store/useAppStore';
import type { Mission } from '../../store/useAppStore';

export const executeQuestSkill = (args: any) => {
  const state = useAppStore.getState();
  const { action, quest_id, quest_type, title, description, progress_delta, ui_toast } = args;
  
  if (action === 'CREATE') {
    const newQuest: Mission = {
      id: quest_id,
      title: title || '新任务',
      description: description,
      type: quest_type || (quest_id.startsWith('main_') ? 'MAIN' : 'SIDE'),
      progress: Math.max(0, progress_delta || 0),
      status: 'ACTIVE'
    };
    state.setMissions([...state.missions, newQuest]);
  } 
  else if (action === 'UPDATE') {
    const quest = state.missions.find((m: Mission) => m.id === quest_id);
    if (quest) {
      const newProgress = Math.min(100, Math.max(0, quest.progress + (progress_delta || 0)));
      state.updateMission(quest_id, { 
        progress: newProgress,
        description: description || quest.description,
        status: newProgress >= 100 ? 'COMPLETED' : 'ACTIVE'
      });
    }
  }
  else if (action === 'RESOLVE') {
    state.updateMission(quest_id, { progress: 100, status: 'COMPLETED' });
  }

  if (ui_toast) {
    state.addFragment(ui_toast);
  }
  
  return `Success: ${action} executed for ${quest_id}`;
};

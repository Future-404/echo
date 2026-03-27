import { getStorageAdapter } from '../storage'

export const STORE_KEY = 'echo-storage-v16'

// 直接將完整 partialize 數據寫入 KV，不做 read-modify-write
export async function forcePersist(get: () => any) {
  const state = get()
  const data = {
    state: {
      config: state.config,
      currentView: state.currentView,
      characters: (state.characters || []).map((c: any) =>
        c.id.startsWith('custom-') ? { ...c, image: '' } : c
      ),
      selectedCharacter: state.selectedCharacter?.id?.startsWith('custom-')
        ? { ...state.selectedCharacter, image: '' }
        : state.selectedCharacter,
      secondaryCharacter: state.secondaryCharacter
        ? (state.secondaryCharacter.id.startsWith('custom-') ? { ...state.secondaryCharacter, image: '' } : state.secondaryCharacter)
        : null,
      routerProviderId: state.routerProviderId,
      multiCharMode: state.multiCharMode,
      multiSaveSlots: state.multiSaveSlots,
      messages: state.messages,
      isGreetingSession: state.isGreetingSession,
      missions: state.missions,
      fragments: state.fragments,
      saveSlots: state.saveSlots,
    },
    version: 0,
  }
  await getStorageAdapter().setItem(STORE_KEY, JSON.stringify(data))
}

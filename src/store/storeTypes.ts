// 聚合所有 slice 类型，供 StateCreator 泛型使用，避免循环依赖
import type { ChatSlice } from './chatSlice'
import type { CharacterSlice } from './characterSlice'
import type { ConfigSlice } from './configSlice'
import type { SaveSlice } from './saveSlice'
import type { UISlice } from './uiSlice'

export interface AppState extends ChatSlice, CharacterSlice, ConfigSlice, SaveSlice, UISlice {
  _hasHydrated: boolean
  setHasHydrated: (val: boolean) => void
}

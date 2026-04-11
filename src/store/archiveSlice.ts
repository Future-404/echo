import type { StateCreator } from 'zustand'

export interface CharacterStat {
  messageCount: number
  lastInteraction: number
  firstInteraction: number
}

export interface ArchiveStats {
  characterStats: Record<string, CharacterStat>
  globalStats: {
    totalMessages: number
    userMessages: number
    aiMessages: number
    firstUseDate: number
    totalDays: number
    lastActiveDate: number
  }
  activeDates: string[]
}

export interface ArchiveSlice {
  archiveStats: ArchiveStats
  updateCharacterStat: (characterId: string, increment?: number) => void
  updateGlobalStats: (isUserMessage: boolean) => void
  initializeArchiveStats: () => void
  rebuildArchiveStats: () => Promise<void>
}

export const createArchiveSlice: StateCreator<ArchiveSlice> = (set, get) => ({
  archiveStats: {
    characterStats: {},
    globalStats: {
      totalMessages: 0,
      userMessages: 0,
      aiMessages: 0,
      firstUseDate: Date.now(),
      totalDays: 1,
      lastActiveDate: Date.now()
    },
    activeDates: [new Date().toISOString().split('T')[0]]
  },

  updateCharacterStat: (characterId: string, increment = 1) => {
    set(state => {
      const existing = state.archiveStats.characterStats[characterId]
      const now = Date.now()
      return {
        archiveStats: {
          ...state.archiveStats,
          characterStats: {
            ...state.archiveStats.characterStats,
            [characterId]: {
              messageCount: (existing?.messageCount || 0) + increment,
              lastInteraction: now,
              firstInteraction: existing?.firstInteraction || now
            }
          }
        }
      }
    })
  },

  updateGlobalStats: (isUserMessage: boolean) => {
    set(state => {
      const today = new Date().toISOString().split('T')[0]
      const activeDates = state.archiveStats.activeDates.includes(today)
        ? state.archiveStats.activeDates
        : [...state.archiveStats.activeDates, today]

      return {
        archiveStats: {
          ...state.archiveStats,
          globalStats: {
            ...state.archiveStats.globalStats,
            totalMessages: state.archiveStats.globalStats.totalMessages + 1,
            userMessages: state.archiveStats.globalStats.userMessages + (isUserMessage ? 1 : 0),
            aiMessages: state.archiveStats.globalStats.aiMessages + (isUserMessage ? 0 : 1),
            totalDays: activeDates.length,
            lastActiveDate: Date.now()
          },
          activeDates
        }
      }
    })
  },

  initializeArchiveStats: () => {
    const today = new Date().toISOString().split('T')[0]
    set(state => {
      if (!state.archiveStats.activeDates.includes(today)) {
        return {
          archiveStats: {
            ...state.archiveStats,
            activeDates: [...state.archiveStats.activeDates, today],
            globalStats: {
              ...state.archiveStats.globalStats,
              totalDays: state.archiveStats.activeDates.length + 1
            }
          }
        }
      }
      return state
    })
  },

  // 从数据库回溯统计历史消息（优化：使用索引查询）
  rebuildArchiveStats: async () => {
    const { db } = await import('../storage/db')
    
    // 优化：使用 Dexie 的批量操作和索引
    const [allMessages, totalCount] = await Promise.all([
      db.messages.toArray(),
      db.messages.count()
    ])
    
    // 优化：使用 reduce 替代 forEach，减少中间变量
    const { characterStats, userMessages, aiMessages } = allMessages.reduce((acc, msg) => {
      // 统计角色消息
      if (msg.speakerId) {
        if (!acc.characterStats[msg.speakerId]) {
          acc.characterStats[msg.speakerId] = {
            messageCount: 0,
            firstInteraction: msg.timestamp || Date.now(),
            lastInteraction: msg.timestamp || Date.now()
          }
        }
        acc.characterStats[msg.speakerId].messageCount++
        acc.characterStats[msg.speakerId].lastInteraction = msg.timestamp || Date.now()
      }
      
      // 统计用户/AI消息
      if (msg.role === 'user') acc.userMessages++
      else if (msg.role === 'assistant') acc.aiMessages++
      
      return acc
    }, { characterStats: {} as Record<string, CharacterStat>, userMessages: 0, aiMessages: 0 })
    
    set(state => ({
      archiveStats: {
        ...state.archiveStats,
        characterStats,
        globalStats: {
          ...state.archiveStats.globalStats,
          totalMessages: allMessages.length,
          userMessages,
          aiMessages
        }
      }
    }))
  }
})

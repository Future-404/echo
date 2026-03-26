import { describe, it, expect, vi, beforeEach } from 'vitest'

// 1. Mock 存储适配器
vi.mock('../storage', () => ({
  getStorageAdapter: () => ({
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
    removeItem: vi.fn(() => Promise.resolve()),
  })
}))

import { useAppStore } from './useAppStore'

describe('useAppStore (状态管理) 测试', () => {
  beforeEach(() => {
    // 每次测试前重置 Store 状态 (手动重置重要字段)
    useAppStore.setState({
      messages: [],
      multiCharMode: false,
      secondaryCharacter: null,
      currentView: 'home'
    })
  })

  it('应该能正确添加消息', () => {
    const { addMessage } = useAppStore.getState()
    
    addMessage({ role: 'user', content: 'Hello' })
    
    const state = useAppStore.getState()
    expect(state.messages).toHaveLength(1)
    expect(state.messages[0].content).toBe('Hello')
  })

  it('切换视图时应该正确更新 currentView', () => {
    const { setCurrentView } = useAppStore.getState()
    
    setCurrentView('main')
    expect(useAppStore.getState().currentView).toBe('main')
  })

  it('应该能正确开启/关闭多角色模式', () => {
    const { setMultiCharMode } = useAppStore.getState()
    
    setMultiCharMode(true)
    expect(useAppStore.getState().multiCharMode).toBe(true)
  })

  describe('持久化过滤逻辑', () => {
    it('应该根据 partialize 逻辑过滤掉自定义角色的图片', async () => {
      // 获取 Mock 的存储适配器
      const { getStorageAdapter } = await import('../storage')
      const mockSetItem = getStorageAdapter().setItem as any

      // 确保 Store 已经初始化并 Hydrated
      // Zustand persist 默认是异步加载初始数据的
      if (!useAppStore.getState()._hasHydrated) {
        useAppStore.getState().setHasHydrated(true)
      }

      // 准备测试数据
      // 我们需要确保 selectedCharacter 的结构完整，以通过可能的类型检查
      const customChar = { 
        id: 'custom-123', 
        name: '自建角色', 
        image: 'data:image/png;base64,DATA',
        description: 'desc',
        systemPrompt: 'prompt',
        extensions: {}
      }
      
      // 显式触发更新
      useAppStore.setState({
        selectedCharacter: customChar as any,
        // 为了确保触发 persist，我们修改一个肯定会被持久化的字段
        messages: [{ role: 'system', content: 'trigger_persist' }]
      })

      // 等待微任务队列清空，给 Zustand 持久化留出时间
      await new Promise(resolve => setTimeout(resolve, 50))

      // 如果 mockSetItem 还是没被调用，我们检查是否是因为 Zustand 认为状态没变
      // 实际上，只要 setState 被调用且数据不同，persist 就应该触发
      expect(mockSetItem).toHaveBeenCalled()
      
      const lastCallArgs = mockSetItem.mock.calls[mockSetItem.mock.calls.length - 1]
      const savedState = JSON.parse(lastCallArgs[1]).state
      
      expect(savedState.selectedCharacter.image).toBe('')
    })
  })
})

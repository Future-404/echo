import { describe, it, expect, vi } from 'vitest'
import { extractAndSyncTags, applyCharacterRegexScripts } from './tagParser'
import type { CharacterCard } from '../store/useAppStore'

describe('tagParser (标签与状态解析) 测试', () => {
  const mockChar: CharacterCard = {
    id: 'char1',
    name: '测试角色',
    image: '',
    description: '',
    systemPrompt: '',
    extensions: {
      tagTemplates: [
        {
          id: 'tpl1',
          name: '好感度模板',
          originalRegex: '\\[trust:(\\d+)\\]',
          replaceString: '❤️ 好感度: $1',
          enabled: true,
          fields: ['trust']
        }
      ]
    }
  }

  describe('extractAndSyncTags', () => {
    it('应该能从 <status> 标签内的 Markdown 表格中提取数据', () => {
      const text = `
        你好！
        <status>
        | 属性 | 数值 |
        | --- | --- |
        | 信任度 | 85 |
        | 心情 | 愉快 |
        </status>
      `
      const mockUpdate = vi.fn()
      extractAndSyncTags(text, mockChar, mockUpdate)

      expect(mockUpdate).toHaveBeenCalledWith('char1', expect.objectContaining({
        '信任度': '85',
        '心情': '愉快'
      }))
    })

    it('验证提取逻辑与转换逻辑的执行顺序问题', () => {
      const text = "这是一段对话 [trust:99]"
      const mockUpdate = vi.fn()
      
      // 我们手动检查：如果先转换，文本会变成什么
      const processed = applyCharacterRegexScripts(text, mockChar)
      expect(processed).toBe("这是一段对话 ❤️ 好感度: 99")

      // 现在运行提取逻辑
      extractAndSyncTags(text, mockChar, mockUpdate)
      
      // 如果这里失败，说明 extractAndSyncTags 内部逻辑确实被 applyCharacterRegexScripts 的副作用干扰了
      expect(mockUpdate).toHaveBeenCalledWith('char1', expect.objectContaining({
        'trust': '99'
      }))
    })

    it('应该能处理 <status-container> 嵌套标签', () => {
      const text = `
        <status-container>
          <energy>100</energy>
          <health>80</health>
        </status-container>
      `
      const mockUpdate = vi.fn()
      extractAndSyncTags(text, mockChar, mockUpdate)

      expect(mockUpdate).toHaveBeenCalledWith('char1', expect.objectContaining({
        'energy': '100',
        'health': '80'
      }))
    })
  })

  describe('applyCharacterRegexScripts', () => {
    it('应该根据模板将文本中的 [trust:50] 转换为可视字符串', () => {
      const text = "当前的信任状态是 [trust:70]"
      const result = applyCharacterRegexScripts(text, mockChar)
      expect(result).toBe("当前的信任状态是 ❤️ 好感度: 70")
    })

    it('应该支持 hideFromChat 属性隐藏特定的正则匹配内容', () => {
      const customParsers = [{
        id: 'p1',
        name: '系统指令隐藏',
        triggerRegex: '\\[SYS:.*?\\]',
        hideFromChat: true,
        enabled: true,
        fields: []
      }]
      const text = "显示这段文字 [SYS: 隐藏这段文字]"
      const result = applyCharacterRegexScripts(text, mockChar, customParsers)
      expect(result).toBe("显示这段文字 ")
    })
  })
})

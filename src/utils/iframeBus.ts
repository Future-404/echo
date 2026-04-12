// 轻量级事件总线，用于 iframe <-> useChat 的跨组件通信
type Handler = (text: string, hidden?: boolean, injectOnly?: boolean) => void
type ErrorHandler = (msg: string) => void
type EventType = 'ON_MESSAGE' | 'ON_CHARACTER_SWITCH' | 'ON_STATE_CHANGE' | 'ON_ATTRS_UPDATED'
type EventHandler = (data: any) => void

let _handler: Handler | null = null
const _errorHandlers = new Set<ErrorHandler>()
const _eventSubscribers = new Map<EventType, Set<EventHandler>>()

export const iframeBus = {
  // iframe -> 主程序：发送消息
  emit: (text: string, hidden?: boolean, injectOnly?: boolean) => _handler?.(text, hidden, injectOnly),
  setHandler: (fn: Handler | null) => { _handler = fn },

  // 主程序 -> 所有活跃 iframe：错误广播
  emitError: (msg: string) => _errorHandlers.forEach(fn => fn(msg)),
  subscribeError: (fn: ErrorHandler) => {
    _errorHandlers.add(fn)
    return () => _errorHandlers.delete(fn)
  },

  // 主程序 -> 所有活跃 iframe：通用事件广播
  emitEvent: (type: EventType, data: any) => {
    const subs = _eventSubscribers.get(type)
    if (subs) subs.forEach(fn => fn(data))
  },
  subscribeEvent: (type: EventType, fn: EventHandler) => {
    if (!_eventSubscribers.has(type)) _eventSubscribers.set(type, new Set())
    _eventSubscribers.get(type)!.add(fn)
    return () => _eventSubscribers.get(type)?.delete(fn)
  }
}

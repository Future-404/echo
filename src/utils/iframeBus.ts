// 轻量级事件总线，用于 iframe → useChat 的跨组件通信
type Handler = (text: string) => void
let _handler: Handler | null = null

export const iframeBus = {
  emit: (text: string) => _handler?.(text),
  setHandler: (fn: Handler | null) => { _handler = fn },
}

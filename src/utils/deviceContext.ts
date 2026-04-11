export interface DeviceContext {
  localTime: string
  weekday: string
  batteryLevel?: string
  isCharging?: string
  networkType?: string
}

export const collectDeviceContext = async (): Promise<DeviceContext> => {
  const now = new Date()
  const ctx: DeviceContext = {
    localTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    weekday: now.toLocaleDateString(undefined, { weekday: 'long' }),
  }

  try {
    if ('getBattery' in navigator) {
      const battery = await (navigator as any).getBattery()
      ctx.batteryLevel = `${Math.floor(battery.level * 100)}%`
      ctx.isCharging = battery.charging ? '正在充电' : '消耗电池中'
    }
  } catch { /* ignore */ }

  try {
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    if (conn) ctx.networkType = conn.effectiveType || '未知'
  } catch { /* ignore */ }

  return ctx
}

export const formatDeviceContext = (ctx: DeviceContext): string => {
  const lines = [
    `- 当前时间：${ctx.weekday} ${ctx.localTime}`,
    ctx.batteryLevel ? `- 电量：${ctx.batteryLevel}（${ctx.isCharging}）` : null,
    ctx.networkType ? `- 网络：${ctx.networkType}` : null,
  ].filter(Boolean)
  return lines.join('\n')
}

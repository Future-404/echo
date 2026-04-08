import type { SkillExecuteResult } from '../core/types';

/**
 * 设备感知技能执行器
 */
export const executeDeviceStatus = async (args: { fields?: string[] }): Promise<SkillExecuteResult> => {
  const fields = args.fields || ["battery", "network", "time"];
  const results: Record<string, any> = {};

  try {
    if (fields.includes("time")) {
      const now = new Date();
      results.local_time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      results.weekday = now.toLocaleDateString(undefined, { weekday: 'long' });
    }

    if (fields.includes("battery")) {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        results.battery_level = `${Math.floor(battery.level * 100)}%`;
        results.is_charging = battery.charging ? "正在充电" : "消耗电池中";
      } else {
        results.battery_status = "终端能源接口被屏蔽";
      }
    }

    if (fields.includes("network")) {
      const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (conn) {
        results.network_type = conn.effectiveType || "未知";
        results.connection_quality = conn.saveData ? "低带宽模式" : "连接稳定";
      } else {
        results.network_status = "信号波段处于量子叠加态";
      }
    }

    return {
      success: true,
      message: `【感知同步成功】\n当前终端状态：${JSON.stringify(results)}`,
      data: results
    };
  } catch (e: any) {
    return {
      success: false,
      message: `感知受阻：因环境磁场干扰（${e.message}），无法同步终端状态。`
    };
  }
};

export const deviceSchema = {
  name: "get_device_status",
  description: "读取用户设备状态（电量、网络、本地时间）。用户回应迟缓、提及没电/网络问题，或你想借现实环境展开话题时使用。将数据融入叙事而非直接报数字。",
  parameters: {
    type: "object",
    properties: {
      fields: {
        type: "array",
        items: { type: "string", enum: ["battery", "network", "time"] },
        description: "需要获取的信息类别，默认全部"
      }
    }
  }
};

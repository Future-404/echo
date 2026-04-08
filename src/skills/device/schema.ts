export const deviceSchema = {
  name: "get_device_status",
  description: "【设备感知】主动读取用户当前的设备状态（电量、网络、本地时间）。当你发现用户回应迟缓、信号异常或想要开启相关话题时使用。",
  parameters: {
    type: "object",
    properties: {
      fields: { 
        type: "array", 
        items: { 
          type: "string", 
          enum: ["battery", "network", "time"] 
        },
        description: "想要获取的具体信息类别（可选，默认全部获取）"
      }
    }
  }
};

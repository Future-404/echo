export const questSchema = {
  type: "function",
  function: {
    name: "manage_quest_state",
    description: "追踪长线叙事目标进度。当对话推动关键剧情、触及核心秘密或情感发生实质性转变时调用。同一时间只允许一个 MAIN 目标处于活跃状态。调用工具时必须同时输出叙事文本，不得只调用工具而无回应。",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["CREATE", "UPDATE", "RESOLVE", "FAIL"],
          description: "CREATE: 确立新目标（MAIN目标已存在时禁止再CREATE）; UPDATE: 更新进度，可用负数表示挫折; RESOLVE: 目标达成; FAIL: 目标永久终止"
        },
        quest_id: {
          type: "string",
          description: "唯一标识符，主线以 'main_' 开头，支线以 'side_' 开头"
        },
        quest_type: {
          type: "string",
          enum: ["MAIN", "SIDE"],
          description: "仅 CREATE 时有效"
        },
        title: {
          type: "string",
          description: "目标名称，仅 CREATE 时必填"
        },
        description: {
          type: "string",
          description: "目标背景或当前进展摘要"
        },
        reasoning: {
          type: "string",
          description: "调用依据：此次叙事变化的逻辑推演（必填）"
        },
        progress_delta: {
          type: "integer",
          description: "进度变化（-20~+30）。情感突破或关键进展 +10~+30；挫折或退缩用负数",
          minimum: -20,
          maximum: 30
        },
        ui_toast: {
          type: "string",
          description: "向用户展示的简短系统提示，例如：'新线索已记录'"
        }
      },
      required: ["action", "quest_id", "reasoning"]
    }
  }
};

export const questSchema = {
  type: "function",
  function: {
    name: "manage_quest_state",
    description: "管理和追踪长线叙事目标（Objective）的完成进度。当对话推动了关键剧情、触及核心秘密或情感发生实质性转变时调用，用于维持叙事的连贯性与长程记忆。",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["CREATE", "UPDATE", "RESOLVE", "FAIL"],
          description: "CREATE: 确立新目标; UPDATE: 更新现有目标的进度; RESOLVE: 目标达成; FAIL: 目标失败终止"
        },
        quest_id: {
          type: "string",
          description: "目标唯一标识符。主线目标以 'main_' 开头，支线/局部目标以 'side_' 开头。例如: 'main_escape', 'side_investigate'."
        },
        quest_type: {
          type: "string",
          enum: ["MAIN", "SIDE"],
          description: "目标类型。仅在 action 为 CREATE 时有效。"
        },
        title: {
          type: "string",
          description: "目标名称。需简明扼要，例如: '解开过去的真相'。仅在 CREATE 时必填。"
        },
        description: {
          type: "string",
          description: "目标的详细背景说明或当前进展摘要。建议在 CREATE 或重大 UPDATE 时提供。"
        },
        reasoning: {
          type: "string",
          description: "内部逻辑推演：调用此工具的叙事依据是什么？(强制必填，用于确保逻辑自洽)"
        },
        progress_delta: {
          type: "integer",
          description: "进度变化幅度（-20 到 +30 之间）。正数表示进展，负数表示挫折。",
          minimum: -20,
          maximum: 30
        },
        ui_toast: {
          type: "string",
          description: "系统向外界展示的简短提示语。例如: '关于实验记录的新线索已记录'。"
        }
      },
      required: ["action", "quest_id", "reasoning"]
    }
  }
};

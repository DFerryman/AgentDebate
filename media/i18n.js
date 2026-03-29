/* i18n module for webview */
(function (global) {
  var en = {
    "discussionHistory": "Discussion History",
    "viewLogs": "View Logs",
    "settings": "Settings",
    "close": "Close",
    "send": "Send",
    "cancel": "Cancel",
    "delete": "Delete",
    "inputPlaceholder": "Enter discussion topic\u2026",
    "discussionSettings": "Discussion Settings",
    "crossReviewRounds": "Cross-Review Rounds",
    "moderatorAgent": "Moderator Agent",
    "autoSelect": "Auto Select",
    "promptTemplates": "Prompt Templates",
    "independentProposalPrompt": "Independent Proposal Prompt",
    "eachAgentInitial": "Each agent gives initial proposal independently",
    "crossReviewPrompt": "Cross-Review Prompt",
    "reviewOthers": "Review others' proposals and revise own views",
    "finalSynthesisPrompt": "Final Synthesis Prompt",
    "synthesizeAll": "Synthesize all discussion into final conclusion",
    "reset": "Reset",
    "save": "Save",
    "runningHint": "Discussion in progress; changes apply next time",
    "noHistory": "No history records",
    "statusRunning": "In Progress",
    "statusDone": "Completed",
    "statusError": "Error",
    "statusCancelled": "Cancelled",
    "crossReviewRoundsCount": "{0} cross-review rounds",
    "viewingHistory": "Viewing history",
    "backToCurrent": "Back to current",
    "emptyTitle": "Agent Debate",
    "emptySub": "Enter a topic and multiple agents will discuss",
    "copySynthesis": "Copy synthesis content",
    "finalSynthesisLabel": "Final Synthesis",
    "finalSynthesisWithAgent": "Final Synthesis ({0})",
    "outputting": "Outputting",
    "statusIdle": "Idle",
    "statusStarting": "Starting",
    "statusReady": "Ready",
    "statusWaitingPermission": "Waiting for permission",
    "statusPending": "Pending",
    "permissionTitle": "Permission Request",
    "permissionMessage": "{0} requests permission for \"{1}\"",
    "permissionDeny": "Deny",
    "permissionFeedback": "Additional instructions (optional)",
    "permissionSend": "Send",
    "acpAgents": "ACP Agents",
    "editSettingsJson": "Edit settings.json",
    "agentName": "Name",
    "command": "Command",
    "args": "Arguments",
    "argsHint": "space-separated",
    "connect": "Connect",
    "connecting": "Connecting\u2026",
    "connected": "Connected",
    "addAgent": "+ Add Agent",
    "newAgent": "New Agent",
    "enabled": "Enabled",
    "model": "Model",
    "mode": "Mode"
  };

  var zhCN = {
    "discussionHistory": "讨论历史",
    "viewLogs": "查看日志",
    "settings": "设置",
    "close": "关闭",
    "send": "发送",
    "cancel": "取消",
    "delete": "删除",
    "inputPlaceholder": "输入讨论话题…",
    "discussionSettings": "讨论设置",
    "crossReviewRounds": "交叉评审轮数",
    "moderatorAgent": "汇总 Agent",
    "autoSelect": "自动选择",
    "promptTemplates": "Prompt 模板",
    "independentProposalPrompt": "独立提案 Prompt",
    "eachAgentInitial": "每个 Agent 独立给出初始方案",
    "crossReviewPrompt": "交叉评审 Prompt",
    "reviewOthers": "审阅他人方案并修正自己的观点",
    "finalSynthesisPrompt": "最终汇总 Prompt",
    "synthesizeAll": "综合所有讨论输出最终结论",
    "reset": "重置",
    "save": "保存",
    "runningHint": "讨论进行中，修改将在下次讨论生效",
    "noHistory": "暂无历史记录",
    "statusRunning": "进行中",
    "statusDone": "已完成",
    "statusError": "出错",
    "statusCancelled": "已取消",
    "crossReviewRoundsCount": "{0} 轮交叉评审",
    "viewingHistory": "正在查看历史记录",
    "backToCurrent": "返回当前",
    "emptyTitle": "Agent Debate",
    "emptySub": "输入话题，多个 Agent 将展开讨论",
    "copySynthesis": "复制汇总内容",
    "finalSynthesisLabel": "最终汇总",
    "finalSynthesisWithAgent": "最终汇总 ({0})",
    "outputting": "输出中",
    "statusIdle": "空闲",
    "statusStarting": "启动中",
    "statusReady": "就绪",
    "statusWaitingPermission": "等待授权",
    "statusPending": "等待中",
    "permissionTitle": "权限请求",
    "permissionMessage": "{0} 请求授权执行 \"{1}\"",
    "permissionDeny": "拒绝",
    "permissionFeedback": "附加指令（可选）",
    "permissionSend": "发送",
    "acpAgents": "ACP Agents",
    "editSettingsJson": "编辑 settings.json",
    "agentName": "名称",
    "command": "命令",
    "args": "参数",
    "argsHint": "以空格分隔",
    "connect": "连接",
    "connecting": "连接中…",
    "connected": "已连接",
    "addAgent": "+ 添加 Agent",
    "newAgent": "新 Agent",
    "enabled": "启用",
    "model": "模型",
    "mode": "模式"
  };

  var bundles = { "en": en, "zh-cn": zhCN };
  var currentLocale = "en";

  global._i18n = {
    setLocale: function (lang) {
      lang = (lang || "en").toLowerCase();
      if (bundles[lang]) { currentLocale = lang; }
      else if (lang.indexOf("zh") === 0) { currentLocale = "zh-cn"; }
      else { currentLocale = "en"; }
    },
    t: function (key) {
      var bundle = bundles[currentLocale] || en;
      var msg = bundle[key] || en[key] || key;
      for (var i = 1; i < arguments.length; i++) {
        msg = msg.replace("{" + (i - 1) + "}", String(arguments[i]));
      }
      return msg;
    }
  };
})(window);

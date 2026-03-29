import * as vscode from "vscode";

type MessageKeys = keyof typeof en;

const en = {
  "enterTopic": "Please enter a discussion topic.",
  "noAgentStarted": "No agent started successfully. Please install and authenticate the corresponding CLIs, then check agentDebate.agents configuration.",
  "independentProposals": "Independent Proposals",
  "eachAgentProposal": "Each agent gives an independent proposal.",
  "crossReview": "Cross Review {0}",
  "crossReviewDetail": "Cross review round {0}.",
  "oneAgentSkip": "Only one agent, skipping.",
  "finalSynthesis": "Final Synthesis",
  "moderatorSynthesis": "{0} is responsible for synthesis.",
  "noAgentForSynthesis": "No agent available for synthesis.",
  "moderatorUnavailable": "Specified moderator \"{0}\" unavailable, auto-selecting.",
  "startingAgents": "Starting agent processes.",
  "synthesisComplete": "Synthesis complete.",
  "debateFinished": "Debate finished.",
  "cancelled": "Cancelled",
  "requestsPermission": "{0} requests permission for \"{1}\".",
  "startup": "Startup",
  "commandNotFound": "Command not found: \"{0}\". Please check the path or install the program.",
  "commandNotInPath": "Command \"{0}\" not found in PATH. Please install it or configure the full path in agentDebate.agents.",
  "retryingFailedAgents": "Only {0} agent(s) ready, need {1}. Retrying failed agents (attempt {2}/{3})...",
  "notEnoughAgents": "Only {0} agent(s) started successfully, but at least {1} are required for a meaningful debate. Please check agent configurations.",
};

const zhCN: Record<MessageKeys, string> = {
  "enterTopic": "请输入要讨论的话题。",
  "noAgentStarted": "没有成功启动的 agent。请先安装并认证对应 CLI，再检查 agentDebate.agents 配置。",
  "independentProposals": "独立提案",
  "eachAgentProposal": "每个 agent 独立给出方案。",
  "crossReview": "交叉评审 {0}",
  "crossReviewDetail": "第 {0} 轮交叉评审。",
  "oneAgentSkip": "只有一个 agent，跳过。",
  "finalSynthesis": "最终汇总",
  "moderatorSynthesis": "{0} 负责汇总。",
  "noAgentForSynthesis": "没有可用于汇总的 agent。",
  "moderatorUnavailable": "指定汇总 agent \"{0}\" 不可用，自动选择。",
  "startingAgents": "启动 agent 进程。",
  "synthesisComplete": "汇总完成。",
  "debateFinished": "讨论完成。",
  "cancelled": "已取消",
  "requestsPermission": "{0} 请求授权执行 \"{1}\"。",
  "startup": "启动",
  "commandNotFound": "命令未找到: \"{0}\"。请检查路径或安装对应程序。",
  "commandNotInPath": "在 PATH 中找不到命令 \"{0}\"。请安装或在 agentDebate.agents 中配置完整路径。",
  "retryingFailedAgents": "仅 {0} 个 agent 就绪，需要 {1} 个。正在重试失败的 agent（第 {2}/{3} 次）...",
  "notEnoughAgents": "仅 {0} 个 agent 启动成功，但讨论至少需要 {1} 个。请检查 agent 配置。",
};

const bundles: Record<string, Record<string, string>> = {
  en,
  "zh-cn": zhCN,
};

let currentLocale: string = "en";

export function initLocale(): void {
  const lang = vscode.env.language.toLowerCase();
  if (bundles[lang]) {
    currentLocale = lang;
  } else {
    // Try base language (e.g. "zh" from "zh-tw")
    const base = lang.split("-")[0];
    if (base === "zh") {
      currentLocale = "zh-cn";
    } else {
      currentLocale = "en";
    }
  }
}

export function getLocale(): string {
  return currentLocale;
}

export function t(key: MessageKeys, ...args: (string | number)[]): string {
  const bundle = bundles[currentLocale] || en;
  let msg = bundle[key] || en[key] || key;
  for (let i = 0; i < args.length; i++) {
    msg = msg.replace(`{${i}}`, String(args[i]));
  }
  return msg;
}

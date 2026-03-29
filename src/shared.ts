import * as os from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";

export const EXTENSION_ID = "agibattle.agent-debate";
export const PROTOCOL_VERSION = 1;

/* ---- Shared constants ---- */
export const MAX_ROUNDS = 8;
export const PEER_OUTPUT_MAX_LEN = 1600;
export const SYNTHESIS_OUTPUT_MAX_LEN = 1400;
export const PERMISSION_RAW_INPUT_MAX_LEN = 1200;
export const STATE_PUSH_DEBOUNCE_MS = 60;
export const MAX_HISTORY_ENTRIES = 50;

export interface SessionConfig {
  mode?: string;
  configOptions?: Record<string, string>;
}

export interface AgentConfig {
  id: string;
  label: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  enabled: boolean;
  sessionConfig?: SessionConfig;
}

export interface RoundState {
  id: string;
  title: string;
  status: "pending" | "running" | "done" | "error" | "cancelled";
  detail?: string;
}

export interface AgentState {
  id: string;
  label: string;
  status: "idle" | "starting" | "ready" | "running" | "waiting_permission" | "done" | "error" | "cancelled";
  sessionId?: string;
  info?: string;
  error?: string;
  liveOutput: string;
  roundOutputs: Record<string, string>;
}

export interface PromptTemplates {
  round1: string;
  crossEval: string;
  synthesis: string;
}

/**
 * Built-in prompt prefixes containing {{placeholder}} variables.
 * These are NOT shown in the settings UI — they are prepended automatically
 * when building the final prompt sent to agents.
 */
const OUTPUT_DISCIPLINE = "Start your response DIRECTLY with the first markdown heading. No preamble, introduction, or chain-of-thought before the heading.";

export const BUILTIN_PROMPT_PREFIXES: PromptTemplates = {
  round1: [
    OUTPUT_DISCIPLINE,
    "",
    "You are {{roleName}} in a structured multi-agent discussion.",
    "Topic: {{topic}}",
    "",
    "Think from the unique perspective your role implies. Prioritize actionable, specific proposals over abstract analysis."
  ].join("\n"),

  crossEval: [
    OUTPUT_DISCIPLINE,
    "",
    "Round {{roundNumber}} of a structured multi-agent discussion.",
    "Topic: {{topic}}",
    "Your role: {{roleName}}",
    "",
    "Your own previous output(s):",
    "{{ownOutputs}}",
    "",
    "Peer outputs from all rounds:",
    "{{peerOutputs}}"
  ].join("\n"),

  synthesis: [
    OUTPUT_DISCIPLINE,
    "",
    "You are the moderator synthesizing a multi-agent discussion.",
    "Topic: {{topic}}",
    "",
    "All discussion outputs from every participant and round:",
    "{{allOutputs}}"
  ].join("\n")
};

/**
 * Default user-editable prompt templates.
 * Only contains pure-text instructions — no {{placeholder}} variables.
 */
export const DEFAULT_PROMPT_TEMPLATES: PromptTemplates = {
  round1: [
    "Instructions:",
    "- Work independently. Do not assume what others will propose.",
    "- Prioritize practical, actionable recommendations.",
    "- Be explicit about tradeoffs and assumptions.",
    "- Leverage your role perspective to provide unique insights.",
    "",
    "Return markdown with these sections:",
    "## Proposal",
    "## Rationale",
    "## Implementation Approach",
    "## Risks & Tradeoffs",
    "## Next Step",
    "",
    "Keep it under 400 words."
  ].join("\n"),

  crossEval: [
    "Task:",
    "- Compare peer outputs against your own previous position.",
    "- Identify the strongest ideas from any participant worth preserving.",
    "- Challenge weak assumptions, gaps, or contradictions.",
    "- Revise your position by incorporating the best ideas. Converge toward agreement where evidence supports it; flag genuine disagreements explicitly.",
    "",
    "Return markdown with these sections:",
    "## Strongest Ideas",
    "## Challenges",
    "## Revised Recommendation",
    "## Remaining Disagreements",
    "",
    "Keep it under 350 words."
  ].join("\n"),

  synthesis: [
    "Synthesize all outputs into a final, actionable recommendation.",
    "Resolve disagreements by weighing the arguments — do not merely list them.",
    "",
    "Return markdown with these sections:",
    "## Consensus",
    "## Resolved Disagreements",
    "## Recommended Approach",
    "## Implementation Priority",
    "## Open Risks",
    "",
    "Keep it under 600 words."
  ].join("\n")
};

export interface PanelState {
  running: boolean;
  topic: string;
  cwd: string;
  warning: string;
  finalReport: string;
  rounds: RoundState[];
  agents: AgentState[];
  availableAgents: number;
  totalRounds: number;
  selectedModerator: string;
  promptTemplates: PromptTemplates;
}

export interface HistoryMeta {
  id: string;
  topic: string;
  timestamp: number;
  agentLabels: string[];
  totalRounds: number;
  status: "running" | "done" | "error" | "cancelled";
}

export interface HistoryEntry extends HistoryMeta {
  rounds: RoundState[];
  agents: AgentState[];
  finalReport: string;
}

export function getWorkspacePath(): string {
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (workspacePath) {
    return path.resolve(workspacePath);
  }

  const activeDocumentPath = vscode.window.activeTextEditor?.document.uri.fsPath;
  if (activeDocumentPath) {
    return path.resolve(path.dirname(activeDocumentPath));
  }

  return path.resolve(os.homedir());
}

export function createEmptyState(cwd: string): PanelState {
  return {
    running: false,
    topic: "",
    cwd,
    warning: "",
    finalReport: "",
    rounds: [],
    agents: [],
    availableAgents: 0,
    totalRounds: getDefaultRounds(),
    selectedModerator: getDefaultModerator(),
    promptTemplates: { ...DEFAULT_PROMPT_TEMPLATES }
  };
}

export function getDefaultRounds(): number {
  return vscode.workspace.getConfiguration("agentDebate").get<number>("defaultRounds", 2);
}

export function getDefaultModerator(): string {
  return vscode.workspace.getConfiguration("agentDebate").get<string>("defaultModerator", "");
}

export function getConfiguredAgents(): AgentConfig[] {
  const config = vscode.workspace.getConfiguration("agentDebate");
  const rawAgents = config.get<unknown[]>("agents", []);
  return rawAgents
    .map((rawAgent, index) => normalizeAgent(rawAgent, index))
    .filter((agent): agent is AgentConfig => agent !== undefined);
}

function normalizeAgent(rawAgent: unknown, index: number): AgentConfig | undefined {
  if (!rawAgent || typeof rawAgent !== "object") {
    return undefined;
  }

  const candidate = rawAgent as Record<string, unknown>;
  const id = asString(candidate.id) ?? `agent-${index + 1}`;
  const label = asString(candidate.label) ?? id;
  const command = asString(candidate.command);

  if (!command) {
    return undefined;
  }

  const args = Array.isArray(candidate.args)
    ? candidate.args.map((value) => String(value))
    : [];

  const env = typeof candidate.env === "object" && candidate.env
    ? Object.fromEntries(
        Object.entries(candidate.env as Record<string, unknown>).map(([key, value]) => [key, String(value)])
      )
    : {};

  return {
    id,
    label,
    command,
    args,
    env,
    enabled: candidate.enabled === undefined ? true : Boolean(candidate.enabled),
    sessionConfig: parseSessionConfig(candidate.sessionConfig)
  };
}

function parseSessionConfig(raw: unknown): SessionConfig | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  const config: SessionConfig = {};
  if (typeof obj.mode === "string") config.mode = obj.mode;
  if (obj.configOptions && typeof obj.configOptions === "object") {
    config.configOptions = Object.fromEntries(
      Object.entries(obj.configOptions as Record<string, unknown>).map(([k, v]) => [k, String(v)])
    );
  }
  return config.mode || config.configOptions ? config : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function resolveTemplate(value: string, cwd: string): string {
  return value
    .replaceAll("${workspaceFolder}", cwd)
    .replaceAll("${cwd}", cwd);
}

export function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}\n\n[truncated]`;
}

export function getPromptStyle(): string {
  return vscode.workspace.getConfiguration("agentDebate").get<string>("promptStyle", "fast-mvp");
}

export function getStartupTimeoutMs(): number {
  return vscode.workspace.getConfiguration("agentDebate").get<number>("startupTimeoutSeconds", 60) * 1000;
}

export function getMinAgents(): number {
  return vscode.workspace.getConfiguration("agentDebate").get<number>("minAgents", 2);
}

export function getStartupRetries(): number {
  return vscode.workspace.getConfiguration("agentDebate").get<number>("startupRetries", 3);
}

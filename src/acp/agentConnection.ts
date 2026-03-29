import * as fs from "node:fs/promises";
import * as path from "node:path";
import { JsonRpcProcess } from "./jsonRpcProcess";
import { AgentConfig, PROTOCOL_VERSION, truncateText } from "../shared";

/** Local types — only used within ACP connection, not exposed to UI */
interface ToolCallState {
  id: string;
  title: string;
  status: string;
  kind?: string;
  content?: string;
}

interface PlanEntryState {
  content: string;
  priority: string;
  status: string;
}

const DEFAULT_STARTUP_TIMEOUT_MS = 30_000;

export interface PermissionResolution {
  outcome: "selected" | "cancelled";
  optionId?: string;
  message?: string;
}

export interface PermissionRequestContext {
  agentLabel: string;
  params: any;
}

export interface AgentConnectionOptions {
  agent: AgentConfig;
  cwd: string;
  onEvent: (event: AgentConnectionEvent) => void;
  onPermissionRequest: (context: PermissionRequestContext) => Promise<PermissionResolution>;
}

export type AgentConnectionEvent =
  | { type: "chunk"; kind: "agent_message" | "agent_thought"; text: string }
  | { type: "tool_call"; toolCall: ToolCallState }
  | { type: "plan"; entries: PlanEntryState[] }
  | { type: "stderr"; text: string }
  | { type: "info"; message: string }
  | { type: "permission_required"; title: string }
  | { type: "permission_resolved"; outcome: string };

export interface AgentInfo {
  name?: string;
  title?: string;
  version?: string;
  [key: string]: unknown;
}

export interface AgentStartupResult {
  sessionId: string;
  agentInfo?: AgentInfo;
  authMethods: string[];
  modes?: SessionModeState;
  models?: SessionModelState;
  configOptions?: SessionConfigOption[];
}

export interface PromptResult {
  text: string;
  stopReason: string;
}

export interface SessionMode {
  id: string;
  name: string;
  description?: string;
}

export interface SessionModeState {
  currentModeId: string;
  availableModes: SessionMode[];
}

export interface SessionConfigSelectOption {
  value: string;
  name: string;
  description?: string;
}

export interface SessionConfigOption {
  id: string;
  name: string;
  description?: string;
  category?: string;
  type: string;
  currentValue: string;
  options?: SessionConfigSelectOption[];
}

export interface ModelInfo {
  modelId: string;
  name: string;
  description?: string;
}

export interface SessionModelState {
  currentModelId: string;
  availableModels: ModelInfo[];
}

interface NewSessionResponse {
  sessionId: string;
  modes?: SessionModeState;
  models?: SessionModelState;
  configOptions?: SessionConfigOption[];
}

interface InitializeResponse {
  agentInfo?: AgentInfo;
  authMethods?: Array<{ name?: string; id?: string }>;
}

export class AgentConnection {
  private readonly options: AgentConnectionOptions;
  private readonly toolCalls = new Map<string, ToolCallState>();
  private readonly rpc: JsonRpcProcess;
  private readonly startupTimeoutMs: number;
  private currentTurnBuffer = "";
  private sessionId?: string;
  private cancelled = false;

  public constructor(options: AgentConnectionOptions, startupTimeoutMs?: number) {
    this.options = options;
    this.startupTimeoutMs = startupTimeoutMs ?? DEFAULT_STARTUP_TIMEOUT_MS;

    const env = {
      ...process.env,
      ...options.agent.env
    };

    this.rpc = new JsonRpcProcess({
      command: options.agent.command,
      args: options.agent.args,
      cwd: options.cwd,
      env,
      onNotification: async (method, params) => {
        await this.handleNotification(method, params);
      },
      onRequest: async (_id, method, params) => this.handleRequest(method, params),
      onLog: (level, message) => {
        if (level === "error") {
          this.options.onEvent({ type: "stderr", text: message });
        } else {
          this.options.onEvent({ type: "info", message });
        }
      }
    });
  }

  public async start(): Promise<AgentStartupResult> {
    await this.rpc.start();

    const initialize = await this.rpc.request<InitializeResponse>(
      "initialize",
      {
        protocolVersion: PROTOCOL_VERSION,
        clientCapabilities: {
          fs: {
            readTextFile: true,
            writeTextFile: false
          },
          terminal: false
        },
        clientInfo: {
          name: "agent-debate-vscode",
          title: "Agent Debate for VS Code",
          version: "0.1.0"
        }
      },
      this.startupTimeoutMs
    );

    const newSession = await this.rpc.request<NewSessionResponse>(
      "session/new",
      {
        cwd: this.options.cwd,
        mcpServers: []
      },
      this.startupTimeoutMs
    );

    this.sessionId = newSession.sessionId;
    const authMethods = (initialize.authMethods ?? [])
      .map((method) => method.name || method.id)
      .filter((value): value is string => Boolean(value));

    return {
      sessionId: newSession.sessionId,
      agentInfo: initialize.agentInfo,
      authMethods,
      modes: newSession.modes,
      models: newSession.models,
      configOptions: newSession.configOptions
    };
  }

  public async setMode(modeId: string): Promise<void> {
    if (!this.sessionId) throw new Error("No session");
    await this.rpc.request("session/set_mode", { sessionId: this.sessionId, modeId }, this.startupTimeoutMs);
  }

  public async setConfigOption(configId: string, value: string): Promise<void> {
    if (!this.sessionId) throw new Error("No session");
    await this.rpc.request("session/set_config_option", { sessionId: this.sessionId, configId, value }, this.startupTimeoutMs);
  }

  public async prompt(promptText: string): Promise<PromptResult> {
    if (!this.sessionId) {
      throw new Error("Session has not been created");
    }

    this.currentTurnBuffer = "";
    this.cancelled = false;

    const response = await this.rpc.request<{ stopReason: string }>("session/prompt", {
      sessionId: this.sessionId,
      prompt: [
        {
          type: "text",
          text: promptText
        }
      ]
    });

    return {
      text: this.currentTurnBuffer.trim(),
      stopReason: response.stopReason
    };
  }

  public async cancel(): Promise<void> {
    this.cancelled = true;
    if (this.sessionId) {
      this.rpc.notify("session/cancel", { sessionId: this.sessionId });
    }
  }

  public async dispose(): Promise<void> {
    await this.rpc.dispose();
  }

  private async handleNotification(method: string, params: any): Promise<void> {
    if (method !== "session/update") {
      return;
    }

    const update = params?.update;
    if (!update) {
      return;
    }

    switch (update.sessionUpdate) {
      case "agent_message_chunk": {
        const text = contentBlockToText(update.content);
        this.currentTurnBuffer += text;
        this.options.onEvent({ type: "chunk", kind: "agent_message", text });
        return;
      }
      case "agent_thought_chunk": {
        const text = contentBlockToText(update.content);
        this.options.onEvent({ type: "chunk", kind: "agent_thought", text });
        return;
      }
      case "tool_call": {
        const toolCall = this.upsertToolCall(update.toolCallId, {
          id: update.toolCallId,
          title: update.title ?? "Tool call",
          status: update.status ?? "pending",
          kind: update.kind,
          content: extractToolCallContent(update.content)
        });
        this.options.onEvent({ type: "tool_call", toolCall });
        return;
      }
      case "tool_call_update": {
        const toolCall = this.upsertToolCall(update.toolCallId, {
          id: update.toolCallId,
          title: update.title ?? this.toolCalls.get(update.toolCallId)?.title ?? "Tool call",
          status: update.status ?? this.toolCalls.get(update.toolCallId)?.status ?? "pending",
          kind: update.kind ?? this.toolCalls.get(update.toolCallId)?.kind,
          content: update.content ? extractToolCallContent(update.content) : this.toolCalls.get(update.toolCallId)?.content
        });
        this.options.onEvent({ type: "tool_call", toolCall });
        return;
      }
      case "plan": {
        const entries = Array.isArray(update.entries)
          ? update.entries.map((entry: any) => ({
              content: String(entry.content ?? ""),
              priority: String(entry.priority ?? "medium"),
              status: String(entry.status ?? "pending")
            }))
          : [];
        this.options.onEvent({ type: "plan", entries });
        return;
      }
      default:
        return;
    }
  }

  private async handleRequest(method: string, params: any): Promise<unknown> {
    switch (method) {
      case "fs/read_text_file":
        return this.readTextFile(params);
      case "session/request_permission":
        return this.resolvePermission(params);
      default:
        throw new Error(`Unsupported client method: ${method}`);
    }
  }

  private async readTextFile(params: any): Promise<{ content: string }> {
    const filePath = String(params?.path ?? "");
    if (!path.isAbsolute(filePath)) {
      throw new Error("ACP fs/read_text_file requires an absolute path");
    }

    const raw = await fs.readFile(filePath, "utf8");
    const startLine = Math.max(Number(params?.line ?? 1), 1);
    const limit = params?.limit === undefined ? undefined : Math.max(Number(params.limit), 0);
    const lines = raw.split(/\r?\n/);
    const slice = lines.slice(startLine - 1, limit === undefined ? undefined : startLine - 1 + limit);
    return {
      content: slice.join("\n")
    };
  }

  private async resolvePermission(params: any): Promise<{ outcome: PermissionResolution }> {
    if (this.cancelled) {
      return { outcome: { outcome: "cancelled" } };
    }

    const title = String(params?.toolCall?.title ?? "Tool call");
    this.options.onEvent({ type: "permission_required", title });

    try {
      const resolution = await this.options.onPermissionRequest({
        agentLabel: this.options.agent.label,
        params
      });
      this.options.onEvent({ type: "permission_resolved", outcome: resolution.outcome });
      if (resolution.outcome === "cancelled") {
        return { outcome: { outcome: "cancelled", ...(resolution.message ? { message: resolution.message } : {}) } };
      }
      return {
        outcome: {
          outcome: "selected",
          optionId: resolution.optionId,
          ...(resolution.message ? { message: resolution.message } : {})
        }
      };
    } catch {
      this.options.onEvent({ type: "permission_resolved", outcome: "cancelled" });
      return { outcome: { outcome: "cancelled" } };
    }
  }

  private upsertToolCall(toolCallId: string, patch: ToolCallState): ToolCallState {
    const current = this.toolCalls.get(toolCallId);
    const next: ToolCallState = {
      id: toolCallId,
      title: patch.title ?? current?.title ?? "Tool call",
      status: patch.status ?? current?.status ?? "pending",
      kind: patch.kind ?? current?.kind,
      content: patch.content ?? current?.content
    };
    this.toolCalls.set(toolCallId, next);
    return next;
  }
}

function contentBlockToText(content: any): string {
  if (!content) {
    return "";
  }

  switch (content.type) {
    case "text":
      return String(content.text ?? "");
    case "resource":
      return String(content.resource?.text ?? content.text ?? "");
    case "resource_link":
      return String(content.uri ?? content.resource?.uri ?? "");
    case "image":
      return "[image]";
    default:
      return truncateText(JSON.stringify(content, null, 2), 800);
  }
}

function extractToolCallContent(content: any): string | undefined {
  if (!Array.isArray(content) || content.length === 0) {
    return undefined;
  }

  const joined = content
    .map((item) => {
      if (!item) {
        return "";
      }
      if (item.type === "content") {
        return contentBlockToText(item.content);
      }
      if (item.type === "diff") {
        return `Diff: ${item.path ?? "unknown file"}`;
      }
      if (item.type === "terminal") {
        return `Terminal: ${item.terminalId ?? "unknown"}`;
      }
      return truncateText(JSON.stringify(item, null, 2), 600);
    })
    .filter(Boolean)
    .join("\n\n");

  return joined || undefined;
}


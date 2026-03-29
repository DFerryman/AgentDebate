import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { AgentConnection, AgentConnectionEvent, PermissionResolution } from "./acp/agentConnection";
import { getLocale, t } from "./i18n";
import {
  AgentConfig,
  AgentState,
  BUILTIN_PROMPT_PREFIXES,
  DEFAULT_PROMPT_TEMPLATES,
  HistoryEntry,
  HistoryMeta,
  MAX_HISTORY_ENTRIES,
  MAX_ROUNDS,
  PanelState,
  PEER_OUTPUT_MAX_LEN,
  PERMISSION_RAW_INPUT_MAX_LEN,
  PromptTemplates,
  RoundState,
  STATE_PUSH_DEBOUNCE_MS,
  SYNTHESIS_OUTPUT_MAX_LEN,
  createEmptyState,
  getConfiguredAgents,
  getDefaultModerator,
  getDefaultRounds,
  getWorkspacePath,
  resolveTemplate,
  truncateText
} from "./shared";

export class DebatePanelController implements vscode.WebviewViewProvider {
  public static readonly viewType = "agentDebate.chatView";

  private view?: vscode.WebviewView;
  private readonly context: vscode.ExtensionContext;
  private readonly outputChannel: vscode.OutputChannel;
  private state: PanelState;
  private readonly connections = new Map<string, AgentConnection>();
  private postStateTimer?: NodeJS.Timeout;
  private runToken = 0;
  private cancelRequested = false;
  private currentHistoryId: string | null = null;
  private pendingPermission?: { resolve: (value: PermissionResolution) => void };

  public constructor(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
    this.context = context;
    this.outputChannel = outputChannel;
    this.state = createEmptyState(getWorkspacePath());
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView;
    webviewView.title = "";

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, "media")]
    };

    webviewView.webview.html = this.getHtml(webviewView.webview);

    webviewView.onDidDispose(() => {
      this.view = undefined;
      void this.cancelRun("View disposed");
    });

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message?.type) {
        case "ready":
          this.refreshAgentCount();
          this.pushState();
          this.view?.webview.postMessage({ type: "defaults", promptTemplates: DEFAULT_PROMPT_TEMPLATES });
          return;
        case "runDebate": {
          const templates: PromptTemplates = {
            round1: String(message.promptTemplates?.round1 || DEFAULT_PROMPT_TEMPLATES.round1),
            crossEval: String(message.promptTemplates?.crossEval || DEFAULT_PROMPT_TEMPLATES.crossEval),
            synthesis: String(message.promptTemplates?.synthesis || DEFAULT_PROMPT_TEMPLATES.synthesis)
          };
          await this.runDebate(
            String(message.topic ?? ""),
            Number(message.totalRounds ?? getDefaultRounds()),
            String(message.moderatorId ?? getDefaultModerator()),
            templates
          );
          return;
        }
        case "cancelDebate":
          await this.cancelRun("User requested cancellation");
          return;
        case "showLogs":
          this.outputChannel.show(true);
          return;
        case "openSettings":
          await vscode.commands.executeCommand("workbench.action.openSettings", "agentDebate");
          return;
        case "openSettingsJson":
          await vscode.commands.executeCommand("workbench.action.openSettingsJson");
          return;
        case "getAgentConfigs":
          this.sendAgentConfigs();
          return;
        case "saveAgentConfigs": {
          const rawAgents = Array.isArray(message.agents) ? message.agents : [];
          const configs = rawAgents.map((a: any) => ({
            id: String(a.id || "").trim() ||
              String(a.label || "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") ||
              `agent-${Date.now()}`,
            label: String(a.label || ""),
            enabled: a.enabled !== false,
            command: String(a.command || ""),
            args: Array.isArray(a.args) ? a.args.map(String) : [],
            env: {},
            ...(a.sessionConfig ? { sessionConfig: a.sessionConfig } : {})
          })).filter((a: { label: string; command: string }) => a.label && a.command);
          await vscode.workspace.getConfiguration("agentDebate").update("agents", configs, vscode.ConfigurationTarget.Global);
          this.refreshAgentCount();
          this.pushState();
          this.sendAgentConfigs();
          return;
        }
        case "connectAgent": {
          const connCmd = String(message.command || "");
          const connArgs: string[] = Array.isArray(message.args) ? message.args.map(String) : [];
          const connLabel = String(message.label || "agent");
          const connId = String(message.connId || "");
          const wp = path.resolve(getWorkspacePath());

          if (!connCmd) {
            this.view?.webview.postMessage({ type: "connectResult", connId, success: false, error: "No command" });
            return;
          }
          const resolved = resolveTemplate(connCmd, wp);
          const cmdErr = this.checkCommandAvailable(resolved);
          if (cmdErr) {
            this.view?.webview.postMessage({ type: "connectResult", connId, success: false, error: cmdErr });
            return;
          }

          const testCfg: AgentConfig = {
            id: "connect-test", label: connLabel, enabled: true,
            command: resolved, args: connArgs.map((a) => resolveTemplate(a, wp)), env: {}
          };
          const conn = new AgentConnection({
            agent: testCfg, cwd: wp,
            onEvent: () => {},
            onPermissionRequest: async () => ({ outcome: "cancelled" as const })
          });
          try {
            const r = await conn.start();
            this.view?.webview.postMessage({
              type: "connectResult", connId, success: true,
              agentInfo: r.agentInfo ?? {},
              modes: r.modes, models: r.models, configOptions: r.configOptions
            });
          } catch (err) {
            this.view?.webview.postMessage({
              type: "connectResult", connId, success: false,
              error: err instanceof Error ? err.message : String(err)
            });
          } finally {
            await conn.dispose();
          }
          return;
        }
        case "getHistory":
          this.sendHistoryList();
          return;
        case "loadHistory":
          this.sendHistoryDetail(String(message.id ?? ""));
          return;
        case "deleteHistory":
          this.deleteHistoryEntry(String(message.id ?? ""));
          return;
        case "permissionResponse":
          if (this.pendingPermission) {
            const resolve = this.pendingPermission.resolve;
            this.pendingPermission = undefined;
            const userMessage = message.message ? String(message.message) : undefined;
            if (message.optionId) {
              resolve({ outcome: "selected", optionId: String(message.optionId), message: userMessage });
            } else {
              resolve({ outcome: "cancelled", message: userMessage });
            }
          }
          return;
        default:
          return;
      }
    });

    this.refreshAgentCount();
    this.pushState();
  }

  /** Trigger an action inside the webview from an external command */
  public triggerWebviewAction(action: string): void {
    if (action === "showLogs") {
      this.outputChannel.show(true);
      return;
    }
    this.view?.webview.postMessage({ type: "triggerAction", action });
  }

  /** Also support opening as a standalone panel (fallback / command) */
  public open(): void {
    // Try to reveal the sidebar view
    void vscode.commands.executeCommand("agentDebate.chatView.focus");
  }

  public async dispose(): Promise<void> {
    await this.cancelRun("Extension deactivated");
  }

  /* ------------------------------------------------------------------ */
  /*  Debate orchestration                                               */
  /* ------------------------------------------------------------------ */

  private async runDebate(topic: string, totalRounds: number, moderatorId: string, templates: PromptTemplates): Promise<void> {
    if (this.state.running) {
      return;
    }

    const trimmedTopic = topic.trim();
    if (!trimmedTopic) {
      this.state.warning = t("enterTopic");
      this.pushState();
      return;
    }

    const clampedRounds = Math.max(1, Math.min(MAX_ROUNDS, Math.floor(totalRounds)));

    const workspacePath = getWorkspacePath();
    const agentConfigs = getConfiguredAgents()
      .filter((agent) => agent.enabled)
      .map((agent) => ({
        ...agent,
        command: resolveTemplate(agent.command, workspacePath),
        args: agent.args.map((arg) => resolveTemplate(arg, workspacePath)),
        env: Object.fromEntries(
          Object.entries(agent.env).map(([key, value]) => [key, resolveTemplate(value, workspacePath)])
        )
      }));

    this.resetRunState(trimmedTopic, workspacePath, agentConfigs, clampedRounds, moderatorId, templates);
    this.cancelRequested = false;
    this.runToken += 1;
    const currentRunToken = this.runToken;

    // Create history entry immediately
    this.createHistoryEntry();

    try {
      const readyAgents = await this.startAgents(agentConfigs, currentRunToken);
      if (this.cancelRequested || currentRunToken !== this.runToken) {
        throw new Error("Run cancelled");
      }

      if (readyAgents.length === 0) {
        throw new Error(t("noAgentStarted"));
      }

      const allRoundOutputs = new Map<string, Map<string, string>>();

      // Independent proposals (no round number)
      const round1 = await this.runRound(
        currentRunToken,
        { id: "round1", title: t("independentProposals"), status: "running", detail: t("eachAgentProposal") },
        readyAgents,
        (agent) => this.buildRound1Prompt(trimmedTopic, agent)
      );
      allRoundOutputs.set("round1", round1);
      this.updateHistoryEntry();

      if (this.cancelRequested || currentRunToken !== this.runToken) {
        throw new Error("Run cancelled");
      }

      // Cross-evaluation rounds: clampedRounds = number of cross-review rounds
      for (let i = 1; i <= clampedRounds; i++) {
        if (this.cancelRequested || currentRunToken !== this.runToken) {
          throw new Error("Run cancelled");
        }

        const roundId = `round${i + 1}`;
        if (readyAgents.length > 1) {
          // Include all ready agents — agents that failed a single round
          // (e.g. due to permission denial) should still participate in subsequent rounds.
          const roundOutputs = await this.runRound(
            currentRunToken,
            { id: roundId, title: t("crossReview", i), status: "running", detail: t("crossReviewDetail", i) },
            readyAgents,
            (agent) => this.buildCrossEvalPrompt(trimmedTopic, agent, i + 1, allRoundOutputs)
          );
          allRoundOutputs.set(roundId, roundOutputs);
        } else {
          this.setRound({ id: roundId, title: t("crossReview", i), status: "done", detail: t("oneAgentSkip") });
          allRoundOutputs.set(roundId, new Map());
        }
        this.updateHistoryEntry();
      }

      if (this.cancelRequested || currentRunToken !== this.runToken) {
        throw new Error("Run cancelled");
      }

      // Synthesis
      const moderator = this.selectModerator(readyAgents, allRoundOutputs, moderatorId);
      if (!moderator) {
        throw new Error(t("noAgentForSynthesis"));
      }

      this.setRound({ id: "synthesis", title: t("finalSynthesis"), status: "running", detail: t("moderatorSynthesis", moderator.label) });
      this.updateAgentState(moderator.id, (a) => { a.status = "running"; a.liveOutput = ""; });

      const synthesis = await moderator.connection.prompt(
        this.buildSynthesisPromptFromAll(trimmedTopic, allRoundOutputs)
      );

      if (this.cancelRequested || currentRunToken !== this.runToken || synthesis.stopReason === "cancelled") {
        throw new Error("Run cancelled");
      }

      this.state.finalReport = synthesis.text || "(no synthesis returned)";
      this.updateAgentState(moderator.id, (a) => { a.status = "done"; a.liveOutput = ""; });
      this.finishRound("synthesis", "done", t("synthesisComplete"));
      this.log("info", t("debateFinished"));
      this.updateHistoryEntry("done");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message !== "Run cancelled") {
        this.state.warning = message;
        this.log("error", message);
      }
      this.markIncompleteRounds(this.cancelRequested ? "cancelled" : "error");
      this.updateHistoryEntry(this.cancelRequested ? "cancelled" : "error");
    } finally {
      this.state.running = false;
      await this.disposeConnections();
      this.pushState();
    }
  }

  private selectModerator(
    readyAgents: Array<{ id: string; label: string; connection: AgentConnection }>,
    allRoundOutputs: Map<string, Map<string, string>>,
    moderatorId: string
  ): { id: string; label: string; connection: AgentConnection } | undefined {
    if (moderatorId) {
      const selected = readyAgents.find((a) => a.id === moderatorId);
      if (selected) return selected;
      this.log("info", t("moderatorUnavailable", moderatorId));
    }
    return readyAgents.find((a) => {
      for (const outputs of allRoundOutputs.values()) {
        if (outputs.has(a.id)) return true;
      }
      return false;
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Agent lifecycle                                                    */
  /* ------------------------------------------------------------------ */

  private sendAgentConfigs(): void {
    const agents = getConfiguredAgents();
    this.view?.webview.postMessage({
      type: "agentConfigs",
      agents: agents.map((a) => ({
        id: a.id, label: a.label, command: a.command,
        args: a.args, env: a.env, enabled: a.enabled,
        sessionConfig: a.sessionConfig
      }))
    });
  }

  private checkCommandAvailable(command: string): string | undefined {
    if (path.isAbsolute(command)) {
      if (!fs.existsSync(command)) {
        return t("commandNotFound", command);
      }
      return undefined;
    }
    try {
      const checker = process.platform === "win32" ? "where" : "which";
      execSync(`${checker} "${command}"`, { stdio: "ignore", timeout: 5000 });
      return undefined;
    } catch {
      return t("commandNotInPath", command);
    }
  }

  private async startAgents(agentConfigs: AgentConfig[], runToken: number): Promise<Array<{ id: string; label: string; connection: AgentConnection }>> {
    this.setRound({ id: "startup", title: t("startup"), status: "running", detail: t("startingAgents") });

    const results = await Promise.all(
      agentConfigs.map(async (agent) => {
        const connection = new AgentConnection({
          agent, cwd: this.state.cwd,
          onEvent: (event) => this.handleAgentEvent(agent.id, event),
          onPermissionRequest: (context) => this.askPermission(context)
        });
        const cmdError = this.checkCommandAvailable(agent.command);
        if (cmdError) {
          this.updateAgentState(agent.id, (a) => { a.status = "error"; a.error = cmdError; });
          this.log("error", `${agent.label}: ${cmdError}`);
          return undefined;
        }

        this.connections.set(agent.id, connection);
        this.updateAgentState(agent.id, (a) => { a.status = "starting"; a.info = agent.command; });

        try {
          const startup = await connection.start();
          if (this.cancelRequested || runToken !== this.runToken) return undefined;

          // Apply saved session config (mode, model, configOptions)
          const sc = agent.sessionConfig;
          if (sc) {
            try {
              if (sc.mode) await connection.setMode(sc.mode);
              if (sc.configOptions) {
                for (const [optId, val] of Object.entries(sc.configOptions)) {
                  await connection.setConfigOption(optId, val);
                }
              }
            } catch (e) {
              this.log("info", `${agent.label}: session config apply failed: ${e instanceof Error ? e.message : String(e)}`);
            }
          }

          this.updateAgentState(agent.id, (a) => {
            a.status = "ready";
            a.sessionId = startup.sessionId;
            a.info = startup.agentInfo?.title || startup.agentInfo?.name || a.info;
          });
          return { id: agent.id, label: agent.label, connection };
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          this.updateAgentState(agent.id, (a) => { a.status = "error"; a.error = msg; });
          this.log("error", `${agent.label} failed: ${msg}`);
          return undefined;
        }
      })
    );

    const readyAgents = results.filter((r): r is { id: string; label: string; connection: AgentConnection } => Boolean(r));
    this.finishRound("startup", readyAgents.length ? "done" : "error", readyAgents.length ? "ready" : "failed");
    return readyAgents;
  }

  private async runRound(
    runToken: number, round: RoundState,
    participants: Array<{ id: string; label: string; connection: AgentConnection }>,
    buildPrompt: (p: { id: string; label: string; connection: AgentConnection }) => string
  ): Promise<Map<string, string>> {
    this.setRound(round);
    const outputs = new Map<string, string>();

    await Promise.all(
      participants.map(async (p) => {
        this.updateAgentState(p.id, (a) => { a.status = "running"; a.liveOutput = ""; a.error = undefined; });
        try {
          const result = await p.connection.prompt(buildPrompt(p));
          if (this.cancelRequested || runToken !== this.runToken) {
            this.updateAgentState(p.id, (a) => { a.status = "cancelled"; a.liveOutput = ""; });
            return;
          }
          if (result.stopReason === "cancelled") {
            // Agent-side cancel (e.g. permission denied) — not a full debate cancellation.
            // Save any partial output so the agent can still participate in subsequent rounds.
            const text = result.text?.trim();
            if (text) {
              outputs.set(p.id, text);
              this.updateAgentState(p.id, (a) => { a.status = "ready"; a.liveOutput = ""; a.roundOutputs[round.id] = text; });
            } else {
              this.updateAgentState(p.id, (a) => { a.status = "ready"; a.liveOutput = ""; });
              this.log("info", `${p.label}: prompt cancelled (permission denied?), will retry in next round`);
            }
            return;
          }
          outputs.set(p.id, result.text || "(empty)");
          this.updateAgentState(p.id, (a) => { a.status = "ready"; a.liveOutput = ""; a.roundOutputs[round.id] = result.text || "(empty)"; });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          this.updateAgentState(p.id, (a) => { a.status = this.cancelRequested ? "cancelled" : "error"; a.liveOutput = ""; a.error = msg; });
          if (!this.cancelRequested) this.log("error", `${p.label} failed: ${msg}`);
        }
      })
    );

    this.finishRound(round.id, this.cancelRequested ? "cancelled" : outputs.size ? "done" : "error",
      this.cancelRequested ? t("cancelled") : "");
    return outputs;
  }

  /* ------------------------------------------------------------------ */
  /*  Prompt builders (template-based)                                   */
  /* ------------------------------------------------------------------ */

  private buildRound1Prompt(topic: string, participant: { label: string }): string {
    const prefix = BUILTIN_PROMPT_PREFIXES.round1
      .replaceAll("{{topic}}", topic)
      .replaceAll("{{roleName}}", participant.label);
    return prefix + "\n\n" + this.state.promptTemplates.round1;
  }

  private buildCrossEvalPrompt(topic: string, participant: { id: string; label: string }, roundNumber: number, allPreviousOutputs: Map<string, Map<string, string>>): string {
    const peerOutputs = this.formatPeerOutputs(allPreviousOutputs, participant.id, PEER_OUTPUT_MAX_LEN);
    const ownOutputs = this.formatOwnOutputs(allPreviousOutputs, participant.id, PEER_OUTPUT_MAX_LEN);
    const prefix = BUILTIN_PROMPT_PREFIXES.crossEval
      .replaceAll("{{topic}}", topic)
      .replaceAll("{{roleName}}", participant.label)
      .replaceAll("{{roundNumber}}", String(roundNumber))
      .replaceAll("{{ownOutputs}}", ownOutputs || "No previous output from you.")
      .replaceAll("{{peerOutputs}}", peerOutputs || "No peer outputs were available.");
    return prefix + "\n\n" + this.state.promptTemplates.crossEval;
  }

  private buildSynthesisPromptFromAll(topic: string, allRoundOutputs: Map<string, Map<string, string>>): string {
    const allOutputs = this.formatAllOutputs(allRoundOutputs, SYNTHESIS_OUTPUT_MAX_LEN);
    const prefix = BUILTIN_PROMPT_PREFIXES.synthesis
      .replaceAll("{{topic}}", topic)
      .replaceAll("{{allOutputs}}", allOutputs || "None.");
    return prefix + "\n\n" + this.state.promptTemplates.synthesis;
  }

  private formatPeerOutputs(allOutputs: Map<string, Map<string, string>>, excludeId: string, maxLen: number): string {
    const sections: string[] = [];
    for (const [roundId, outputs] of allOutputs.entries()) {
      const peers = Array.from(outputs.entries()).filter(([id]) => id !== excludeId);
      if (!peers.length) continue;
      const label = roundId.replace("round", "Round ");
      const text = peers.map(([id, t]) => {
        const agent = this.state.agents.find((a) => a.id === id);
        return `### ${agent?.label ?? id}\n${truncateText(t, maxLen)}`;
      }).join("\n\n");
      sections.push(`## ${label}\n${text}`);
    }
    return sections.join("\n\n");
  }

  private formatOwnOutputs(allOutputs: Map<string, Map<string, string>>, agentId: string, maxLen: number): string {
    const sections: string[] = [];
    for (const [roundId, outputs] of allOutputs.entries()) {
      const own = outputs.get(agentId);
      if (!own) continue;
      const label = roundId.replace("round", "Round ");
      sections.push(`## ${label}\n${truncateText(own, maxLen)}`);
    }
    return sections.join("\n\n");
  }

  private formatAllOutputs(allOutputs: Map<string, Map<string, string>>, maxLen: number): string {
    const sections: string[] = [];
    for (const [roundId, outputs] of allOutputs.entries()) {
      if (!outputs.size) continue;
      const label = roundId.replace("round", "Round ");
      const text = Array.from(outputs.entries()).map(([id, t]) => {
        const agent = this.state.agents.find((a) => a.id === id);
        return `### ${agent?.label ?? id}\n${truncateText(t, maxLen)}`;
      }).join("\n\n");
      sections.push(`## ${label}\n${text}`);
    }
    return sections.join("\n\n");
  }

  /* ------------------------------------------------------------------ */
  /*  Permission dialog                                                  */
  /* ------------------------------------------------------------------ */

  private async askPermission(context: { agentLabel: string; params: any }): Promise<PermissionResolution> {
    if (this.cancelRequested) return { outcome: "cancelled" };

    const options = Array.isArray(context.params?.options) ? context.params.options : [];
    if (!options.length) return { outcome: "cancelled" };

    const toolTitle = String(context.params?.toolCall?.title ?? "Tool call");
    const rawInput = context.params?.toolCall?.rawInput
      ? truncateText(JSON.stringify(context.params.toolCall.rawInput, null, 2), PERMISSION_RAW_INPUT_MAX_LEN)
      : "";

    const items = options.map((o: any) => ({
      title: String(o.name ?? o.kind ?? o.optionId ?? "Select"),
      optionId: String(o.optionId)
    }));

    // Cancel any previously pending permission request
    if (this.pendingPermission) {
      this.pendingPermission.resolve({ outcome: "cancelled" });
      this.pendingPermission = undefined;
    }

    this.view?.webview.postMessage({
      type: "permissionRequest",
      agentLabel: context.agentLabel,
      toolTitle,
      rawInput,
      items
    });

    return new Promise<PermissionResolution>((resolve) => {
      this.pendingPermission = { resolve };
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Agent event handler (simplified — no tool call / plan tracking)    */
  /* ------------------------------------------------------------------ */

  private handleAgentEvent(agentId: string, event: AgentConnectionEvent): void {
    switch (event.type) {
      case "chunk":
        if (event.kind === "agent_message") {
          this.updateAgentState(agentId, (a) => { a.liveOutput += event.text; });
        }
        return;
      case "stderr":
        this.log("info", event.text);
        return;
      case "info":
        this.log("info", event.message);
        return;
      case "permission_required":
        this.updateAgentState(agentId, (a) => { a.status = "waiting_permission"; a.info = `Awaiting: ${event.title}`; });
        return;
      case "permission_resolved":
        this.updateAgentState(agentId, (a) => {
          if (a.status === "waiting_permission") a.status = this.cancelRequested ? "cancelled" : "running";
          a.info = `Permission: ${event.outcome}`;
        });
        return;
      default:
        return;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  State helpers                                                      */
  /* ------------------------------------------------------------------ */

  private updateAgentState(agentId: string, update: (a: AgentState) => void): void {
    const a = this.state.agents.find((x) => x.id === agentId);
    if (a) { update(a); this.pushState(); }
  }

  private setRound(round: RoundState): void {
    const existing = this.state.rounds.find((r) => r.id === round.id);
    if (existing) { existing.title = round.title; existing.status = round.status; existing.detail = round.detail; }
    else { this.state.rounds.push(round); }
    this.pushState();
  }

  private finishRound(roundId: string, status: RoundState["status"], detail: string): void {
    const r = this.state.rounds.find((x) => x.id === roundId);
    if (r) { r.status = status; r.detail = detail; this.pushState(); }
  }

  private markIncompleteRounds(status: RoundState["status"]): void {
    for (const r of this.state.rounds) { if (r.status === "running") r.status = status; }
    this.pushState();
  }

  private resetRunState(topic: string, cwd: string, agentConfigs: AgentConfig[], totalRounds: number, selectedModerator: string, templates?: PromptTemplates): void {
    this.state = createEmptyState(cwd);
    this.state.running = true;
    this.state.topic = topic;
    this.state.totalRounds = totalRounds;
    this.state.selectedModerator = selectedModerator;
    if (templates) this.state.promptTemplates = templates;
    this.state.availableAgents = agentConfigs.length;
    this.state.agents = agentConfigs.map((a) => ({ id: a.id, label: a.label, status: "idle" as const, liveOutput: "", roundOutputs: {} }));
    this.pushState();
  }


  private refreshAgentCount(): void {
    const enabled = getConfiguredAgents().filter((a) => a.enabled);
    this.state.availableAgents = enabled.length;
    this.state.cwd = getWorkspacePath();
    // Populate agents list when not running so the moderator dropdown works,
    // but only if no debate data exists (rounds with outputs to preserve).
    if (!this.state.running && this.state.rounds.length === 0) {
      this.state.agents = enabled.map((a) => ({
        id: a.id, label: a.label, status: "idle" as const, liveOutput: "", roundOutputs: {}
      }));
    }
  }

  private log(level: "info" | "error", message: string): void {
    const ts = new Date().toLocaleTimeString();
    this.outputChannel.appendLine(`[${ts}] [${level.toUpperCase()}] ${message}`);
  }

  private async cancelRun(reason: string): Promise<void> {
    if (!this.state.running && this.connections.size === 0) return;
    this.cancelRequested = true;
    this.runToken += 1;
    this.log("info", reason);

    // Resolve any pending permission dialog
    if (this.pendingPermission) {
      this.pendingPermission.resolve({ outcome: "cancelled" });
      this.pendingPermission = undefined;
    }
    this.view?.webview.postMessage({ type: "permissionDismiss" });

    for (const a of this.state.agents) {
      if (a.status === "running" || a.status === "waiting_permission" || a.status === "starting") a.status = "cancelled";
    }
    this.markIncompleteRounds("cancelled");
    for (const c of this.connections.values()) { try { await c.cancel(); } catch { /* best-effort */ } }
    await this.disposeConnections();
    this.state.running = false;
    this.pushState();
  }

  private async disposeConnections(): Promise<void> {
    const entries = Array.from(this.connections.values());
    this.connections.clear();
    await Promise.allSettled(entries.map((c) => c.dispose()));
  }

  private pushState(): void {
    if (!this.view) return;
    if (this.postStateTimer) clearTimeout(this.postStateTimer);
    this.postStateTimer = setTimeout(() => {
      this.view?.webview.postMessage({ type: "state", payload: this.state });
    }, STATE_PUSH_DEBOUNCE_MS);
  }

  /* ------------------------------------------------------------------ */
  /*  History persistence (globalState)                                  */
  /* ------------------------------------------------------------------ */

  private static readonly HISTORY_KEY = "agentDebate.history";

  private getHistoryEntries(): HistoryEntry[] {
    return this.context.globalState.get<HistoryEntry[]>(DebatePanelController.HISTORY_KEY, []);
  }

  private async setHistoryEntries(entries: HistoryEntry[]): Promise<void> {
    await this.context.globalState.update(DebatePanelController.HISTORY_KEY, entries);
  }

  private createHistoryEntry(): void {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.currentHistoryId = id;
    const entry: HistoryEntry = {
      id,
      topic: this.state.topic,
      timestamp: Date.now(),
      agentLabels: this.state.agents.map((a) => a.label),
      totalRounds: this.state.totalRounds,
      status: "running",
      rounds: this.state.rounds.map((r) => ({ ...r })),
      agents: this.state.agents.map((a) => ({ ...a, liveOutput: "" })),
      finalReport: this.state.finalReport
    };

    const entries = this.getHistoryEntries();
    entries.unshift(entry);
    if (entries.length > MAX_HISTORY_ENTRIES) {
      entries.length = MAX_HISTORY_ENTRIES;
    }
    this.setHistoryEntries(entries).catch((err) => this.log("error", `Failed to save history: ${err instanceof Error ? err.message : String(err)}`));
    this.log("info", `History created: ${id}`);
  }

  private updateHistoryEntry(status?: "running" | "done" | "error" | "cancelled"): void {
    if (!this.currentHistoryId) return;
    const entries = this.getHistoryEntries();
    const entry = entries.find((e) => e.id === this.currentHistoryId);
    if (!entry) return;
    entry.rounds = this.state.rounds.map((r) => ({ ...r }));
    entry.agents = this.state.agents.map((a) => ({ ...a, liveOutput: "" }));
    entry.finalReport = this.state.finalReport;
    if (status) entry.status = status;
    this.setHistoryEntries(entries).catch((err) => this.log("error", `Failed to update history: ${err instanceof Error ? err.message : String(err)}`));
    this.log("info", `History updated: ${this.currentHistoryId} (${status ?? "progress"})`);
  }

  private sendHistoryList(): void {
    const entries = this.getHistoryEntries();
    const list: HistoryMeta[] = entries.map((e) => ({
      id: e.id,
      topic: e.topic,
      timestamp: e.timestamp,
      agentLabels: e.agentLabels,
      totalRounds: e.totalRounds,
      status: e.status || "done"
    }));
    this.view?.webview.postMessage({ type: "historyList", entries: list });
  }

  private sendHistoryDetail(id: string): void {
    const entries = this.getHistoryEntries();
    const entry = entries.find((e) => e.id === id);
    if (entry) {
      this.view?.webview.postMessage({ type: "historyDetail", entry });
    }
  }

  private deleteHistoryEntry(id: string): void {
    const entries = this.getHistoryEntries().filter((e) => e.id !== id);
    this.setHistoryEntries(entries).catch((err) => this.log("error", `Failed to delete history: ${err instanceof Error ? err.message : String(err)}`));
    this.sendHistoryList();
  }

  private getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "media", "panel.js"));
    const i18nUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "media", "i18n.js"));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "media", "panel.css"));
    const nonce = getNonce();
    const locale = getLocale();
    const htmlLang = locale === "zh-cn" ? "zh-CN" : "en";

    return `<!DOCTYPE html>
<html lang="${htmlLang}">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="${styleUri}" />
    <title>Agent Debate</title>
  </head>
  <body data-locale="${locale}">
    <div id="app"></div>
    <script nonce="${nonce}" src="${i18nUri}"></script>
    <script nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>`;
  }
}

function getNonce(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

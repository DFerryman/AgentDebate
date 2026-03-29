import * as path from "node:path";
import { ChildProcessWithoutNullStreams, spawn, spawnSync } from "node:child_process";
import { StringDecoder } from "node:string_decoder";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: unknown;
}

interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
}

interface JsonRpcSuccess {
  jsonrpc: "2.0";
  id: number;
  result: unknown;
}

interface JsonRpcFailure {
  jsonrpc: "2.0";
  id: number | null;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

type IncomingMessage = JsonRpcRequest | JsonRpcNotification | JsonRpcSuccess | JsonRpcFailure;

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout?: NodeJS.Timeout;
}

interface LaunchSpec {
  command: string;
  args: string[];
  shell: boolean;
  windowsVerbatimArguments?: boolean;
}

export interface JsonRpcProcessOptions {
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  onNotification: (method: string, params: unknown) => void | Promise<void>;
  onRequest: (id: number, method: string, params: unknown) => Promise<unknown>;
  onLog: (level: "info" | "error", message: string) => void;
}

export class JsonRpcProcess {
  private readonly options: JsonRpcProcessOptions;
  private readonly decoder = new StringDecoder("utf8");
  private readonly pending = new Map<number, PendingRequest>();
  private readonly recentStderr: string[] = [];
  private process?: ChildProcessWithoutNullStreams;
  private stdoutBuffer = "";
  private nextId = 1;
  private disposed = false;

  public constructor(options: JsonRpcProcessOptions) {
    this.options = options;
  }

  public async start(): Promise<void> {
    if (this.process) {
      return;
    }

    const launchSpec = this.resolveLaunchSpec();
    this.options.onLog(
      "info",
      `Launching ACP process: ${launchSpec.command}${launchSpec.args.length ? ` ${launchSpec.args.join(" ")}` : ""}`
    );

    this.process = spawn(launchSpec.command, launchSpec.args, {
      cwd: this.options.cwd,
      env: this.options.env,
      shell: launchSpec.shell,
      windowsHide: true,
      windowsVerbatimArguments: launchSpec.windowsVerbatimArguments,
      stdio: "pipe"
    });

    this.process.stdout.on("data", (chunk: Buffer | string) => {
      this.handleStdoutChunk(typeof chunk === "string" ? chunk : this.decoder.write(chunk));
    });

    this.process.stderr.on("data", (chunk: Buffer | string) => {
      const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
      this.captureStderr(text);
    });

    this.process.on("error", (error) => {
      this.rejectAll(new Error(`Failed to launch ${launchSpec.command}: ${error.message}`));
    });

    this.process.on("exit", (code, signal) => {
      const reason = signal
        ? `Process exited from signal ${signal}`
        : `Process exited with code ${String(code)}`;
      this.rejectAll(new Error(this.appendRecentStderr(reason)));
    });
  }

  public async request<T>(method: string, params: unknown, timeoutMs?: number): Promise<T> {
    const id = this.nextId++;

    const payload: JsonRpcRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params
    };

    const promise = new Promise<T>((resolve, reject) => {
      const pendingRequest: PendingRequest = {
        resolve: (value) => resolve(value as T),
        reject
      };

      if (timeoutMs && timeoutMs > 0) {
        pendingRequest.timeout = setTimeout(() => {
          this.pending.delete(id);
          reject(new Error(this.appendRecentStderr(`Request timed out: ${method}`)));
        }, timeoutMs);
      }

      this.pending.set(id, pendingRequest);
    });

    this.write(payload);
    return promise;
  }

  public notify(method: string, params: unknown): void {
    const payload: JsonRpcNotification = {
      jsonrpc: "2.0",
      method,
      params
    };
    this.write(payload);
  }

  public async dispose(): Promise<void> {
    this.disposed = true;
    this.rejectAll(new Error("Process disposed"));

    if (!this.process) {
      return;
    }

    const current = this.process;
    this.process = undefined;

    if (!current.killed) {
      current.kill();
    }
  }

  private requireProcess(): ChildProcessWithoutNullStreams {
    if (!this.process) {
      throw new Error("JSON-RPC process is not running");
    }

    return this.process;
  }

  private write(payload: JsonRpcRequest | JsonRpcNotification | JsonRpcSuccess | JsonRpcFailure): void {
    const child = this.requireProcess();
    const line = `${JSON.stringify(payload)}\n`;
    child.stdin.write(line, "utf8");
  }

  private handleStdoutChunk(chunk: string): void {
    this.stdoutBuffer += chunk;

    while (true) {
      const newlineIndex = this.stdoutBuffer.indexOf("\n");
      if (newlineIndex === -1) {
        break;
      }

      const line = this.stdoutBuffer.slice(0, newlineIndex).trim();
      this.stdoutBuffer = this.stdoutBuffer.slice(newlineIndex + 1);

      if (!line) {
        continue;
      }

      let parsed: IncomingMessage;
      try {
        parsed = JSON.parse(line) as IncomingMessage;
      } catch {
        this.options.onLog("error", `Non-JSON stdout from agent: ${line}`);
        continue;
      }

      void this.handleIncomingMessage(parsed);
    }
  }

  private async handleIncomingMessage(message: IncomingMessage): Promise<void> {
    if ("method" in message && "id" in message) {
      try {
        const result = await this.options.onRequest(message.id, message.method, message.params);
        this.write({
          jsonrpc: "2.0",
          id: message.id,
          result
        });
      } catch (error) {
        this.write({
          jsonrpc: "2.0",
          id: message.id,
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : String(error)
          }
        });
      }
      return;
    }

    if ("method" in message) {
      await this.options.onNotification(message.method, message.params);
      return;
    }

    const pendingRequest = this.pending.get(message.id ?? -1);
    if (!pendingRequest) {
      return;
    }

    this.pending.delete(message.id ?? -1);
    if (pendingRequest.timeout) {
      clearTimeout(pendingRequest.timeout);
    }

    if ("error" in message) {
      pendingRequest.reject(new Error(this.appendRecentStderr(message.error.message)));
      return;
    }

    pendingRequest.resolve(message.result);
  }

  private resolveLaunchSpec(): LaunchSpec {
    if (process.platform !== "win32") {
      return {
        command: this.options.command,
        args: this.options.args,
        shell: false
      };
    }

    const explicit = this.resolveExplicitWindowsCommand(this.options.command);
    if (explicit) {
      return this.toLaunchSpec(explicit, this.options.args);
    }

    const commandMatches = spawnSync("where.exe", [this.options.command], {
      cwd: this.options.cwd,
      env: this.options.env,
      windowsHide: true,
      encoding: "utf8"
    });

    if (commandMatches.status === 0) {
      const matches = `${commandMatches.stdout ?? ""}`
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean);

      if (matches.length) {
        const preferred = pickPreferredWindowsCandidate(matches);
        return this.toLaunchSpec(preferred, this.options.args);
      }
    }

    return {
      command: this.options.command,
      args: this.options.args,
      shell: true
    };
  }

  private resolveExplicitWindowsCommand(command: string): string | undefined {
    if (!path.isAbsolute(command) && !command.includes("\\") && !command.includes("/")) {
      return undefined;
    }

    const extension = path.extname(command).toLowerCase();
    if (extension) {
      return command;
    }

    const candidates = [
      `${command}.exe`,
      `${command}.cmd`,
      `${command}.bat`,
      `${command}.ps1`,
      command
    ];

    return candidates.find((candidate) => {
      const result = spawnSync("where.exe", [candidate], {
        cwd: this.options.cwd,
        env: this.options.env,
        windowsHide: true,
        encoding: "utf8"
      });
      return result.status === 0;
    });
  }

  private toLaunchSpec(command: string, args: string[]): LaunchSpec {
    const extension = path.extname(command).toLowerCase();
    if (extension === ".ps1") {
      const powershell = path.join(
        process.env.SystemRoot ?? "C:\\Windows",
        "System32",
        "WindowsPowerShell",
        "v1.0",
        "powershell.exe"
      );
      return {
        command: powershell,
        args: ["-ExecutionPolicy", "Bypass", "-File", command, ...args],
        shell: false
      };
    }

    if (extension === ".cmd" || extension === ".bat") {
      const comspec = process.env.ComSpec ?? path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "cmd.exe");
      const commandLine = [quoteForCmd(command), ...args.map(quoteForCmd)].join(" ");
      // Wrap in extra quotes so cmd.exe /s strips the outer pair and leaves inner quoting intact
      return {
        command: comspec,
        args: ["/d", "/s", "/c", `"${commandLine}"`],
        shell: false,
        windowsVerbatimArguments: true
      };
    }

    return {
      command,
      args,
      shell: false
    };
  }

  private captureStderr(text: string): void {
    const cleaned = text.trim();
    if (!cleaned) {
      return;
    }

    this.recentStderr.push(cleaned);
    if (this.recentStderr.length > 8) {
      this.recentStderr.shift();
    }
    this.options.onLog("info", cleaned);
  }

  private appendRecentStderr(message: string): string {
    if (!this.recentStderr.length) {
      return message;
    }

    return `${message}\n${this.recentStderr.join("\n")}`;
  }

  private rejectAll(error: Error): void {
    if (this.disposed && this.pending.size === 0) {
      return;
    }

    for (const [id, pendingRequest] of this.pending.entries()) {
      if (pendingRequest.timeout) {
        clearTimeout(pendingRequest.timeout);
      }
      pendingRequest.reject(error);
      this.pending.delete(id);
    }
  }
}

function pickPreferredWindowsCandidate(candidates: string[]): string {
  const scored = [...candidates].sort((left, right) => scoreWindowsCandidate(left) - scoreWindowsCandidate(right));
  return scored[0];
}

function quoteForCmd(value: string): string {
  if (value.length === 0) {
    return '""';
  }

  return `"${value.replace(/"/g, '""')}"`;
}

function scoreWindowsCandidate(candidate: string): number {
  const extension = path.extname(candidate).toLowerCase();
  switch (extension) {
    case ".exe":
      return 0;
    case ".cmd":
      return 1;
    case ".bat":
      return 2;
    case ".ps1":
      return 3;
    default:
      return 4;
  }
}

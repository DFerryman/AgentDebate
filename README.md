# Agent Debate for VS Code

A VS Code extension that connects multiple [ACP](https://agentclientprotocol.com)-compatible coding agents and runs structured, multi-round discussions on any topic you provide.

Give it a question, and your agents will independently propose solutions, cross-review each other's ideas, then synthesize a final recommendation — all inside a chat-style panel.

## Features

- **Multi-agent discussions** — connect any number of ACP-compatible agents (Codex, Claude Code, OpenCode, etc.)
- **Structured rounds** — independent proposals, configurable cross-review rounds (1–8), and a final synthesis
- **Live streaming** — watch each agent's output in real time with Markdown rendering
- **Permission handling** — ACP permission requests are surfaced as in-panel dialogs so you stay in control
- **Session configuration** — set agent mode, model, and config options per agent from the settings panel
- **Discussion history** — past debates are saved and can be reviewed anytime
- **Customizable prompts** — edit the prompt templates for each round to fit your workflow
- **i18n** — English and Simplified Chinese UI

## Prerequisites

You need at least one ACP-compatible agent CLI installed and authenticated on your machine.

### Verified agents

| Agent | Command | Args | Install | Note |
|-------|---------|---------|---------|---------|
| Codex | `codex-acp` |  | `npm i -g @zed-industries/codex-acp` | Install optional platform dependency, e.g. Win32 Platform `npm i -g @zed-industries/codex-acp-win32-x64`  |
| Claude Code | `claude-agent-acp` | | `npm i -g @agentclientprotocol/claude-agent-acp` | | 
| OpenCode | `opencode` | `acp` |See [opencode.ai](https://opencode.ai/docs/acp/) | Make sure run `opencode auth login` first  | 

> Any CLI that implements the [Agent Client Protocol](https://agentclientprotocol.com) will work.

### Authentication

Each agent CLI must be authenticated before use:

- **Codex** — set `OPENAI_API_KEY` or complete its local login flow
- **Claude Code** — complete its local login flow
- **OpenCode** — configure API keys per its CLI documentation

## Getting Started

1. Install the extension from the VS Code Marketplace (or build from source).
2. Open the **Agent Debate** panel from the Activity Bar (left sidebar).
3. Click the **gear icon** to open Settings and verify your agents are connected.
4. Type a topic in the input box and press **Enter** (or click Send).
5. Watch the agents discuss, then read the final synthesis.

## How It Works

Each discussion follows three phases:

1. **Independent Proposals** — every agent produces its own solution without seeing others' work.
2. **Cross-Review** (configurable, default 2 rounds) — agents review all previous outputs and revise their recommendations.
3. **Final Synthesis** — one agent (the moderator) merges all discussion into a single actionable recommendation.

## Configuration

Open **Settings** (`Ctrl+,`) and search for `agentDebate`, or use the gear icon in the panel.

### `agentDebate.agents`

Define the agents that participate in discussions:

```json
{
  "agentDebate.agents": [
    {
      "id": "codex",
      "label": "Codex",
      "enabled": true,
      "command": "codex-acp",
      "args": [],
      "env": {}
    },
    {
      "id": "claude",
      "label": "Claude Code",
      "enabled": true,
      "command": "claude-agent-acp",
      "args": [],
      "env": {}
    },
    {
      "id": "opencode",
      "label": "OpenCode",
      "enabled": true,
      "command": "opencode",
      "args": ["acp"],
      "env": {}
    }
  ]
}
```

Each agent entry supports:

| Field | Description |
|-------|-------------|
| `id` | Stable identifier for the agent |
| `label` | Display name shown in the panel |
| `enabled` | Whether this agent participates by default |
| `command` | Executable to launch (must be in PATH or an absolute path) |
| `args` | Arguments passed to the executable |
| `env` | Extra environment variables for the agent process |

### Other settings

| Setting | Default | Description |
|---------|---------|-------------|
| `agentDebate.defaultRounds` | `2` | Number of cross-review rounds (1–8) |
| `agentDebate.defaultModerator` | `""` (auto) | Agent ID for synthesis; empty = auto-select |
| `agentDebate.promptStyle` | `fast-mvp` | Prompt framing style (`fast-mvp`, `architecture`, `code-review`) |

## Limitations

- Each discussion starts a fresh session; previous sessions are not reused.
- Agents are granted read-only file access (`fs/read_text_file`); file writing and terminal execution are not exposed.
- Markdown rendering is lightweight — tables, footnotes, and other complex syntax are not supported.

## Source Code

[![GitHub](https://img.shields.io/github/stars/DFerryman/AgentDebate?style=social)](https://github.com/DFerryman/AgentDebate)

https://github.com/DFerryman/AgentDebate

## License

[MIT](LICENSE)

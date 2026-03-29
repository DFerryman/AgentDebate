import * as vscode from "vscode";
import { initLocale } from "./i18n";
import { DebatePanelController } from "./panel";

let controller: DebatePanelController | undefined;

export function activate(context: vscode.ExtensionContext): void {
  initLocale();
  const outputChannel = vscode.window.createOutputChannel("Agent Debate");
  controller = new DebatePanelController(context, outputChannel);

  context.subscriptions.push(
    outputChannel,
    vscode.window.registerWebviewViewProvider(
      DebatePanelController.viewType,
      controller,
      { webviewOptions: { retainContextWhenHidden: true } }
    ),
    vscode.commands.registerCommand("agentDebate.openPanel", () => {
      controller?.open();
    }),
    vscode.commands.registerCommand("agentDebate.showHistory", () => {
      controller?.triggerWebviewAction("showHistory");
    }),
    vscode.commands.registerCommand("agentDebate.showLogs", () => {
      controller?.triggerWebviewAction("showLogs");
    }),
    vscode.commands.registerCommand("agentDebate.showSettings", () => {
      controller?.triggerWebviewAction("showSettings");
    }),
    {
      dispose: () => {
        void controller?.dispose();
      }
    }
  );
}

export function deactivate(): Thenable<void> | undefined {
  if (!controller) {
    return undefined;
  }
  return controller.dispose();
}

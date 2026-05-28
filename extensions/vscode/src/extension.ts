import * as vscode from "vscode";

const TOKEN_SECRET_KEY = "nexusAi.developerToken";
const DEFAULT_MODEL = "gpt-4.1-mini";
const MAX_CONTEXT_CHARS = 20000;

type NexusChatResponse = {
  answer?: string;
  conversationId?: string;
  creditsUsed?: number;
  tokensUsed?: number;
  error?: string;
};

type NexusChatPayload = {
  prompt: string;
  selectedText?: string;
  fileName?: string;
  languageId?: string;
  workspaceName?: string;
  model: typeof DEFAULT_MODEL;
};

export function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel("Nexus AI");
  context.subscriptions.push(output);

  context.subscriptions.push(
    vscode.commands.registerCommand("nexus-ai.setApiUrl", async () => {
      const currentUrl = getApiUrl();
      const apiUrl = await vscode.window.showInputBox({
        title: "Nexus AI API URL",
        prompt: "Enter your Nexus AI app URL.",
        value: currentUrl,
        placeHolder: "http://localhost:3000",
        ignoreFocusOut: true,
      });

      if (!apiUrl) return;

      await vscode.workspace
        .getConfiguration("nexusAi")
        .update("apiUrl", apiUrl.trim(), vscode.ConfigurationTarget.Global);

      vscode.window.showInformationMessage("Nexus AI API URL saved.");
    }),
    vscode.commands.registerCommand("nexus-ai.setDeveloperToken", async () => {
      const token = await vscode.window.showInputBox({
        title: "Nexus AI Developer Token",
        prompt: "Paste the one-time token generated in Nexus AI settings.",
        password: true,
        ignoreFocusOut: true,
      });

      if (!token) return;

      await context.secrets.store(TOKEN_SECRET_KEY, token.trim());
      vscode.window.showInformationMessage("Nexus AI developer token saved.");
    }),
    vscode.commands.registerCommand("nexus-ai.askSelection", async () => {
      const editor = vscode.window.activeTextEditor;

      if (!editor) {
        vscode.window.showWarningMessage("Open a file before asking Nexus AI.");
        return;
      }

      const selectedText = editor.document.getText(editor.selection);

      if (!selectedText.trim()) {
        vscode.window.showWarningMessage("Select code before using Ask About Selection.");
        return;
      }

      const prompt = await vscode.window.showInputBox({
        title: "Ask Nexus AI",
        prompt: "What should Nexus AI do with this selection?",
        placeHolder: "Explain, refactor, debug, add tests...",
        ignoreFocusOut: true,
      });

      if (!prompt) return;

      await askNexus(context, output, {
        prompt,
        selectedText: trimContext(selectedText),
        fileName: getActiveFileName(editor),
        languageId: editor.document.languageId,
        workspaceName: getWorkspaceName(),
        model: DEFAULT_MODEL,
      });
    }),
    vscode.commands.registerCommand("nexus-ai.explainFile", async () => {
      const editor = vscode.window.activeTextEditor;

      if (!editor) {
        vscode.window.showWarningMessage("Open a file before asking Nexus AI.");
        return;
      }

      await askNexus(context, output, {
        prompt: "Explain this file. Call out architecture, risks, and useful improvements.",
        selectedText: trimContext(editor.document.getText()),
        fileName: getActiveFileName(editor),
        languageId: editor.document.languageId,
        workspaceName: getWorkspaceName(),
        model: DEFAULT_MODEL,
      });
    })
  );
}

export function deactivate() {}

async function askNexus(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
  payload: NexusChatPayload
) {
  const token = await context.secrets.get(TOKEN_SECRET_KEY);

  if (!token) {
    const action = await vscode.window.showWarningMessage(
      "Set your Nexus AI developer token before using the extension.",
      "Set Token"
    );

    if (action === "Set Token") {
      await vscode.commands.executeCommand("nexus-ai.setDeveloperToken");
    }

    return;
  }

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Nexus AI is thinking...",
        cancellable: false,
      },
      async () => {
        const apiUrl = getApiUrl().replace(/\/$/, "");
        const endpoint = `${apiUrl}/api/extensions/vscode/chat`;

        output.appendLine(`POST ${endpoint}`);

        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = (await res.json()) as NexusChatResponse;

        if (!res.ok || !data.answer) {
          throw new Error(data.error || "Nexus AI request failed");
        }

        showAnswerPanel(data.answer, {
          conversationId: data.conversationId,
          creditsUsed: data.creditsUsed,
          tokensUsed: data.tokensUsed,
          fileName: payload.fileName,
        });
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Nexus AI request failed";
    output.appendLine(message);
    vscode.window.showErrorMessage(message);
  }
}

function showAnswerPanel(
  answer: string,
  metadata: {
    conversationId?: string;
    creditsUsed?: number;
    tokensUsed?: number;
    fileName?: string;
  }
) {
  const panel = vscode.window.createWebviewPanel(
    "nexusAiAnswer",
    "Nexus AI",
    vscode.ViewColumn.Beside,
    {
      enableScripts: false,
      retainContextWhenHidden: true,
    }
  );

  panel.webview.html = getWebviewHtml(answer, metadata);
}

function getWebviewHtml(
  answer: string,
  metadata: {
    conversationId?: string;
    creditsUsed?: number;
    tokensUsed?: number;
    fileName?: string;
  }
) {
  const details = [
    metadata.fileName ? `File: ${metadata.fileName}` : "",
    metadata.creditsUsed ? `${metadata.creditsUsed} credits` : "",
    metadata.tokensUsed ? `${metadata.tokensUsed} tokens` : "",
    metadata.conversationId ? `Conversation: ${metadata.conversationId}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      :root {
        color-scheme: dark;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      body {
        margin: 0;
        background: #070a18;
        color: #f8fafc;
      }

      main {
        max-width: 860px;
        margin: 0 auto;
        padding: 28px;
      }

      .header {
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.04);
        padding: 18px;
      }

      .eyebrow {
        color: #67e8f9;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }

      .details {
        margin-top: 8px;
        color: #94a3b8;
        font-size: 12px;
        line-height: 1.6;
      }

      pre {
        margin-top: 20px;
        white-space: pre-wrap;
        word-break: break-word;
        line-height: 1.75;
        font-size: 14px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        background: rgba(15, 23, 42, 0.72);
        padding: 20px;
      }
    </style>
  </head>
  <body>
    <main>
      <div class="header">
        <div class="eyebrow">Nexus AI</div>
        <div class="details">${escapeHtml(details || "Coding assistant response")}</div>
      </div>
      <pre>${escapeHtml(answer)}</pre>
    </main>
  </body>
</html>`;
}

function getApiUrl() {
  return (
    vscode.workspace.getConfiguration("nexusAi").get<string>("apiUrl") ||
    "http://localhost:3000"
  );
}

function getWorkspaceName() {
  return vscode.workspace.workspaceFolders?.[0]?.name;
}

function getActiveFileName(editor: vscode.TextEditor) {
  return vscode.workspace.asRelativePath(editor.document.uri, false);
}

function trimContext(text: string) {
  if (text.length <= MAX_CONTEXT_CHARS) {
    return text;
  }

  return `${text.slice(0, MAX_CONTEXT_CHARS)}\n\n[Context truncated by Nexus AI VS Code extension.]`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

import * as vscode from "vscode";

const TOKEN_SECRET_KEY = "nexusAi.developerToken";
const LAST_WELCOME_VERSION_KEY = "nexusAi.lastWelcomeVersion";
const EXTENSION_VERSION = "0.1.2";
const DEFAULT_MODEL = "gpt-4.1-mini";
const PRODUCTION_API_URL = "https://nexus-ai-jet-kappa.vercel.app";
const LOCAL_API_URL = "http://localhost:3000";
const MAX_CONTEXT_CHARS = 20000;
const DEFAULT_WORKSPACE_MAX_FILES = 120;
const DEFAULT_WORKSPACE_CONTEXT_CHARS = 32000;
const MAX_TREE_FILES = 250;
const MAX_FILE_CONTEXT_CHARS = 6000;
const EXTENSION_URI_AUTHORITY = "nexus-ai.nexus-ai-vscode";
const EXCLUDED_WORKSPACE_GLOB =
  "{**/node_modules/**,**/.git/**,**/.next/**,**/dist/**,**/build/**,**/coverage/**,**/.vercel/**,**/.turbo/**,**/out/**,**/.cache/**,**/*.lock,**/package-lock.json,**/pnpm-lock.yaml,**/yarn.lock,**/.env,**/.env.*,**/*.png,**/*.jpg,**/*.jpeg,**/*.gif,**/*.webp,**/*.ico,**/*.pdf,**/*.zip,**/*.gz,**/*.tgz,**/*.map}";

const CONTEXT_FILE_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".prisma",
  ".sql",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

const PRIORITY_CONTEXT_FILES = [
  /^agents\.md$/i,
  /^readme(\.[a-z0-9_-]+)?\.md$/i,
  /^package\.json$/i,
  /^extensions\/vscode\/package\.json$/i,
  /^extensions\/vscode\/src\/extension\.ts$/i,
  /^src\/app\/api\/extensions\/vscode\/chat\/route\.ts$/i,
  /^next\.config\.[cm]?[jt]s$/i,
  /^tsconfig\.json$/i,
  /^prisma\/schema\.prisma$/i,
];

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
  workspaceContext?: string;
  model: typeof DEFAULT_MODEL;
};

type AskOptions = {
  prompt?: string;
  requireSelection?: boolean;
  wholeFile?: boolean;
  includeWorkspace?: boolean;
};

type WorkspaceOverview = {
  hasWorkspace: boolean;
  workspaceName: string;
  rootPath?: string;
  activeFile?: string;
  fileCountLabel: string;
  includeWorkspaceContext: boolean;
  apiUrl: string;
};

export function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel("Nexus AI");
  const statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  const assistantView = new NexusAssistantViewProvider(context);
  const workspaceProvider = new NexusWorkspaceTreeProvider();

  statusBar.text = "$(sparkle) Nexus AI";
  statusBar.tooltip = "Show Nexus AI Workspace";
  statusBar.command = "nexus-ai.showWorkspace";
  statusBar.show();

  showWorkspaceLocationOnUpdate(context);

  context.subscriptions.push(
    output,
    statusBar,
    vscode.window.registerTreeDataProvider("nexus-ai.workspace", workspaceProvider),
    vscode.window.registerTreeDataProvider(
      "nexus-ai.explorerWorkspace",
      workspaceProvider
    ),
    vscode.window.registerWebviewViewProvider(
      "nexus-ai.assistant",
      assistantView,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      }
    ),
    vscode.window.registerUriHandler({
      handleUri: async (uri) => {
        await handleConnectCallback(context, assistantView, uri);
      },
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      workspaceProvider.refresh();
      assistantView.refresh();
    }),
    vscode.window.onDidChangeActiveTextEditor(() => {
      assistantView.refresh();
    }),
    vscode.commands.registerCommand("nexus-ai.openAssistant", async () => {
      await vscode.commands.executeCommand("workbench.view.extension.nexus-ai");
      await focusView("nexus-ai.assistant.focus");
    }),
    vscode.commands.registerCommand("nexus-ai.showWorkspace", async () => {
      await vscode.commands.executeCommand("workbench.view.explorer");
    }),
    vscode.commands.registerCommand("nexus-ai.refreshWorkspace", async () => {
      workspaceProvider.refresh();
      await assistantView.refresh();
      vscode.window.showInformationMessage("Nexus AI workspace refreshed.");
    }),
    vscode.commands.registerCommand("nexus-ai.askWorkspace", async () => {
      await askFromEditor(context, output, {
        includeWorkspace: true,
        prompt: await vscode.window.showInputBox({
          title: "Ask Nexus AI About This Workspace",
          prompt: "What should Nexus AI do with this workspace?",
          placeHolder: "Find the VS Code extension flow and explain why the workspace is not visible...",
          ignoreFocusOut: true,
        }),
      });
    }),
    vscode.commands.registerCommand("nexus-ai.connect", async () => {
      await connectNexus(context, assistantView);
    }),
    vscode.commands.registerCommand("nexus-ai.setApiUrl", async () => {
      await setApiUrl();
      assistantView.refresh();
    }),
    vscode.commands.registerCommand("nexus-ai.testApiConnection", async () => {
      await testApiConnection(output);
      assistantView.refresh();
    }),
    vscode.commands.registerCommand("nexus-ai.setDeveloperToken", async () => {
      await setDeveloperToken(context);
      assistantView.refresh();
    }),
    vscode.commands.registerCommand("nexus-ai.ask", async () => {
      await askFromEditor(context, output);
    }),
    vscode.commands.registerCommand("nexus-ai.askSelection", async () => {
      await askFromEditor(context, output, {
        requireSelection: true,
      });
    }),
    vscode.commands.registerCommand("nexus-ai.explainFile", async () => {
      await askFromEditor(context, output, {
        wholeFile: true,
        prompt:
          "Explain this file. Call out architecture, risks, and useful improvements.",
      });
    })
  );
}

export function deactivate() {}

class NexusAssistantViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;

  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.webview.onDidReceiveMessage(async (message: { command: string }) => {
      switch (message.command) {
        case "connect":
          await vscode.commands.executeCommand("nexus-ai.connect");
          break;
        case "ask":
          await vscode.commands.executeCommand("nexus-ai.ask");
          break;
        case "askWorkspace":
          await vscode.commands.executeCommand("nexus-ai.askWorkspace");
          break;
        case "explain":
          await vscode.commands.executeCommand("nexus-ai.explainFile");
          break;
        case "api":
          await vscode.commands.executeCommand("nexus-ai.setApiUrl");
          break;
        case "testApi":
          await vscode.commands.executeCommand("nexus-ai.testApiConnection");
          break;
        case "refreshWorkspace":
          await vscode.commands.executeCommand("nexus-ai.refreshWorkspace");
          break;
        case "token":
          await vscode.commands.executeCommand("nexus-ai.setDeveloperToken");
          break;
        case "settings":
          await openNexusSettings();
          break;
      }
    });

    this.refresh();
  }

  async refresh() {
    if (!this.view) return;

    const connected = Boolean(await this.context.secrets.get(TOKEN_SECRET_KEY));
    const overview = await getWorkspaceOverview();
    this.view.webview.html = getAssistantViewHtml(connected, overview);
  }
}

class WorkspaceNode {
  readonly children = new Map<string, WorkspaceNode>();

  constructor(
    readonly label: string,
    readonly type: "root" | "folder" | "file" | "empty" | "info",
    readonly uri?: vscode.Uri
  ) {}

  get sortedChildren() {
    return [...this.children.values()].sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "folder" || a.type === "root" ? -1 : 1;
      }

      return a.label.localeCompare(b.label);
    });
  }
}

class NexusWorkspaceTreeProvider implements vscode.TreeDataProvider<WorkspaceNode> {
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<
    WorkspaceNode | undefined | void
  >();
  private rootsPromise = this.buildTree();

  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  refresh() {
    this.rootsPromise = this.buildTree();
    this.onDidChangeTreeDataEmitter.fire();
  }

  async getChildren(element?: WorkspaceNode) {
    if (element) {
      return element.sortedChildren;
    }

    return this.rootsPromise;
  }

  getTreeItem(element: WorkspaceNode) {
    const collapsibleState =
      element.type === "file" || element.type === "empty" || element.type === "info"
        ? vscode.TreeItemCollapsibleState.None
        : element.type === "root"
          ? vscode.TreeItemCollapsibleState.Expanded
          : vscode.TreeItemCollapsibleState.Collapsed;

    const item = new vscode.TreeItem(element.label, collapsibleState);

    item.resourceUri = element.uri;
    item.contextValue = `nexus-ai.${element.type}`;

    if (element.type === "file" && element.uri) {
      item.command = {
        command: "vscode.open",
        title: "Open File",
        arguments: [element.uri],
      };
      item.iconPath = vscode.ThemeIcon.File;
    } else if (element.type === "root" || element.type === "folder") {
      item.iconPath = vscode.ThemeIcon.Folder;
    } else if (element.type === "empty") {
      item.iconPath = new vscode.ThemeIcon("folder-opened");
    } else {
      item.iconPath = new vscode.ThemeIcon("info");
    }

    return item;
  }

  private async buildTree() {
    const folders = vscode.workspace.workspaceFolders ?? [];

    if (folders.length === 0) {
      return [
        new WorkspaceNode(
          "Open a folder to give Nexus AI workspace context.",
          "empty"
        ),
      ];
    }

    const rootNodes = new Map<string, WorkspaceNode>();

    for (const folder of folders) {
      rootNodes.set(folder.uri.toString(), new WorkspaceNode(folder.name, "root", folder.uri));
    }

    const files = await vscode.workspace.findFiles(
      "**/*",
      EXCLUDED_WORKSPACE_GLOB,
      MAX_TREE_FILES
    );

    for (const file of files) {
      const folder = vscode.workspace.getWorkspaceFolder(file);

      if (!folder) {
        continue;
      }

      const root = rootNodes.get(folder.uri.toString());
      const relativePath = getRelativePath(file);

      if (!root || !relativePath || isSensitivePath(relativePath)) {
        continue;
      }

      insertFileNode(root, relativePath, file);
    }

    const roots = [...rootNodes.values()];

    if (files.length >= MAX_TREE_FILES) {
      roots[0]?.children.set(
        "__nexus_info__",
        new WorkspaceNode(`Showing first ${MAX_TREE_FILES} files`, "info")
      );
    }

    return roots;
  }
}

function insertFileNode(root: WorkspaceNode, relativePath: string, uri: vscode.Uri) {
  const segments = relativePath.split("/").filter(Boolean);
  let current = root;

  segments.forEach((segment, index) => {
    const isFile = index === segments.length - 1;
    const key = `${isFile ? "file" : "folder"}:${segment}`;
    let child = current.children.get(key);

    if (!child) {
      child = new WorkspaceNode(segment, isFile ? "file" : "folder", isFile ? uri : undefined);
      current.children.set(key, child);
    }

    current = child;
  });
}

async function connectNexus(
  context: vscode.ExtensionContext,
  assistantView?: NexusAssistantViewProvider
) {
  const apiUrl = getApiUrl();
  const redirect = `vscode://${EXTENSION_URI_AUTHORITY}/connect`;
  const connectUrl = new URL(`${apiUrl}/api/developer-tokens/vscode-callback`);

  connectUrl.searchParams.set("redirect", redirect);
  connectUrl.searchParams.set("name", `${getWorkspaceName() ?? "VS Code"} - VS Code`);

  await vscode.env.openExternal(vscode.Uri.parse(connectUrl.toString()));

  const action = await vscode.window.showInformationMessage(
    "Finish connecting Nexus AI in your browser. VS Code will capture the token automatically.",
    "Change API URL",
    "Paste Token Manually"
  );

  if (action === "Change API URL") {
    await setApiUrl();
    assistantView?.refresh();
  }

  if (action === "Paste Token Manually") {
    await setDeveloperToken(context);
    assistantView?.refresh();
  }
}

async function setApiUrl() {
  const currentUrl = getApiUrl();
  const apiUrl = await vscode.window.showInputBox({
    title: "Nexus AI API URL",
    prompt:
      `Enter your deployed Nexus AI app URL. Use ${LOCAL_API_URL} only while running local development.`,
    value: currentUrl,
    placeHolder: PRODUCTION_API_URL,
    ignoreFocusOut: true,
    validateInput: (value) =>
      normalizeApiUrl(value)
        ? undefined
        : "Enter a valid http(s) URL, for example https://your-app.vercel.app.",
  });

  if (!apiUrl) return null;

  const normalizedUrl = normalizeApiUrl(apiUrl);

  if (!normalizedUrl) {
    vscode.window.showErrorMessage("Nexus AI API URL was not saved.");
    return null;
  }

  await vscode.workspace
    .getConfiguration("nexusAi")
    .update("apiUrl", normalizedUrl, vscode.ConfigurationTarget.Global);

  vscode.window.showInformationMessage(
    isLocalApiUrl(normalizedUrl)
      ? "Nexus AI API URL saved for local development."
      : "Nexus AI production API URL saved."
  );
  return normalizedUrl;
}

async function testApiConnection(output: vscode.OutputChannel) {
  const healthUrl = `${getApiUrl()}/api/extensions/vscode/health`;

  try {
    output.appendLine(`GET ${healthUrl}`);
    const res = await fetch(healthUrl, {
      headers: {
        Accept: "application/json",
      },
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      name?: string;
      error?: string;
    };

    if (!res.ok || !data.ok) {
      throw new Error(data.error || `API returned ${res.status}`);
    }

    vscode.window.showInformationMessage(
      `Connected to ${data.name ?? "Nexus AI"} at ${getApiUrl()}.`
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "API connection failed";
    output.appendLine(message);
    vscode.window.showErrorMessage(`Nexus AI API connection failed: ${message}`);
  }
}

async function setDeveloperToken(context: vscode.ExtensionContext) {
  const token = await vscode.window.showInputBox({
    title: "Nexus AI Developer Token",
    prompt: "Paste the token generated in Nexus AI settings.",
    password: true,
    ignoreFocusOut: true,
  });

  if (!token) return null;

  await context.secrets.store(TOKEN_SECRET_KEY, token.trim());
  vscode.window.showInformationMessage("Nexus AI is connected.");
  return token.trim();
}

async function handleConnectCallback(
  context: vscode.ExtensionContext,
  assistantView: NexusAssistantViewProvider,
  uri: vscode.Uri
) {
  if (uri.authority !== EXTENSION_URI_AUTHORITY || uri.path !== "/connect") {
    return;
  }

  const params = new URLSearchParams(uri.query);
  const token = params.get("token");
  const apiUrl = normalizeApiUrl(params.get("apiUrl"));

  if (!token) {
    vscode.window.showErrorMessage("Nexus AI did not return a developer token.");
    return;
  }

  await context.secrets.store(TOKEN_SECRET_KEY, token);

  if (apiUrl) {
    await vscode.workspace
      .getConfiguration("nexusAi")
      .update("apiUrl", apiUrl, vscode.ConfigurationTarget.Global);
  }

  assistantView.refresh();
  await vscode.commands.executeCommand("nexus-ai.openAssistant");
  vscode.window.showInformationMessage("Nexus AI is connected to VS Code.");
}

async function askFromEditor(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
  options: AskOptions = {}
) {
  const editor = vscode.window.activeTextEditor;

  if (!editor && !options.includeWorkspace) {
    vscode.window.showWarningMessage("Open a file before asking Nexus AI.");
    return;
  }

  const selectedText = editor?.document.getText(editor.selection) ?? "";
  const hasSelection = selectedText.trim().length > 0;

  if (options.requireSelection && !hasSelection) {
    vscode.window.showWarningMessage("Select code before using Ask About Selection.");
    return;
  }

  const prompt =
    options.prompt ??
    (await vscode.window.showInputBox({
      title: "Ask Nexus AI",
      prompt: hasSelection
        ? "What should Nexus AI do with this selection?"
        : options.includeWorkspace
          ? "What should Nexus AI do with this workspace?"
          : "What should Nexus AI do with this file?",
      placeHolder: "Explain, refactor, debug, add tests...",
      ignoreFocusOut: true,
    }));

  if (!prompt) return;

  const contextText = editor
    ? options.wholeFile || !hasSelection
      ? editor.document.getText()
      : selectedText
    : "";
  const includeWorkspace =
    options.includeWorkspace ?? getWorkspaceContextEnabled();
  const workspaceContext = includeWorkspace
    ? await buildWorkspaceContext(editor, output)
    : undefined;

  await askNexus(context, output, {
    prompt,
    selectedText: contextText ? trimContext(contextText, MAX_CONTEXT_CHARS) : undefined,
    fileName: editor ? getActiveFileName(editor) : undefined,
    languageId: editor?.document.languageId,
    workspaceName: getWorkspaceName(),
    workspaceContext,
    model: DEFAULT_MODEL,
  });
}

async function askNexus(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
  payload: NexusChatPayload
) {
  const token = await context.secrets.get(TOKEN_SECRET_KEY);

  if (!token) {
    const action = await vscode.window.showWarningMessage(
      "Connect Nexus AI before asking about code.",
      "Connect"
    );

    if (action === "Connect") {
      await vscode.commands.executeCommand("nexus-ai.connect");
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
        const apiUrl = getApiUrl();
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

  panel.webview.html = getAnswerHtml(answer, metadata);
}

async function getWorkspaceOverview(): Promise<WorkspaceOverview> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  const activeEditor = vscode.window.activeTextEditor;
  const files =
    folders.length > 0
      ? await vscode.workspace.findFiles("**/*", EXCLUDED_WORKSPACE_GLOB, MAX_TREE_FILES)
      : [];

  return {
    hasWorkspace: folders.length > 0,
    workspaceName: getWorkspaceName() ?? "No workspace folder",
    rootPath: folders[0]?.uri.fsPath,
    activeFile: activeEditor ? getActiveFileName(activeEditor) : undefined,
    fileCountLabel:
      files.length >= MAX_TREE_FILES ? `${MAX_TREE_FILES}+` : String(files.length),
    includeWorkspaceContext: getWorkspaceContextEnabled(),
    apiUrl: getApiUrl(),
  };
}

async function buildWorkspaceContext(
  activeEditor: vscode.TextEditor | undefined,
  output: vscode.OutputChannel
) {
  const folders = vscode.workspace.workspaceFolders ?? [];

  if (folders.length === 0) {
    return undefined;
  }

  const maxFiles = getWorkspaceMaxFiles();
  const maxChars = getWorkspaceContextMaxChars();
  const files = await vscode.workspace.findFiles(
    "**/*",
    EXCLUDED_WORKSPACE_GLOB,
    maxFiles
  );
  const relativeFiles = files
    .map(getRelativePath)
    .filter((file): file is string => Boolean(file))
    .filter((file) => !isSensitivePath(file))
    .sort((a, b) => a.localeCompare(b));
  const chunks = [
    `Workspace: ${folders.map((folder) => folder.name).join(", ")}`,
    activeEditor ? `Active file: ${getActiveFileName(activeEditor)}` : "",
    `Workspace file list (${relativeFiles.length}${files.length >= maxFiles ? "+" : ""} files shown):\n${relativeFiles
      .map((file) => `- ${file}`)
      .join("\n")}`,
  ].filter(Boolean);
  const contextFiles = selectWorkspaceContextFiles(files, activeEditor);

  for (const file of contextFiles) {
    const relativePath = getRelativePath(file);

    if (!relativePath || isSensitivePath(relativePath) || !isTextContextFile(relativePath)) {
      continue;
    }

    try {
      const stat = await vscode.workspace.fs.stat(file);

      if (stat.size > 150000) {
        continue;
      }

      const bytes = await vscode.workspace.fs.readFile(file);
      const text = Buffer.from(bytes).toString("utf8");

      if (looksBinary(text)) {
        continue;
      }

      chunks.push(
        `File context: ${relativePath}\n\`\`\`${getFenceLanguage(relativePath)}\n${text.slice(
          0,
          MAX_FILE_CONTEXT_CHARS
        )}${text.length > MAX_FILE_CONTEXT_CHARS ? "\n[File truncated by Nexus AI VS Code extension.]" : ""}\n\`\`\``
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`Skipping workspace context file ${relativePath}: ${message}`);
    }
  }

  return trimContext(chunks.join("\n\n"), maxChars);
}

function selectWorkspaceContextFiles(
  files: vscode.Uri[],
  activeEditor: vscode.TextEditor | undefined
) {
  const selected = new Map<string, vscode.Uri>();

  if (activeEditor && activeEditor.document.uri.scheme === "file") {
    selected.set(activeEditor.document.uri.toString(), activeEditor.document.uri);
  }

  for (const pattern of PRIORITY_CONTEXT_FILES) {
    for (const file of files) {
      const relativePath = getRelativePath(file);

      if (relativePath && pattern.test(relativePath)) {
        selected.set(file.toString(), file);
      }
    }
  }

  return [...selected.values()].slice(0, 8);
}

function getAssistantViewHtml(connected: boolean, overview: WorkspaceOverview) {
  const status = connected ? "Connected" : "Not connected";
  const apiMode = isLocalApiUrl(overview.apiUrl) ? "Local development API" : "Production API";
  const workspaceStatus = overview.hasWorkspace ? "Workspace ready" : "No folder open";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body {
        margin: 0;
        padding: 18px;
        background: transparent;
        color: var(--vscode-foreground);
        font-family: var(--vscode-font-family);
      }

      .logo {
        align-items: center;
        display: flex;
        gap: 12px;
        margin-bottom: 18px;
      }

      .mark {
        align-items: center;
        background: linear-gradient(135deg, #0ea5e9, #22c55e);
        border-radius: 10px;
        color: white;
        display: flex;
        font-size: 20px;
        font-weight: 900;
        height: 42px;
        justify-content: center;
        width: 42px;
      }

      h1 {
        font-size: 18px;
        margin: 0;
      }

      p {
        color: var(--vscode-descriptionForeground);
        line-height: 1.55;
        margin: 8px 0 0;
      }

      .status {
        border: 1px solid var(--vscode-panel-border);
        border-radius: 8px;
        margin: 14px 0;
        padding: 12px;
      }

      .pill {
        border-radius: 999px;
        display: inline-block;
        font-size: 11px;
        font-weight: 800;
        margin-bottom: 8px;
        padding: 4px 9px;
      }

      .connected {
        background: rgba(16, 185, 129, 0.16);
        color: #6ee7b7;
      }

      .disconnected {
        background: rgba(245, 158, 11, 0.16);
        color: #fcd34d;
      }

      .neutral {
        background: rgba(14, 165, 233, 0.16);
        color: #7dd3fc;
      }

      button {
        background: var(--vscode-button-background);
        border: 0;
        border-radius: 8px;
        color: var(--vscode-button-foreground);
        cursor: pointer;
        display: block;
        font-weight: 700;
        margin-top: 10px;
        padding: 10px 12px;
        text-align: left;
        width: 100%;
      }

      button.secondary {
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
      }

      code {
        background: var(--vscode-textCodeBlock-background);
        border-radius: 6px;
        display: block;
        margin-top: 8px;
        overflow-wrap: anywhere;
        padding: 8px;
      }
    </style>
  </head>
  <body>
    <div class="logo">
      <div class="mark">N</div>
      <div>
        <h1>Nexus AI</h1>
        <p>Code assistant for this workspace.</p>
      </div>
    </div>

    <div class="status">
      <span class="pill ${connected ? "connected" : "disconnected"}">${status}</span>
      <p>${escapeHtml(apiMode)}</p>
      <code>${escapeHtml(overview.apiUrl)}</code>
    </div>

    <div class="status">
      <span class="pill neutral">${escapeHtml(workspaceStatus)}</span>
      <p>${escapeHtml(overview.workspaceName)}</p>
      ${
        overview.rootPath
          ? `<code>${escapeHtml(overview.rootPath)}</code>`
          : "<p>Open a folder in VS Code so Nexus AI can read local workspace context.</p>"
      }
      <p>${escapeHtml(overview.fileCountLabel)} files available in the Nexus workspace tree.</p>
      ${
        overview.activeFile
          ? `<p>Active file: ${escapeHtml(overview.activeFile)}</p>`
          : ""
      }
      <p>Workspace context is ${overview.includeWorkspaceContext ? "enabled" : "disabled"}.</p>
    </div>

    <button onclick="send('ask')">Ask Nexus AI</button>
    <button onclick="send('askWorkspace')">Ask about workspace</button>
    <button onclick="send('explain')">Explain current file</button>
    <button onclick="send('connect')" class="secondary">${connected ? "Reconnect Nexus AI" : "Connect Nexus AI"}</button>
    <button onclick="send('refreshWorkspace')" class="secondary">Refresh workspace</button>
    <button onclick="send('testApi')" class="secondary">Test API connection</button>
    <button onclick="send('api')" class="secondary">Change API URL</button>

    <script>
      const vscode = acquireVsCodeApi();
      function send(command) {
        vscode.postMessage({ command });
      }
    </script>
  </body>
</html>`;
}

function getAnswerHtml(
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
    .join(" - ");

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
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.04);
        padding: 18px;
      }

      .eyebrow {
        color: #67e8f9;
        font-size: 12px;
        font-weight: 800;
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
        border-radius: 8px;
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

async function openNexusSettings() {
  await vscode.env.openExternal(vscode.Uri.parse(`${getApiUrl()}/settings`));
}

async function showWorkspaceLocationOnUpdate(context: vscode.ExtensionContext) {
  const lastVersion = context.globalState.get<string>(LAST_WELCOME_VERSION_KEY);

  if (lastVersion === EXTENSION_VERSION) {
    return;
  }

  await context.globalState.update(LAST_WELCOME_VERSION_KEY, EXTENSION_VERSION);

  const action = await vscode.window.showInformationMessage(
    "Nexus AI Workspace is available in the Explorer panel.",
    "Open Explorer"
  );

  if (action === "Open Explorer") {
    await vscode.commands.executeCommand("workbench.view.explorer");
  }
}

async function focusView(command: string) {
  try {
    await vscode.commands.executeCommand(command);
  } catch {
    // Older VS Code-compatible editors may not expose generated focus commands.
  }
}

function getApiUrl() {
  const configured = vscode.workspace.getConfiguration("nexusAi").get<string>("apiUrl");
  return normalizeApiUrl(configured) ?? PRODUCTION_API_URL;
}

function normalizeApiUrl(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    const path = url.pathname.replace(/\/+$/, "");
    return `${url.origin}${path === "/" ? "" : path}`;
  } catch {
    return null;
  }
}

function isLocalApiUrl(apiUrl: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::|\/|$)/i.test(apiUrl);
}

function getWorkspaceContextEnabled() {
  return vscode.workspace
    .getConfiguration("nexusAi")
    .get<boolean>("includeWorkspaceContext", true);
}

function getWorkspaceMaxFiles() {
  const configured = vscode.workspace
    .getConfiguration("nexusAi")
    .get<number>("workspaceMaxFiles", DEFAULT_WORKSPACE_MAX_FILES);

  return Math.min(Math.max(configured, 20), 500);
}

function getWorkspaceContextMaxChars() {
  const configured = vscode.workspace
    .getConfiguration("nexusAi")
    .get<number>("workspaceContextMaxChars", DEFAULT_WORKSPACE_CONTEXT_CHARS);

  return Math.min(Math.max(configured, 8000), 80000);
}

function getWorkspaceName() {
  return vscode.workspace.workspaceFolders?.[0]?.name;
}

function getActiveFileName(editor: vscode.TextEditor) {
  return getRelativePath(editor.document.uri) ?? editor.document.fileName;
}

function getRelativePath(uri: vscode.Uri) {
  if (uri.scheme !== "file") {
    return null;
  }

  return vscode.workspace.asRelativePath(uri, false).replace(/\\/g, "/");
}

function isSensitivePath(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/").toLowerCase();
  const fileName = normalized.split("/").pop() ?? normalized;

  return (
    fileName === ".env" ||
    fileName.startsWith(".env.") ||
    normalized.includes("/.env.") ||
    normalized.includes("/.env/") ||
    normalized.includes("/node_modules/") ||
    normalized.includes("/.git/")
  );
}

function isTextContextFile(relativePath: string) {
  return CONTEXT_FILE_EXTENSIONS.has(getExtension(relativePath));
}

function getExtension(relativePath: string) {
  const fileName = relativePath.split("/").pop() ?? relativePath;
  const lastDot = fileName.lastIndexOf(".");

  return lastDot >= 0 ? fileName.slice(lastDot).toLowerCase() : "";
}

function getFenceLanguage(relativePath: string) {
  const extension = getExtension(relativePath).slice(1);

  if (extension === "md") return "markdown";
  if (extension === "yml") return "yaml";

  return extension;
}

function looksBinary(text: string) {
  return text.includes("\u0000");
}

function trimContext(text: string, maxChars: number) {
  if (text.length <= maxChars) {
    return text;
  }

  return `${text.slice(0, maxChars)}\n\n[Context truncated by Nexus AI VS Code extension.]`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

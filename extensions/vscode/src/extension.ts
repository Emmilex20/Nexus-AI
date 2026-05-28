import * as vscode from "vscode";

const TOKEN_SECRET_KEY = "nexusAi.developerToken";
const LAST_WELCOME_VERSION_KEY = "nexusAi.lastWelcomeVersion";
const EXTENSION_VERSION = "0.3.0";
const DEFAULT_MODEL = "gpt-4.1-mini";
const PRODUCTION_API_URL = "https://nexus-ai-jet-kappa.vercel.app";
const LOCAL_API_URL = "http://localhost:3000";
const MAX_CONTEXT_CHARS = 20000;
const DEFAULT_WORKSPACE_MAX_FILES = 120;
const DEFAULT_WORKSPACE_CONTEXT_CHARS = 32000;
const MAX_TREE_FILES = 250;
const MAX_FILE_CONTEXT_CHARS = 6000;
const MAX_AGENT_FILE_CHARS = 60000;
const MAX_AGENT_FILES = 12;
const MAX_IMAGE_ATTACHMENTS = 4;
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

type NexusFileSnapshot = {
  path: string;
  languageId?: string;
  content: string;
};

type NexusAgentChange = {
  path: string;
  action: "create" | "update" | "delete";
  description?: string;
  content?: string;
};

type NexusPermissionMode = "default" | "auto-review" | "full-access";

type NexusImageAttachment = {
  kind: "image";
  name: string;
  type: string;
  dataUrl: string;
};

type NexusAgentPayload = NexusChatPayload & {
  files: NexusFileSnapshot[];
  attachments: NexusImageAttachment[];
  permissionMode: NexusPermissionMode;
};

type NexusAgentResponse = NexusChatResponse & {
  changes?: NexusAgentChange[];
};

type AskOptions = {
  prompt?: string;
  requireSelection?: boolean;
  wholeFile?: boolean;
  includeWorkspace?: boolean;
};

type AssistantMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: string;
  changes?: NexusAgentChange[];
};

type WebviewMessage = {
  command: string;
  prompt?: string;
  path?: string;
  permissionMode?: NexusPermissionMode;
  attachments?: NexusImageAttachment[];
};

type WorkspaceOverview = {
  hasWorkspace: boolean;
  workspaceName: string;
  rootPath?: string;
  activeFile?: string;
  fileCountLabel: string;
  includeWorkspaceContext: boolean;
  apiUrl: string;
  permissionMode: NexusPermissionMode;
};

export function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel("Nexus AI");
  const statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  const workspaceProvider = new NexusWorkspaceTreeProvider();
  const assistantView = new NexusAssistantViewProvider(
    context,
    output,
    workspaceProvider
  );

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
    vscode.window.registerWebviewViewProvider(
      "nexus-ai.explorerAssistant",
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
      const prompt = await vscode.window.showInputBox({
        title: "Ask Nexus AI About This Workspace",
        prompt: "What should Nexus AI do with this workspace?",
        placeHolder: "Fix the build error and update the files safely...",
        ignoreFocusOut: true,
      });

      if (prompt) {
        await assistantView.submitPrompt(prompt);
      }
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
  private readonly views = new Set<vscode.WebviewView>();
  private readonly messages: AssistantMessage[] = [
    {
      role: "assistant",
      content:
        "Tell me what to build, fix, or update. I can inspect the workspace context, propose file changes, and apply them after you review.",
    },
  ];
  private pendingChanges: NexusAgentChange[] = [];
  private busy = false;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly output: vscode.OutputChannel,
    private readonly workspaceProvider: NexusWorkspaceTreeProvider
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this.views.add(webviewView);

    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.onDidDispose(() => {
      this.views.delete(webviewView);
    });

    webviewView.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
      switch (message.command) {
        case "submit":
          if (message.permissionMode) {
            await setPermissionMode(message.permissionMode);
          }
          await this.submitPrompt(
            message.prompt ?? "",
            sanitizeImageAttachments(message.attachments ?? [])
          );
          break;
        case "setPermissionMode":
          if (message.permissionMode) {
            await setPermissionMode(message.permissionMode);
            await this.refresh();
          }
          break;
        case "applyChanges":
          await this.applyPendingChanges();
          break;
        case "clearChanges":
          this.pendingChanges = [];
          this.messages.push({
            role: "system",
            content: "Pending changes cleared.",
          });
          await this.refresh();
          break;
        case "openFile":
          await this.openWorkspaceFile(message.path);
          break;
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
    const connected = Boolean(await this.context.secrets.get(TOKEN_SECRET_KEY));
    const overview = await getWorkspaceOverview();

    for (const view of this.views) {
      view.webview.html = getAssistantViewHtml({
        connected,
        overview,
        messages: this.messages,
        pendingChanges: this.pendingChanges,
        busy: this.busy,
      });
    }
  }

  async submitPrompt(rawPrompt: string, attachments: NexusImageAttachment[] = []) {
    const prompt = rawPrompt.trim();

    if (!prompt || this.busy) {
      return;
    }

    const token = await this.context.secrets.get(TOKEN_SECRET_KEY);

    if (!token) {
      this.messages.push({
        role: "assistant",
        content: "Connect Nexus AI first, then I can work on this workspace.",
      });
      await this.refresh();
      const action = await vscode.window.showWarningMessage(
        "Connect Nexus AI before asking the coding assistant to edit files.",
        "Connect"
      );

      if (action === "Connect") {
        await vscode.commands.executeCommand("nexus-ai.connect");
      }

      return;
    }

    this.messages.push({
      role: "user",
      content:
        attachments.length > 0
          ? `${prompt}\n\n[${attachments.length} image attachment${attachments.length === 1 ? "" : "s"}]`
          : prompt,
    });
    this.busy = true;
    this.pendingChanges = [];
    await this.refresh();

    try {
      const editor = vscode.window.activeTextEditor;
      const selectedText = editor?.document.getText(editor.selection) ?? "";
      const hasSelection = selectedText.trim().length > 0;
      const workspaceContext = getWorkspaceContextEnabled()
        ? await buildWorkspaceContext(editor, this.output)
        : undefined;
      const files = await buildAgentFileSnapshots(editor, this.output);
      const permissionMode = getPermissionMode();
      const payload: NexusAgentPayload = {
        prompt,
        selectedText: hasSelection
          ? trimContext(selectedText, MAX_CONTEXT_CHARS)
          : undefined,
        fileName: editor ? getActiveFileName(editor) : undefined,
        languageId: editor?.document.languageId,
        workspaceName: getWorkspaceName(),
        workspaceContext,
        files,
        attachments,
        permissionMode,
        model: DEFAULT_MODEL,
      };
      const data = await requestNexusAgent(token, payload, this.output);

      this.pendingChanges = data.changes ?? [];
      this.messages.push({
        role: "assistant",
        content: data.answer ?? "Done.",
        metadata: formatAgentMetadata(data),
        changes: this.pendingChanges,
      });

      if (this.pendingChanges.length > 0 && permissionMode === "auto-review") {
        await this.openReviewPreviews(this.pendingChanges);
        this.messages.push({
          role: "system",
          content: "Opened proposed change previews. Review them, then apply when ready.",
        });
      }

      if (this.pendingChanges.length > 0 && permissionMode === "full-access") {
        await this.applyPendingChanges({ skipConfirmation: true });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Nexus AI request failed";
      this.output.appendLine(message);
      this.messages.push({
        role: "assistant",
        content: `I could not complete that request: ${message}`,
      });
      vscode.window.showErrorMessage(message);
    } finally {
      this.busy = false;
      await this.refresh();
    }
  }

  private async applyPendingChanges(options: { skipConfirmation?: boolean } = {}) {
    if (this.pendingChanges.length === 0) {
      vscode.window.showInformationMessage("No Nexus AI changes to apply.");
      return;
    }

    const action = options.skipConfirmation
      ? "Apply"
      : await vscode.window.showWarningMessage(
          `Apply ${this.pendingChanges.length} Nexus AI file change${this.pendingChanges.length === 1 ? "" : "s"}?`,
          { modal: true },
          "Apply"
        );

    if (action !== "Apply") {
      return;
    }

    try {
      const appliedChanges = [...this.pendingChanges];
      const applied = await applyAgentChanges(this.pendingChanges);

      this.messages.push({
        role: "system",
        content: `${options.skipConfirmation ? "Full access applied" : "Applied"} ${applied} file change${applied === 1 ? "" : "s"}${appliedChanges.length > 0 ? `: ${appliedChanges.map((change) => change.path).join(", ")}` : ""}.`,
      });
      this.pendingChanges = [];
      this.workspaceProvider.refresh();
      await this.refresh();
      vscode.window.showInformationMessage("Nexus AI changes applied.");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Could not apply Nexus AI changes";

      this.output.appendLine(message);
      vscode.window.showErrorMessage(message);
      this.messages.push({
        role: "assistant",
        content: `I could not apply the changes: ${message}`,
      });
      await this.refresh();
    }
  }

  private async openWorkspaceFile(path: string | undefined) {
    if (!path) return;

    const uri = getWorkspaceUri(path);

    if (!uri) {
      vscode.window.showErrorMessage("Nexus AI could not open that workspace file.");
      return;
    }

    try {
      const document = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(document, vscode.ViewColumn.Active);
    } catch {
      vscode.window.showInformationMessage("That file does not exist yet.");
    }
  }

  private async openReviewPreviews(changes: NexusAgentChange[]) {
    const previewable = changes
      .filter((change) => change.action !== "delete" && change.content !== undefined)
      .slice(0, 3);

    for (const change of previewable) {
      const document = await vscode.workspace.openTextDocument({
        content: change.content ?? "",
        language: getFenceLanguage(change.path),
      });

      await vscode.window.showTextDocument(document, {
        preview: true,
        viewColumn: vscode.ViewColumn.Beside,
      });
    }
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
    const data = await readJsonResponse<{
      ok?: boolean;
      name?: string;
      error?: string;
    }>(res, healthUrl);

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

        const data = await readJsonResponse<NexusChatResponse>(res, endpoint);

        if (!res.ok || !data.answer) {
          throw new Error(
            data.error ||
              getApiResponseErrorMessage(
                res.status,
                endpoint,
                "The chat endpoint did not return an answer."
              )
          );
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

async function requestNexusAgent(
  token: string,
  payload: NexusAgentPayload,
  output: vscode.OutputChannel
) {
  const apiUrl = getApiUrl();
  const endpoint = `${apiUrl}/api/extensions/vscode/agent`;

  output.appendLine(`POST ${endpoint}`);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await readJsonResponse<NexusAgentResponse>(res, endpoint);

  if (!res.ok || !data.answer) {
    throw new Error(
      data.error ||
        getApiResponseErrorMessage(
          res.status,
          endpoint,
          "The agent endpoint did not return an answer."
        )
    );
  }

  return data;
}

async function readJsonResponse<T>(res: Response, endpoint: string) {
  const text = await res.text();

  if (!text.trim()) {
    throw new Error(
      getApiResponseErrorMessage(
        res.status,
        endpoint,
        "The API returned an empty response."
      )
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      getApiResponseErrorMessage(
        res.status,
        endpoint,
        `The API returned ${describeResponseText(text)} instead of JSON.`
      )
    );
  }
}

function getApiResponseErrorMessage(
  status: number,
  endpoint: string,
  detail: string
) {
  const apiUrl = getApiUrl();
  const isAgentEndpoint = endpoint.includes("/api/extensions/vscode/agent");
  const isChatEndpoint = endpoint.includes("/api/extensions/vscode/chat");
  const isVsCodeEndpoint = isAgentEndpoint || isChatEndpoint;
  const setupHint = isLocalApiUrl(apiUrl)
    ? `Make sure the Nexus AI dev server is running at ${apiUrl}.`
    : isAgentEndpoint
      ? "The deployed Nexus AI app likely does not have the new VS Code agent endpoint yet. Deploy the latest code, or set the extension API URL to http://localhost:3000 while running pnpm dev."
      : "Check that the deployed Nexus AI app is up to date and that the API URL is correct.";

  return [
    `Nexus AI API returned ${status || "an invalid response"}.`,
    detail,
    isVsCodeEndpoint ? setupHint : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function describeResponseText(text: string) {
  const trimmed = text.trim();

  if (trimmed.startsWith("<!doctype") || trimmed.startsWith("<html")) {
    return "an HTML page";
  }

  return trimmed.length > 80
    ? `non-JSON text: ${trimmed.slice(0, 80)}...`
    : `non-JSON text: ${trimmed}`;
}

function formatAgentMetadata(data: NexusAgentResponse) {
  return [
    data.creditsUsed ? `${data.creditsUsed} credits` : "",
    data.tokensUsed ? `${data.tokensUsed} tokens` : "",
    data.conversationId ? `Conversation: ${data.conversationId}` : "",
  ]
    .filter(Boolean)
    .join(" - ");
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
    permissionMode: getPermissionMode(),
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

async function buildAgentFileSnapshots(
  activeEditor: vscode.TextEditor | undefined,
  output: vscode.OutputChannel
) {
  const folders = vscode.workspace.workspaceFolders ?? [];

  if (folders.length === 0) {
    return [];
  }

  const files = await vscode.workspace.findFiles(
    "**/*",
    EXCLUDED_WORKSPACE_GLOB,
    getWorkspaceMaxFiles()
  );
  const selectedFiles = selectWorkspaceContextFiles(files, activeEditor);
  const snapshots: NexusFileSnapshot[] = [];

  for (const file of selectedFiles) {
    const relativePath = getRelativePath(file);

    if (
      !relativePath ||
      isUnsafeAgentPath(relativePath) ||
      !isTextContextFile(relativePath)
    ) {
      continue;
    }

    try {
      const stat = await vscode.workspace.fs.stat(file);

      if (stat.size > MAX_AGENT_FILE_CHARS * 2) {
        continue;
      }

      const bytes = await vscode.workspace.fs.readFile(file);
      const content = Buffer.from(bytes).toString("utf8");

      if (looksBinary(content)) {
        continue;
      }

      snapshots.push({
        path: relativePath,
        languageId:
          activeEditor?.document.uri.toString() === file.toString()
            ? activeEditor.document.languageId
            : getFenceLanguage(relativePath),
        content: content.slice(0, MAX_AGENT_FILE_CHARS),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`Skipping agent file snapshot ${relativePath}: ${message}`);
    }
  }

  return snapshots.slice(0, MAX_AGENT_FILES);
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

function getAssistantViewHtml({
  connected,
  overview,
  messages,
  pendingChanges,
  busy,
}: {
  connected: boolean;
  overview: WorkspaceOverview;
  messages: AssistantMessage[];
  pendingChanges: NexusAgentChange[];
  busy: boolean;
}) {
  const status = connected ? "Connected" : "Not connected";
  const apiMode = isLocalApiUrl(overview.apiUrl) ? "Local API" : "Production API";
  const workspaceStatus = overview.hasWorkspace ? "Workspace ready" : "No folder open";
  const renderedMessages = messages.map(renderAssistantMessage).join("");
  const renderedChanges = renderPendingChanges(pendingChanges);
  const permissionLabel = getPermissionLabel(overview.permissionMode);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body {
        margin: 0;
        padding: 0;
        background: transparent;
        color: var(--vscode-foreground);
        font-family: var(--vscode-font-family);
      }

      .shell {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
      }

      .scroll {
        flex: 1;
        overflow: auto;
        padding: 14px;
      }

      .logo {
        align-items: center;
        display: flex;
        gap: 12px;
        margin-bottom: 12px;
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
        margin: 10px 0;
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

      button.inline {
        display: inline-flex;
        margin: 8px 8px 0 0;
        width: auto;
      }

      button.secondary {
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
      }

      button:disabled,
      textarea:disabled {
        cursor: not-allowed;
        opacity: 0.62;
      }

      code {
        background: var(--vscode-textCodeBlock-background);
        border-radius: 6px;
        display: inline-block;
        margin-top: 8px;
        overflow-wrap: anywhere;
        padding: 8px;
      }

      .messages {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 12px;
      }

      .message {
        border: 1px solid var(--vscode-panel-border);
        border-radius: 8px;
        padding: 10px;
      }

      .message.user {
        background: var(--vscode-input-background);
      }

      .message.assistant {
        background: color-mix(in srgb, var(--vscode-editor-background) 82%, var(--vscode-button-background));
      }

      .message.system {
        opacity: 0.84;
      }

      .role {
        color: var(--vscode-descriptionForeground);
        font-size: 11px;
        font-weight: 800;
        margin-bottom: 6px;
        text-transform: uppercase;
      }

      .content {
        line-height: 1.55;
        white-space: pre-wrap;
      }

      .metadata {
        color: var(--vscode-descriptionForeground);
        font-size: 11px;
        margin-top: 8px;
      }

      .change {
        border: 1px solid var(--vscode-panel-border);
        border-radius: 8px;
        margin-top: 8px;
        padding: 10px;
      }

      .change-head {
        align-items: center;
        display: flex;
        gap: 8px;
        justify-content: space-between;
      }

      .change-path {
        font-family: var(--vscode-editor-font-family);
        overflow-wrap: anywhere;
      }

      .change-action {
        border-radius: 999px;
        font-size: 10px;
        font-weight: 800;
        padding: 3px 7px;
        text-transform: uppercase;
      }

      .change-action.create {
        background: rgba(34, 197, 94, 0.18);
        color: #86efac;
      }

      .change-action.update {
        background: rgba(14, 165, 233, 0.18);
        color: #7dd3fc;
      }

      .change-action.delete {
        background: rgba(248, 113, 113, 0.18);
        color: #fca5a5;
      }

      pre {
        background: var(--vscode-textCodeBlock-background);
        border-radius: 6px;
        font-family: var(--vscode-editor-font-family);
        font-size: 11px;
        line-height: 1.45;
        max-height: 220px;
        overflow: auto;
        padding: 8px;
        white-space: pre-wrap;
      }

      .composer {
        border-top: 1px solid var(--vscode-panel-border);
        padding: 10px;
      }

      .composer-box {
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
        border-radius: 16px;
        padding: 8px;
      }

      .composer-row {
        align-items: center;
        display: flex;
        gap: 8px;
        justify-content: space-between;
        margin-top: 8px;
      }

      .left-tools,
      .right-tools {
        align-items: center;
        display: flex;
        gap: 6px;
        min-width: 0;
      }

      .icon-button {
        align-items: center;
        background: var(--vscode-button-secondaryBackground);
        border: 1px solid var(--vscode-panel-border);
        border-radius: 999px;
        color: var(--vscode-button-secondaryForeground);
        display: inline-flex;
        height: 30px;
        justify-content: center;
        margin: 0;
        min-width: 30px;
        padding: 0 10px;
        text-align: center;
        width: auto;
      }

      .send-button {
        align-items: center;
        border-radius: 999px;
        display: inline-flex;
        height: 32px;
        justify-content: center;
        margin: 0;
        min-width: 38px;
        padding: 0 12px;
        width: auto;
      }

      .permission-select {
        background: var(--vscode-dropdown-background);
        border: 1px solid var(--vscode-dropdown-border, var(--vscode-panel-border));
        border-radius: 999px;
        color: var(--vscode-dropdown-foreground);
        font: inherit;
        font-size: 12px;
        height: 30px;
        max-width: 155px;
        padding: 0 8px;
      }

      .attachments {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 8px;
      }

      .attachment {
        align-items: center;
        background: var(--vscode-editor-background);
        border: 1px solid var(--vscode-panel-border);
        border-radius: 8px;
        display: flex;
        gap: 8px;
        max-width: 100%;
        padding: 5px;
      }

      .attachment img {
        border-radius: 6px;
        height: 38px;
        object-fit: cover;
        width: 48px;
      }

      .attachment span {
        color: var(--vscode-descriptionForeground);
        font-size: 11px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .drop-hint {
        color: var(--vscode-descriptionForeground);
        font-size: 11px;
        margin-top: 6px;
      }

      textarea {
        background: transparent;
        border: 0;
        box-sizing: border-box;
        color: var(--vscode-input-foreground);
        display: block;
        font-family: var(--vscode-font-family);
        line-height: 1.45;
        min-height: 82px;
        outline: none;
        padding: 4px;
        resize: vertical;
        width: 100%;
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <div class="scroll">
        <div class="logo">
          <div class="mark">N</div>
          <div>
            <h1>Nexus AI</h1>
            <p>Tell it what to change. Review, then apply.</p>
          </div>
        </div>

        <div class="status">
          <span class="pill ${connected ? "connected" : "disconnected"}">${status}</span>
          <span class="pill neutral">${escapeHtml(workspaceStatus)}</span>
          <p>${escapeHtml(apiMode)}: <code>${escapeHtml(overview.apiUrl)}</code></p>
          <p>Permissions: ${escapeHtml(permissionLabel)}</p>
          <p>${escapeHtml(overview.workspaceName)} · ${escapeHtml(overview.fileCountLabel)} files · context ${overview.includeWorkspaceContext ? "on" : "off"}</p>
          ${overview.activeFile ? `<p>Active file: ${escapeHtml(overview.activeFile)}</p>` : ""}
        </div>

        ${renderedChanges}

        <div class="messages">
          ${renderedMessages}
        </div>
      </div>

      <form class="composer" id="composer">
        <div class="composer-box" id="composerBox">
          <div class="attachments" id="attachments"></div>
          <textarea id="prompt" ${busy ? "disabled" : ""} placeholder="Ask Nexus AI to build, fix, refactor, inspect an image..."></textarea>
          <div class="composer-row">
            <div class="left-tools">
              <button class="icon-button" type="button" id="attachButton" title="Attach images">+</button>
              <select class="permission-select" id="permissionMode" title="Permission mode">
                <option value="default" ${overview.permissionMode === "default" ? "selected" : ""}>Default</option>
                <option value="auto-review" ${overview.permissionMode === "auto-review" ? "selected" : ""}>Auto-review</option>
                <option value="full-access" ${overview.permissionMode === "full-access" ? "selected" : ""}>Full access</option>
              </select>
            </div>
            <div class="right-tools">
              <button class="icon-button" type="button" onclick="send('connect')" title="${connected ? "Reconnect" : "Connect"}">${connected ? "On" : "Off"}</button>
              <button class="send-button" id="send" type="submit" ${busy ? "disabled" : ""}>${busy ? "..." : "Send"}</button>
            </div>
          </div>
          <div class="drop-hint">Paste, drop, or attach images. Ctrl+Enter sends.</div>
          <input id="imageInput" type="file" accept="image/*" multiple hidden />
        </div>
      </form>
    </div>
    <script>
      const vscode = acquireVsCodeApi();
      function send(command) {
        vscode.postMessage({ command });
      }
      function openFile(path) {
        vscode.postMessage({ command: 'openFile', path });
      }
      const attachments = [];
      const imageInput = document.getElementById('imageInput');
      const attachmentList = document.getElementById('attachments');
      const permissionMode = document.getElementById('permissionMode');
      const composerBox = document.getElementById('composerBox');

      function renderAttachments() {
        attachmentList.innerHTML = attachments.map((attachment, index) => (
          '<div class="attachment">' +
          '<img src="' + attachment.dataUrl + '" alt="" />' +
          '<span title="' + escapeAttribute(attachment.name) + '">' + escapeHtml(attachment.name) + '</span>' +
          '<button class="icon-button" type="button" onclick="removeAttachment(' + index + ')" title="Remove image">x</button>' +
          '</div>'
        )).join('');
      }

      function escapeHtml(value) {
        return String(value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }

      function escapeAttribute(value) {
        return escapeHtml(value).replace(new RegExp(String.fromCharCode(96), 'g'), '&#096;');
      }

      window.removeAttachment = (index) => {
        attachments.splice(index, 1);
        renderAttachments();
      };

      function addFiles(fileList) {
        Array.from(fileList || [])
          .filter((file) => file.type.startsWith('image/'))
          .slice(0, ${MAX_IMAGE_ATTACHMENTS})
          .forEach((file) => {
            if (attachments.length >= ${MAX_IMAGE_ATTACHMENTS}) return;
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = String(reader.result || '');
              if (!dataUrl.startsWith('data:image/')) return;
              attachments.push({
                kind: 'image',
                name: file.name || 'pasted-image',
                type: file.type || 'image/png',
                dataUrl,
              });
              renderAttachments();
            };
            reader.readAsDataURL(file);
          });
      }

      document.getElementById('attachButton').addEventListener('click', () => imageInput.click());
      imageInput.addEventListener('change', () => {
        addFiles(imageInput.files);
        imageInput.value = '';
      });
      permissionMode.addEventListener('change', () => {
        vscode.postMessage({ command: 'setPermissionMode', permissionMode: permissionMode.value });
      });
      document.addEventListener('paste', (event) => {
        addFiles(event.clipboardData && event.clipboardData.files);
      });
      composerBox.addEventListener('dragover', (event) => {
        event.preventDefault();
      });
      composerBox.addEventListener('drop', (event) => {
        event.preventDefault();
        addFiles(event.dataTransfer && event.dataTransfer.files);
      });
      document.getElementById('composer').addEventListener('submit', (event) => {
        event.preventDefault();
        const prompt = document.getElementById('prompt').value;
        vscode.postMessage({
          command: 'submit',
          prompt,
          permissionMode: permissionMode.value,
          attachments: attachments.slice(),
        });
        document.getElementById('prompt').value = '';
        attachments.splice(0, attachments.length);
        renderAttachments();
      });
      document.getElementById('prompt').addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault();
          document.getElementById('composer').requestSubmit();
        }
      });
    </script>
  </body>
</html>`;
}

function renderAssistantMessage(message: AssistantMessage) {
  return `<div class="message ${message.role}">
    <div class="role">${escapeHtml(message.role)}</div>
    <div class="content">${escapeHtml(message.content)}</div>
    ${message.metadata ? `<div class="metadata">${escapeHtml(message.metadata)}</div>` : ""}
    ${message.changes && message.changes.length > 0 ? `<div class="metadata">${message.changes.length} proposed file change${message.changes.length === 1 ? "" : "s"} ready to review.</div>` : ""}
  </div>`;
}

function renderPendingChanges(changes: NexusAgentChange[]) {
  if (changes.length === 0) {
    return "";
  }

  return `<div class="status">
    <span class="pill neutral">${changes.length} pending change${changes.length === 1 ? "" : "s"}</span>
    ${changes.map(renderPendingChange).join("")}
    <button class="inline" onclick="send('applyChanges')">Apply changes</button>
    <button class="inline secondary" onclick="send('clearChanges')">Clear</button>
  </div>`;
}

function renderPendingChange(change: NexusAgentChange) {
  const preview =
    change.action === "delete"
      ? ""
      : `<pre>${escapeHtml(previewContent(change.content ?? ""))}</pre>`;

  return `<div class="change">
    <div class="change-head">
      <div class="change-path">${escapeHtml(change.path)}</div>
      <span class="change-action ${change.action}">${escapeHtml(change.action)}</span>
    </div>
    ${change.description ? `<p>${escapeHtml(change.description)}</p>` : ""}
    ${preview}
    <button class="inline secondary" onclick="openFile(${JSON.stringify(change.path)})">Open file</button>
  </div>`;
}

function previewContent(content: string) {
  if (content.length <= 4000) {
    return content;
  }

  return `${content.slice(0, 4000)}\n\n[Preview truncated]`;
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

async function applyAgentChanges(changes: NexusAgentChange[]) {
  let applied = 0;

  for (const change of changes) {
    const uri = getWorkspaceUri(change.path);

    if (!uri) {
      throw new Error(`Unsafe or invalid path: ${change.path}`);
    }

    if (change.action === "delete") {
      await vscode.workspace.fs.delete(uri, {
        recursive: false,
        useTrash: true,
      });
      applied += 1;
      continue;
    }

    if (change.content === undefined) {
      throw new Error(`Missing content for ${change.action} ${change.path}`);
    }

    await ensureParentDirectory(uri);
    await vscode.workspace.fs.writeFile(uri, Buffer.from(change.content, "utf8"));
    applied += 1;
  }

  return applied;
}

async function ensureParentDirectory(uri: vscode.Uri) {
  const parent = vscode.Uri.joinPath(uri, "..");
  await vscode.workspace.fs.createDirectory(parent);
}

async function focusView(command: string) {
  try {
    await vscode.commands.executeCommand(command);
  } catch {
    // Older VS Code-compatible editors may not expose generated focus commands.
  }
}

function getWorkspaceUri(path: string) {
  const normalized = normalizeWorkspacePath(path);
  const root = vscode.workspace.workspaceFolders?.[0];

  if (!normalized || !root) {
    return null;
  }

  return vscode.Uri.joinPath(root.uri, ...normalized.split("/"));
}

function normalizeWorkspacePath(path: string) {
  const normalized = path.trim().replace(/\\/g, "/").replace(/^\.\//, "");

  if (
    !normalized ||
    normalized.startsWith("/") ||
    /^[a-zA-Z]:/.test(normalized) ||
    normalized.split("/").some((part) => part === ".." || part === "")
  ) {
    return null;
  }

  if (isUnsafeAgentPath(normalized)) {
    return null;
  }

  return normalized;
}

function isUnsafeAgentPath(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/").toLowerCase();
  const fileName = normalized.split("/").pop() ?? normalized;

  return (
    isSensitivePath(normalized) ||
    normalized.includes("/dist/") ||
    normalized.includes("/build/") ||
    normalized.includes("/coverage/") ||
    normalized.includes("/.next/") ||
    normalized.includes("/node_modules/") ||
    fileName.endsWith(".lock") ||
    fileName === "package-lock.json" ||
    fileName === "pnpm-lock.yaml" ||
    fileName === "yarn.lock" ||
    [".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip"].includes(
      getExtension(fileName)
    )
  );
}

function sanitizeImageAttachments(attachments: NexusImageAttachment[]) {
  return attachments
    .filter(
      (attachment) =>
        attachment.kind === "image" &&
        attachment.dataUrl.startsWith("data:image/") &&
        attachment.dataUrl.length <= 8_000_000
    )
    .slice(0, MAX_IMAGE_ATTACHMENTS)
    .map((attachment) => ({
      kind: "image" as const,
      name: attachment.name.slice(0, 160),
      type: attachment.type.slice(0, 80),
      dataUrl: attachment.dataUrl,
    }));
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

function getPermissionMode(): NexusPermissionMode {
  const configured = vscode.workspace
    .getConfiguration("nexusAi")
    .get<NexusPermissionMode>("permissionMode", "default");

  return isPermissionMode(configured) ? configured : "default";
}

async function setPermissionMode(permissionMode: NexusPermissionMode) {
  if (!isPermissionMode(permissionMode)) {
    return;
  }

  await vscode.workspace
    .getConfiguration("nexusAi")
    .update("permissionMode", permissionMode, vscode.ConfigurationTarget.Global);
}

function isPermissionMode(value: unknown): value is NexusPermissionMode {
  return (
    value === "default" ||
    value === "auto-review" ||
    value === "full-access"
  );
}

function getPermissionLabel(permissionMode: NexusPermissionMode) {
  switch (permissionMode) {
    case "auto-review":
      return "Auto-review";
    case "full-access":
      return "Full access";
    case "default":
    default:
      return "Default permissions";
  }
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

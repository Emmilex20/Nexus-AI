# Nexus AI VS Code Extension

This is the Nexus AI coding-assistant bridge for VS Code. It adds a Nexus AI
sidebar, editor commands, and a status bar shortcut for asking about selected
code or the current file.

## Install as a local extension

From the main Nexus AI project folder:

```powershell
pnpm vscode:install
```

This packages the extension into `nexus-ai-vscode.vsix` and installs it into VS
Code. After install, reload VS Code if the commands do not appear immediately.

## Connect

1. Open the `Nexus AI Workspace` section in the VS Code Explorer, or click
   `Nexus AI` in the status bar.
2. Click `Connect Nexus AI`.
3. Sign in with Nexus AI in the browser if asked.
4. Approve the browser prompt to open VS Code.

VS Code stores the developer token automatically. If the browser callback does
not open VS Code, return to Nexus AI settings and click `Connect VS Code` again.

## API URL

The API URL is the base URL for the Nexus AI web app that owns authentication,
developer tokens, billing, and the VS Code chat endpoint. For production, this
should be your deployed HTTPS app URL:

```txt
https://nexus-ai-jet-kappa.vercel.app
```

For local development only, use:

```txt
http://localhost:3000
```

Run `Nexus AI: Set API URL` to switch between production and local development.
Run `Nexus AI: Test API Connection` to verify the URL.

## Commands

- `Nexus AI: Connect`
- `Nexus AI: Ask`
- `Nexus AI: Ask About Workspace`
- `Nexus AI: Ask About Selection`
- `Nexus AI: Explain Current File`
- `Nexus AI: Refresh Workspace`
- `Nexus AI: Set API URL`
- `Nexus AI: Test API Connection`

## Coding assistant workflow

Open Explorer, expand `Nexus AI Assistant`, and type what you want changed. Nexus
AI will reply with a short explanation and proposed file changes. Review the
preview, then click `Apply changes` to write them into the local workspace.

## Workspace Context

The extension reads local workspace context in VS Code, shows a `Nexus AI
Workspace` view in Explorer, and sends a bounded snapshot with code requests. It
filters out common generated folders, binary files, lockfiles, and `.env*`
files.

# Nexus AI VS Code Extension

This is the first Nexus AI coding-assistant bridge for VS Code. It sends the
current file or selected code to your Nexus AI app through a developer token and
opens the answer in a side panel.

## Install as a local extension

From the main Nexus AI project folder:

```powershell
pnpm vscode:install
```

This packages the extension into `nexus-ai-vscode.vsix` and installs it into VS
Code. After install, reload VS Code if the commands do not appear immediately.

## Setup

1. Open Nexus AI in the browser and go to `Settings`.
2. Create a developer token in the `Developer tokens` section.
3. Run `Nexus AI: Set API URL` from the command palette.
4. Run `Nexus AI: Set Developer Token` and paste the token.

For local development, the API URL should usually be:

```txt
http://localhost:3000
```

## Commands

- `Nexus AI: Ask About Selection`
- `Nexus AI: Explain Current File`
- `Nexus AI: Set API URL`
- `Nexus AI: Set Developer Token`

## Current Scope

The extension sends only explicit context: selected text or the current file.
Later MCP/local agent support can add deeper workspace awareness, repo search,
safe patch generation, terminal context, and multi-file edits.

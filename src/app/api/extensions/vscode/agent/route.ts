import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAiModel } from "@/config/ai-models";
import { getUserFromDeveloperToken } from "@/lib/developer-tokens";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

const vscodeFileSnapshotSchema = z.object({
  path: z.string().min(1).max(260),
  languageId: z.string().max(80).optional(),
  content: z.string().max(60000),
});

const vscodeAgentRequestSchema = z.object({
  prompt: z.string().min(1).max(4000),
  selectedText: z.string().max(20000).optional(),
  workspaceContext: z.string().max(80000).optional(),
  fileName: z.string().max(260).optional(),
  languageId: z.string().max(80).optional(),
  workspaceName: z.string().max(120).optional(),
  files: z.array(vscodeFileSnapshotSchema).max(12).default([]),
  model: z.enum(["gpt-4o-mini", "gpt-4.1-mini"]).default("gpt-4.1-mini"),
});

const vscodeAgentChangeSchema = z.object({
  path: z
    .string()
    .min(1)
    .max(260)
    .describe("Workspace-relative path using forward slashes."),
  action: z.enum(["create", "update", "delete"]),
  description: z
    .string()
    .max(800)
    .describe("Short human-readable summary. Use an empty string if unnecessary."),
  content: z
    .string()
    .max(120000)
    .describe(
      "Full replacement file content for create/update actions. Use an empty string for delete actions."
    ),
});

const vscodeAgentResultSchema = z.object({
  answer: z.string().min(1).max(6000),
  changes: z.array(vscodeAgentChangeSchema).max(8),
});

function formatFiles(
  files: z.infer<typeof vscodeFileSnapshotSchema>[]
) {
  if (files.length === 0) {
    return "No full file snapshots were provided.";
  }

  return files
    .map(
      (file) =>
        `File snapshot: ${file.path}\nLanguage: ${file.languageId ?? "unknown"}\n\`\`\`${file.languageId ?? ""}\n${file.content}\n\`\`\``
    )
    .join("\n\n");
}

function formatChangeSummary(changes: z.infer<typeof vscodeAgentChangeSchema>[]) {
  if (changes.length === 0) {
    return "No file changes proposed.";
  }

  return changes
    .map(
      (change) =>
        `- ${change.action.toUpperCase()} ${change.path}${change.description ? `: ${change.description}` : ""}`
    )
    .join("\n");
}

export async function POST(req: Request) {
  const tokenResult = await getUserFromDeveloperToken(
    req.headers.get("authorization")
  );

  if (!tokenResult) {
    return NextResponse.json({ error: "Invalid developer token" }, { status: 401 });
  }

  const { user } = tokenResult;
  const body = await req.json();
  const parsed = vscodeAgentRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid VS Code agent request",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const selectedModel = getAiModel(parsed.data.model);

  if (user.credits < selectedModel.creditsPerMessage) {
    return NextResponse.json(
      {
        error: "Not enough credits",
        requiredCredits: selectedModel.creditsPerMessage,
        currentCredits: user.credits,
      },
      { status: 402 }
    );
  }

  const context = [
    parsed.data.workspaceName ? `Workspace: ${parsed.data.workspaceName}` : "",
    parsed.data.fileName ? `Active file: ${parsed.data.fileName}` : "",
    parsed.data.languageId ? `Active language: ${parsed.data.languageId}` : "",
    parsed.data.selectedText
      ? `Selected code:\n\`\`\`${parsed.data.languageId ?? ""}\n${parsed.data.selectedText}\n\`\`\``
      : "",
    parsed.data.workspaceContext
      ? `Workspace map and snippets:\n${parsed.data.workspaceContext}`
      : "",
    formatFiles(parsed.data.files),
  ]
    .filter(Boolean)
    .join("\n\n");

  const userMessage = [parsed.data.prompt, context].filter(Boolean).join("\n\n");

  const conversation = await prisma.conversation.create({
    data: {
      title: `VS Code Agent: ${parsed.data.prompt.slice(0, 44)}`,
      mode: "CODE",
      userId: user.id,
      messages: {
        create: {
          role: "USER",
          content: userMessage,
          userId: user.id,
        },
      },
    },
  });

  try {
    const result = await generateObject({
      model: openai(selectedModel.id),
      schema: vscodeAgentResultSchema,
      system: `
You are Nexus AI, a coding agent inside VS Code.

Return a concise answer and, when appropriate, exact file operations.

Rules for changes:
- Propose changes only when the user asks you to write, update, fix, implement, refactor, configure, or create code.
- For create and update actions, content must be the complete final file content, not a patch or excerpt.
- For delete actions, content must be an empty string.
- Description must always be present. Use an empty string if there is nothing useful to add.
- Only update/delete a file if its full snapshot was supplied. If you need a file that was not supplied, explain what you need and return no changes.
- Never modify .env files, secrets, generated build folders, dependency folders, binary files, or lockfiles.
- Keep changes focused and production-aware.
- Prefer small, reviewable edits.
- If no code change is needed, return an empty changes array.
`,
      prompt: userMessage,
    });

    const changes = result.object.changes;
    const assistantContent = [
      result.object.answer,
      "",
      "Proposed changes:",
      formatChangeSummary(changes),
    ].join("\n");
    const tokensUsed = result.usage.totalTokens ?? 0;
    const tokenCredits = Math.max(1, Math.ceil(tokensUsed / 1000));
    const creditsUsed = Math.max(selectedModel.creditsPerMessage, tokenCredits);

    await prisma.$transaction([
      prisma.message.create({
        data: {
          role: "ASSISTANT",
          content: assistantContent,
          model: selectedModel.id,
          tokensUsed,
          conversationId: conversation.id,
          userId: user.id,
        },
      }),
      prisma.usageLog.create({
        data: {
          userId: user.id,
          action: "VSCODE_CODE_AGENT",
          model: selectedModel.id,
          tokensUsed,
          creditsUsed,
        },
      }),
      prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          credits: {
            decrement: creditsUsed,
          },
        },
      }),
    ]);

    return NextResponse.json({
      answer: result.object.answer,
      changes,
      conversationId: conversation.id,
      creditsUsed,
      tokensUsed,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Nexus AI agent request failed";

    await prisma.message.create({
      data: {
        role: "ASSISTANT",
        content: `Nexus AI agent failed: ${message}`,
        conversationId: conversation.id,
        userId: user.id,
      },
    });

    return NextResponse.json(
      {
        error: `Nexus AI agent failed: ${message}`,
      },
      { status: 500 }
    );
  }
}

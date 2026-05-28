import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { selectRuntimeModel } from "@/config/ai-models";
import {
  buildAssistantQualityPrompt,
  buildWorkspaceCapabilityPrompt,
} from "@/config/assistant-quality";
import { planLimits } from "@/config/billing";
import { getUserFromDeveloperToken } from "@/lib/developer-tokens";
import { saveMemoryFromMessage } from "@/lib/memory";
import { getPlanModelAccessError, getVsCodeAccessStatus } from "@/lib/plan-access";
import { prisma } from "@/lib/prisma";
import { buildWorkspaceContext } from "@/lib/workspace-context";

export const maxDuration = 60;

const vscodeChatSchema = z.object({
  prompt: z.string().min(1).max(4000),
  selectedText: z.string().max(20000).optional(),
  workspaceContext: z.string().max(80000).optional(),
  fileName: z.string().max(260).optional(),
  languageId: z.string().max(80).optional(),
  workspaceName: z.string().max(120).optional(),
  model: z.enum(["gpt-4o-mini", "gpt-4.1-mini"]).default("gpt-4.1-mini"),
});

export async function POST(req: Request) {
  const tokenResult = await getUserFromDeveloperToken(
    req.headers.get("authorization")
  );

  if (!tokenResult) {
    return NextResponse.json({ error: "Invalid developer token" }, { status: 401 });
  }

  const { user } = tokenResult;
  const access = await getVsCodeAccessStatus(user);

  if (!access.ok) {
    return NextResponse.json(access.body, { status: access.status });
  }

  const body = await req.json();
  const parsed = vscodeChatSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid VS Code request",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const selectedModel = selectRuntimeModel({
    requestedModelId: parsed.data.model,
    allowedModelIds: planLimits[user.plan].allowedModelIds,
    mode: "CODE",
    composerMode: "THINKING",
    hasAttachments: false,
    message: parsed.data.prompt,
  });
  const modelAccessError = getPlanModelAccessError(user.plan, selectedModel.id);

  if (modelAccessError) {
    return NextResponse.json(modelAccessError, { status: 403 });
  }

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
    parsed.data.fileName ? `File: ${parsed.data.fileName}` : "",
    parsed.data.languageId ? `Language: ${parsed.data.languageId}` : "",
    parsed.data.selectedText
      ? `Selected code:\n\`\`\`${parsed.data.languageId ?? ""}\n${parsed.data.selectedText}\n\`\`\``
      : "",
    parsed.data.workspaceContext
      ? `Workspace context supplied by the VS Code extension:\n${parsed.data.workspaceContext}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const userMessage = [parsed.data.prompt, context].filter(Boolean).join("\n\n");
  const workspaceContext = await buildWorkspaceContext({
    userId: user.id,
    query: userMessage,
    workspaceName: parsed.data.workspaceName,
  }).catch(() => "");

  const conversation = await prisma.conversation.create({
    data: {
      title: parsed.data.fileName
        ? `VS Code: ${parsed.data.fileName}`.slice(0, 60)
        : parsed.data.prompt.slice(0, 60),
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

  await saveMemoryFromMessage({
    userId: user.id,
    conversationId: conversation.id,
    message: parsed.data.prompt,
    source: "vscode",
  }).catch(() => null);

  const result = await generateText({
    model: openai(selectedModel.id),
    system: `
You are Nexus AI inside VS Code.

Help with the user's current code workspace.
Be concise, practical, and production-aware.
When changing code, explain the exact change and show complete snippets only when useful.
Use the selected code, active file metadata, and workspace context supplied by the extension.
Do not claim you can see files beyond the context provided by the extension.
${buildWorkspaceCapabilityPrompt()}
${buildAssistantQualityPrompt({
  mode: "CODE",
  composerMode: "THINKING",
})}
${workspaceContext ? `Retrieved workspace context:\n${workspaceContext}` : ""}
`,
    prompt: userMessage,
  });

  const tokensUsed = result.totalUsage.totalTokens ?? 0;
  const tokenCredits = Math.max(1, Math.ceil(tokensUsed / 1000));
  const creditsUsed = Math.max(selectedModel.creditsPerMessage, tokenCredits);

  await prisma.$transaction([
    prisma.message.create({
      data: {
        role: "ASSISTANT",
        content: result.text,
        model: selectedModel.id,
        tokensUsed,
        conversationId: conversation.id,
        userId: user.id,
      },
    }),
    prisma.usageLog.create({
      data: {
        userId: user.id,
        action: "VSCODE_CODE_ASSIST",
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
    answer: result.text,
    conversationId: conversation.id,
    creditsUsed,
    tokensUsed,
  });
}

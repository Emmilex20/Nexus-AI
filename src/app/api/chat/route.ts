import { openai } from "@ai-sdk/openai";
import { streamText, type ModelMessage, type UserContent } from "ai";
import { NextResponse } from "next/server";
import {
  getOpenAIRuntimeOptions,
  getModePrompt,
  selectRuntimeModel,
} from "@/config/ai-models";
import {
  buildAssistantQualityPrompt,
  buildWorkspaceCapabilityPrompt,
} from "@/config/assistant-quality";
import { imageGenerationConfig, planLimits } from "@/config/billing";
import { requireActiveUser } from "@/lib/current-user";
import {
  generateConversationImage,
  ImageGenerationError,
} from "@/lib/image-generation-service";
import { looksLikeImageGenerationPrompt } from "@/lib/image-generation-intent";
import { saveMemoryFromMessage } from "@/lib/memory";
import { getPlanModelAccessError } from "@/lib/plan-access";
import { prisma } from "@/lib/prisma";
import { chatRequestSchema } from "@/lib/validators/chat";
import { buildWorkspaceContext } from "@/lib/workspace-context";

export const maxDuration = 120;

function getBase64ImageData(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (!match) {
    return {
      image: dataUrl,
      mediaType: undefined,
    };
  }

  return {
    image: match[2],
    mediaType: match[1],
  };
}

export async function POST(req: Request) {
  const user = await requireActiveUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = chatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid chat request",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const {
    conversationId,
    message,
    model,
    attachments,
    composerMode,
    siteSearchMode,
    sites,
    retry,
    retryInstruction,
    retryMode,
    retryTargetMessageId,
  } = parsed.data;

  if (
    !retry &&
    attachments.length === 0 &&
    (composerMode === "IMAGE" ||
      (composerMode === "DEFAULT" && looksLikeImageGenerationPrompt(message)))
  ) {
    try {
      const result = await generateConversationImage({
        user,
        conversationId,
        prompt: message,
        size: imageGenerationConfig.size,
        quality: imageGenerationConfig.quality,
      });

      return new Response(
        `0:${JSON.stringify(result.assistantMessage.content)}\n`,
        {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "x-nexus-generation-type": "image",
          },
        }
      );
    } catch (error) {
      const status = error instanceof ImageGenerationError ? error.status : 500;

      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Image generation failed.",
        },
        { status }
      );
    }
  }

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId: user.id,
      archived: false,
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "asc",
        },
        take: 24,
      },
    },
  });

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  const hasImageAttachments = attachments.some(
    (attachment) => attachment.kind === "image" && attachment.dataUrl
  );
  const selectedModel = selectRuntimeModel({
    requestedModelId: model,
    allowedModelIds: planLimits[user.plan].allowedModelIds,
    mode: conversation.mode,
    composerMode,
    hasAttachments: attachments.length > 0,
    message,
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

  if (!retry) {
    await prisma.message.create({
      data: {
        role: "USER",
        content: message,
        conversationId,
        userId: user.id,
      },
    });

    await prisma.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        title:
          conversation.title === "New conversation"
            ? message.slice(0, 60)
            : conversation.title,
        mode: conversation.mode,
        updatedAt: new Date(),
      },
    });

    await saveMemoryFromMessage({
      userId: user.id,
      projectId: conversation.projectId,
      conversationId,
      message,
      source: "chat",
    }).catch(() => null);
  }

  const retryTargetIndex = retryTargetMessageId
    ? conversation.messages.findIndex((msg) => msg.id === retryTargetMessageId)
    : -1;
  const retryUserIndex =
    retry && retryTargetIndex >= 0
      ? conversation.messages
          .slice(0, retryTargetIndex)
          .map((msg, index) => ({ msg, index }))
          .reverse()
          .find(({ msg }) => msg.role === "USER")?.index
      : undefined;

  const historyMessages =
    retry && retryUserIndex !== undefined
      ? conversation.messages.slice(0, retryUserIndex)
      : conversation.messages;

  const retryDirective =
    retryMode === "THINK_LONGER"
      ? "Regenerate the previous answer with deeper reasoning, stronger structure, and more useful detail."
      : retryMode === "SEARCH"
        ? "Regenerate the previous answer in research mode. Live web search is not connected yet, so do not claim fresh verification. Clearly state what would need current verification."
        : retryMode === "CUSTOM" && retryInstruction
          ? `Regenerate the previous answer using this change request: ${retryInstruction}`
          : "Regenerate the previous answer with a fresh, improved response.";

  const finalUserContent = retry
    ? `${message}\n\n${retryDirective}`
    : [
        message,
        hasImageAttachments
          ? "The attached image(s) are part of this request. Inspect them directly and describe visible content, text, layout, objects, colors, and design details. Do not ask the user to describe the image first unless something is genuinely unreadable."
          : "",
        composerMode === "THINKING"
          ? "Work in thinking mode: reason carefully, check assumptions, and give a more robust answer."
          : "",
        composerMode === "DEEP_RESEARCH"
          ? "Work in deep research mode. Live browsing is not connected yet, so clearly separate known information from items that need current verification."
          : "",
        composerMode === "WEB_SEARCH"
          ? "Work in web search mode. Live web search is not connected yet, so do not claim fresh verification; say what should be checked online."
          : "",
        (composerMode === "DEEP_RESEARCH" || composerMode === "WEB_SEARCH") &&
        siteSearchMode === "SPECIFIC" &&
        sites.length > 0
          ? `Focus the research on these specific sites only when discussing source scope: ${sites.join(", ")}. If live browsing is required, say these sites should be checked directly.`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n");

  const attachmentParts: Exclude<UserContent, string> = [];

  for (const attachment of attachments) {
    if (attachment.kind === "image" && attachment.dataUrl) {
      const imageData = getBase64ImageData(attachment.dataUrl);

      attachmentParts.push({
        type: "image",
        image: imageData.image,
        mediaType: imageData.mediaType ?? attachment.type,
      });
      continue;
    }

    if (attachment.kind === "text" && attachment.text) {
      attachmentParts.push({
        type: "text",
        text: `Attached file: ${attachment.name}\n\n${attachment.text}`,
      });
    }
  }

  const userContent: UserContent =
    attachmentParts.length > 0
      ? [
          {
            type: "text",
            text: finalUserContent,
          },
          ...attachmentParts,
        ]
      : finalUserContent;

  const history: ModelMessage[] = historyMessages.map((msg) => ({
    role:
      msg.role === "USER"
        ? ("user" as const)
        : msg.role === "ASSISTANT"
          ? ("assistant" as const)
          : ("system" as const),
    content: msg.content,
  }));

  const workspaceContext = await buildWorkspaceContext({
    userId: user.id,
    conversationId,
    query: finalUserContent,
  }).catch(() => "");

  const systemPrompt = `
You are Nexus AI, a professional AI workspace assistant.

Global style:
- Helpful, clear, practical and direct.
- Use clean formatting.
- Be honest about uncertainty.
- For business/product planning, be realistic and structured.
- For coding help, give safe, production-aware code.
- When image attachments are provided, you can inspect them directly. Analyze what is visible instead of saying you cannot view images.
- Never pretend live web search or file upload is available unless the platform provides it.

${getModePrompt(conversation.mode)}
${buildWorkspaceCapabilityPrompt()}
${buildAssistantQualityPrompt({
  mode: conversation.mode,
  composerMode,
})}
${workspaceContext ? `Retrieved workspace context:\n${workspaceContext}` : ""}
`;

  const result = streamText({
    model: openai(selectedModel.id),
    providerOptions: getOpenAIRuntimeOptions({
      modelId: selectedModel.id,
      mode: conversation.mode,
      composerMode,
      hasAttachments: attachments.length > 0,
      message: finalUserContent,
    }),
    system: systemPrompt,
    messages: [
      ...history,
      {
        role: "user",
        content: userContent,
      },
    ],
    onFinish: async ({ text, totalUsage }) => {
      const tokensUsed = totalUsage.totalTokens ?? 0;
      const tokenCredits = Math.max(1, Math.ceil(tokensUsed / 1000));
      const creditsUsed = Math.max(selectedModel.creditsPerMessage, tokenCredits);

      let updatedRetryMessage = false;

      if (retry && retryTargetMessageId) {
        const updateResult = await prisma.message.updateMany({
          where: {
            id: retryTargetMessageId,
            role: "ASSISTANT",
            conversationId,
            userId: user.id,
          },
          data: {
            content: text,
            model: selectedModel.id,
            tokensUsed,
          },
        });

        updatedRetryMessage = updateResult.count > 0;
      }

      if (!updatedRetryMessage) {
        await prisma.message.create({
          data: {
            role: "ASSISTANT",
            content: text,
            model: selectedModel.id,
            tokensUsed,
            conversationId,
            userId: user.id,
          },
        });
      }

      await prisma.usageLog.create({
        data: {
          userId: user.id,
          action: `CHAT_${conversation.mode}`,
          model: selectedModel.id,
          tokensUsed,
          creditsUsed,
        },
      });

      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          credits: {
            decrement: creditsUsed,
          },
        },
      });

      await prisma.conversation.update({
        where: {
          id: conversationId,
        },
        data: {
          updatedAt: new Date(),
        },
      });
    },
  });

  return result.toUIMessageStreamResponse();
}

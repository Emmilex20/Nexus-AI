import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { NextResponse } from "next/server";
import { getAiModel, getModePrompt } from "@/config/ai-models";
import { requireActiveUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { chatRequestSchema } from "@/lib/validators/chat";

export const maxDuration = 60;

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
    retry,
    retryInstruction,
    retryMode,
    retryTargetMessageId,
  } = parsed.data;
  const selectedModel = getAiModel(model);

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
    : message;

  const history = historyMessages.map((msg) => ({
    role:
      msg.role === "USER"
        ? ("user" as const)
        : msg.role === "ASSISTANT"
          ? ("assistant" as const)
          : ("system" as const),
    content: msg.content,
  }));

  const systemPrompt = `
You are Nexus AI, a professional AI workspace assistant.

Global style:
- Helpful, clear, practical and direct.
- Use clean formatting.
- Be honest about uncertainty.
- For business/product planning, be realistic and structured.
- For coding help, give safe, production-aware code.
- Never pretend live web search or file upload is available unless the platform provides it.

${getModePrompt(conversation.mode)}
`;

  const result = streamText({
    model: openai(selectedModel.id),
    system: systemPrompt,
    messages: [
      ...history,
      {
        role: "user",
        content: finalUserContent,
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

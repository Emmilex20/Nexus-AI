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

  const { conversationId, message, model } = parsed.data;
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

  const history = conversation.messages.map((msg) => ({
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
        content: message,
      },
    ],
    onFinish: async ({ text, totalUsage }) => {
      const tokensUsed = totalUsage.totalTokens ?? 0;
      const tokenCredits = Math.max(1, Math.ceil(tokensUsed / 1000));
      const creditsUsed = Math.max(selectedModel.creditsPerMessage, tokenCredits);

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

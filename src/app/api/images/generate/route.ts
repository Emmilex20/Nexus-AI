import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/current-user";
import {
  generateConversationImage,
  ImageGenerationError,
} from "@/lib/image-generation-service";
import { imageGenerationRequestSchema } from "@/lib/validators/image-generation";

export const maxDuration = 300;

export async function POST(req: Request) {
  const user = await requireActiveUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = imageGenerationRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid image generation request",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { conversationId, prompt, size, quality, referenceImages } =
    parsed.data;

  try {
    const result = await generateConversationImage({
      user,
      conversationId,
      prompt,
      size,
      quality,
      referenceImages,
    });

    return NextResponse.json({
      userMessage: result.userMessage,
      assistantMessage: result.assistantMessage,
      image: {
        id: result.generatedImage.id,
        url: `/api/generated-images/${result.generatedImage.id}`,
        model: result.generatedImage.model,
        size: result.generatedImage.size,
        quality: result.generatedImage.quality,
      },
      credits: result.credits,
      creditsUsed: result.creditsUsed,
      monthlyUsage: result.monthlyUsage,
    });
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

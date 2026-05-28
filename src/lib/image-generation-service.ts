import type { User } from "@prisma/client";
import { imageGenerationConfig } from "@/config/billing";
import {
  getImageGenerationAccessStatus,
  IMAGE_GENERATION_ACTION,
} from "@/lib/plan-access";
import { prisma } from "@/lib/prisma";

type OpenAIImageResult = {
  b64_json?: string;
  revised_prompt?: string;
  url?: string;
};

type OpenAIImageResponse = {
  data?: OpenAIImageResult[];
  output_format?: string;
  usage?: {
    total_tokens?: number;
  };
  error?: {
    message?: string;
  };
};

type ImageReference = {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
};

export class ImageGenerationError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

function blockquote(value: string) {
  return value
    .trim()
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

export function buildGeneratedImageContent({
  imageId,
  prompt,
  revisedPrompt,
  model,
  size,
  quality,
  creditsUsed,
  referenceImageCount = 0,
}: {
  imageId: string;
  prompt: string;
  revisedPrompt?: string;
  model: string;
  size: string;
  quality: string;
  creditsUsed: number;
  referenceImageCount?: number;
}) {
  return [
    "Generated image ready.",
    `![Generated image](/api/generated-images/${imageId})`,
    `Prompt:\n\n${blockquote(prompt)}`,
    referenceImageCount > 0
      ? `Reference images used: ${referenceImageCount}`
      : "",
    revisedPrompt ? `Revised prompt:\n\n${blockquote(revisedPrompt)}` : "",
    `Model: ${model} | Size: ${size} | Quality: ${quality} | Credits used: ${creditsUsed}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function getImageBase64(image: OpenAIImageResult) {
  if (image.b64_json) {
    return image.b64_json;
  }

  if (!image.url) {
    throw new ImageGenerationError("OpenAI did not return an image.");
  }

  const imageResponse = await fetch(image.url);

  if (!imageResponse.ok) {
    throw new ImageGenerationError("Generated image could not be downloaded.");
  }

  return Buffer.from(await imageResponse.arrayBuffer()).toString("base64");
}

function parseReferenceImage(reference: ImageReference) {
  const match = reference.dataUrl.match(
    /^data:(image\/(?:png|jpeg|jpg|webp));base64,([a-zA-Z0-9+/=]+)$/
  );

  if (!match) {
    throw new ImageGenerationError(
      "Reference images must be PNG, JPEG, or WebP files.",
      400
    );
  }

  const mediaType = match[1] === "image/jpg" ? "image/jpeg" : match[1];
  const imageBytes = Buffer.from(match[2], "base64");

  if (imageBytes.byteLength === 0) {
    throw new ImageGenerationError("Reference image is empty.", 400);
  }

  if (imageBytes.byteLength > 5_000_000 || reference.size > 5_000_000) {
    throw new ImageGenerationError(
      "Reference images must be 5MB or smaller.",
      400
    );
  }

  const extension =
    mediaType === "image/png"
      ? "png"
      : mediaType === "image/webp"
        ? "webp"
        : "jpg";
  const safeName =
    reference.name.trim().replace(/[^a-zA-Z0-9._-]/g, "-") ||
    `reference.${extension}`;
  const fileName = /\.[a-zA-Z0-9]+$/.test(safeName)
    ? safeName
    : `${safeName}.${extension}`;

  return {
    fileName,
    mediaType,
    bytes: new Uint8Array(imageBytes),
  };
}

async function createOpenAIImageFromPrompt({
  prompt,
  size,
  quality,
}: {
  prompt: string;
  size: string;
  quality: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new ImageGenerationError(
      "Image generation is not configured. Add OPENAI_API_KEY in production.",
      500
    );
  }

  const model =
    process.env.OPENAI_IMAGE_MODEL?.trim() || imageGenerationConfig.model;
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size,
      quality,
      output_format: imageGenerationConfig.outputFormat,
      output_compression: imageGenerationConfig.outputCompression,
      moderation: "auto",
    }),
  });

  const data = (await response.json().catch(() => null)) as
    | OpenAIImageResponse
    | null;

  if (!response.ok) {
    throw new ImageGenerationError(
      data?.error?.message || "OpenAI image generation failed.",
      response.status >= 400 && response.status < 500 ? response.status : 502
    );
  }

  const image = data?.data?.[0];

  if (!image) {
    throw new ImageGenerationError("OpenAI did not return an image.");
  }

  return {
    imageBase64: await getImageBase64(image),
    model,
    outputFormat: data?.output_format || imageGenerationConfig.outputFormat,
    revisedPrompt: image.revised_prompt,
    tokensUsed: data?.usage?.total_tokens ?? 0,
  };
}

async function createOpenAIImageFromReferences({
  prompt,
  size,
  quality,
  referenceImages,
}: {
  prompt: string;
  size: string;
  quality: string;
  referenceImages: ImageReference[];
}) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new ImageGenerationError(
      "Image generation is not configured. Add OPENAI_API_KEY in production.",
      500
    );
  }

  const model =
    process.env.OPENAI_IMAGE_MODEL?.trim() || imageGenerationConfig.model;
  const formData = new FormData();

  formData.append("model", model);
  formData.append("prompt", prompt);
  formData.append("n", "1");
  formData.append("size", size);
  formData.append("quality", quality);
  formData.append("output_format", imageGenerationConfig.outputFormat);
  formData.append(
    "output_compression",
    String(imageGenerationConfig.outputCompression)
  );
  formData.append("moderation", "auto");

  for (const reference of referenceImages) {
    const parsed = parseReferenceImage(reference);

    formData.append(
      "image[]",
      new Blob([parsed.bytes], { type: parsed.mediaType }),
      parsed.fileName
    );
  }

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  const data = (await response.json().catch(() => null)) as
    | OpenAIImageResponse
    | null;

  if (!response.ok) {
    throw new ImageGenerationError(
      data?.error?.message || "OpenAI image edit failed.",
      response.status >= 400 && response.status < 500 ? response.status : 502
    );
  }

  const image = data?.data?.[0];

  if (!image) {
    throw new ImageGenerationError("OpenAI did not return an edited image.");
  }

  return {
    imageBase64: await getImageBase64(image),
    model,
    outputFormat: data?.output_format || imageGenerationConfig.outputFormat,
    revisedPrompt: image.revised_prompt,
    tokensUsed: data?.usage?.total_tokens ?? 0,
  };
}

export async function generateConversationImage({
  user,
  conversationId,
  prompt,
  size = imageGenerationConfig.size,
  quality = imageGenerationConfig.quality,
  referenceImages = [],
}: {
  user: Pick<User, "id" | "plan" | "credits">;
  conversationId: string;
  prompt: string;
  size?: string;
  quality?: string;
  referenceImages?: ImageReference[];
}) {
  const creditsUsed = imageGenerationConfig.creditsPerImage;
  const validReferenceImages = referenceImages.slice(0, 4);
  const access = await getImageGenerationAccessStatus(user);

  if (!access.ok) {
    throw new ImageGenerationError(access.body.error, access.status);
  }

  if (user.credits < creditsUsed) {
    throw new ImageGenerationError(
      "Not enough credits for image generation",
      402
    );
  }

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId: user.id,
      archived: false,
    },
  });

  if (!conversation) {
    throw new ImageGenerationError("Conversation not found", 404);
  }

  let creditsReserved = false;

  try {
    const creditReservation = await prisma.user.updateMany({
      where: {
        id: user.id,
        credits: {
          gte: creditsUsed,
        },
      },
      data: {
        credits: {
          decrement: creditsUsed,
        },
      },
    });

    if (creditReservation.count === 0) {
      throw new ImageGenerationError(
        "Not enough credits for image generation",
        402
      );
    }

    creditsReserved = true;

    const generated =
      validReferenceImages.length > 0
        ? await createOpenAIImageFromReferences({
            prompt,
            size,
            quality,
            referenceImages: validReferenceImages,
          })
        : await createOpenAIImageFromPrompt({
            prompt,
            size,
            quality,
          });

    const result = await prisma.$transaction(async (tx) => {
      const userMessage = await tx.message.create({
        data: {
          role: "USER",
          content: prompt,
          conversationId,
          userId: user.id,
        },
      });

      const assistantMessage = await tx.message.create({
        data: {
          role: "ASSISTANT",
          content: "Generated image ready.",
          model: generated.model,
          tokensUsed: generated.tokensUsed,
          conversationId,
          userId: user.id,
        },
      });

      const generatedImage = await tx.generatedImage.create({
        data: {
          userId: user.id,
          conversationId,
          messageId: assistantMessage.id,
          prompt,
          revisedPrompt: generated.revisedPrompt,
          model: generated.model,
          size,
          quality,
          outputFormat: generated.outputFormat,
          imageBase64: generated.imageBase64,
        },
      });

      const assistantContent = buildGeneratedImageContent({
        imageId: generatedImage.id,
        prompt,
        revisedPrompt: generated.revisedPrompt,
        model: generated.model,
        size,
        quality,
        creditsUsed,
        referenceImageCount: validReferenceImages.length,
      });

      const finalAssistantMessage = await tx.message.update({
        where: {
          id: assistantMessage.id,
        },
        data: {
          content: assistantContent,
        },
      });

      await tx.usageLog.create({
        data: {
          userId: user.id,
          action: IMAGE_GENERATION_ACTION,
          model: generated.model,
          tokensUsed: generated.tokensUsed,
          creditsUsed,
        },
      });

      await tx.conversation.update({
        where: {
          id: conversationId,
        },
        data: {
          title:
            conversation.title === "New conversation"
              ? prompt.slice(0, 60)
              : conversation.title,
          updatedAt: new Date(),
        },
      });

      return {
        userMessage,
        assistantMessage: finalAssistantMessage,
        generatedImage,
      };
    });

    const freshUser = await prisma.user
      .findUnique({
        where: {
          id: user.id,
        },
        select: {
          credits: true,
        },
      })
      .catch(() => null);

    return {
      ...result,
      credits: freshUser?.credits ?? Math.max(0, user.credits - creditsUsed),
      creditsUsed,
      monthlyUsage: {
        used: access.used + 1,
        limit: access.limit,
      },
    };
  } catch (error) {
    if (creditsReserved) {
      await prisma.user
        .update({
          where: {
            id: user.id,
          },
          data: {
            credits: {
              increment: creditsUsed,
            },
          },
        })
        .catch(() => null);
    }

    throw error;
  }
}

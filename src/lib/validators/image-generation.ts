import { z } from "zod";

export const imageGenerationRequestSchema = z.object({
  conversationId: z.string().min(1),
  prompt: z.string().min(1).max(4000),
  size: z
    .enum(["1024x1024", "1024x1536", "1536x1024"])
    .default("1024x1024"),
  quality: z.enum(["low", "medium", "high"]).default("high"),
});

export type ImageGenerationRequestInput = z.infer<
  typeof imageGenerationRequestSchema
>;

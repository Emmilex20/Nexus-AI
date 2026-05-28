import { z } from "zod";

export const imageReferenceSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(180),
  type: z.string().max(100),
  size: z.number().int().min(0).max(5_000_000),
  kind: z.literal("image"),
  dataUrl: z.string().max(7_000_000),
});

export const imageGenerationRequestSchema = z.object({
  conversationId: z.string().min(1),
  prompt: z.string().min(1).max(4000),
  size: z
    .enum(["1024x1024", "1024x1536", "1536x1024"])
    .default("1024x1024"),
  quality: z.enum(["low", "medium", "high"]).default("high"),
  referenceImages: z.array(imageReferenceSchema).max(4).default([]),
});

export type ImageGenerationRequestInput = z.infer<
  typeof imageGenerationRequestSchema
>;

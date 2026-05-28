import { z } from "zod";
import { aiModelIds, legacyAiModelIds } from "@/config/ai-models";

const chatModelSchema = z
  .union([z.enum(aiModelIds), z.enum(legacyAiModelIds)])
  .default("gpt-5.4-mini");

export const chatAttachmentSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(180),
  type: z.string().max(100),
  size: z.number().int().min(0).max(5_000_000),
  kind: z.enum(["image", "text", "file"]),
  dataUrl: z.string().max(7_000_000).optional(),
  text: z.string().max(16_000).optional(),
});

export const chatRequestSchema = z.object({
  conversationId: z.string().min(1),
  message: z.string().min(1).max(8000),
  model: chatModelSchema,
  composerMode: z
    .enum(["DEFAULT", "THINKING", "DEEP_RESEARCH", "WEB_SEARCH", "IMAGE"])
    .default("DEFAULT"),
  siteSearchMode: z.enum(["WEB", "SPECIFIC"]).default("WEB"),
  sites: z.array(z.string().url().max(300)).max(10).default([]),
  attachments: z.array(chatAttachmentSchema).max(4).default([]),
  retry: z.boolean().default(false),
  retryMode: z
    .enum(["TRY_AGAIN", "THINK_LONGER", "SEARCH", "CUSTOM"])
    .default("TRY_AGAIN"),
  retryInstruction: z.string().max(1000).optional(),
  retryTargetMessageId: z.string().optional(),
});

export type ChatRequestInput = z.infer<typeof chatRequestSchema>;

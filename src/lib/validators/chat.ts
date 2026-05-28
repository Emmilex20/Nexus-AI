import { z } from "zod";

export const chatRequestSchema = z.object({
  conversationId: z.string().min(1),
  message: z.string().min(1).max(8000),
  model: z.enum(["gpt-4o-mini", "gpt-4.1-mini"]).default("gpt-4o-mini"),
  retry: z.boolean().default(false),
  retryMode: z
    .enum(["TRY_AGAIN", "THINK_LONGER", "SEARCH", "CUSTOM"])
    .default("TRY_AGAIN"),
  retryInstruction: z.string().max(1000).optional(),
  retryTargetMessageId: z.string().optional(),
});

export type ChatRequestInput = z.infer<typeof chatRequestSchema>;

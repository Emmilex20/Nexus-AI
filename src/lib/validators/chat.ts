import { z } from "zod";

export const chatRequestSchema = z.object({
  conversationId: z.string().min(1),
  message: z.string().min(1).max(8000),
  model: z.enum(["gpt-4o-mini", "gpt-4.1-mini"]).default("gpt-4o-mini"),
});

export type ChatRequestInput = z.infer<typeof chatRequestSchema>;

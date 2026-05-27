import { z } from "zod";

export const createConversationSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  mode: z.enum(["CHAT", "SEARCH", "CODE", "FILE"]).default("CHAT"),
  projectId: z.string().optional(),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;

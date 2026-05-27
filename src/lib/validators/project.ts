import { z } from "zod";

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(2, "Project name must be at least 2 characters.")
    .max(60, "Project name must be less than 60 characters."),
  description: z
    .string()
    .max(160, "Description must be less than 160 characters.")
    .optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

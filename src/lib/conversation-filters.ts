import type { Prisma } from "@prisma/client";

export const vscodeConversationTitleFilters: Prisma.ConversationWhereInput[] = [
  { title: { startsWith: "VS Code:" } },
  { title: { startsWith: "VS Code Agent:" } },
];

export function webConversationWhere(
  where: Prisma.ConversationWhereInput
): Prisma.ConversationWhereInput {
  return {
    ...where,
    NOT: [
      ...(Array.isArray(where.NOT) ? where.NOT : where.NOT ? [where.NOT] : []),
      ...vscodeConversationTitleFilters,
    ],
  };
}

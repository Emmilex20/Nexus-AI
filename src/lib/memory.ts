import { prisma } from "@/lib/prisma";

type MemorySource = "chat" | "vscode" | "manual";

const memoryTriggers = [
  /\bremember\b/i,
  /\bsave this\b/i,
  /\bnote that\b/i,
  /\bimportant\b/i,
  /\bmy project\b/i,
  /\bour project\b/i,
  /\bthis project\b/i,
  /\bi am building\b/i,
  /\bwe are building\b/i,
  /\bthe goal is\b/i,
  /\bmy preference\b/i,
  /\bi prefer\b/i,
  /\buse .* going forward\b/i,
];

function cleanMemoryContent(value: string) {
  return value
    .replace(/^\s*(please\s+)?(remember|save this|note that)\s*[:,\-]?\s*/i, "")
    .trim()
    .slice(0, 1600);
}

function inferMemoryType(content: string) {
  if (/\b(prefer|preference|tone|style|format|going forward)\b/i.test(content)) {
    return "PREFERENCE";
  }

  if (/\b(project|app|workspace|repo|codebase|product|business|brand)\b/i.test(content)) {
    return "PROJECT_FACT";
  }

  if (/\b(api|database|model|stack|framework|schema|billing|pricing|extension)\b/i.test(content)) {
    return "TECHNICAL_FACT";
  }

  return "NOTE";
}

function titleFromContent(content: string) {
  const firstLine = content.split(/\r?\n/).find(Boolean) ?? content;
  const firstSentence = firstLine.split(/[.!?]/)[0] ?? firstLine;
  const trimmed = firstSentence.trim();

  return (trimmed || "Saved memory").slice(0, 90);
}

export function extractMemoryCandidate(message: string) {
  const content = cleanMemoryContent(message);

  if (content.length < 16 || content.length > 1600) {
    return null;
  }

  const shouldSave = memoryTriggers.some((pattern) => pattern.test(message));

  if (!shouldSave) {
    return null;
  }

  return {
    type: inferMemoryType(content),
    title: titleFromContent(content),
    content,
  };
}

export async function saveMemoryFromMessage({
  userId,
  projectId,
  conversationId,
  message,
  source,
}: {
  userId: string;
  projectId?: string | null;
  conversationId?: string | null;
  message: string;
  source: MemorySource;
}) {
  const candidate = extractMemoryCandidate(message);

  if (!candidate) return null;

  const existing = await prisma.memoryItem.findFirst({
    where: {
      userId,
      content: candidate.content,
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    return prisma.memoryItem.update({
      where: {
        id: existing.id,
      },
      data: {
        projectId,
        conversationId,
        type: candidate.type,
        title: candidate.title,
        source,
        relevance: {
          increment: 1,
        },
      },
    });
  }

  return prisma.memoryItem.create({
    data: {
      userId,
      projectId,
      conversationId,
      type: candidate.type,
      title: candidate.title,
      content: candidate.content,
      source,
    },
  });
}


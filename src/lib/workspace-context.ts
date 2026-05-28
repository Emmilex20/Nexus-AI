import { prisma } from "@/lib/prisma";

const stopWords = new Set([
  "about",
  "after",
  "again",
  "also",
  "because",
  "before",
  "being",
  "build",
  "could",
  "doing",
  "from",
  "have",
  "into",
  "like",
  "make",
  "more",
  "need",
  "please",
  "should",
  "that",
  "their",
  "there",
  "these",
  "thing",
  "this",
  "update",
  "what",
  "when",
  "where",
  "with",
  "work",
  "would",
  "your",
]);

function trimText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trim()}...`;
}

function getQueryTerms(query: string) {
  return Array.from(
    new Set(
      query
        .toLowerCase()
        .match(/[a-z0-9][a-z0-9._-]{2,}/g)
        ?.filter((term) => !stopWords.has(term)) ?? []
    )
  ).slice(0, 16);
}

function scoreText(value: string, terms: string[]) {
  const normalized = value.toLowerCase();

  return terms.reduce(
    (score, term) => score + (normalized.includes(term) ? 1 : 0),
    0
  );
}

function bulletList(items: string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}

export async function buildWorkspaceContext({
  userId,
  conversationId,
  query,
  workspaceName,
}: {
  userId: string;
  conversationId?: string | null;
  query: string;
  workspaceName?: string | null;
}) {
  const terms = getQueryTerms(query);
  const conversation = conversationId
    ? await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId,
        },
        include: {
          project: true,
        },
      })
    : null;

  const [memories, recentMessages, projects, images] = await Promise.all([
    prisma.memoryItem.findMany({
      where: {
        userId,
        OR: [
          { projectId: null },
          ...(conversation?.projectId ? [{ projectId: conversation.projectId }] : []),
          ...(conversationId ? [{ conversationId }] : []),
        ],
      },
      orderBy: [{ relevance: "desc" }, { updatedAt: "desc" }],
      take: 20,
    }),
    prisma.message.findMany({
      where: {
        userId,
        conversation: {
          archived: false,
        },
      },
      include: {
        conversation: {
          select: {
            title: true,
            mode: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 80,
    }),
    prisma.project.findMany({
      where: {
        userId,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 12,
    }),
    prisma.generatedImage.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 12,
    }),
  ]);

  const scoredMemories = memories
    .map((memory) => ({
      memory,
      score:
        scoreText(`${memory.title} ${memory.content}`, terms) +
        (memory.conversationId === conversationId ? 2 : 0),
    }))
    .sort((a, b) => b.score - a.score || b.memory.updatedAt.getTime() - a.memory.updatedAt.getTime())
    .slice(0, 8);

  const scoredMessages = recentMessages
    .map((message) => ({
      message,
      score:
        scoreText(`${message.conversation.title} ${message.content}`, terms) +
        (message.conversationId === conversationId ? 1 : 0),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.message.createdAt.getTime() - a.message.createdAt.getTime())
    .slice(0, 6);

  const scoredProjects = projects
    .map((project) => ({
      project,
      score: scoreText(`${project.name} ${project.description ?? ""}`, terms),
    }))
    .filter((item) => item.score > 0 || item.project.id === conversation?.projectId)
    .sort((a, b) => b.score - a.score || b.project.updatedAt.getTime() - a.project.updatedAt.getTime())
    .slice(0, 5);

  const scoredImages = images
    .map((image) => ({
      image,
      score: scoreText(image.prompt, terms),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.image.createdAt.getTime() - a.image.createdAt.getTime())
    .slice(0, 4);

  const sections = [
    conversation
      ? [
          "Current conversation:",
          bulletList([
            `Title: ${conversation.title}`,
            `Mode: ${conversation.mode}`,
            conversation.project
              ? `Project: ${conversation.project.name}${conversation.project.description ? ` - ${trimText(conversation.project.description, 160)}` : ""}`
              : "Project: none",
          ]),
        ].join("\n")
      : "",
    workspaceName ? `VS Code workspace: ${workspaceName}` : "",
    scoredMemories.length > 0
      ? [
          "Saved memory:",
          bulletList(
            scoredMemories.map(
              ({ memory }) =>
                `[${memory.type}] ${memory.title}: ${trimText(memory.content, 240)}`
            )
          ),
        ].join("\n")
      : "",
    scoredMessages.length > 0
      ? [
          "Relevant recent conversation snippets:",
          bulletList(
            scoredMessages.map(
              ({ message }) =>
                `${message.conversation.title} (${message.role}): ${trimText(
                  message.content,
                  260
                )}`
            )
          ),
        ].join("\n")
      : "",
    scoredProjects.length > 0
      ? [
          "Relevant projects:",
          bulletList(
            scoredProjects.map(
              ({ project }) =>
                `${project.name}: ${trimText(
                  project.description ?? "No description saved.",
                  220
                )}`
            )
          ),
        ].join("\n")
      : "",
    scoredImages.length > 0
      ? [
          "Relevant generated images:",
          bulletList(
            scoredImages.map(
              ({ image }) =>
                `${image.model} ${image.size}: ${trimText(image.prompt, 220)}`
            )
          ),
        ].join("\n")
      : "",
  ].filter(Boolean);

  return sections.join("\n\n").slice(0, 9000);
}


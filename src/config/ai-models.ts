export type AiModelId = "gpt-4o-mini" | "gpt-4.1-mini";

export type ChatMode = "CHAT" | "SEARCH" | "CODE" | "FILE";
export type ComposerMode =
  | "DEFAULT"
  | "THINKING"
  | "DEEP_RESEARCH"
  | "WEB_SEARCH"
  | "IMAGE";

export const aiModels = [
  {
    id: "gpt-4o-mini",
    name: "Fast",
    description: "Best for everyday chat, planning and simple tasks.",
    creditsPerMessage: 1,
    strengths: ["chat", "drafting", "quick answers"],
  },
  {
    id: "gpt-4.1-mini",
    name: "Builder",
    description: "Better for coding, reasoning and longer technical answers.",
    creditsPerMessage: 2,
    strengths: ["code", "vision", "retrieval", "longer reasoning"],
  },
] as const;

export const chatModes = [
  {
    id: "CHAT",
    name: "Chat",
    description: "General conversation, ideas and productivity.",
  },
  {
    id: "CODE",
    name: "Code",
    description: "Debug, explain, refactor and generate code.",
  },
  {
    id: "SEARCH",
    name: "Search",
    description: "Research mode foundation. Live web search comes later.",
  },
  {
    id: "FILE",
    name: "File",
    description: "File assistant foundation. Uploads come later.",
  },
] as const;

export function getAiModel(modelId?: string) {
  return aiModels.find((model) => model.id === modelId) ?? aiModels[0];
}

function isComplexRequest({
  mode,
  composerMode,
  hasAttachments,
  message,
}: {
  mode: ChatMode;
  composerMode: ComposerMode;
  hasAttachments: boolean;
  message: string;
}) {
  const normalized = message.toLowerCase();

  return (
    mode === "CODE" ||
    mode === "FILE" ||
    composerMode === "THINKING" ||
    composerMode === "DEEP_RESEARCH" ||
    composerMode === "WEB_SEARCH" ||
    hasAttachments ||
    message.length > 900 ||
    /\b(debug|fix|refactor|implement|architecture|schema|migration|api route|typescript|prisma|vercel|production|security|accuracy|analyze)\b/.test(
      normalized
    )
  );
}

export function selectRuntimeModel({
  requestedModelId,
  allowedModelIds,
  mode,
  composerMode,
  hasAttachments,
  message,
}: {
  requestedModelId?: string;
  allowedModelIds: readonly AiModelId[];
  mode: ChatMode;
  composerMode: ComposerMode;
  hasAttachments: boolean;
  message: string;
}) {
  const requestedModel = getAiModel(requestedModelId);
  const builderModelId: AiModelId = "gpt-4.1-mini";

  if (
    requestedModel.id === "gpt-4o-mini" &&
    allowedModelIds.includes(builderModelId) &&
    isComplexRequest({
      mode,
      composerMode,
      hasAttachments,
      message,
    })
  ) {
    return getAiModel(builderModelId);
  }

  return requestedModel;
}

export function getModePrompt(mode: ChatMode) {
  switch (mode) {
    case "CODE":
      return `
You are Nexus AI in Code Assistant mode.
Focus on clean, production-safe code.
Explain bugs clearly.
Give complete snippets when useful.
Avoid changing unrelated logic.
Use concise but helpful explanations.
`;

    case "SEARCH":
      return `
You are Nexus AI in Research/Search mode.
Live web search is not connected yet.
Be transparent when you cannot verify fresh information.
Structure answers clearly.
Suggest what should be verified when current data matters.
`;

    case "FILE":
      return `
You are Nexus AI in File Assistant mode.
Image and readable text attachments are supported.
Analyze attached images directly when provided.
Help users reason about pasted or uploaded file content.
Be clear that advanced document parsing for formats like PDFs and spreadsheets may still be limited.
`;

    case "CHAT":
    default:
      return `
You are Nexus AI in General Chat mode.
Be helpful, practical, warm and clear.
Give structured answers.
Prioritize usability and accuracy.
`;
  }
}

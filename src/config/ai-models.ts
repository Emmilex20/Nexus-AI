import type { OpenAILanguageModelResponsesOptions } from "@ai-sdk/openai";

export const aiModelIds = [
  "gpt-4o-mini",
  "gpt-5.4-mini",
  "gpt-5.4",
  "gpt-5.2-codex",
  "gpt-5.5",
] as const;

export const legacyAiModelIds = ["gpt-4.1-mini"] as const;

export type AiModelId = (typeof aiModelIds)[number];

export type ChatMode = "CHAT" | "SEARCH" | "CODE" | "FILE";
export type ComposerMode =
  | "DEFAULT"
  | "THINKING"
  | "DEEP_RESEARCH"
  | "WEB_SEARCH"
  | "IMAGE";

export type AiModel = {
  id: AiModelId;
  name: string;
  description: string;
  creditsPerMessage: number;
  rank: number;
  strengths: string[];
};

export const aiModels = [
  {
    id: "gpt-4o-mini",
    name: "Starter",
    description: "Low-cost chat for quick answers and light planning.",
    creditsPerMessage: 1,
    rank: 1,
    strengths: ["free chat", "drafting", "quick answers"],
  },
  {
    id: "gpt-5.4-mini",
    name: "Fast",
    description: "Modern fast model for everyday chat, code and workspace help.",
    creditsPerMessage: 3,
    rank: 2,
    strengths: ["fast GPT-5", "chat", "light code", "vision"],
  },
  {
    id: "gpt-5.4",
    name: "Pro",
    description: "Stronger reasoning for product work, debugging and analysis.",
    creditsPerMessage: 8,
    rank: 3,
    strengths: ["reasoning", "analysis", "debugging", "planning"],
  },
  {
    id: "gpt-5.2-codex",
    name: "Codex",
    description: "Coding-agent model for repo edits, refactors and long code tasks.",
    creditsPerMessage: 10,
    rank: 4,
    strengths: ["agentic coding", "repo edits", "refactors", "debugging"],
  },
  {
    id: "gpt-5.5",
    name: "Frontier",
    description: "Highest-quality model for complex reasoning and production work.",
    creditsPerMessage: 18,
    rank: 5,
    strengths: ["frontier reasoning", "hard coding", "deep analysis", "agents"],
  },
] as const satisfies readonly AiModel[];

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

export function getFirstAllowedModelId(allowedModelIds: readonly AiModelId[]) {
  return (
    aiModels.find((model) => allowedModelIds.includes(model.id))?.id ??
    aiModels[0].id
  );
}

function isCodeRequest({
  mode,
  message,
}: {
  mode: ChatMode;
  message: string;
}) {
  const normalized = message.toLowerCase();

  return (
    mode === "CODE" ||
    /\b(debug|fix|refactor|implement|code|component|function|schema|migration|api route|typescript|javascript|tsx|jsx|prisma|sql|vercel|build error|lint|test|repo|workspace)\b/.test(
      normalized
    )
  );
}

function isDeepRequest({
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
    mode === "FILE" ||
    composerMode === "THINKING" ||
    composerMode === "DEEP_RESEARCH" ||
    composerMode === "WEB_SEARCH" ||
    hasAttachments ||
    message.length > 900 ||
    /\b(architecture|security|production|accuracy|analyze|research|strategy|complex|deep|evaluate|compare|audit|review|scale|multi-step|agent)\b/.test(
      normalized
    )
  );
}

function getRecommendedModelId({
  allowedModelIds,
  mode,
  composerMode,
  hasAttachments,
  message,
}: {
  allowedModelIds: readonly AiModelId[];
  mode: ChatMode;
  composerMode: ComposerMode;
  hasAttachments: boolean;
  message: string;
}) {
  const firstAllowed = getFirstAllowedModelId(allowedModelIds);
  const canUse = (modelId: AiModelId) => allowedModelIds.includes(modelId);

  if (isCodeRequest({ mode, message }) && canUse("gpt-5.2-codex")) {
    return "gpt-5.2-codex";
  }

  if (
    isDeepRequest({
      mode,
      composerMode,
      hasAttachments,
      message,
    })
  ) {
    if (canUse("gpt-5.5")) return "gpt-5.5";
    if (canUse("gpt-5.4")) return "gpt-5.4";
    if (canUse("gpt-5.4-mini")) return "gpt-5.4-mini";
  }

  if (canUse("gpt-5.4-mini")) {
    return "gpt-5.4-mini";
  }

  return firstAllowed;
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
  const requestedModel =
    aiModels.find(
      (model) =>
        model.id === requestedModelId && allowedModelIds.includes(model.id)
    ) ?? getAiModel(getFirstAllowedModelId(allowedModelIds));
  const recommendedModel = getAiModel(
    getRecommendedModelId({
      allowedModelIds,
      mode,
      composerMode,
      hasAttachments,
      message,
    })
  );

  return recommendedModel.rank > requestedModel.rank
    ? recommendedModel
    : requestedModel;
}

function getReasoningEffort({
  modelId,
  mode,
  composerMode,
  hasAttachments,
  message,
}: {
  modelId: AiModelId;
  mode: ChatMode;
  composerMode: ComposerMode;
  hasAttachments: boolean;
  message: string;
}) {
  if (modelId === "gpt-4o-mini") {
    return null;
  }

  if (
    modelId === "gpt-5.5" &&
    (composerMode === "DEEP_RESEARCH" ||
      mode === "CODE" ||
      message.length > 1800)
  ) {
    return "high";
  }

  if (
    modelId === "gpt-5.2-codex" &&
    (composerMode === "THINKING" || hasAttachments || message.length > 1200)
  ) {
    return "high";
  }

  if (
    composerMode === "THINKING" ||
    composerMode === "DEEP_RESEARCH" ||
    composerMode === "WEB_SEARCH" ||
    mode === "CODE" ||
    mode === "FILE" ||
    hasAttachments
  ) {
    return "medium";
  }

  return "low";
}

export function getOpenAIRuntimeOptions({
  modelId,
  mode,
  composerMode,
  hasAttachments,
  message,
}: {
  modelId: AiModelId;
  mode: ChatMode;
  composerMode: ComposerMode;
  hasAttachments: boolean;
  message: string;
}) {
  const reasoningEffort = getReasoningEffort({
    modelId,
    mode,
    composerMode,
    hasAttachments,
    message,
  });
  const options: OpenAILanguageModelResponsesOptions = {
    store: false,
  };

  if (modelId !== "gpt-4o-mini") {
    options.reasoningEffort = reasoningEffort;
    options.textVerbosity =
      composerMode === "DEEP_RESEARCH" || mode === "FILE"
        ? "medium"
        : "low";
  }

  return {
    openai: options,
  };
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

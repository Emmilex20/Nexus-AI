export type AiModelId = "gpt-4o-mini" | "gpt-4.1-mini";

export type ChatMode = "CHAT" | "SEARCH" | "CODE" | "FILE";

export const aiModels = [
  {
    id: "gpt-4o-mini",
    name: "Fast",
    description: "Best for everyday chat, planning and simple tasks.",
    creditsPerMessage: 1,
  },
  {
    id: "gpt-4.1-mini",
    name: "Builder",
    description: "Better for coding, reasoning and longer technical answers.",
    creditsPerMessage: 2,
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

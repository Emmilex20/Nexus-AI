import type { Plan } from "@prisma/client";
import type { AiModelId } from "@/config/ai-models";

export type PlanLimit = {
  name: string;
  tagline: string;
  monthlyPrice: string;
  amountKobo: number;
  monthlyCredits: number;
  allowedModelIds: AiModelId[];
  vscodeMonthlyRequests: number;
  imageMonthlyGenerations: number;
  maxProjects: number;
  maxConversations: number;
  features: string[];
};

export const imageGenerationConfig = {
  model: "gpt-image-2",
  size: "1024x1024",
  quality: "high",
  outputFormat: "webp",
  outputCompression: 90,
  creditsPerImage: 320,
} as const;

export const planLimits: Record<Plan, PlanLimit> = {
  FREE: {
    name: "Free",
    tagline: "Try Nexus AI for everyday chat and light planning.",
    monthlyPrice: "NGN 0",
    amountKobo: 0,
    monthlyCredits: 100,
    allowedModelIds: ["gpt-4o-mini"],
    vscodeMonthlyRequests: 0,
    imageMonthlyGenerations: 0,
    maxProjects: 1,
    maxConversations: 10,
    features: [
      "Fast AI chat",
      "100 starter credits",
      "10 saved conversations",
      "1 project",
      "Community support",
      "Image generation starts on Pro",
      "VS Code integration not included",
    ],
  },
  PRO: {
    name: "Pro",
    tagline: "For solo users who need GPT-5 quality for daily work.",
    monthlyPrice: "NGN 12,000",
    amountKobo: 1200000,
    monthlyCredits: 4000,
    allowedModelIds: ["gpt-5.4-mini", "gpt-5.4"],
    vscodeMonthlyRequests: 150,
    imageMonthlyGenerations: 12,
    maxProjects: 10,
    maxConversations: 250,
    features: [
      "4,000 credits every month",
      "GPT-5.4 Mini for fast daily work",
      "GPT-5.4 for harder reasoning",
      "250 saved conversations",
      "10 projects",
      "Image-aware chat",
      "12 GPT Image 2 generations/month",
      "VS Code assistant: 150 requests/month",
    ],
  },
  BUILDER: {
    name: "Builder",
    tagline: "For developers using Nexus AI as a real coding partner.",
    monthlyPrice: "NGN 38,000",
    amountKobo: 3800000,
    monthlyCredits: 18000,
    allowedModelIds: ["gpt-5.4-mini", "gpt-5.4", "gpt-5.2-codex"],
    vscodeMonthlyRequests: 600,
    imageMonthlyGenerations: 50,
    maxProjects: 40,
    maxConversations: 1000,
    features: [
      "18,000 credits every month",
      "GPT-5.2-Codex for repo-aware coding",
      "Automatic coding-task model routing",
      "1,000 saved conversations",
      "40 projects",
      "50 GPT Image 2 generations/month",
      "Workspace-aware VS Code agent",
      "VS Code assistant: 600 requests/month",
    ],
  },
  TEAM: {
    name: "Team",
    tagline: "For teams shipping with shared frontier AI capacity.",
    monthlyPrice: "NGN 120,000",
    amountKobo: 12000000,
    monthlyCredits: 70000,
    allowedModelIds: [
      "gpt-5.4-mini",
      "gpt-5.4",
      "gpt-5.2-codex",
      "gpt-5.5",
    ],
    vscodeMonthlyRequests: 2500,
    imageMonthlyGenerations: 180,
    maxProjects: 150,
    maxConversations: 5000,
    features: [
      "70,000 shared credits every month",
      "5,000 saved conversations",
      "150 projects",
      "GPT-5.5 frontier routing",
      "GPT-5.2-Codex for team coding workflows",
      "180 shared GPT Image 2 generations/month",
      "Highest shared usage limits",
      "VS Code assistant: 2,500 requests/month",
    ],
  },
};

const planOrder: Plan[] = ["FREE", "PRO", "BUILDER", "TEAM"];

export const creditPackages = [
  {
    id: "starter",
    name: "Starter Credits",
    credits: 2500,
    price: "NGN 6,000",
    amountKobo: 600000,
    description: "A small top-up for GPT-5 chat, image drafts and quick code help.",
  },
  {
    id: "growth",
    name: "Growth Credits",
    credits: 12000,
    price: "NGN 25,000",
    amountKobo: 2500000,
    description: "A better value top-up for regular coding sessions and research.",
  },
  {
    id: "power",
    name: "Power Credits",
    credits: 40000,
    price: "NGN 75,000",
    amountKobo: 7500000,
    description: "For heavy Codex work, GPT Image 2 batches and team overflow.",
  },
];

export function getCreditPackage(packageId: string) {
  return creditPackages.find((item) => item.id === packageId);
}

export function planHasVsCodeAccess(plan: Plan) {
  return planLimits[plan].vscodeMonthlyRequests > 0;
}

export function planHasImageGenerationAccess(plan: Plan) {
  return planLimits[plan].imageMonthlyGenerations > 0;
}

export function planAllowsModel(plan: Plan, modelId: string) {
  return planLimits[plan].allowedModelIds.includes(modelId as AiModelId);
}

export function getMinimumPlanForModel(modelId: string) {
  return (
    planOrder.find((plan) =>
      planLimits[plan].allowedModelIds.includes(modelId as AiModelId)
    ) ?? "PRO"
  );
}

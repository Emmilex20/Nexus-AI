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
  maxProjects: number;
  maxConversations: number;
  features: string[];
};

export const planLimits: Record<Plan, PlanLimit> = {
  FREE: {
    name: "Free",
    tagline: "Try Nexus AI for everyday chat and light planning.",
    monthlyPrice: "NGN 0",
    amountKobo: 0,
    monthlyCredits: 100,
    allowedModelIds: ["gpt-4o-mini"],
    vscodeMonthlyRequests: 0,
    maxProjects: 1,
    maxConversations: 10,
    features: [
      "Fast AI chat",
      "100 starter credits",
      "10 saved conversations",
      "1 project",
      "Community support",
      "VS Code integration not included",
    ],
  },
  PRO: {
    name: "Pro",
    tagline: "For solo users who want better models and light coding help.",
    monthlyPrice: "NGN 7,500",
    amountKobo: 750000,
    monthlyCredits: 3000,
    allowedModelIds: ["gpt-4o-mini", "gpt-4.1-mini"],
    vscodeMonthlyRequests: 100,
    maxProjects: 10,
    maxConversations: 250,
    features: [
      "3,000 credits every month",
      "Fast and Builder models",
      "250 saved conversations",
      "10 projects",
      "Image-aware chat",
      "VS Code assistant: 100 requests/month",
    ],
  },
  BUILDER: {
    name: "Builder",
    tagline: "For developers building and debugging real projects.",
    monthlyPrice: "NGN 18,000",
    amountKobo: 1800000,
    monthlyCredits: 10000,
    allowedModelIds: ["gpt-4o-mini", "gpt-4.1-mini"],
    vscodeMonthlyRequests: 400,
    maxProjects: 40,
    maxConversations: 1000,
    features: [
      "10,000 credits every month",
      "Higher chat and code limits",
      "1,000 saved conversations",
      "40 projects",
      "Workspace-aware VS Code agent",
      "VS Code assistant: 400 requests/month",
    ],
  },
  TEAM: {
    name: "Team",
    tagline: "For teams with heavier coding workflows and shared usage.",
    monthlyPrice: "NGN 55,000",
    amountKobo: 5500000,
    monthlyCredits: 35000,
    allowedModelIds: ["gpt-4o-mini", "gpt-4.1-mini"],
    vscodeMonthlyRequests: 1500,
    maxProjects: 150,
    maxConversations: 5000,
    features: [
      "35,000 shared credits every month",
      "5,000 saved conversations",
      "150 projects",
      "Fast and Builder models",
      "Highest shared usage limits",
      "VS Code assistant: 1,500 requests/month",
    ],
  },
};

export const creditPackages = [
  {
    id: "starter",
    name: "Starter Credits",
    credits: 1500,
    price: "NGN 3,000",
    amountKobo: 300000,
    description: "A small top-up for light chat, research and quick code help.",
  },
  {
    id: "growth",
    name: "Growth Credits",
    credits: 7500,
    price: "NGN 12,000",
    amountKobo: 1200000,
    description: "A better value top-up for regular builders and researchers.",
  },
  {
    id: "power",
    name: "Power Credits",
    credits: 25000,
    price: "NGN 32,000",
    amountKobo: 3200000,
    description: "For heavy coding, long sessions and team overflow usage.",
  },
];

export function getCreditPackage(packageId: string) {
  return creditPackages.find((item) => item.id === packageId);
}

export function planHasVsCodeAccess(plan: Plan) {
  return planLimits[plan].vscodeMonthlyRequests > 0;
}

export function planAllowsModel(plan: Plan, modelId: string) {
  return planLimits[plan].allowedModelIds.includes(modelId as AiModelId);
}

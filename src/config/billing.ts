import type { Plan } from "@prisma/client";

export const planLimits: Record<
  Plan,
  {
    name: string;
    monthlyPrice: string;
    amountKobo: number;
    monthlyCredits: number;
    features: string[];
  }
> = {
  FREE: {
    name: "Free",
    monthlyPrice: "₦0",
    amountKobo: 0,
    monthlyCredits: 100,
    features: ["Basic AI chat", "Fast model", "Limited history"],
  },
  PRO: {
    name: "Pro",
    monthlyPrice: "₦5,000",
    amountKobo: 500000,
    monthlyCredits: 2500,
    features: ["More credits", "Builder model", "Projects", "Chat history"],
  },
  BUILDER: {
    name: "Builder",
    monthlyPrice: "₦12,000",
    amountKobo: 1200000,
    monthlyCredits: 8000,
    features: [
      "Higher limits",
      "Code assistant",
      "Priority AI",
      "Usage dashboard",
    ],
  },
  TEAM: {
    name: "Team",
    monthlyPrice: "₦30,000",
    amountKobo: 3000000,
    monthlyCredits: 25000,
    features: [
      "Team workspace",
      "Admin controls",
      "Shared usage",
      "Priority support",
    ],
  },
};

export const creditPackages = [
  {
    id: "starter",
    name: "Starter Credits",
    credits: 1000,
    price: "₦2,000",
    amountKobo: 200000,
    description: "Good for light usage and testing.",
  },
  {
    id: "growth",
    name: "Growth Credits",
    credits: 5000,
    price: "₦8,000",
    amountKobo: 800000,
    description: "Best for regular AI usage.",
  },
  {
    id: "power",
    name: "Power Credits",
    credits: 15000,
    price: "₦20,000",
    amountKobo: 2000000,
    description: "For heavy builders and teams.",
  },
];

export function getCreditPackage(packageId: string) {
  return creditPackages.find((item) => item.id === packageId);
}

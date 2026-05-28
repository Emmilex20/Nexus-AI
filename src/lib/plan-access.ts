import type { Plan, User } from "@prisma/client";
import {
  getMinimumPlanForModel,
  planHasImageGenerationAccess,
  planAllowsModel,
  planHasVsCodeAccess,
  planLimits,
} from "@/config/billing";
import { prisma } from "@/lib/prisma";

export const IMAGE_GENERATION_ACTION = "IMAGE_GENERATION";
const VSCODE_USAGE_ACTIONS = ["VSCODE_CODE_AGENT", "VSCODE_CODE_ASSIST"];

export function getMonthlyUsageWindowStart(from = new Date()) {
  return new Date(from.getFullYear(), from.getMonth(), 1);
}

export function getPlanModelAccessError(plan: Plan, modelId: string) {
  if (planAllowsModel(plan, modelId)) {
    return null;
  }

  return {
    error: `${planLimits[plan].name} does not include this model.`,
    requiredPlan: getMinimumPlanForModel(modelId),
  };
}

export async function getVsCodeUsageThisMonth(userId: string) {
  return prisma.usageLog.count({
    where: {
      userId,
      action: {
        in: VSCODE_USAGE_ACTIONS,
      },
      createdAt: {
        gte: getMonthlyUsageWindowStart(),
      },
    },
  });
}

export async function getImageGenerationUsageThisMonth(userId: string) {
  return prisma.usageLog.count({
    where: {
      userId,
      action: IMAGE_GENERATION_ACTION,
      createdAt: {
        gte: getMonthlyUsageWindowStart(),
      },
    },
  });
}

export async function getImageGenerationAccessStatus(
  user: Pick<User, "id" | "plan">
) {
  const plan = planLimits[user.plan];

  if (!planHasImageGenerationAccess(user.plan)) {
    return {
      ok: false as const,
      status: 403,
      body: {
        error: "OpenAI image generation is available on Pro, Builder and Team plans.",
        requiredPlan: "PRO",
        currentPlan: user.plan,
      },
    };
  }

  const used = await getImageGenerationUsageThisMonth(user.id);

  if (used >= plan.imageMonthlyGenerations) {
    return {
      ok: false as const,
      status: 429,
      body: {
        error: `You have reached your ${plan.name} image generation monthly limit.`,
        currentPlan: user.plan,
        limit: plan.imageMonthlyGenerations,
        used,
      },
    };
  }

  return {
    ok: true as const,
    used,
    limit: plan.imageMonthlyGenerations,
  };
}

export async function getVsCodeAccessStatus(
  user: Pick<User, "id" | "plan">
) {
  const plan = planLimits[user.plan];

  if (!planHasVsCodeAccess(user.plan)) {
    return {
      ok: false as const,
      status: 403,
      body: {
        error:
          "VS Code integration is available on Pro, Builder and Team plans.",
        requiredPlan: "PRO",
        currentPlan: user.plan,
      },
    };
  }

  const used = await getVsCodeUsageThisMonth(user.id);

  if (used >= plan.vscodeMonthlyRequests) {
    return {
      ok: false as const,
      status: 429,
      body: {
        error: `You have reached your ${plan.name} VS Code monthly limit.`,
        currentPlan: user.plan,
        limit: plan.vscodeMonthlyRequests,
        used,
      },
    };
  }

  return {
    ok: true as const,
    used,
    limit: plan.vscodeMonthlyRequests,
  };
}

export async function getConversationCreateStatus(
  user: Pick<User, "id" | "plan">
) {
  const plan = planLimits[user.plan];
  const count = await prisma.conversation.count({
    where: {
      userId: user.id,
      archived: false,
    },
  });

  if (count >= plan.maxConversations) {
    return {
      ok: false as const,
      status: 403,
      body: {
        error: `${plan.name} includes up to ${plan.maxConversations.toLocaleString()} saved conversations. Archive old conversations or upgrade your plan.`,
        currentPlan: user.plan,
        limit: plan.maxConversations,
        used: count,
      },
    };
  }

  return {
    ok: true as const,
    used: count,
    limit: plan.maxConversations,
  };
}

export async function getProjectCreateStatus(user: Pick<User, "id" | "plan">) {
  const plan = planLimits[user.plan];
  const count = await prisma.project.count({
    where: {
      userId: user.id,
    },
  });

  if (count >= plan.maxProjects) {
    return {
      ok: false as const,
      status: 403,
      body: {
        error: `${plan.name} includes up to ${plan.maxProjects.toLocaleString()} project${plan.maxProjects === 1 ? "" : "s"}. Upgrade your plan for more projects.`,
        currentPlan: user.plan,
        limit: plan.maxProjects,
        used: count,
      },
    };
  }

  return {
    ok: true as const,
    used: count,
    limit: plan.maxProjects,
  };
}

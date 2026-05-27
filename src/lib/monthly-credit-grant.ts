import { prisma } from "@/lib/prisma";
import {
  getMonthlyCreditsForPlan,
  getNextRenewalDate,
} from "@/lib/plan-renewal";

export async function grantMonthlyCreditsIfDue(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || user.plan === "FREE" || !user.planRenewsAt) {
    return null;
  }

  const now = new Date();

  if (user.planRenewsAt > now) {
    return null;
  }

  const creditsToGrant = getMonthlyCreditsForPlan(user.plan);

  return prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: user.id },
      data: {
        credits: {
          increment: creditsToGrant,
        },
        planRenewsAt: getNextRenewalDate(now),
      },
    });

    await tx.billingEvent.create({
      data: {
        userId: user.id,
        type: "MONTHLY_CREDITS_GRANTED",
        note: `${creditsToGrant} monthly credits granted`,
        metadata: {
          plan: user.plan,
          credits: creditsToGrant,
        },
      },
    });

    return updatedUser;
  });
}

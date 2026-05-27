import type { Plan } from "@prisma/client";
import { planLimits } from "@/config/billing";

export function getNextRenewalDate(from = new Date()) {
  const nextDate = new Date(from);
  nextDate.setMonth(nextDate.getMonth() + 1);
  return nextDate;
}

export function getMonthlyCreditsForPlan(plan: Plan) {
  return planLimits[plan].monthlyCredits;
}

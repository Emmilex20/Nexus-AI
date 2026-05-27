import { NextResponse } from "next/server";
import { planLimits } from "@/config/billing";
import { getCurrentDbUser } from "@/lib/current-user";

export async function GET() {
  const user = await getCurrentDbUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plan = planLimits[user.plan];

  return NextResponse.json({
    plan: user.plan,
    planName: plan.name,
    monthlyCredits: plan.monthlyCredits,
    currentCredits: user.credits,
    planStartedAt: user.planStartedAt,
    planRenewsAt: user.planRenewsAt,
  });
}

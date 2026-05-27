import { Plan } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/admin";
import { getNextRenewalDate } from "@/lib/plan-renewal";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  plan: z.enum(["FREE", "PRO", "BUILDER", "TEAM"]),
  note: z.string().max(200).optional(),
});

type Params = {
  params: Promise<{ userId: string }>;
};

export async function PATCH(req: Request, { params }: Params) {
  const admin = await getAdminUser();
  const { userId } = await params;

  const body = await req.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const nextPlan = parsed.data.plan as Plan;
  const now = new Date();

  const updatedUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: {
        plan: nextPlan,
        planStartedAt: nextPlan === "FREE" ? null : now,
        planRenewsAt: nextPlan === "FREE" ? null : getNextRenewalDate(now),
      },
    });

    await tx.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        targetUserId: userId,
        action: "PLAN_CHANGED",
        note: parsed.data.note,
        metadata: {
          previousPlan: target.plan,
          nextPlan,
        },
      },
    });

    return user;
  });

  return NextResponse.json({ user: updatedUser });
}

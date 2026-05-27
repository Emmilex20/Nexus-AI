import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  amount: z.number().int().min(-100000).max(100000),
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

  const nextCredits = Math.max(0, target.credits + parsed.data.amount);

  const updatedUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: { credits: nextCredits },
    });

    await tx.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        targetUserId: userId,
        action: "CREDIT_ADJUSTED",
        note: parsed.data.note,
        metadata: {
          previousCredits: target.credits,
          amount: parsed.data.amount,
          nextCredits,
        },
      },
    });

    return user;
  });

  return NextResponse.json({ user: updatedUser });
}

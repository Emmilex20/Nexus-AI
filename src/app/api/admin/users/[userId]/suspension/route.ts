import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  suspend: z.boolean(),
  reason: z.string().max(300).optional(),
});

type Params = {
  params: Promise<{ userId: string }>;
};

export async function PATCH(req: Request, { params }: Params) {
  const admin = await getAdminUser();
  const { userId } = await params;

  if (admin.id === userId) {
    return NextResponse.json(
      { error: "You cannot suspend your own account." },
      { status: 400 }
    );
  }

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

  const updatedUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: {
        isSuspended: parsed.data.suspend,
        suspensionReason: parsed.data.suspend ? parsed.data.reason ?? null : null,
        suspendedAt: parsed.data.suspend ? new Date() : null,
      },
    });

    await tx.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        targetUserId: userId,
        action: parsed.data.suspend ? "USER_SUSPENDED" : "USER_UNSUSPENDED",
        note: parsed.data.reason,
        metadata: {
          previousStatus: target.isSuspended,
          nextStatus: parsed.data.suspend,
        },
      },
    });

    return user;
  });

  return NextResponse.json({ user: updatedUser });
}

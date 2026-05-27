import { NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentDbUser();

  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [users, conversations, payments, usage] = await Promise.all([
    prisma.user.count(),
    prisma.conversation.count(),
    prisma.payment.count(),
    prisma.usageLog.aggregate({
      _sum: {
        creditsUsed: true,
        tokensUsed: true,
      },
    }),
  ]);

  return NextResponse.json({
    users,
    conversations,
    payments,
    creditsUsed: usage._sum.creditsUsed ?? 0,
    tokensUsed: usage._sum.tokensUsed ?? 0,
  });
}

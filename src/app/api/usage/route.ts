import { NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentDbUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [usageLogs, totalUsage, conversationCount, messageCount, projectCount] =
    await Promise.all([
      prisma.usageLog.findMany({
        where: {
          userId: user.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      }),

      prisma.usageLog.aggregate({
        where: {
          userId: user.id,
        },
        _sum: {
          tokensUsed: true,
          creditsUsed: true,
        },
      }),

      prisma.conversation.count({
        where: {
          userId: user.id,
          archived: false,
        },
      }),

      prisma.message.count({
        where: {
          userId: user.id,
        },
      }),

      prisma.project.count({
        where: {
          userId: user.id,
        },
      }),
    ]);

  return NextResponse.json({
    user: {
      plan: user.plan,
      credits: user.credits,
    },
    totals: {
      tokensUsed: totalUsage._sum.tokensUsed ?? 0,
      creditsUsed: totalUsage._sum.creditsUsed ?? 0,
      conversations: conversationCount,
      messages: messageCount,
      projects: projectCount,
    },
    usageLogs,
  });
}

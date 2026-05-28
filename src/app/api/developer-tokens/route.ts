import { NextResponse } from "next/server";
import { z } from "zod";
import { planHasVsCodeAccess, planLimits } from "@/config/billing";
import { createDeveloperToken } from "@/lib/developer-tokens";
import { getCurrentDbUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const createTokenSchema = z.object({
  name: z
    .string()
    .min(2, "Token name must be at least 2 characters.")
    .max(60, "Token name must be less than 60 characters.")
    .default("VS Code"),
});

export async function GET() {
  const user = await getCurrentDbUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tokens = await prisma.developerToken.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      tokenPrefix: true,
      lastUsedAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ tokens });
}

export async function POST(req: Request) {
  const user = await getCurrentDbUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createTokenSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid token data",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  if (!planHasVsCodeAccess(user.plan)) {
    return NextResponse.json(
      {
        error: "VS Code integration is available on Pro, Builder and Team.",
        currentPlan: user.plan,
        upgradePlans: Object.entries(planLimits)
          .filter(([, plan]) => plan.vscodeMonthlyRequests > 0)
          .map(([key, plan]) => ({
            id: key,
            name: plan.name,
            vscodeMonthlyRequests: plan.vscodeMonthlyRequests,
          })),
      },
      { status: 403 }
    );
  }

  const activeTokenCount = await prisma.developerToken.count({
    where: {
      userId: user.id,
      revokedAt: null,
    },
  });

  if (activeTokenCount >= 5) {
    return NextResponse.json(
      { error: "You can have up to 5 active developer tokens." },
      { status: 400 }
    );
  }

  const { developerToken, token } = await createDeveloperToken(
    user.id,
    parsed.data.name
  );

  return NextResponse.json(
    {
      token,
      developerToken: {
        id: developerToken.id,
        name: developerToken.name,
        tokenPrefix: developerToken.tokenPrefix,
        lastUsedAt: developerToken.lastUsedAt,
        revokedAt: developerToken.revokedAt,
        createdAt: developerToken.createdAt,
      },
    },
    { status: 201 }
  );
}

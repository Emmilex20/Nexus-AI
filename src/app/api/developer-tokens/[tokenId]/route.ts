import { NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{
    tokenId: string;
  }>;
};

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getCurrentDbUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tokenId } = await params;

  const updatedToken = await prisma.developerToken.updateMany({
    where: {
      id: tokenId,
      userId: user.id,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  if (updatedToken.count === 0) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

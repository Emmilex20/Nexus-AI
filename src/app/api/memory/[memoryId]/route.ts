import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{
    memoryId: string;
  }>;
};

export async function DELETE(_req: Request, { params }: Params) {
  const user = await requireActiveUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { memoryId } = await params;
  const result = await prisma.memoryItem.deleteMany({
    where: {
      id: memoryId,
      userId: user.id,
    },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Memory not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

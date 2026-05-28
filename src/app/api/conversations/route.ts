import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/current-user";
import { getConversationCreateStatus } from "@/lib/plan-access";
import { prisma } from "@/lib/prisma";
import { createConversationSchema } from "@/lib/validators/conversation";

export async function GET() {
  const user = await requireActiveUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const conversations = await prisma.conversation.findMany({
    where: {
      userId: user.id,
      archived: false,
    },
    include: {
      project: true,
      messages: {
        take: 1,
        orderBy: {
          createdAt: "desc",
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return NextResponse.json({ conversations });
}

export async function POST(req: Request) {
  const user = await requireActiveUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const result = createConversationSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      {
        error: "Invalid conversation data",
        details: result.error.flatten(),
      },
      { status: 400 }
    );
  }

  const createStatus = await getConversationCreateStatus(user);

  if (!createStatus.ok) {
    return NextResponse.json(createStatus.body, { status: createStatus.status });
  }

  const project = result.data.projectId
    ? await prisma.project.findFirst({
        where: {
          id: result.data.projectId,
          userId: user.id,
        },
        select: {
          id: true,
        },
      })
    : null;

  if (result.data.projectId && !project) {
    return NextResponse.json(
      { error: "Project not found" },
      { status: 404 }
    );
  }

  const conversation = await prisma.conversation.create({
    data: {
      title: result.data.title ?? "New conversation",
      mode: result.data.mode,
      projectId: project?.id,
      userId: user.id,
    },
  });

  return NextResponse.json({ conversation }, { status: 201 });
}

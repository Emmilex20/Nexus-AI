import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/current-user";
import { getProjectCreateStatus } from "@/lib/plan-access";
import { prisma } from "@/lib/prisma";
import { createProjectSchema } from "@/lib/validators/project";

export async function GET() {
  const user = await requireActiveUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const projects = await prisma.project.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return NextResponse.json({ projects });
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
  const result = createProjectSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      {
        error: "Invalid project data",
        details: result.error.flatten(),
      },
      { status: 400 }
    );
  }

  const createStatus = await getProjectCreateStatus(user);

  if (!createStatus.ok) {
    return NextResponse.json(createStatus.body, { status: createStatus.status });
  }

  const project = await prisma.project.create({
    data: {
      name: result.data.name,
      description: result.data.description,
      userId: user.id,
    },
  });

  return NextResponse.json({ project }, { status: 201 });
}

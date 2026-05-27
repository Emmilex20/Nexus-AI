import Link from "next/link";
import { FolderKanban, MessageSquarePlus } from "lucide-react";
import { getCurrentDbUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/dashboard/page-header";
import { CreateProjectForm } from "@/components/projects/create-project-form";

export default async function ProjectsPage() {
  const user = await getCurrentDbUser();

  const projects = user
    ? await prisma.project.findMany({
        where: { userId: user.id },
        include: {
          _count: {
            select: {
              conversations: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      })
    : [];

  return (
    <div>
      <PageHeader
        eyebrow="Projects"
        title="Organize your AI work."
        description="Create workspaces for apps, research, business ideas, files and long-term conversations."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {projects.length > 0 ? (
            projects.map((project) => (
              <div
                key={project.id}
                className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6"
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
                        <FolderKanban className="h-6 w-6" />
                      </div>

                      <div>
                        <h2 className="text-xl font-black text-white">
                          {project.name}
                        </h2>
                        <p className="text-xs text-slate-500">
                          {project._count.conversations} conversation
                          {project._count.conversations === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>

                    {project.description ? (
                      <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
                        {project.description}
                      </p>
                    ) : null}
                  </div>

                  <Link
                    href={`/chat?projectId=${project.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-200"
                  >
                    <MessageSquarePlus className="h-5 w-5" />
                    Chat
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-500/15 text-violet-300">
                <FolderKanban className="h-8 w-8" />
              </div>

              <h2 className="mt-6 text-2xl font-black text-white">
                No projects yet
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-400">
                Create your first project to organize chats, research and future files.
              </p>
            </div>
          )}
        </div>

        <CreateProjectForm />
      </div>
    </div>
  );
}

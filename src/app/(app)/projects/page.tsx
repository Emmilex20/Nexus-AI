import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  FolderKanban,
  MessageSquare,
  MessageSquarePlus,
  type LucideIcon,
} from "lucide-react";
import { getCurrentDbUser } from "@/lib/current-user";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { CreateConversationButton } from "@/components/chat/create-conversation-button";
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
          conversations: {
            where: {
              archived: false,
            },
            orderBy: {
              updatedAt: "desc",
            },
            take: 3,
            include: {
              messages: {
                orderBy: {
                  createdAt: "desc",
                },
                take: 1,
              },
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      })
    : [];
  const projectChatCount = projects.reduce(
    (total, project) => total + project._count.conversations,
    0
  );

  return (
    <div>
      <PageHeader
        eyebrow="Projects"
        title="Project workspaces."
        description="Group chats, coding work, image prompts, research and decisions around the thing you are building."
      />

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <ProjectStat
          label="Projects"
          value={projects.length.toLocaleString()}
          icon={FolderKanban}
        />
        <ProjectStat
          label="Project chats"
          value={projectChatCount.toLocaleString()}
          icon={MessageSquare}
        />
        <ProjectStat
          label="Latest activity"
          value={projects[0] ? formatDate(projects[0].updatedAt) : "None"}
          icon={Clock3}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="space-y-4">
          {projects.length > 0 ? (
            projects.map((project) => {
              const latestConversation = project.conversations[0];

              return (
                <article
                  key={project.id}
                  className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
                          <FolderKanban className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <h2 className="truncate text-xl font-black text-white">
                            {project.name}
                          </h2>
                          <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                            {project._count.conversations} conversation
                            {project._count.conversations === 1 ? "" : "s"} -
                            updated {formatDate(project.updatedAt)}
                          </p>
                        </div>
                      </div>

                      {project.description ? (
                        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400">
                          {project.description}
                        </p>
                      ) : (
                        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-500">
                          Add conversations, research notes and implementation
                          decisions here as the project grows.
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:w-56 lg:flex-col">
                      <CreateConversationButton
                        projectId={project.id}
                        title={`${project.name} workspace`}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <MessageSquarePlus className="h-5 w-5" />
                        Start project chat
                      </CreateConversationButton>

                      {latestConversation ? (
                        <Link
                          href={`/chat?conversationId=${latestConversation.id}`}
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                        >
                          Continue latest
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-5 border-t border-white/10 pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                        Recent project chats
                      </p>
                      {project.conversations.length > 0 ? (
                        <p className="text-xs text-slate-500">
                          {project.conversations.length} shown
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-3 divide-y divide-white/10">
                      {project.conversations.length > 0 ? (
                        project.conversations.map((conversation) => (
                          <Link
                            key={conversation.id}
                            href={`/chat?conversationId=${conversation.id}`}
                            className="flex items-center justify-between gap-4 py-3 transition hover:text-white"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-white">
                                {conversation.title}
                              </p>
                              <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                                {conversation.messages[0]?.content ??
                                  "No messages yet."}
                              </p>
                            </div>
                            <span className="shrink-0 text-xs text-slate-500">
                              {formatDate(conversation.updatedAt)}
                            </span>
                          </Link>
                        ))
                      ) : (
                        <div className="py-4 text-sm text-slate-500">
                          Start a project chat to create the first saved thread
                          for this workspace.
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-500/15 text-violet-300">
                <FolderKanban className="h-8 w-8" />
              </div>

              <h2 className="mt-6 text-2xl font-black text-white">
                No projects yet
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-400">
                Create your first project to organize chats, coding sessions,
                research and generated media around one workspace.
              </p>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <CreateProjectForm />

          <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-lg font-black text-white">
              How project workspaces behave
            </h2>
            <div className="mt-4 space-y-4 text-sm leading-6 text-slate-400">
              <p>
                Project chats keep their context grouped under the selected
                app, client, research topic or workflow.
              </p>
              <p>
                Nexus AI can reuse saved project memory, recent conversations
                and workspace context when you return to the project later.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function ProjectStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-cyan-300" />
        <p className="text-sm text-slate-400">{label}</p>
      </div>
      <p className="mt-3 truncate text-2xl font-black text-white">{value}</p>
    </div>
  );
}

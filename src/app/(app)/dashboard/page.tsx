import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Clock3,
  Code2,
  CreditCard,
  FileText,
  FolderKanban,
  MessageSquare,
  Search,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { CreateConversationButton } from "@/components/chat/create-conversation-button";
import { webConversationWhere } from "@/lib/conversation-filters";
import { getCurrentDbUser } from "@/lib/current-user";
import { formatDate } from "@/lib/format";
import {
  DASHBOARD_VIEW_PARAM,
  LAST_CONVERSATION_COOKIE,
  isSafeConversationId,
} from "@/lib/last-conversation";
import { prisma } from "@/lib/prisma";

const actions = [
  {
    title: "Start a new chat",
    description: "Open a focused assistant workspace for ideas, code or research.",
    href: "/chat",
    icon: MessageSquare,
    tone: "text-cyan-300 bg-cyan-500/10",
  },
  {
    title: "Create a project",
    description: "Group future chats by app, client, research topic or workflow.",
    href: "/projects",
    icon: FolderKanban,
    tone: "text-amber-300 bg-amber-500/10",
  },
  {
    title: "Review history",
    description: "Return to saved conversations and continue with context.",
    href: "/history",
    icon: Clock3,
    tone: "text-emerald-300 bg-emerald-500/10",
  },
  {
    title: "Manage billing",
    description: "Track credits, payment history, plan status and usage.",
    href: "/billing",
    icon: CreditCard,
    tone: "text-violet-300 bg-violet-500/10",
  },
];

const assistantModes = [
  {
    title: "General chat",
    description: "Brainstorm, plan, write and decide faster.",
    icon: Sparkles,
  },
  {
    title: "Code mode",
    description: "Debug, explain, refactor and generate code.",
    icon: Code2,
  },
  {
    title: "Research mode",
    description: "Structure questions and flag what needs verification.",
    icon: Search,
  },
  {
    title: "File mode",
    description: "Prepare for document analysis and pasted content workflows.",
    icon: FileText,
  },
];

type DashboardPageProps = {
  searchParams: Promise<{
    view?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await getCurrentDbUser();
  const params = await searchParams;

  if (user && params.view !== DASHBOARD_VIEW_PARAM) {
    const lastConversationId = (await cookies()).get(
      LAST_CONVERSATION_COOKIE
    )?.value;

    if (isSafeConversationId(lastConversationId)) {
      const lastConversation = await prisma.conversation.findFirst({
        where: webConversationWhere({
          id: lastConversationId,
          userId: user.id,
          archived: false,
        }),
        select: {
          id: true,
        },
      });

      if (lastConversation) {
        redirect(`/chat?conversationId=${lastConversation.id}`);
      }
    }
  }

  const [projectCount, conversationCount, recentConversations, recentProjects] =
    user
      ? await Promise.all([
          prisma.project.count({
            where: {
              userId: user.id,
            },
          }),
          prisma.conversation.count({
            where: webConversationWhere({
              userId: user.id,
              archived: false,
            }),
          }),
          prisma.conversation.findMany({
            where: webConversationWhere({
              userId: user.id,
              archived: false,
            }),
            orderBy: {
              updatedAt: "desc",
            },
            take: 3,
            include: {
              project: true,
            },
          }),
          prisma.project.findMany({
            where: {
              userId: user.id,
            },
            orderBy: {
              updatedAt: "desc",
            },
            take: 3,
          }),
        ])
      : [0, 0, [], []];

  return (
    <div className="mx-auto max-w-7xl">
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b1020]">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:p-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
              <Sparkles className="h-4 w-4" />
              Dashboard
            </div>

            <h1 className="mt-5 max-w-3xl text-balance text-3xl font-black tracking-tight text-white sm:text-5xl">
              Welcome{user?.firstName ? `, ${user.firstName}` : ""}. What are we
              building today?
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              Your workspace is organized around action: start a conversation,
              attach work to projects, revisit history and keep credits visible.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <CreateConversationButton
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-200"
              >
                Start with Nexus AI
                <ArrowRight className="h-5 w-5" />
              </CreateConversationButton>

              <Link
                href="/projects"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                View projects
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <StatCard label="Plan" value={user?.plan ?? "FREE"} icon={Wallet} />
            <StatCard
              label="Credits"
              value={(user?.credits ?? 0).toLocaleString()}
              icon={Sparkles}
            />
            <StatCard
              label="Saved chats"
              value={conversationCount.toLocaleString()}
              icon={MessageSquare}
            />
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-4">
        {actions.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 transition hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-white/[0.07]"
            >
              <div
                className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${item.tone}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-white">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {item.description}
                  </p>
                </div>
                <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-slate-600 transition group-hover:translate-x-1 group-hover:text-white" />
              </div>
            </Link>
          );
        })}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-white">
                Continue where you left off
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Recent conversations stay one click away.
              </p>
            </div>
            <Link
              href="/history"
              className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              View all
            </Link>
          </div>

          <div className="mt-6 space-y-3">
            {recentConversations.length > 0 ? (
              recentConversations.map((conversation) => (
                <Link
                  key={conversation.id}
                  href={`/chat?conversationId=${conversation.id}`}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4 transition hover:bg-slate-900"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold text-white">
                      {conversation.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {conversation.mode}
                      {conversation.project ? ` in ${conversation.project.name}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs text-slate-500">
                    {formatDate(conversation.updatedAt)}
                  </p>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
                <p className="font-bold text-white">No conversations yet</p>
                <p className="mt-2 text-sm text-slate-500">
                  Start with Nexus AI and your saved chats will appear here.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-2xl font-black text-white">Workspace map</h2>
          <p className="mt-2 text-sm text-slate-400">
            Pick the mode that matches the work in front of you.
          </p>

          <div className="mt-6 grid gap-3">
            {assistantModes.map((mode) => {
              const Icon = mode.icon;

              return (
                <div
                  key={mode.title}
                  className="flex gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-cyan-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-white">{mode.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      {mode.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">Recent projects</h2>
            <p className="mt-2 text-sm text-slate-400">
              {projectCount} project{projectCount === 1 ? "" : "s"} in your workspace.
            </p>
          </div>
          <Link
            href="/projects"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-200"
          >
            Manage projects
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {recentProjects.length > 0 ? (
            recentProjects.map((project) => (
              <Link
                key={project.id}
                href={`/chat?projectId=${project.id}`}
                className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 transition hover:bg-slate-900"
              >
                <FolderKanban className="h-5 w-5 text-amber-300" />
                <p className="mt-4 font-bold text-white">{project.name}</p>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                  {project.description ?? "Open a project chat."}
                </p>
              </Link>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-500 md:col-span-3">
              Create your first project to organize chats and research by topic.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
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
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

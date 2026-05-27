import Link from "next/link";
import {
  ArrowRight,
  Code2,
  CreditCard,
  FileText,
  MessageSquare,
  Search,
  ShieldCheck,
} from "lucide-react";
import { getCurrentDbUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/dashboard/page-header";

const actions = [
  {
    title: "Start AI chat",
    description: "Create a new saved conversation with Nexus AI.",
    href: "/chat",
    icon: MessageSquare,
  },
  {
    title: "Explore projects",
    description: "Create and manage workspaces for your AI tasks.",
    href: "/projects",
    icon: FileText,
  },
  {
    title: "View history",
    description: "Open and continue your saved conversations.",
    href: "/history",
    icon: Search,
  },
  {
    title: "Manage billing",
    description: "Track credits, plans and usage.",
    href: "/billing",
    icon: CreditCard,
  },
];

export default async function DashboardPage() {
  const user = await getCurrentDbUser();

  const [projectCount, conversationCount] = user
    ? await Promise.all([
        prisma.project.count({
          where: {
            userId: user.id,
          },
        }),
        prisma.conversation.count({
          where: {
            userId: user.id,
          },
        }),
      ])
    : [0, 0];

  return (
    <div>
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome${user?.firstName ? `, ${user.firstName}` : ""}.`}
        description="Your AI workspace for chat, search, coding, files, ideas and productivity."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-slate-400">Plan</p>
          <p className="mt-2 text-2xl font-black text-white">{user?.plan ?? "FREE"}</p>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-slate-400">Credits</p>
          <p className="mt-2 text-2xl font-black text-white">{user?.credits ?? 0}</p>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm text-slate-400">Projects</p>
          <p className="mt-2 text-2xl font-black text-white">{projectCount}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {actions.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 transition hover:border-violet-400/40 hover:bg-white/[0.07]"
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
                <Icon className="h-6 w-6" />
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-white">{item.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-400">
                    {item.description}
                  </p>
                </div>

                <ArrowRight className="mt-1 h-5 w-5 text-slate-500 transition group-hover:translate-x-1 group-hover:text-white" />
              </div>
            </Link>
          );
        })}
      </div>

      <section className="mt-8 rounded-[2rem] border border-white/10 bg-gradient-to-br from-violet-500/10 to-blue-500/10 p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-violet-300">
              Database ready
            </p>
            <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">
              Your account is now connected to the database.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Batch 5 adds users, projects, conversations, messages and usage
              tracking so future AI chats can be saved properly.
            </p>
          </div>

          <div className="grid gap-4">
            {[
              {
                title: "User sync",
                description: "Clerk users are automatically created in Prisma.",
                icon: ShieldCheck,
              },
              {
                title: "Conversation storage",
                description: `${conversationCount} conversation record${
                  conversationCount === 1 ? "" : "s"
                } ready.`,
                icon: MessageSquare,
              },
              {
                title: "Usage foundation",
                description: "Credits, token logs and plan tracking are now prepared.",
                icon: Code2,
              },
            ].map((step) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.title}
                  className="flex gap-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-violet-300">
                    <Icon className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="font-bold text-white">{step.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

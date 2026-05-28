import { redirect } from "next/navigation";
import { Brain, Clock3, Database, Sparkles } from "lucide-react";
import { DeleteMemoryButton } from "@/components/memory/delete-memory-button";
import { PageHeader } from "@/components/dashboard/page-header";
import { getCurrentDbUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

function formatMemoryType(type: string) {
  return type
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

export default async function MemoryPage() {
  const user = await getCurrentDbUser();

  if (!user) {
    redirect("/sign-in");
  }

  const memories = await prisma.memoryItem.findMany({
    where: {
      userId: user.id,
    },
    include: {
      project: {
        select: {
          name: true,
        },
      },
      conversation: {
        select: {
          title: true,
        },
      },
    },
    orderBy: [{ relevance: "desc" }, { updatedAt: "desc" }],
    take: 120,
  });

  return (
    <div>
      <PageHeader
        eyebrow="Memory"
        title="Workspace memory."
        description="Manage durable facts, preferences and project notes Nexus can use when answering future requests."
      />

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <Database className="h-5 w-5 text-cyan-300" />
          <p className="mt-4 text-3xl font-black text-white">
            {memories.length}
          </p>
          <p className="mt-1 text-sm text-slate-400">Saved memories</p>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <Brain className="h-5 w-5 text-violet-300" />
          <p className="mt-4 text-3xl font-black text-white">
            {new Set(memories.map((memory) => memory.type)).size}
          </p>
          <p className="mt-1 text-sm text-slate-400">Memory types</p>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <Sparkles className="h-5 w-5 text-emerald-300" />
          <p className="mt-4 text-3xl font-black text-white">
            {memories.reduce((sum, memory) => sum + memory.relevance, 0)}
          </p>
          <p className="mt-1 text-sm text-slate-400">Relevance score</p>
        </div>
      </section>

      {memories.length > 0 ? (
        <section className="grid gap-4 xl:grid-cols-2">
          {memories.map((memory) => (
            <article
              key={memory.id}
              className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
                    {formatMemoryType(memory.type)}
                  </p>
                  <h2 className="mt-2 line-clamp-2 text-lg font-black text-white">
                    {memory.title}
                  </h2>
                </div>

                <DeleteMemoryButton memoryId={memory.id} />
              </div>

              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                {memory.content}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4 text-xs font-bold text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5" />
                  {memory.updatedAt.toLocaleDateString()}
                </span>
                <span>Source: {memory.source}</span>
                {memory.project ? <span>Project: {memory.project.name}</span> : null}
                {memory.conversation ? (
                  <span>Conversation: {memory.conversation.title}</span>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="rounded-[2rem] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan-400/10 text-cyan-300">
            <Brain className="h-8 w-8" />
          </div>
          <h2 className="mt-6 text-2xl font-black text-white">
            No saved memory yet
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-400">
            Tell Nexus to remember a project fact, preference, stack decision or
            important note. It will appear here and can be removed anytime.
          </p>
        </section>
      )}
    </div>
  );
}


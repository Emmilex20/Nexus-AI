import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  Brain,
  Code2,
  FileText,
  MessageSquarePlus,
  Search,
  Sparkles,
} from "lucide-react";
import { getCurrentDbUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { CreateConversationButton } from "@/components/chat/create-conversation-button";
import { ChatPanel } from "@/components/chat/chat-panel";
import { ConversationList } from "@/components/chat/conversation-list";

type ChatPageProps = {
  searchParams: Promise<{
    conversationId?: string;
    projectId?: string;
  }>;
};

const starterMessages = [
  {
    label: "Plan a web app",
    title: "Web app planning",
    description: "Turn an idea into scope, screens, data models and milestones.",
    mode: "CHAT" as const,
    icon: Brain,
  },
  {
    label: "Debug code",
    title: "Code debugging session",
    description: "Paste an error or component and work through a clean fix.",
    mode: "CODE" as const,
    icon: Code2,
  },
  {
    label: "Research an idea",
    title: "Business research",
    description: "Structure assumptions, risks, positioning and validation steps.",
    mode: "SEARCH" as const,
    icon: Search,
  },
  {
    label: "Analyze content",
    title: "File assistant session",
    description: "Paste future file content and ask for summaries or extraction.",
    mode: "FILE" as const,
    icon: FileText,
  },
];

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const user = await getCurrentDbUser();

  if (!user) {
    redirect("/sign-in");
  }

  const params = await searchParams;
  const conversationId = params.conversationId;

  if (conversationId) {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: user.id,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!conversation) {
      redirect("/chat");
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        userId: user.id,
        archived: false,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 20,
    });

    return (
      <div className="mx-auto flex max-w-[100rem] gap-5">
        <ConversationList
          conversations={conversations}
          activeConversationId={conversation.id}
        />

        <ChatPanel
          conversationId={conversation.id}
          conversationTitle={conversation.title}
          conversationMode={conversation.mode}
          initialCredits={user.credits}
          initialMessages={conversation.messages}
        />
      </div>
    );
  }

  const recentConversations = await prisma.conversation.findMany({
    where: {
      userId: user.id,
      archived: false,
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 20,
  });

  return (
    <div className="mx-auto grid max-w-[100rem] gap-5 xl:grid-cols-[20rem_1fr]">
      <ConversationList conversations={recentConversations} />

      <section className="min-h-[calc(100vh-5rem)] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0b1020]">
        <div className="grid min-h-[calc(100vh-5rem)] lg:grid-cols-[1fr_0.95fr]">
          <div className="flex flex-col justify-between border-b border-white/10 p-6 sm:p-8 lg:border-b-0 lg:border-r">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                <Sparkles className="h-4 w-4" />
                Nexus AI chat
              </div>

              <h1 className="mt-7 max-w-3xl text-balance text-4xl font-black tracking-tight text-white sm:text-6xl">
                Start a conversation that becomes workspace memory.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
                Choose a mode, create a saved thread, and use Nexus like a
                professional assistant for building, research, writing and
                planning.
              </p>

              <div className="mt-8">
                <Suspense fallback={null}>
                  <CreateConversationButton
                    label="New conversation"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </Suspense>
              </div>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[
                "Markdown answers",
                "Saved history",
                "Credit aware",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-bold text-slate-300"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white">
                  Choose a launch mode
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  Every option creates a real saved conversation.
                </p>
              </div>
              <MessageSquarePlus className="h-6 w-6 text-slate-600" />
            </div>

            <div className="mt-6 grid gap-3">
              <Suspense fallback={null}>
                {starterMessages.map((item) => {
                  const Icon = item.icon;

                  return (
                    <CreateConversationButton
                      key={item.label}
                      title={item.title}
                      mode={item.mode}
                      label={item.label}
                      className="group flex w-full items-center gap-4 rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-cyan-300/30 hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300 transition group-hover:bg-cyan-400/15">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="min-w-0">
                        <span className="block font-black text-white">
                          {item.label}
                        </span>
                        <span className="mt-1 block text-sm leading-6 text-slate-400">
                          {item.description}
                        </span>
                      </span>
                    </CreateConversationButton>
                  );
                })}
              </Suspense>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

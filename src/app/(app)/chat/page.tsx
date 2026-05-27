import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SendHorizonal, Sparkles } from "lucide-react";
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
    label: "Help me plan a web app",
    title: "Web app planning",
    mode: "CHAT" as const,
  },
  {
    label: "Explain a code error",
    title: "Code debugging session",
    mode: "CODE" as const,
  },
  {
    label: "Research a business idea",
    title: "Business research",
    mode: "SEARCH" as const,
  },
  {
    label: "Analyze a future file",
    title: "File assistant session",
    mode: "FILE" as const,
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
      <div className="flex gap-5">
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

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03]">
      <div className="border-b border-white/10 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
              <Sparkles className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-lg font-black text-white">AI chat</h1>
              <p className="text-sm text-slate-400">
                Create or open a conversation to start chatting.
              </p>
            </div>
          </div>

          <Suspense fallback={null}>
            <CreateConversationButton label="New conversation" />
          </Suspense>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-3xl text-center">
          <h2 className="text-balance text-3xl font-black tracking-tight text-white sm:text-5xl">
            What should we work on today?
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
            Choose a starting point to create a saved conversation.
          </p>

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            <Suspense fallback={null}>
              {starterMessages.map((item) => (
                <CreateConversationButton
                  key={item.label}
                  title={item.title}
                  mode={item.mode}
                  label={item.label}
                  className="inline-flex items-center justify-start gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-left text-sm font-semibold text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                />
              ))}
            </Suspense>
          </div>
        </div>
      </div>

      <form className="border-t border-white/10 bg-slate-950/80 px-3 py-3 backdrop-blur-xl sm:px-5 sm:py-4">
        <div className="mx-auto flex max-w-3xl items-end gap-3 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-3">
          <textarea
            rows={1}
            placeholder="Create or open a conversation first..."
            disabled
            className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-3 text-sm text-slate-500 outline-none"
          />

          <button
            type="button"
            disabled
            className="flex h-11 w-11 shrink-0 cursor-not-allowed items-center justify-center rounded-2xl bg-white/10 text-slate-500"
            aria-label="Send message"
          >
            <SendHorizonal className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}

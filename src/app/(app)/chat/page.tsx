import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  Brain,
  Code2,
  FileText,
  Search,
  Sparkles,
} from "lucide-react";
import { getCurrentDbUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { CreateConversationButton } from "@/components/chat/create-conversation-button";
import { ChatPanel } from "@/components/chat/chat-panel";

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

    return (
      <div className="-mx-4 -my-6 sm:-mx-5 lg:-m-5">
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
    <div className="-mx-4 -my-6 flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 sm:-mx-5 lg:-m-5 lg:min-h-screen">
      <section className="w-full max-w-3xl text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-3xl bg-cyan-400/10 text-cyan-300 sm:h-14 sm:w-14">
          <Sparkles className="h-6 w-6 sm:h-7 sm:w-7" />
        </div>

        <h1 className="text-balance text-2xl font-medium tracking-tight text-white sm:text-4xl">
          Where should we begin?
        </h1>

        <div className="mx-auto mt-6 max-w-2xl rounded-[1.5rem] bg-[#242424] p-2.5 text-left shadow-2xl shadow-black/30 ring-1 ring-white/10 sm:mt-8 sm:rounded-[1.75rem]">
          <div className="min-h-16 px-3 py-3 text-base text-slate-400 sm:min-h-20 sm:px-4 sm:py-4 sm:text-lg">
            Ask anything
          </div>
          <div className="flex flex-wrap items-center gap-2 px-2 pb-2">
            <Suspense fallback={null}>
              <CreateConversationButton
                label="New conversation"
                className="inline-flex h-10 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </Suspense>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Suspense fallback={null}>
            {starterMessages.map((item) => {
              const Icon = item.icon;

              return (
                <CreateConversationButton
                  key={item.label}
                  title={item.title}
                  mode={item.mode}
                  label={item.label}
                  className="group inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </CreateConversationButton>
              );
            })}
          </Suspense>
        </div>
      </section>
    </div>
  );
}

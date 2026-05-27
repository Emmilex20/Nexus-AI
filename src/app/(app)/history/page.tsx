import Link from "next/link";
import { Calendar, History, MessageSquarePlus } from "lucide-react";
import { getCurrentDbUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/dashboard/page-header";
import { CreateConversationButton } from "@/components/chat/create-conversation-button";

export default async function HistoryPage() {
  const user = await getCurrentDbUser();

  const conversations = user
    ? await prisma.conversation.findMany({
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
      })
    : [];

  return (
    <div>
      <PageHeader
        eyebrow="History"
        title="Your conversations."
        description="View saved conversations and continue from where you stopped."
      />

      <div className="mb-6">
        <CreateConversationButton label="Start new chat" />
      </div>

      <div className="space-y-4">
        {conversations.length > 0 ? (
          conversations.map((conversation) => (
            <Link
              key={conversation.id}
              href={`/chat?conversationId=${conversation.id}`}
              className="block rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 transition hover:border-violet-400/40 hover:bg-white/[0.07]"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
                      <History className="h-6 w-6" />
                    </div>

                    <div>
                      <h2 className="text-lg font-black text-white">
                        {conversation.title}
                      </h2>
                      <p className="text-xs text-slate-500">
                        {conversation.mode}
                        {conversation.project
                          ? ` • ${conversation.project.name}`
                          : ""}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
                    {conversation.messages[0]?.content ??
                      "No messages yet. Open this conversation to continue."}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Calendar className="h-4 w-4" />
                  {conversation.updatedAt.toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-500/15 text-violet-300">
              <MessageSquarePlus className="h-8 w-8" />
            </div>

            <h2 className="mt-6 text-2xl font-black text-white">
              No saved chats yet
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-400">
              Start your first conversation. It will appear here once messages
              are saved in the next chat phase.
            </p>

            <div className="mt-8">
              <CreateConversationButton label="Create first chat" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

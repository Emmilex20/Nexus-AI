import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

type ConversationItem = {
  id: string;
  title: string;
  mode: string;
  updatedAt: Date;
};

type ConversationListProps = {
  conversations: ConversationItem[];
  activeConversationId?: string;
};

export function ConversationList({
  conversations,
  activeConversationId,
}: ConversationListProps) {
  return (
    <aside className="hidden w-80 shrink-0 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] xl:block">
      <div className="border-b border-white/10 p-5">
        <h2 className="font-black text-white">Recent chats</h2>
        <p className="mt-1 text-xs text-slate-500">Open a saved conversation</p>
      </div>

      <div className="max-h-[calc(100vh-14rem)] space-y-2 overflow-y-auto p-3">
        {conversations.length > 0 ? (
          conversations.map((conversation) => {
            const active = conversation.id === activeConversationId;

            return (
              <Link
                key={conversation.id}
                href={`/chat?conversationId=${conversation.id}`}
                className={cn(
                  "block rounded-2xl p-4 transition",
                  active
                    ? "bg-white text-slate-950"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                )}
              >
                <div className="flex gap-3">
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{conversation.title}</p>
                    <p
                      className={cn(
                        "mt-1 text-xs",
                        active ? "text-slate-600" : "text-slate-500"
                      )}
                    >
                      {conversation.mode} •{" "}
                      {conversation.updatedAt.toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="p-4 text-sm leading-6 text-slate-500">
            No conversations yet.
          </div>
        )}
      </div>
    </aside>
  );
}

import Link from "next/link";
import { Clock3, MessageSquare, Plus } from "lucide-react";
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
    <aside className="hidden h-[calc(100vh-5rem)] w-80 shrink-0 overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0b1020] xl:flex xl:flex-col">
      <div className="border-b border-white/10 p-4">
        <Link
          href="/chat"
          className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-200"
        >
          <Plus className="h-5 w-5" />
          New conversation
        </Link>

        <div className="mt-5 flex items-center justify-between">
          <div>
            <h2 className="font-black text-white">Recent chats</h2>
            <p className="mt-1 text-xs text-slate-500">Saved assistant work</p>
          </div>
          <Clock3 className="h-5 w-5 text-slate-600" />
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {conversations.length > 0 ? (
          conversations.map((conversation) => {
            const active = conversation.id === activeConversationId;

            return (
              <Link
                key={conversation.id}
                href={`/chat?conversationId=${conversation.id}`}
                className={cn(
                  "block rounded-2xl border p-4 transition",
                  active
                    ? "border-cyan-300/30 bg-cyan-400/10 text-white"
                    : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.05] hover:text-white"
                )}
              >
                <div className="flex gap-3">
                  <div
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                      active
                        ? "bg-cyan-400/15 text-cyan-200"
                        : "bg-white/5 text-slate-500"
                    )}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">
                      {conversation.title}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-xs font-medium",
                        active ? "text-cyan-100/70" : "text-slate-500"
                      )}
                    >
                      {conversation.mode} -{" "}
                      {conversation.updatedAt.toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm leading-6 text-slate-500">
            Your saved chats will appear here after you create a conversation.
          </div>
        )}
      </div>
    </aside>
  );
}

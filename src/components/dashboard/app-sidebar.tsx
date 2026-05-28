"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  MessageSquarePlus,
} from "lucide-react";
import { MountedUserButton } from "@/components/auth/mounted-user-button";
import { CreateConversationButton } from "@/components/chat/create-conversation-button";
import { RecentChatItem } from "@/components/dashboard/recent-chat-item";
import { BrandMark } from "@/components/shared/brand-mark";
import { appNavItems } from "@/config/app-nav";
import { cn } from "@/lib/utils";

type SidebarConversation = {
  id: string;
  title: string;
  mode: string;
  updatedAt: string;
};

type AppSidebarProps = {
  conversations?: SidebarConversation[];
};

export function AppSidebar({ conversations = [] }: AppSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeConversationId = searchParams.get("conversationId");
  const [showRecentChats, setShowRecentChats] = useState(true);

  return (
    <aside className="sidebar-scrollbar fixed left-0 top-0 z-40 hidden h-screen w-60 flex-col overflow-y-auto border-r border-white/10 bg-[#070a13]/95 p-3.5 lg:flex">
      <Link href="/dashboard" className="flex items-center gap-2.5 px-1">
        <BrandMark className="h-10 w-10" priority />

        <div className="min-w-0">
          <p className="truncate text-sm font-black tracking-tight text-white">
            Nexus AI
          </p>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            Workspace
          </p>
        </div>
      </Link>

      <CreateConversationButton
        className="mt-5 flex w-full items-center justify-between rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-3.5 py-2.5 text-xs font-black text-cyan-100 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="inline-flex items-center gap-2.5">
          <MessageSquarePlus className="h-4 w-4" />
          New chat
        </span>
        <ArrowRight className="h-4 w-4" />
      </CreateConversationButton>

      <nav className="mt-5 space-y-1">
        {appNavItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex h-10 items-center gap-3 rounded-2xl px-3 text-xs font-black transition",
                active
                  ? "bg-white text-slate-950 shadow-lg shadow-white/5"
                  : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4",
                  active
                    ? "text-slate-950"
                    : "text-slate-500 group-hover:text-white"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <section
        className={cn(
          "mt-4 rounded-2xl border border-white/10 bg-white/[0.025]",
          !showRecentChats && "shrink-0"
        )}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-3.5 py-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
              Recent chats
            </p>
            <p className="mt-1 text-xs text-slate-400">Saved assistant work</p>
          </div>
          <button
            type="button"
            onClick={() => setShowRecentChats((value) => !value)}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label={showRecentChats ? "Hide recent chats" : "Show recent chats"}
            title={showRecentChats ? "Hide recent chats" : "Show recent chats"}
          >
            {showRecentChats ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>

        {showRecentChats ? (
          <div className="space-y-1.5 p-2">
            {conversations.length > 0 ? (
              conversations.map((conversation) => (
                <RecentChatItem
                  key={conversation.id}
                  conversation={conversation}
                  active={conversation.id === activeConversationId}
                />
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 p-3 text-xs leading-5 text-slate-500">
                New conversations will appear here.
              </div>
            )}
          </div>
        ) : null}
      </section>

      <div className="min-h-3 flex-1" />

      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
        <MountedUserButton />
        <div className="min-w-0">
          <p className="truncate text-xs font-black text-white">Account</p>
          <p className="text-[11px] text-slate-500">Manage profile</p>
        </div>
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { Clock3, Menu, MessageSquarePlus, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MountedUserButton } from "@/components/auth/mounted-user-button";
import { CreateConversationButton } from "@/components/chat/create-conversation-button";
import { RecentChatItem } from "@/components/dashboard/recent-chat-item";
import { BrandMark } from "@/components/shared/brand-mark";
import { appNavItems } from "@/config/app-nav";
import { cn } from "@/lib/utils";

type MobileConversation = {
  id: string;
  title: string;
  mode: string;
  updatedAt: string;
};

type MobileAppHeaderProps = {
  conversations?: MobileConversation[];
};

export function MobileAppHeader({ conversations = [] }: MobileAppHeaderProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070a13]/95 backdrop-blur-xl lg:hidden">
      <div className="flex h-14 items-center justify-between px-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <BrandMark className="h-9 w-9 rounded-[1rem]" priority />
          <div>
            <p className="text-sm font-black leading-none text-white">Nexus AI</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Workspace
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <MountedUserButton placeholderClassName="h-9 w-9" />

          <button
            onClick={() => setOpen((value) => !value)}
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white"
            aria-label="Toggle app menu"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="sidebar-scrollbar max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-white/10 bg-[#070a13] px-3 py-3">
          <nav className="grid gap-2">
            <CreateConversationButton
              onCreated={() => setOpen(false)}
              className="mb-1 flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <MessageSquarePlus className="h-4 w-4" />
              New chat
            </CreateConversationButton>

            {appNavItems.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-black transition",
                    active
                      ? "bg-white text-slate-950"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      active ? "text-slate-950" : "text-slate-500"
                    )}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025]">
            <div className="flex items-center justify-between border-b border-white/10 px-3.5 py-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                  Recent chats
                </p>
                <p className="mt-1 text-xs text-slate-400">Continue a thread</p>
              </div>
              <Clock3 className="h-4 w-4 text-slate-600" />
            </div>

            <div className="space-y-1.5 p-2">
              {conversations.length > 0 ? (
                conversations.map((conversation) => (
                  <RecentChatItem
                    key={conversation.id}
                    conversation={conversation}
                    onNavigate={() => setOpen(false)}
                  />
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 p-3 text-xs leading-5 text-slate-500">
                  New conversations will appear here.
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </header>
  );
}

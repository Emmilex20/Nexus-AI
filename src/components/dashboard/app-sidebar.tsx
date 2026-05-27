"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { ArrowRight, MessageSquarePlus, Sparkles } from "lucide-react";
import { appNavItems } from "@/config/app-nav";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 border-r border-white/10 bg-[#070a13]/95 p-5 lg:block">
      <Link href="/dashboard" className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-violet-500 to-fuchsia-500 shadow-lg shadow-cyan-500/20">
          <Sparkles className="h-5 w-5 text-white" />
        </div>

        <div>
          <p className="text-base font-black tracking-tight text-white">Nexus AI</p>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Workspace
          </p>
        </div>
      </Link>

      <Link
        href="/chat"
        className="mt-8 flex items-center justify-between rounded-[1.25rem] border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-400/15"
      >
        <span className="inline-flex items-center gap-3">
          <MessageSquarePlus className="h-5 w-5" />
          New chat
        </span>
        <ArrowRight className="h-4 w-4" />
      </Link>

      <nav className="mt-8 space-y-1.5">
        {appNavItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-[1.15rem] px-4 py-3 text-sm font-bold transition",
                active
                  ? "bg-white text-slate-950 shadow-lg shadow-white/5"
                  : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  active ? "text-slate-950" : "text-slate-500 group-hover:text-white"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-5 left-5 right-5 space-y-3">
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            Flow
          </p>
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            <p>Ask AI</p>
            <p>Save chats</p>
            <p>Track credits</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
          <UserButton />
          <div>
            <p className="text-sm font-bold text-white">Account</p>
            <p className="text-xs text-slate-500">Manage profile</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

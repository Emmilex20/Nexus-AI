"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { appNavItems } from "@/config/app-nav";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 border-r border-white/10 bg-slate-950/95 p-5 lg:block">
      <Link href="/" className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 shadow-lg shadow-violet-500/25">
          <Sparkles className="h-5 w-5 text-white" />
        </div>

        <div>
          <p className="text-base font-black text-white">Nexus AI</p>
          <p className="text-xs text-slate-500">Workspace</p>
        </div>
      </Link>

      <nav className="mt-10 space-y-2">
        {appNavItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                active
                  ? "bg-white text-slate-950"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-5 left-5 right-5 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-center gap-3">
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

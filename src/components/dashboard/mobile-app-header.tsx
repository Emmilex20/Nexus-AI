"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Menu, MessageSquarePlus, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { appNavItems } from "@/config/app-nav";

export function MobileAppHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070a13]/90 backdrop-blur-xl lg:hidden">
      <div className="flex h-16 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-violet-500 to-fuchsia-500">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="font-black text-white">Nexus AI</span>
        </Link>

        <div className="flex items-center gap-3">
          <UserButton />

          <button
            onClick={() => setOpen((value) => !value)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white"
            aria-label="Toggle app menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <nav className="border-t border-white/10 px-4 py-4">
          <div className="grid gap-2">
            <Link
              href="/chat"
              onClick={() => setOpen(false)}
              className="mb-2 flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950"
            >
              <MessageSquarePlus className="h-5 w-5" />
              New chat
            </Link>

            {appNavItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </header>
  );
}

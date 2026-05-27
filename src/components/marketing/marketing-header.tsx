"use client";

import Link from "next/link";
import { UserButton, useAuth } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/marketing/logo";
import { Container } from "@/components/shared/container";
import { siteConfig } from "@/config/site";

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const { isLoaded, isSignedIn } = useAuth();
  const signedOut = isLoaded && !isSignedIn;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <Container className="flex h-20 items-center justify-between">
        <Logo />

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-300 lg:flex">
          {siteConfig.nav.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {signedOut ? (
            <>
            <Link
              href="/sign-in"
              className="rounded-full px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              Sign in
            </Link>

            <Link
              href="/sign-up"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-black text-slate-950 transition hover:bg-slate-200"
            >
              Get started
            </Link>
            </>
          ) : null}

          {isSignedIn ? (
            <>
            <Link
              href="/dashboard"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-black text-slate-950 transition hover:bg-slate-200"
            >
              Dashboard
            </Link>
            <UserButton />
            </>
          ) : null}
        </div>

        <button
          onClick={() => setOpen((value) => !value)}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white lg:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </Container>

      {open ? (
        <div className="border-t border-white/10 bg-slate-950 lg:hidden">
          <Container className="space-y-2 py-5">
            {siteConfig.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block rounded-2xl px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                {item.label}
              </Link>
            ))}

            <div className="grid gap-3 pt-3">
              {signedOut ? (
                <>
                <Link
                  href="/sign-in"
                  onClick={() => setOpen(false)}
                  className="rounded-2xl border border-white/10 px-4 py-3 text-center text-sm font-bold text-white"
                >
                  Sign in
                </Link>

                <Link
                  href="/sign-up"
                  onClick={() => setOpen(false)}
                  className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-slate-950"
                >
                  Get started
                </Link>
                </>
              ) : null}

              {isSignedIn ? (
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-slate-950"
                >
                  Dashboard
                </Link>
              ) : null}
            </div>
          </Container>
        </div>
      ) : null}
    </header>
  );
}

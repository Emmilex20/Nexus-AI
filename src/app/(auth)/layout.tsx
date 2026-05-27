import Link from "next/link";
import { Sparkles } from "lucide-react";
import { siteConfig } from "@/config/site";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.28),transparent_32rem),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.18),transparent_28rem)]" />

      <div className="w-full max-w-md">
        <Link href="/" className="mx-auto mb-8 flex w-fit items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 shadow-lg shadow-violet-500/25">
            <Sparkles className="h-5 w-5" />
          </div>

          <div>
            <p className="font-black text-white">{siteConfig.name}</p>
            <p className="text-xs text-slate-400">AI Workspace</p>
          </div>
        </Link>

        {children}

        <p className="mt-8 text-center text-xs leading-6 text-slate-500">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="text-slate-300 hover:text-white">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-slate-300 hover:text-white">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

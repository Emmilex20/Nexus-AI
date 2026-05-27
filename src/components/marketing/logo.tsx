import Link from "next/link";
import { Sparkles } from "lucide-react";
import { siteConfig } from "@/config/site";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 text-white shadow-lg shadow-violet-500/25">
        <Sparkles className="h-5 w-5" />
      </div>

      <div className="leading-tight">
        <p className="text-base font-black tracking-tight text-white">
          {siteConfig.name}
        </p>
        <p className="text-xs text-slate-400">AI Workspace</p>
      </div>
    </Link>
  );
}
